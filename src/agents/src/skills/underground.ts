import pathfinderPkg from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import type { Bot } from "mineflayer";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { countInventory } from "../observe.js";
import { asNumber, getOutOfWater, groundAbove, headInWater, homeBlock, isExposed, liquidBeside, opensOnClick, plainError, threatened, withTimeout } from "./util.js";
export { plainError };
import { half, insideSpot, spotKey } from "./buildShelter.js";
import { torchTrail } from "./light.js";

const { goals } = pathfinderPkg;

/** Deepest feet height we dig to: bedrock starts at -64 and is uneven up to -60. */
export const LOWEST_Y = -58;
const DIG_TIMEOUT_MS = 15_000;
const STEP_TIMEOUT_MS = 10_000;
/** A fall this short costs no health, so it is a step, not a hazard (agents spawn on tree canopies). */
const MAX_SAFE_DROP = 3;
const MAX_SKILL_MS = 6 * 60_000;
/**
 * Pickaxes for bulk digging, cheapest first. A staircase to diamond depth breaks ~400 blocks: more
 * than an iron pickaxe lasts (250), and diamonds need one. So iron and better are only dug with
 * when nothing cheaper is left, and never below KEEP_USES (seen in the skill smoke test).
 */
const DIGGERS = ["stone_pickaxe", "wooden_pickaxe", "golden_pickaxe", "iron_pickaxe", "diamond_pickaxe", "netherite_pickaxe"];
const PRECIOUS = new Set(["iron_pickaxe", "diamond_pickaxe", "netherite_pickaxe"]);
const KEEP_USES = 16;
/** A block slower than this to dig with the held pickaxe gets the best tool instead. */
const SLOW_DIG_MS = 3000;
const HEADINGS: Array<{ name: string; dx: number; dz: number }> = [
  { name: "north", dx: 0, dz: -1 },
  { name: "east", dx: 1, dz: 0 },
  { name: "south", dx: 0, dz: 1 },
  { name: "west", dx: -1, dz: 0 },
];

/** Blocks that fall when what holds them up is dug out. */
const FALLS = /^(gravel|sand|red_sand|suspicious_sand|suspicious_gravel|.*_concrete_powder)$/;

/**
 * Why the block over the bot's head can't be dug from below, or null if it can: with gravel or sand
 * on top, that falls straight onto the head (la suffocated this way in bpoc7, climbing out).
 */
function fallsOnHead(bot: Bot, feet: Vec3): string | null {
  const over = bot.blockAt(feet.offset(0, 2, 0));
  if (!over || over.boundingBox === "empty") return null;
  const above = bot.blockAt(feet.offset(0, 3, 0));
  return above && FALLS.test(above.name) ? `${above.name} above, which would fall on your head` : null;
}

/** The heading each bot last dug in, so repeated calls keep one straight line. Keyed by username. */
const lastHeading = new Map<string, number>();

/** Why a cell can't be cleared safely, or null if it can (or is already open). */
function unsafe(bot: Bot, cell: Vec3): string | null {
  const block = bot.blockAt(cell);
  if (!block) return "unloaded ground";
  if (block.name === "lava" || block.name === "water") return block.name;
  if (block.boundingBox === "empty") return null;
  if (block.name === "bedrock" || !bot.canDigBlock(block)) return `unbreakable ${block.name}`;
  if (homeBlock(bot, cell)) return "part of a home";
  const liquid = liquidBeside(bot, cell);
  return liquid ? `${liquid} behind the ${block.name}` : null;
}

/** Why the bot can't stand at `feet`'s floor, or null if the floor is solid. */
function badFloor(bot: Bot, feet: Vec3): string | null {
  const floor = bot.blockAt(feet.offset(0, -1, 0));
  if (!floor) return "unloaded ground";
  if (floor.name === "lava" || floor.name === "water") return `${floor.name} below`;
  if (floor.boundingBox !== "block") return "a drop into a cave";
  return null;
}

/**
 * The block the bot really stands on. Usually the one under its feet; but standing at an edge, the
 * bot's middle can hang over air while the rest of it rests on the block beside (lb in bpoc11, in a
 * cave, told "not standing on solid ground" five times on solid ground). Null when it stands on nothing.
 */
function support(bot: Bot): Vec3 | null {
  const { x, y, z } = bot.entity.position;
  for (const [dx, dz] of [[0, 0], [0.3, 0.3], [0.3, -0.3], [-0.3, 0.3], [-0.3, -0.3]] as const) {
    const cell = new Vec3(Math.floor(x + dx), Math.floor(y) - 1, Math.floor(z + dz));
    if (bot.blockAt(cell)?.boundingBox === "block") return cell;
  }
  return null;
}

/** Steps onto the middle of the block the bot rests on when it hangs over an edge, so every check below starts from solid ground. */
async function centre(bot: Bot): Promise<void> {
  const under = support(bot);
  const feet = bot.entity.position.floored();
  if (!under || (under.x === feet.x && under.z === feet.z)) return;
  try {
    await withTimeout(bot.pathfinder.goto(new goals.GoalBlock(under.x, under.y + 1, under.z)), 5000, "stepping onto the block underfoot");
  } catch {
    bot.pathfinder.setGoal(null);
  }
}

/**
 * Puts the named item in hand, found afresh: anything else can move items in between (a reflex digging
 * the head free picks its own tool), and a stale item makes the game refuse the click ("invalid operation").
 */
async function hold(bot: Bot, name: string): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (bot.heldItem?.name === name) return true;
    const item = bot.inventory.items().find((i) => i.name === name);
    if (!item) return false;
    try {
      await bot.equip(item, "hand");
    } catch {
      await bot.waitForTicks(2);
    }
  }
  return bot.heldItem?.name === name;
}


function usesLeft(item: { maxDurability?: number; durabilityUsed?: number }): number {
  return item.maxDurability ? item.maxDurability - (item.durabilityUsed ?? 0) : Infinity;
}

/**
 * Holds the cheapest pickaxe fit for digging. Returns null when it has one in hand, or why not:
 * no pickaxe at all, or only an iron (or better) one that is being saved for ore.
 */
async function equipDigger(bot: Bot): Promise<string | null> {
  const candidates = bot.inventory
    .items()
    .filter((item) => DIGGERS.includes(item.name))
    // Cheapest kind first; within a kind, finish the most worn one.
    .sort((a, b) => DIGGERS.indexOf(a.name) - DIGGERS.indexOf(b.name) || usesLeft(a) - usesLeft(b));
  const usable = candidates.find((item) => !(PRECIOUS.has(item.name) && usesLeft(item) <= KEEP_USES));
  if (usable) {
    if (bot.heldItem?.slot !== usable.slot) await hold(bot, usable.name);
    return null;
  }
  const saved = candidates[0];
  return saved
    ? `stopped to save your ${saved.name} (${usesLeft(saved)} uses left) for mining ore — craft a stone_pickaxe to dig with`
    : "need a pickaxe to dig — craft one first";
}

/** "your stone_pickaxe broke" for each pickaxe held at the start and gone now. */
function brokenSince(bot: Bot, before: Record<string, number>): string {
  const now = countInventory(bot);
  const broke = DIGGERS.filter((name) => (now[name] ?? 0) < (before[name] ?? 0));
  return broke.length ? ` Your ${broke.join(" and ")} wore out and broke.` : "";
}

/** A block of gravel or sand on its way down into one of the cells, which looks like air until it lands. */
function falling(bot: Bot, cells: Vec3[]): boolean {
  return Object.values(bot.entities).some(
    (e) => e.name === "falling_block" && cells.some((c) => Math.abs(e.position.x - c.x - 0.5) < 1 && Math.abs(e.position.z - c.z - 0.5) < 1 && e.position.y >= c.y),
  );
}

/**
 * Where each agent was driven out by water digging down, and when (game ticks). A flooded layer can't be told from a
 * pocket by the water in view (10-11 blocks round the step where filling worked, 11-14 where it did not, measured
 * live), only by the water coming back: in tluna24 the agents dug into one at y 57-61 39 times, cut short by "out of
 * air" each time, and went back to it. Ten minutes of game time.
 */
export type FloodSpot = { x: number; z: number; at: number };
const floodedAt = new WeakMap<Bot, FloodSpot[]>();
/** This agent's own flooded spots, for its teammates (shared like ore sightings). */
export function ownFloods(bot: Bot): FloodSpot[] {
  return floodedAt.get(bot) ?? [];
}

/**
 * Open ground 8-24 blocks off, at least FLOOD_CLEAR from every flooded spot known, nearest first: where descend digs
 * from instead. The lake under the first world's start area is about 50 by 42 blocks (14,328 water blocks at y 45-62,
 * mapped 10 November), and in tluna25 descend refused 35 times there as the agents kept starting from the home above it.
 */
function clearOfFloods(bot: Bot, floods: FloodSpot[]): Vec3[] {
  const here = bot.entity.position.floored();
  const out: Array<{ c: Vec3; d: number }> = [];
  for (let r = 8; r <= 24; r += 2)
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * 2 * Math.PI;
      const x = here.x + Math.round(Math.cos(a) * r), z = here.z + Math.round(Math.sin(a) * r);
      if (floods.some((f) => Math.hypot(f.x - x, f.z - z) < FLOOD_CLEAR)) continue;
      for (const dy of [0, 1, -1, 2, -2, 3, -3, 4, -4]) {
        const c = new Vec3(x, here.y + dy, z);
        if (standable(bot, c) && !homeBlock(bot, c.offset(0, -1, 0))) {
          out.push({ c, d: r });
          break;
        }
      }
    }
  return out.sort((p, q) => p.d - q.d).map((p) => p.c);
}
const FLOOD_MEMORY_TICKS = 12_000;
const FLOOD_NEAR = 6;
/**
 * A dry way down planned before digging: for each of the four headings, from where the agent stands and from open
 * ground up to 24 blocks off, the diagonal stair to the target height is checked for water or lava within a block of
 * it, using the blocks the game has sent (as the pathfinder and the unsafe() checks do; nothing is told to the agent).
 * Filling cannot seal a stair through open water: at the lake under the first world's start area (about 50 by 42
 * blocks, y 45-62) a live dig took flowing water into the head cell at its edge and most fills found nothing to
 * place against; the agents' iron in the winning reps lay below and east of it (x 17-23, y 32-41).
 */
function stairIsDry(bot: Bot, start: Vec3, heading: { dx: number; dz: number }, depth: number): boolean {
  for (let i = 1; i <= depth; i++) {
    const feet = start.offset(heading.dx * i, -i, heading.dz * i);
    // Solid ground under every step: a stair planned over a cave stops at "a drop into a cave" (live, twice).
    if (bot.blockAt(feet.offset(0, -1, 0))?.boundingBox !== "block") return false;
    for (const dy of [0, 1, 2]) {
      const cell = feet.offset(0, dy, 0);
      for (const [ox, oy, oz] of [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]] as const) {
        const b = bot.blockAt(cell.offset(ox, oy, oz));
        if (!b || b.name === "water" || b.name === "lava" || b.name === "bubble_column") return false;
        // Sand or gravel over the stair falls into it as it is dug ("blocks kept falling into the gap", live).
        if (oy >= 0 && /^(sand|red_sand|gravel|suspicious_sand|suspicious_gravel)$/.test(b.name)) return false;
      }
      if (homeBlock(bot, cell)) return false;
    }
  }
  return true;
}

/** The nearest start (here first) and heading with a dry stair down to `targetY`, or null. */
function planDryDescent(bot: Bot, targetY: number, toward?: { x: number; z: number }): { start: Vec3; heading: number } | null {
  const here = bot.entity.position.floored();
  const starts: Vec3[] = [here];
  for (let r = 4; r <= 24; r += 4)
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * 2 * Math.PI;
      const x = here.x + Math.round(Math.cos(a) * r), z = here.z + Math.round(Math.sin(a) * r);
      for (const dy of [0, 1, -1, 2, -2, 3, -3]) {
        const c = new Vec3(x, here.y + dy, z);
        if (standable(bot, c) && !homeBlock(bot, c.offset(0, -1, 0))) {
          starts.push(c);
          break;
        }
      }
    }
  // Toward something (ore in sight below): of the dry stairs, the one ending nearest it, then the nearest start.
  if (toward) {
    let best: { start: Vec3; heading: number; score: number } | null = null;
    for (const start of starts) {
      const depth = start.y - targetY;
      if (depth <= 0) continue;
      for (let h = 0; h < 4; h++) {
        const end = start.offset(HEADINGS[h]!.dx * depth, 0, HEADINGS[h]!.dz * depth);
        const score = Math.hypot(end.x - toward.x, end.z - toward.z) + start.distanceTo(here) / 4;
        if (best && score >= best.score) continue;
        if (stairIsDry(bot, start, HEADINGS[h]!, depth)) best = { start, heading: h, score };
      }
    }
    return best;
  }
  for (const start of starts) {
    const depth = start.y - targetY;
    if (depth <= 0) continue;
    for (let h = 0; h < 4; h++) if (stairIsDry(bot, start, HEADINGS[h]!, depth)) return { start, heading: h };
  }
  return null;
}

/** How far from every flooded spot a new way down starts. */
const FLOOD_CLEAR = 8;
/** Seconds with the head under water in one descend before it counts as driven out. */
const MAX_WET_MS = 6000;

/** Blocks to stop water with, as a player plugs a leak: cheap ones that don't fall. */
const PLUG_BLOCKS = ["cobblestone", "dirt", "cobbled_deepslate", "stone", "andesite", "diorite", "granite", "netherrack", "tuff"];
const SIDES = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, -1, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];

export function plugBlock(bot: Bot): string | undefined {
  const held = countInventory(bot);
  return PLUG_BLOCKS.find((name) => (held[name] ?? 0) > 0);
}

/** Water only, behind a block to dig: something a block in the gap stops (lava is never dug towards). */
function leak(problem: string | null): boolean {
  return problem !== null && problem.startsWith("water behind the ");
}

/**
 * Fills the water touching a just-dug cell with a block, before it floods the stair, leaving the stair's
 * own cells open. Refusing every block with water behind it stopped 43 of 54 descends and tunnels in
 * tluna4, and 11 of 19 in tluna5e, in this world's wet ground; a player digs on and plugs the leak.
 */
async function plugWater(bot: Bot, dug: Vec3, path: Vec3[]): Promise<void> {
  let placed = false;
  // Not where the bot stands either: no block goes there, and what flowed in drains once its source is stopped.
  const feet = bot.entity.position.floored();
  const keep = [...path, feet, feet.offset(0, 1, 0)];
  for (const side of SIDES) {
    const wet = dug.plus(side);
    if (keep.some((cell) => cell.equals(wet)) || bot.blockAt(wet)?.name !== "water") continue;
    await fillWater(bot, wet);
    placed = true;
  }
  if (placed) await equipDigger(bot);
}

/** A block put into a cell of water. Throws why not. */
export async function fillWater(bot: Bot, wet: Vec3): Promise<void> {
  const name = plugBlock(bot);
  if (!name) throw new Error("water came in and there was no block left to plug it with");
  const against = SIDES.map((s) => bot.blockAt(wet.plus(s))).find((b) => b && b.boundingBox === "block" && !opensOnClick(b.name));
  if (!against) throw new Error("water came in with nothing solid beside it to put a block against");
  if (!(await hold(bot, name))) throw new Error(`could not hold the ${name} to plug the water`);
  await withTimeout(bot.placeBlock(against, wet.minus(against.position)), 3000, "plugging the water");
}

/**
 * Digs the cells top-down. Gravel and sand fall into a cleared space, so it goes round a few times,
 * and waits for any still falling: one landing after the bot steps in buries its head (bpoc7). With
 * `plug`, water touching a dug cell is stopped with a block.
 */
async function clear(bot: Bot, cells: Vec3[], plug = false): Promise<void> {
  for (let round = 0; round < 6; round++) {
    const solid = cells.map((cell) => bot.blockAt(cell)).filter((block) => block && block.boundingBox !== "empty");
    if (solid.length === 0 && !falling(bot, cells)) return;
    for (const block of solid) {
      // Ore a cheap pickaxe can't harvest (redstone, diamond) takes it ages; use the right tool for that block.
      if (bot.digTime(block!) > SLOW_DIG_MS) {
        const better = bot.pathfinder.bestHarvestTool(block!);
        if (better) await hold(bot, better.name);
      }
      await withTimeout(bot.dig(block!), DIG_TIMEOUT_MS, `digging ${block!.name}`);
      if (plug) await plugWater(bot, block!.position, cells);
    }
    // Long enough for gravel or sand to start falling, only where some could: every step waited 0.3 s.
    const couldFall = cells.some((cell) => FALLS.test(bot.blockAt(cell.offset(0, 1, 0))?.name ?? ""));
    await bot.waitForTicks(couldFall ? 6 : 1);
  }
  throw new Error("blocks kept falling into the gap");
}

/**
 * One step from the bot's feet along `heading`, `dy` up or down (-1 for a stair down, 0 for a
 * tunnel, 1 for a stair up). Checks everything first, digs, then walks in. Returns null on success
 * or why it refused.
 */
async function step(bot: Bot, heading: { dx: number; dz: number }, dy: number): Promise<string | null> {
  const feet = bot.entity.position.floored();
  const next = feet.offset(heading.dx, dy, heading.dz);
  // A stair down needs headroom over the step as well as space for feet and head; a stair up needs
  // room over the bot's own head to jump.
  const cells =
    dy < 0 ? [next.offset(0, 2, 0), next.offset(0, 1, 0), next]
    : dy > 0 ? [feet.offset(0, 2, 0), next.offset(0, 1, 0), next]
    : [next.offset(0, 1, 0), next];
  // Head in water that ran in after the last step: whatever feeds it is filled first, the cells ahead left alone.
  if (headInWater(bot) && plugBlock(bot)) {
    for (const own of [feet, feet.offset(0, 1, 0)]) {
      for (const side of SIDES) {
        const wet = own.plus(side);
        if (cells.some((cell) => cell.equals(wet)) || wet.equals(feet) || wet.equals(feet.offset(0, 1, 0))) continue;
        if (bot.blockAt(wet)?.name === "water") await fillWater(bot, wet).catch(() => {});
      }
    }
    await equipDigger(bot);
    for (let tick = 0; tick < 30 && headInWater(bot); tick += 5) await bot.waitForTicks(5);
  }
  // Open water in the step itself: each cell filled with a block first, which the dig below then cuts through,
  // plugging what lies behind, as a player fills a flooded way down. On the first world descend stopped at
  // "every way down is unsafe: water" 11 times in tluna23 alone, with the iron below it.
  if (plugBlock(bot)) {
    for (const cell of [...cells].reverse()) {
      if (bot.blockAt(cell)?.name === "water") await fillWater(bot, cell).catch(() => {});
    }
  }
  // Water behind a block is plugged as it is dug, given a block to plug it with.
  const problems = cells.map((cell) => unsafe(bot, cell));
  const plug = problems.some(leak) && plugBlock(bot) !== undefined;
  const problem = problems.find((p) => p && !(plug && leak(p)));
  if (problem) return problem;
  const overhead = dy > 0 && fallsOnHead(bot, feet);
  if (overhead) return overhead;
  let landing = next;
  // Only a step across or down may land lower; a stair up stands on the block it climbs onto.
  for (let drop = 0; dy <= 0 && drop < MAX_SAFE_DROP && badFloor(bot, landing) === "a drop into a cave"; drop++) {
    const below = landing.offset(0, -1, 0);
    if (bot.blockAt(below)?.boundingBox !== "empty" || unsafe(bot, below)) break;
    landing = below;
  }
  // Water to stand on: filled with a block to make the step's floor.
  if (badFloor(bot, landing) === "water below" && plugBlock(bot)) await fillWater(bot, landing.offset(0, -1, 0)).catch(() => {});
  const floor = badFloor(bot, landing);
  // Going up, the "floor" is the block to step onto; none there is open space, not a drop.
  if (floor) return dy > 0 && floor === "a drop into a cave" ? "no rock to step up onto" : floor;
  await clear(bot, cells, plug);
  // What ran in before the plug drains away once nothing feeds it.
  for (let tick = 0; plug && tick < 30 && cells.some((cell) => bot.blockAt(cell)?.name === "water"); tick += 5) await bot.waitForTicks(5);
  await bot.waitForTicks(2);
  try {
    await withTimeout(bot.pathfinder.goto(new goals.GoalBlock(landing.x, landing.y, landing.z)), STEP_TIMEOUT_MS, "stepping");
  } catch (error) {
    bot.pathfinder.setGoal(null);
    return `could not step in: ${plainError((error as Error).message)}`;
  }
  // The cells just left were skipped while the bot stood in them, and water ran down the stair onto its
  // head, where digging is five times slower (checked live: its air ran out). Water in them now is filled,
  // closing the stair behind as a player would; climbing out digs it open again.
  const left = [feet.offset(0, 1, 0), feet].filter((cell) => bot.blockAt(cell)?.name === "water");
  if (left.length > 0 && plugBlock(bot)) {
    // The step is made either way; a plug that failed here is tried again after the next step.
    for (const cell of left) await fillWater(bot, cell).catch(() => {});
    await equipDigger(bot);
  }
  return null;
}

const GROUND = ["grass_block", "dirt", "coarse_dirt", "podzol", "rooted_dirt", "moss_block", "stone", "sand", "gravel", "deepslate", "andesite", "diorite", "granite", "mud"];

/**
 * Agents often spawn on top of a tree canopy, with air below the leaves. Digging a staircase from
 * there means stepping into that air, so first walk to the nearest real ground within 16 blocks.
 * Returns why it could not, or null when on the ground (already, or now).
 */
async function toGround(bot: Bot): Promise<string | null> {
  const under = bot.blockAt(bot.entity.position.floored().offset(0, -1, 0));
  if (!under || !(under.name.endsWith("_leaves") || under.name.endsWith("_log"))) return null;
  const ids = GROUND.map((name) => bot.registry.blocksByName[name]?.id).filter((id): id is number => id !== undefined);
  const here = bot.entity.position;
  const spots = bot
    .findBlocks({ matching: ids, maxDistance: 16, count: 256 })
    .filter((p) => bot.blockAt(p.offset(0, 1, 0))?.boundingBox === "empty" && bot.blockAt(p.offset(0, 2, 0))?.boundingBox === "empty")
    .sort((a, b) => a.distanceTo(here) - b.distanceTo(here));
  for (const spot of spots.slice(0, 5)) {
    try {
      await withTimeout(bot.pathfinder.goto(new goals.GoalBlock(spot.x, spot.y + 1, spot.z)), 20_000, "climbing down to the ground");
      return null;
    } catch {
      bot.pathfinder.setGoal(null);
    }
  }
  return "standing on a tree and could not climb down to the ground";
}

/** True when the bot is in water or floating on it: its feet or head in water, or no solid block underfoot. */
function inWater(bot: Bot): boolean {
  const feet = bot.entity.position.floored();
  if ([feet, feet.offset(0, 1, 0)].some((cell) => bot.blockAt(cell)?.name === "water")) return true;
  return bot.blockAt(feet.offset(0, -1, 0))?.name === "water";
}

const WET = new Set(["water", "bubble_column"]);
/** How far along the surface a swim looks for a bank to climb onto. */
const BANK_REACH = 10;

/** A cell a player could stand in: solid and dry underfoot, nothing solid, wet or burning at feet or head. */
export function standable(bot: Bot, cell: Vec3): boolean {
  const below = bot.blockAt(cell.offset(0, -1, 0));
  const open = (c: Vec3) => {
    const block = bot.blockAt(c);
    return !!block && block.boundingBox === "empty" && !WET.has(block.name) && block.name !== "lava";
  };
  return !!below && below.boundingBox === "block" && !WET.has(below.name) && open(cell) && open(cell.offset(0, 1, 0));
}

/** Rock (or anything solid) between the head and the water's surface: swimming straight up won't reach air. */
function roofedOver(bot: Bot): boolean {
  const head = bot.entity.position.offset(0, 1.62, 0).floored();
  for (let dy = 1; dy <= 8; dy++) {
    const block = bot.blockAt(head.offset(0, dy, 0));
    if (!block) return false;
    if (block.boundingBox === "block") return true;
    if (!WET.has(block.name)) return false;
  }
  return false;
}

/** The nearest water with air right above it within 16 blocks: where the head can come out to breathe. */
function nearestAir(bot: Bot): Vec3 | null {
  const water = bot.registry.blocksByName["water"]?.id;
  if (water === undefined) return null;
  const here = bot.entity.position;
  const surface = bot
    .findBlocks({ matching: water, maxDistance: 16, count: 2048 })
    .filter((p) => {
      const above = bot.blockAt(p.offset(0, 1, 0));
      return !!above && above.boundingBox === "empty" && !WET.has(above.name) && above.name !== "lava";
    })
    .sort((a, b) => a.distanceTo(here) - b.distanceTo(here));
  return surface[0] ?? null;
}

/**
 * Under rock in water, swim to the nearest air before anything else: digging up through rock under
 * water is five times slower, and in thaiku2 an agent drowned three times doing it. The pathfinder
 * swims round what's in the way; if it can't, a straight swim toward the air. True once the head is out.
 */
async function swimToAir(bot: Bot, air: Vec3): Promise<boolean> {
  try {
    await withTimeout(bot.pathfinder.goto(new goals.GoalNear(air.x, air.y + 1, air.z, 1)), 12_000, "swimming to air");
  } catch {
    bot.pathfinder.setGoal(null);
  }
  if (!headInWater(bot)) return true;
  bot.setControlState("forward", true);
  bot.setControlState("jump", true);
  try {
    for (let tick = 0; tick < 120 && headInWater(bot); tick++) {
      await bot.lookAt(air.offset(0.5, 1, 0.5), true);
      await bot.waitForTicks(1);
    }
  } finally {
    bot.clearControlStates();
  }
  return !headInWater(bot);
}

/**
 * Out of water the way a player gets out: under rock, swim to the nearest air first; then swim up,
 * digging out any block over the head on the way (a flooded pit has a roof), and climb onto the nearest
 * bank a jump from the water reaches. Walking to dry ground can find no path from water: in thaiku1 hc
 * spent 116 of its 127 decisions by a lake's cliff, told "could not reach dry ground". Returns null
 * once on dry ground, or why it could not.
 */
async function swimOut(bot: Bot): Promise<string | null> {
  bot.pathfinder.setGoal(null);
  try {
    if (headInWater(bot) && roofedOver(bot)) {
      const air = nearestAir(bot);
      if (air) await swimToAir(bot, air);
    }
    bot.setControlState("jump", true);
    let highest = bot.entity.position.y;
    let still = 0;
    for (let tick = 0; tick < 400 && headInWater(bot); tick++) {
      // Not rising any more with the head still under: the water fills the space to its roof. A player
      // would build up against a wall there; this doesn't, so say so at once rather than spin.
      if (bot.entity.position.y > highest + 0.1) {
        highest = bot.entity.position.y;
        still = 0;
      } else if (++still > 60) {
        return "the water fills the space up to its roof, so there is no surface to climb out from";
      }
      const over = bot.blockAt(bot.entity.position.offset(0, 2.1, 0).floored());
      if (over && over.boundingBox === "block") {
        if (over.name === "bedrock" || !bot.canDigBlock(over) || homeBlock(bot, over.position)) return `under water with ${over.name} overhead, which can't be dug`;
        bot.setControlState("jump", false);
        await equipDigger(bot);
        await withTimeout(bot.dig(over), DIG_TIMEOUT_MS, `digging the ${over.name} overhead`);
        bot.setControlState("jump", true);
      }
      await bot.waitForTicks(1);
    }
    if (headInWater(bot)) return "could not swim up to the surface";
    const at = bot.entity.position.floored();
    // The nearest bank within BANK_REACH, swum to along the surface (out from under a roof, the nearest
    // was 5 blocks off in the check that set this).
    const banks: Vec3[] = [];
    for (let dx = -BANK_REACH; dx <= BANK_REACH; dx++)
      for (let dz = -BANK_REACH; dz <= BANK_REACH; dz++)
        for (let dy = 0; dy <= 2; dy++) {
          const cell = at.offset(dx, dy, dz);
          if ((dx || dz) && standable(bot, cell)) banks.push(cell);
        }
    banks.sort((a, b) => Math.hypot(a.x - at.x, a.z - at.z) - Math.hypot(b.x - at.x, b.z - at.z) || a.y - b.y);
    for (const bank of banks.slice(0, 6)) {
      // Swimming at the surface with jump held, forward climbs a ledge up to a block and a half high.
      bot.setControlState("forward", true);
      for (let tick = 0; tick < 160; tick++) {
        if (bot.entity.onGround && !inWater(bot)) return null;
        await bot.lookAt(bank.offset(0.5, 0.5, 0.5), true);
        await bot.waitForTicks(1);
      }
      bot.setControlState("forward", false);
    }
    if (bot.entity.onGround && !inWater(bot)) return null;
    return banks.length ? "swam up, but could not climb onto the bank" : `swam up, but there is no bank within ${BANK_REACH} blocks to climb onto`;
  } catch (error) {
    return plainError((error as Error).message);
  } finally {
    bot.clearControlStates();
  }
}

/**
 * A staircase can't start from water: every first step would dig beside it. So first swim out onto a
 * bank, and failing that walk to the nearest dry place to stand within 8 blocks, highest first, since
 * the way out is up. Returns why it could not, or null when on dry ground (already, or now).
 */
async function outOfWater(bot: Bot): Promise<string | null> {
  if (!inWater(bot)) return null;
  const swam = await swimOut(bot);
  if (!inWater(bot)) return null;
  const ids = Object.values(bot.registry.blocksByName).filter((b) => b.boundingBox === "block").map((b) => b.id);
  const here = bot.entity.position;
  const dry = (cell: Vec3) => {
    const block = bot.blockAt(cell);
    return !!block && block.boundingBox === "empty" && block.name !== "water" && block.name !== "lava";
  };
  const spots = bot
    .findBlocks({ matching: ids, maxDistance: 8, count: 512 })
    .filter((p) => dry(p.offset(0, 1, 0)) && dry(p.offset(0, 2, 0)) && !liquidBeside(bot, p.offset(0, 1, 0)))
    .sort((a, b) => b.y - a.y || a.distanceTo(here) - b.distanceTo(here));
  for (const spot of spots.slice(0, 5)) {
    try {
      await withTimeout(bot.pathfinder.goto(new goals.GoalBlock(spot.x, spot.y + 1, spot.z)), 15_000, "getting out of the water");
      if (!inWater(bot)) return null;
    } catch {
      bot.pathfinder.setGoal(null);
    }
  }
  return `in water (${swam ?? "swimming out didn't leave it on dry ground"}), and could not reach dry ground within 8 blocks to dig from`;
}

/** Exposed ore within 16 blocks, by name: what the model can now go and mine. */
export function oreInSight(bot: Bot, radius = 16): Record<string, number> {
  const ids = Object.values(bot.registry.blocksByName).filter((b) => b.name.endsWith("_ore")).map((b) => b.id);
  const seen: Record<string, number> = {};
  for (const point of bot.findBlocks({ matching: ids, maxDistance: radius, count: 128 })) {
    const block = bot.blockAt(point);
    if (block && isExposed(bot, point)) seen[block.name] = (seen[block.name] ?? 0) + 1;
  }
  return seen;
}

/**
 * Out of a home before digging. descend and tunnel dig from where the agent stands, and a home's floor and
 * walls are never dug, so from inside one they could only refuse: in tluna4 la chose descend 32 times from
 * inside the shared home. The model chose to dig; walking out to do it is the code's job. Walks through the
 * door (or the doorway) to the nearest open ground in front of it. Null when not in a home.
 */
async function leaveHome(ctx: SkillContext): Promise<{ note: string } | { error: string } | null> {
  const bot = ctx.bot;
  const home = (ctx.shelters?.() ?? []).find((spot) => insideSpot(bot, spot));
  if (!home) return null;
  const r = half(home.size ?? 3) + 1;
  const outer = new Vec3(home.x, home.y, home.z + r + 1);
  // Any open ground in front of the door, nearest the doorway first. Only the line straight out from it was looked
  // at, and in tluna13 the agents' own staircases, dug from that line, left nothing standable on it: descend from
  // inside was refused 5 times on day 3 with open ground a step to either side.
  const targets: Vec3[] = [];
  for (let ahead = 2; ahead <= 7; ahead++)
    for (let dx = -3; dx <= 3; dx++)
      for (const dy of [0, -1, 1, -2, 2, -3]) {
        const cell = new Vec3(home.x + dx, home.y + dy, home.z + r + ahead);
        if (standable(bot, cell) && !homeBlock(bot, cell.offset(0, -1, 0))) targets.push(cell);
      }
  targets.sort((a, b) => a.distanceTo(outer) - b.distanceTo(outer));
  if (targets.length === 0) return { error: `you are in the home at ${spotKey(home)} and there is no open ground in front of its door to dig from` };
  let target: Vec3 | null = null;
  let failure = "";
  for (const cell of targets.slice(0, 3)) {
    try {
      await withTimeout(bot.pathfinder.goto(new goals.GoalBlock(cell.x, cell.y, cell.z)), 30_000, "walking out of the home");
      target = cell;
      break;
    } catch (error) {
      bot.pathfinder.setGoal(null);
      failure = plainError((error as Error).message);
    }
  }
  if (!target) return { error: `you are in the home at ${spotKey(home)} and could not walk out of it to dig: ${failure}` };
  if (insideSpot(bot, home)) return { error: `you are in the home at ${spotKey(home)} and could not walk out of it to dig` };
  return { note: `you walked out of the home at ${spotKey(home)} to ${target.x},${target.y},${target.z} to dig from there` };
}

function headingIndex(name: unknown): number | null {
  const index = HEADINGS.findIndex((h) => h.name === String(name ?? "").trim().toLowerCase());
  return index >= 0 ? index : null;
}

export const descend: Skill = {
  name: "descend",
  description:
    "Dig a staircase down until your feet are at height `y` (sea level is 63, diamonds are most common near -58, " +
    `iron around 16; the lowest allowed is ${LOWEST_Y}). Needs any pickaxe. Checks every block before breaking it and ` +
    "turns away from lava and drops into caves; a small pocket of water in the way (in the step, under it, or behind a block) is filled with a block you carry (cobblestone, dirt or stone), but a flooded layer, with a lot of water round the next step, is not: it stops there and says so. Stops if every way down is unsafe. A staircase can be walked " +
    "back up, and is lit as it goes: a torch every 8 steps when you carry torches, coal or charcoal (1 coal and a stick make 4), so no monster spawns on it. Started inside a home, it first walks out through its door and digs from just outside. Pickaxes wear out (stone lasts about 130 blocks, iron 250, and the surface to diamond depth is about 400), " +
    "so it digs with your cheapest pickaxe and will not wear an iron one below 16 uses — carry spare stone pickaxes. " +
    "Returns the height reached and the ore now in sight. Takes a few minutes for a long way down; call it again to continue.",
  args: { y: "number" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const bot = ctx.bot;
    const startY = Math.floor(bot.entity.position.y);
    const target = Math.max(LOWEST_Y, Math.min(startY - 1, Math.floor(asNumber(rawArgs["y"], startY - 16))));
    const tools = countInventory(bot);
    const noDigger = await equipDigger(bot);
    if (noDigger) return { status: "failed", reason: noDigger };
    const grounded = await toGround(bot);
    if (grounded) return { status: "failed", reason: grounded };
    const out = await leaveHome(ctx);
    if (out && "error" in out) return { status: "failed", reason: out.error };
    const walkedOut = out ? `${out.note}. ` : "";

    const trail = torchTrail(ctx);
    const report = (extra: Record<string, unknown> = {}) => ({ y: Math.floor(bot.entity.position.y), oreInSight: oreInSight(bot), ...(trail.placed() ? { torches: trail.placed() } : {}), ...extra });
    const age = () => Number(bot.time.age);
    const floods = (floodedAt.get(bot) ?? []).filter((f) => age() - f.at < FLOOD_MEMORY_TICKS);
    floodedAt.set(bot, floods);
    // Teammates' too: whoever finds the flooded ground, everyone digs clear of it.
    const allFloods = [...floods, ...(ctx.floods?.() ?? [])].filter((f) => age() - f.at < FLOOD_MEMORY_TICKS);
    const here0 = bot.entity.position;
    const known = allFloods.find((f) => Math.hypot(f.x - here0.x, f.z - here0.z) <= FLOOD_NEAR);
    let movedClear = "";
    if (known) {
      let reached: Vec3 | null = null;
      for (const spot of clearOfFloods(bot, allFloods).slice(0, 3)) {
        try {
          await withTimeout(bot.pathfinder.goto(new goals.GoalBlock(spot.x, spot.y, spot.z)), 30_000, "walking clear of the flooded ground");
          reached = spot;
          break;
        } catch {
          bot.pathfinder.setGoal(null);
          if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };
        }
      }
      if (!reached) {
        const mins = Math.max(1, Math.round((age() - known.at) / 1200));
        return { status: "failed", reason: `water drove an agent out digging down within ${Math.round(Math.hypot(known.x - here0.x, known.z - here0.z))} blocks of here ${mins} min ago, and no open ground clear of it could be reached: a flooded layer lies below this spot`, detail: report() };
      }
      movedClear = `you walked ${Math.round(reached.distanceTo(here0))} blocks clear of the flooded ground to ${reached.x},${reached.y},${reached.z} to dig from there. `;
    }
    let wetSteps = 0;
    const start = bot.entity.position.clone();
    // Head under water: plugged at the next step; the second time in one call, the water is coming back (a flooded
    // layer, or a stair flooded since it was dug: going back down one, live, spent 11.5 s under water). Checked after
    // every step tried, not once a round: once a round, a live try spent 58 s under water before it stopped.
    // And by the clock: one step under water can take seconds (digging there is five times slower), so 2 checks alone
    // still left it under water 35 s (health 20 to 18) in a live try.
    let wetMs = 0;
    const wetClock = setInterval(() => { if (headInWater(bot)) wetMs += 250; }, 250);
    const drivenOut = async (): Promise<SkillResult | null> => {
      const wetNow = headInWater(bot);
      if (wetMs < MAX_WET_MS && (!wetNow || ++wetSteps < 2)) return null;
      const at = bot.entity.position;
      clearInterval(wetClock);
      floods.push({ x: at.x, z: at.z, at: age() }, { x: start.x, z: start.z, at: age() });
      await getOutOfWater(bot).catch(() => false);
      lastHeading.set(bot.username, (heading + 1) % 4);
      return {
        status: "failed",
        reason: `stopped at y=${Math.floor(at.y)}: water keeps coming in here (a flooded layer, or a flooded stair) faster than it can be filled.${brokenSince(bot, tools)}`,
        detail: report(),
      };
    };
    const startedAt = Date.now();
    let heading = lastHeading.get(bot.username) ?? Math.floor(Math.random() * 4);
    // A dry way down, planned before digging; walked to if it starts elsewhere. Without one, as before.
    let planned = "";
    let maxTurns = 4;
    let replans = 0;
    // Internal: mine_ore passes where the ore it is digging toward lies (not offered to the model).
    const toward = rawArgs["toward"] as { x: number; z: number } | undefined;
    const plan = planDryDescent(bot, target, toward);
    if (plan) {
      const at = bot.entity.position.floored();
      if (!plan.start.equals(at)) {
        try {
          await withTimeout(bot.pathfinder.goto(new goals.GoalBlock(plan.start.x, plan.start.y, plan.start.z)), 30_000, "walking to a dry way down");
          planned = `you walked ${Math.round(plan.start.distanceTo(at))} blocks to ${plan.start.x},${plan.start.y},${plan.start.z}, where the way down to y=${target} is clear of water, to dig from there. `;
        } catch {
          bot.pathfinder.setGoal(null);
          if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };
        }
      }
      if (bot.entity.position.floored().distanceTo(plan.start) < 1.5) {
        heading = plan.heading;
        // Keep to the planned stair: turning off it is how a dig found water or a cave live.
        maxTurns = 1;
      }
    }
    try {
      while (Math.floor(bot.entity.position.y) > target) {
        if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };
        const danger = threatened(ctx, 8, true);
        if (danger) return { status: "aborted", reason: `stopped digging because ${danger}`, detail: report() };
        if (Date.now() - startedAt > MAX_SKILL_MS) {
          return { status: "failed", reason: `reached y=${Math.floor(bot.entity.position.y)} of ${target} before running out of time — call descend again to continue.${brokenSince(bot, tools)}`, detail: report() };
        }
        const noTool = await equipDigger(bot);
        if (noTool) return { status: "failed", reason: `reached y=${Math.floor(bot.entity.position.y)} of ${target} and ${noTool}.${brokenSince(bot, tools)}`, detail: report() };
        let moved = false;
        const refusals: string[] = [];
        await centre(bot);
        for (let turn = 0; turn < maxTurns && !moved; turn++) {
          if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };
          const index = (heading + turn) % 4;
          const problem = await step(bot, HEADINGS[index]!, -1).catch((error: Error) => plainError(error.message));
          const out = await drivenOut();
          if (out) return out;
          if (problem === null) {
            heading = index;
            moved = true;
            await trail.step(HEADINGS[index]!);
          } else {
            refusals.push(`${HEADINGS[index]!.name}: ${problem}`);
          }
        }
        // Off the planned stair (a block that would not dig, sand that fell): plan again from here, up to 3 times.
        if (!moved && maxTurns === 1 && replans < 3) {
          replans++;
          const again = planDryDescent(bot, target, toward);
          if (again && again.start.equals(bot.entity.position.floored())) {
            heading = again.heading;
            continue;
          }
          if (again) {
            try {
              await withTimeout(bot.pathfinder.goto(new goals.GoalBlock(again.start.x, again.start.y, again.start.z)), 30_000, "walking to a dry way down");
              heading = again.heading;
              continue;
            } catch {
              bot.pathfinder.setGoal(null);
            }
          }
        }
        if (!moved) {
          lastHeading.set(bot.username, (heading + 1) % 4);
          return {
            status: "failed",
            reason: refusals.every((r) => r.includes("part of a home"))
              ? `you are standing in a home: descend digs down from where you stand and won't dig through a home's floor or walls — walk outside first`
              : `stopped at y=${Math.floor(bot.entity.position.y)}: every way down is unsafe (${refusals.join("; ")}) — explore or tunnel somewhere else and try again.${brokenSince(bot, tools)}`,
            detail: report(),
          };
        }
      }
      lastHeading.set(bot.username, heading);
      const broke = brokenSince(bot, tools);
      const said = [walkedOut.trim(), movedClear.trim(), planned.trim(), broke.trim(), trail.note() && `${trail.note()}.`].filter(Boolean).join(" ");
      return { status: "success", ...(said && { reason: said }), detail: report() };
    } finally {
      clearInterval(wetClock);
    }
  },
};

export const tunnel: Skill = {
  name: "tunnel",
  description:
    "Dig a straight tunnel, 2 blocks high, `length` blocks long (up to 32), at your current height: the way to uncover " +
    "ore hidden inside rock, since mine_ore only finds ore you can see. Takes an optional `direction` (north, east, " +
    "south or west); by default it keeps going the way you last dug. Digs with your cheapest pickaxe, sparing an iron one " +
    "as descend does. Stops before lava or a drop; water in the way is filled with a block you carry, as descend does. Lit as it goes, as descend is. Returns how far it got and the ore now in sight, for mine_ore.",
  args: { length: "number", direction: "string?" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const bot = ctx.bot;
    const length = Math.max(1, Math.min(32, Math.floor(asNumber(rawArgs["length"], 16))));
    const tools = countInventory(bot);
    const noDigger = await equipDigger(bot);
    if (noDigger) return { status: "failed", reason: noDigger };
    const grounded = await toGround(bot);
    if (grounded) return { status: "failed", reason: grounded };
    const out = await leaveHome(ctx);
    if (out && "error" in out) return { status: "failed", reason: out.error };
    const walkedOut = out ? `${out.note}. ` : "";
    const index = headingIndex(rawArgs["direction"]) ?? lastHeading.get(bot.username) ?? Math.floor(Math.random() * 4);
    const heading = HEADINGS[index]!;
    lastHeading.set(bot.username, index);

    let dug = 0;
    const trail = torchTrail(ctx);
    const report = () => ({ dug, direction: heading.name, y: Math.floor(bot.entity.position.y), oreInSight: oreInSight(bot), ...(trail.placed() ? { torches: trail.placed() } : {}) });
    for (; dug < length; dug++) {
      if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };
      const danger = threatened(ctx, 8, true);
      if (danger) return { status: "aborted", reason: `stopped digging because ${danger}`, detail: report() };
      const noTool = await equipDigger(bot);
      if (noTool) return { status: dug ? "success" : "failed", reason: `dug ${dug} blocks, then ${noTool}.${brokenSince(bot, tools)}`, detail: report() };
      await centre(bot);
      const problem = await step(bot, heading, 0).catch((error: Error) => plainError(error.message));
      if (problem && ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };
      if (problem) {
        // Next call should try another way rather than hit the same wall.
        lastHeading.set(bot.username, (index + 1) % 4);
        if (dug === 0) return { status: "failed", reason: `cannot tunnel ${heading.name}: ${problem} — try another direction`, detail: report() };
        return { status: "success", reason: `stopped after ${dug} blocks: ${problem} ahead.${brokenSince(bot, tools)}${trail.note() ? ` ${trail.note()}.` : ""}`, detail: report() };
      }
      await trail.step(heading);
    }
    const broke = brokenSince(bot, tools);
    const said = [walkedOut.trim(), broke.trim(), trail.note() && `${trail.note()}.`].filter(Boolean).join(" ");
    return { status: "success", ...(said && { reason: said }), detail: report() };
  },
};

/** Blocks a climb may stand on, in the order it spends them: cheap ones first, logs last (they make tools). */
const PILLAR_BLOCKS = [
  "cobblestone", "dirt", "cobbled_deepslate", "stone", "andesite", "diorite", "granite", "netherrack", "gravel", "sand",
  "oak_planks", "spruce_planks", "birch_planks", "jungle_planks", "acacia_planks", "dark_oak_planks", "mangrove_planks", "cherry_planks",
  "oak_log", "spruce_log", "birch_log", "jungle_log", "acacia_log", "dark_oak_log", "mangrove_log", "cherry_log",
];

/**
 * Up one block where there is nothing to cut a stair into (an open cave): clear the block over the
 * head, then jump and place a block underfoot at the top of the jump, as a player builds a pillar.
 * Returns null on success or why it could not.
 */
async function pillar(bot: Bot): Promise<string | null> {
  await centre(bot);
  const feet = bot.entity.position.floored();
  const problem = unsafe(bot, feet.offset(0, 2, 0));
  if (problem) return `above: ${problem}`;
  const overhead = fallsOnHead(bot, feet);
  if (overhead) return `above: ${overhead}`;
  const floor = bot.blockAt(feet.offset(0, -1, 0));
  if (!floor || floor.boundingBox !== "block") return "not standing on solid ground";
  const held = countInventory(bot);
  const name = PILLAR_BLOCKS.find((block) => (held[block] ?? 0) > 0);
  if (!name) return "nothing to stand on: building up needs a block such as dirt, cobblestone, planks or logs";
  await clear(bot, [feet.offset(0, 2, 0)]);
  bot.pathfinder.setGoal(null);
  // A placement at the top of a jump is sometimes not taken by the server; land and jump again.
  let failure = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    for (let tick = 0; tick < 20 && !bot.entity.onGround; tick++) await bot.waitForTicks(1);
    // Checked again just before placing: anything that moved items in between (in bpoc11 the pillar
    // tried to place the iron pickaxe in hand) would otherwise put the wrong item down.
    if (!(await hold(bot, name))) return `could not hold the ${name} to stand on`;
    await bot.lookAt(feet.offset(0.5, 0, 0.5), true);
    bot.setControlState("jump", true);
    try {
      for (let tick = 0; tick < 20 && bot.entity.position.y < feet.y + 1; tick++) await bot.waitForTicks(1);
      if (bot.entity.position.y < feet.y + 1) {
        failure = "could not jump high enough to build up";
        continue;
      }
      if (bot.heldItem?.name !== name) {
        failure = `something else was in hand (${bot.heldItem?.name ?? "nothing"})`;
        continue;
      }
      await withTimeout(bot.placeBlock(floor, new Vec3(0, 1, 0)), 3000, "placing a block underfoot");
    } catch (error) {
      failure = `could not build up: ${plainError((error as Error).message)}`;
    } finally {
      bot.setControlState("jump", false);
    }
    for (let tick = 0; tick < 20 && !bot.entity.onGround; tick++) await bot.waitForTicks(1);
    if (bot.entity.position.floored().y > feet.y) return null;
    if (bot.blockAt(feet)?.boundingBox === "block") return "the block was placed but you did not land on it";
    failure ||= "the block underfoot did not hold";
  }
  return failure;
}


/**
 * At the bottom of a narrow hole open to the sky: solid on all four sides at the feet and the head. "Under open
 * sky" is true there, so climb_out used to stop at once; in tluna15 an agent sat 67 decisions in a 3-deep hole
 * flee had dug in sand and could not cover. Exported for flee's messages.
 */
export function inPit(bot: Bot): boolean {
  const feet = bot.entity.position.floored();
  const SIDES4 = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
  if (groundAbove(bot) > 0) return false; // covered over, or under rock: a dug-in hole or a tunnel, not a pit
  return [0, 1].every((dy) => SIDES4.every((d) => bot.blockAt(feet.offset(d.x, dy, d.z))?.boundingBox === "block"));
}

/** Out of a pit: walked or dug out to open ground beside it, or failing that built up on any block held. */
async function outOfPit(bot: Bot): Promise<boolean> {
  const feet = bot.entity.position.floored();
  const exits: Vec3[] = [];
  for (let dx = -4; dx <= 4; dx++)
    for (let dz = -4; dz <= 4; dz++)
      for (let dy = 1; dy <= 5; dy++) {
        const cell = feet.offset(dx, dy, dz);
        if ((dx || dz) && standable(bot, cell)) exits.push(cell);
      }
  exits.sort((a, b) => a.distanceTo(feet) - b.distanceTo(feet));
  for (const cell of exits.slice(0, 3)) {
    try {
      await withTimeout(bot.pathfinder.goto(new goals.GoalBlock(cell.x, cell.y, cell.z)), 20_000, "climbing out of the hole");
      if (!inPit(bot)) return true;
    } catch {
      bot.pathfinder.setGoal(null);
    }
  }
  // Built up, a block under the feet at each jump: sand and gravel will do here, each resting on the one below.
  // With none held, the walls give them: a dug wall block drops one, and sand above falls into the gap to dig again.
  const held = () => bot.inventory.items().filter((item) => bot.registry.blocksByName[item.name]?.boundingBox === "block" && !opensOnClick(item.name)).reduce((n, item) => n + item.count, 0);
  const SIDES4 = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
  for (let dug = 0; dug < 12 && held() < 5; dug++) {
    const feet = bot.entity.position.floored();
    const wall = SIDES4.map((d) => bot.blockAt(feet.plus(d))).find((b) => b && b.boundingBox === "block" && bot.canDigBlock(b) && !homeBlock(bot, b.position) && !opensOnClick(b.name) && b.digTime(null, false, false, false, [], bot.entity.effects ?? {}) < 2000);
    if (!wall) break;
    try {
      await withTimeout(bot.dig(wall), 4000, "digging a block out of the wall");
    } catch {
      break;
    }
    await bot.waitForTicks(12);
  }
  for (let step = 0; step < 6 && inPit(bot); step++) {
    const block = bot.inventory.items().find((item) => bot.registry.blocksByName[item.name]?.boundingBox === "block" && !opensOnClick(item.name));
    if (!block) return false;
    const below = bot.blockAt(bot.entity.position.floored().offset(0, -1, 0));
    if (!below || below.boundingBox !== "block") return false;
    const y0 = bot.entity.position.y;
    try {
      await bot.equip(block, "hand");
      await bot.look(bot.entity.yaw, -Math.PI / 2, true);
      bot.setControlState("jump", true);
      for (let t = 0; t < 10 && bot.entity.position.y < y0 + 1; t++) await bot.waitForTicks(1);
      await withTimeout(bot.placeBlock(below, new Vec3(0, 1, 0)), 3000, "building up out of the hole");
    } catch {
      // The block itself says whether it went down.
    } finally {
      bot.setControlState("jump", false);
    }
    await bot.waitForTicks(8);
    if (bot.entity.position.y < y0 + 0.5) return false;
  }
  return !inPit(bot);
}
export const climbOut: Skill = {
  name: "climb_out",
  description:
    "Dig a staircase up until there is open sky above you: the way back to the surface from a cave or a mine. Uses your " +
    "cheapest pickaxe, sparing an iron one as descend does, or your hands when you have none (much slower through stone). " +
    "Checks every block before breaking it and turns away from lava and water, and steps out from under gravel or sand " +
    "that would fall on your head; if you are in water it first swims out (under rock, to the nearest air first), " +
    "digging through anything over your head, and climbs onto the nearest bank, or walks to dry ground nearby. Where there is no rock to cut steps into, as in an open cave, it builds up instead, standing on blocks " +
    "from your inventory (dirt or cobblestone first, logs last). At the bottom of a narrow hole open to the sky it climbs out of it, " +
    "digging blocks from its walls to stand on if you carry none. Stops if every way up is unsafe. Returns the height reached. Takes a few minutes from deep down; call " +
    "it again to continue.",
  args: {},

  async run(ctx: SkillContext): Promise<SkillResult> {
    const bot = ctx.bot;
    const startY = Math.floor(bot.entity.position.y);
    const report = () => ({ y: Math.floor(bot.entity.position.y), climbed: Math.floor(bot.entity.position.y) - startY, groundAbove: groundAbove(bot) });
    // The bottom of a lake is under open sky too, but not out: water first (thaiku1).
    if (!inWater(bot) && inPit(bot)) {
      return (await outOfPit(bot))
        ? { status: "success", reason: "climbed out of the hole you were in, onto open ground", detail: report() }
        : { status: "failed", reason: "you are in a narrow hole and could not climb or dig out of it: carry a block to build up on, or a shovel for sand and dirt", detail: report() };
    }
    if (groundAbove(bot) === 0 && !inWater(bot)) return { status: "success", reason: "already under open sky", detail: report() };
    const tools = countInventory(bot);
    // No pickaxe, or only one being saved for ore: dig by hand. Getting out matters more.
    await equipDigger(bot);
    const wet = await outOfWater(bot);
    if (wet) return { status: "failed", reason: wet, detail: report() };
    if (groundAbove(bot) === 0) return { status: "success", reason: "out of the water, on dry ground under open sky", detail: report() };

    const startedAt = Date.now();
    let heading = lastHeading.get(bot.username) ?? Math.floor(Math.random() * 4);
    let sidesteps = 0;
    while (groundAbove(bot) > 0) {
      if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };
      const danger = threatened(ctx, 8, true);
      if (danger) return { status: "aborted", reason: `stopped climbing because ${danger}`, detail: report() };
      if (Date.now() - startedAt > MAX_SKILL_MS) {
        return { status: "failed", reason: `climbed to y=${Math.floor(bot.entity.position.y)}, still under ${groundAbove(bot)} blocks of ground, before running out of time — call climb_out again to continue.${brokenSince(bot, tools)}`, detail: report() };
      }
      await equipDigger(bot);
      let moved = false;
      const refusals: string[] = [];
      await centre(bot);
      for (let turn = 0; turn < 4 && !moved; turn++) {
        if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };
        const index = (heading + turn) % 4;
        const problem = await step(bot, HEADINGS[index]!, 1).catch((error: Error) => plainError(error.message));
        if (problem === null) {
          heading = index;
          moved = true;
        } else {
          refusals.push(`${HEADINGS[index]!.name}: ${problem}`);
        }
      }
      if (!moved && sidesteps < 4 && refusals.every((r) => r.includes("would fall on your head"))) {
        // Gravel over the head blocks every stair from here; a level step aside gets out from under it,
        // to a spot with none over it if there is one.
        const feet = bot.entity.position.floored();
        const order = [0, 1, 2, 3]
          .map((turn) => (heading + turn) % 4)
          .sort((a, b) => Number(!!fallsOnHead(bot, feet.offset(HEADINGS[a]!.dx, 0, HEADINGS[a]!.dz))) - Number(!!fallsOnHead(bot, feet.offset(HEADINGS[b]!.dx, 0, HEADINGS[b]!.dz))));
        for (const index of order) {
          if (moved) break;
          if ((await step(bot, HEADINGS[index]!, 0).catch((error: Error) => plainError(error.message))) === null) {
            heading = index;
            moved = true;
          }
        }
        if (moved) {
          sidesteps++;
          continue;
        }
      }
      if (moved) sidesteps = 0;
      if (!moved) {
        // No rock to cut a step into: build up instead.
        if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };
        const built = await pillar(bot).catch((error: Error) => plainError(error.message));
        if (built === null) continue;
        if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };
        refusals.push(`straight up: ${built}`);
        lastHeading.set(bot.username, (heading + 1) % 4);
        return {
          status: "failed",
          reason: `stopped at y=${Math.floor(bot.entity.position.y)}, under ${groundAbove(bot)} blocks of ground: every way up is unsafe (${refusals.join("; ")}) — tunnel or walk somewhere else and try again.${brokenSince(bot, tools)}`,
          detail: report(),
        };
      }
    }
    lastHeading.set(bot.username, heading);
    const broke = brokenSince(bot, tools);
    return { status: "success", ...(broke && { reason: broke.trim() }), detail: report() };
  },
};
