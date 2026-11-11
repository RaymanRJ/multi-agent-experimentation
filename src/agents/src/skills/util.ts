import type { Bot } from "mineflayer";
import type { Block } from "prismarine-block";
import type { Entity } from "prismarine-entity";
import type { Vec3 } from "vec3";
import pathfinderPkg from "mineflayer-pathfinder";
import type { Skill, SkillContext, SkillResult } from "../types.js";

const { Movements } = pathfinderPkg;

export class SkillTimeout extends Error {}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new SkillTimeout(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Another agent this close to a target is working the same spot. */
export const CROWD_RADIUS = 4;

/** Another player within CROWD_RADIUS of the point: two agents digging one pit get in each other's way. */
export function crowded(bot: Bot, point: { distanceTo(other: any): number }): boolean {
  return Object.values(bot.entities).some(
    (e) => e && e !== bot.entity && e.type === "player" && point.distanceTo(e.position) <= CROWD_RADIUS,
  );
}

/**
 * Targets nearest first, except that ones beside another agent go last. They stay in the list, so
 * an agent with nothing else in reach still works beside its teammate rather than giving up.
 */
export function nearestUncrowded<T extends { distanceTo(other: any): number }>(bot: Bot, points: T[]): T[] {
  const here = bot.entity.position;
  return points
    .map((point) => ({ point, crowded: crowded(bot, point), distance: point.distanceTo(here) }))
    .sort((a, b) => Number(a.crowded) - Number(b.crowded) || a.distance - b.distance)
    .map(({ point }) => point);
}

/** No solid block on the straight line between two points: what a mob needs to see, shoot or reach the agent directly. */
export function inSight(bot: Bot, from: Vec3, to: Vec3): boolean {
  const steps = Math.ceil(from.distanceTo(to) / 0.25);
  for (let i = 1; i < steps; i++) {
    const block = bot.blockAt(from.plus(to.minus(from).scaled(i / steps)));
    if (block?.boundingBox === "block") return false;
  }
  return true;
}

export const eyeOf = (mob: Entity) => mob.position.offset(0, (mob.height || 1.99) * 0.88, 0);

/** Within this, a mob is a danger whatever stands between: it may be about to come round the corner. */
const BESIDE = 2;

/**
 * A hostile mob can get at the agent: right beside it, or with a clear line from its eyes to the agent's.
 * Underground, a creeper in the next cave over is behind solid rock.
 */
export function canReach(bot: Bot, mob: Entity): boolean {
  if (mob.position.distanceTo(bot.entity.position) <= BESIDE) return true;
  return inSight(bot, eyeOf(mob), bot.entity.position.offset(0, 1.62, 0));
}

/**
 * A hostile close enough that continuing is a bad idea. `reachable`: only one that can get at the agent
 * counts (canReach). For digging, where the agent is in its own shaft or tunnel: in tbase5, `descend` was
 * stopped at least 15 times by creepers, skeletons and endermen in caves beside the shaft, and the team
 * never got down to the iron rep 1 had mined 42 blocks below its home.
 */
/**
 * Mobs that attack only when provoked (an enderman looked in the eye, or hit): nearby, they are no reason to stop. A hit
 * still stops a skill as damage. In tluna26b an enderman 6 blocks off stopped or cut short la's mining 5 times in a row.
 */
export const NEUTRAL_UNTIL_PROVOKED = new Set(["enderman"]);

export function threatened(ctx: SkillContext, within = 8, reachable = false): string | null {
  for (const entity of Object.values(ctx.bot.entities)) {
    if (!entity || entity.type !== "hostile" || NEUTRAL_UNTIL_PROVOKED.has(entity.name ?? "")) continue;
    const distance = entity.position.distanceTo(ctx.bot.entity.position);
    if (distance > within || (reachable && !canReach(ctx.bot, entity))) continue;
    return `${entity.name ?? "a hostile mob"} is ${Math.round(distance)} blocks away`;
  }
  return null;
}

export function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

/**
 * Pathfinder movements for every bot. By default the pathfinder pillars up with dirt *and*
 * cobblestone, so walking out of a mine_stone hole quietly spent the cobblestone a stone_pickaxe
 * needed (seen in a batch: mine 3, walk to place a table, craft fails "need 2 more cobblestone",
 * repeat). Dirt is never an ingredient we plan around; cobblestone always is.
 */
/** Tools worth sparing: iron and better. */
export const PRECIOUS_TOOL = /^(iron|diamond|netherite)_(pickaxe|axe|shovel|hoe|sword)$/;
/** A cheaper tool, or a bare hand, this quick on a block does the job; an iron one isn't worn for it. */
const CHEAP_ENOUGH_MS = 2000;
const spared = new WeakSet<Bot>();

/**
 * The pathfinder digs its way with the fastest tool held, so walking wore down iron pickaxes on dirt
 * and stone (bpoc7: an agent's last iron pickaxe broke on the way home). Every dig, the pathfinder's and
 * the skills', now takes the fastest of the cheaper tools or a bare hand when that is quick enough,
 * and an iron (or better) tool only when nothing cheaper is: "the cheapest tool that does the job",
 * whatever the goal. Wraps the bot's bestHarvestTool once.
 */
export function spareGoodTools(bot: Bot): void {
  if (spared.has(bot) || !bot.pathfinder?.bestHarvestTool) return;
  spared.add(bot);
  const fastest = bot.pathfinder.bestHarvestTool;
  bot.pathfinder.bestHarvestTool = (block) => {
    const effects = bot.entity.effects ?? {};
    const time = (item: { type: number } | null) => block.digTime(item ? item.type : null, false, false, false, [], effects);
    const items = bot.inventory.items();
    let best: ReturnType<typeof fastest> = null;
    let bestTime = time(null);
    for (const item of items) {
      if (PRECIOUS_TOOL.test(item.name)) continue;
      const t = time(item);
      if (t < bestTime) {
        best = item;
        bestTime = t;
      }
    }
    if (bestTime > CHEAP_ENOUGH_MS) return fastest(block);
    if (best) return best;
    // A bare hand is quickest. The pathfinder digs with whatever is in hand when given nothing, which
    // was often the iron pickaxe, so hold something that isn't a tool (it digs as a hand does), or
    // else the cheapest tool.
    return items.find((item) => !item.maxDurability) ?? items.find((item) => item.maxDurability && !PRECIOUS_TOOL.test(item.name)) ?? null;
  };
}

export function movementsFor(bot: Bot): InstanceType<typeof Movements> {
  spareGoodTools(bot);
  const movements = new Movements(bot);
  const dirt = bot.registry.itemsByName["dirt"]?.id;
  movements.scafoldingBlocks = dirt === undefined ? [] : [dirt];
  // Swimming is allowed but dear: a route through water was how agents ended up mining under it.
  // Set in the library's code (movements.js) but missing from its type definitions.
  (movements as unknown as { liquidCost: number }).liquidCost = LIQUID_COST;
  // Never dig through someone's furniture to get past it (chests are kept by the library already). In
  // tbase1 half of the shared base's bed went missing, cause unknown; the pathfinder is one way it could.
  for (const block of bot.registry.blocksArray) {
    if (FURNITURE.test(block.name)) movements.blocksCantBreak.add(block.id);
  }
  // Doors are never dug and never opened by the library (its door handling stood the bot still in an open
  // doorway, checked live): buildShelter's walkThroughDoors takes the agent through the door instead.
  // A block in a chunk not loaded reaches these with no position (the library's stand-in): no cost, not a crash
  // (tluna12a: an agent's process died on one, 74 blocks from home).
  movements.exclusionAreasBreak.push((block) => (block.position && protectedCells.get(bot)?.().has(`${block.position.x},${block.position.y},${block.position.z}`) ? 1000 : 0));
  // Steer round anywhere the bot has got stuck this run (gotoWatched records them).
  movements.exclusionAreasStep.push((block) => (block.position && stuckSpots.get(bot)?.has(`${block.position.x},${block.position.y},${block.position.z}`) ? STUCK_SPOT_COST : 0));
  noCornerCutting(movements);
  return movements;
}

type Node = { x: number; y: number; z: number };
type DiagonalMovements = {
  getMoveDiagonal(node: Node, dir: { x: number; z: number }, neighbors: unknown[]): void;
  getBlock(node: Node, dx: number, dy: number, dz: number): { physical: boolean };
};

/**
 * No diagonal step past anything solid beside it. The library allows a diagonal step when either side is
 * clear, but the body catches on the other side's corner, as a player's would: in tluna6c la stood still
 * through a night 4 blocks from a free bed, the path's first step cutting past a bed's corner under a
 * second floor (checked live in a copy of the room: never moved; with this, at the bed in under a second).
 */
function noCornerCutting(movements: InstanceType<typeof Movements>): void {
  const m = movements as unknown as DiagonalMovements;
  const diagonal = m.getMoveDiagonal.bind(m);
  m.getMoveDiagonal = (node, dir, neighbors) => {
    for (const dy of [0, 1]) {
      if (m.getBlock(node, dir.x, dy, 0).physical || m.getBlock(node, 0, dy, dir.z).physical) return;
    }
    diagonal(node, dir, neighbors);
  };
}

/**
 * Where a bot got stuck, by "x,y,z", kept for the rest of its run. The pathfinder can freeze mid-jump at
 * an ordinary step for no reason found (at 2,74,34 on this seed, on a team's way home: one agent was
 * stuck there three times in bpoc5), so a spot that stuck it once is one to walk round.
 */
const stuckSpots = new WeakMap<Bot, Set<string>>();
/** What stepping into a stuck spot costs the pathfinder, against 1 for a block of walking: a detour that long is worth it. */
const STUCK_SPOT_COST = 40;

/** Marks the bot's spot, and the cells round it, at feet and head height, as ones to walk round. */
export function avoidSpot(bot: Bot): void {
  const at = bot.entity.position.floored();
  const spots = stuckSpots.get(bot) ?? new Set<string>();
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let dy = 0; dy <= 1; dy++) spots.add(`${at.x + dx},${at.y + dy},${at.z + dz}`);
  stuckSpots.set(bot, spots);
}

const FURNITURE = /_bed$|^(trapped_)?chest$|^furnace$|^crafting_table$|_door$/;

/**
 * Cells the pathfinder must not dig, by bot: the floors, walls and roofs of the homes it knows (agent.ts keeps
 * the set). Walking out used to dig through the doorway, or any wall, and leave the home open behind it; with
 * a door in it the door is the way out, opened and shut, and the walls stay whole.
 */
const protectedCells = new WeakMap<Bot, () => Set<string>>();
export function protectCells(bot: Bot, cells: () => Set<string>): void {
  protectedCells.set(bot, cells);
}

/**
 * Part of a home, never to be dug by a skill either: a known home's floor, wall or roof cell, or any door.
 * The pathfinder was kept off them, but skills that dig for themselves were not: in bpoc13 a descend started
 * inside the home dug a staircase down through its floor and doorway and carried the door away.
 */
export function homeBlock(bot: Bot, at: { x: number; y: number; z: number }): boolean {
  if (protectedCells.get(bot)?.().has(`${at.x},${at.y},${at.z}`)) return true;
  const name = bot.blockAt(at as never)?.name ?? "";
  return name.endsWith("_door");
}

/**
 * Each home's way in and out, as "x,y,z": the cell inside its doorway, the doorway and the cell outside,
 * at feet and head height. In tluna5g two agents could not walk out of their home for the last third of
 * the run; a crafting table on the cell inside the doorway shuts an agent in just so (reproduced live).
 */
export function doorwayLanes(homes: ReadonlyArray<{ x: number; y: number; z: number; size?: number }>): Set<string> {
  const lane = new Set<string>();
  for (const home of homes) {
    const r = (home.size === 5 ? 2 : 1) + 1;
    for (const dz of [r - 1, r, r + 1]) for (const dy of [0, 1]) lane.add(`${home.x},${home.y + dy},${home.z + dz}`);
  }
  return lane;
}

/**
 * True if, with something solid on `taken`'s cells (a bed, a workbench), every open cell of the room can still be walked to from `entry`,
 * the cell inside the doorway, stepping square by square. A bed can't be stood on under a second storey
 * (two blocks of headroom), so it is a wall: in tluna5h three beds laid out from the centre cut off the
 * room's back corners, and an agent who slept there was shut in for the rest of the run. Pure, for testing.
 */
export function roomStaysOpen(room: Vec3[], open: (cell: Vec3) => boolean, entry: Vec3, put: Vec3[]): boolean {
  const key = (cell: Vec3) => `${cell.x},${cell.z}`;
  const taken = new Set(put.map(key));
  const walkable = new Set(room.filter((cell) => open(cell) && !taken.has(key(cell))).map(key));
  if (taken.has(key(entry))) return false;
  // A block already on the cell inside the doorway is stepped over, as a player does: the walk starts from the open
  // cells beside it. Requiring it open refused every bed in tluna28b's home ("no room left for a bed", 50 times) while
  // the agents walked in and out over the crafting table on it.
  const sides = [[1, 0], [-1, 0], [0, -1]].map(([dx, dz]) => entry.offset(dx!, 0, dz!));
  const queue = walkable.has(key(entry)) ? [entry] : sides.filter((cell) => walkable.has(key(cell)));
  if (queue.length === 0) return false;
  const reached = new Set(queue.map(key));
  while (queue.length > 0) {
    const cell = queue.shift()!;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const next = cell.offset(dx, 0, dz);
      if (walkable.has(key(next)) && !reached.has(key(next))) {
        reached.add(key(next));
        queue.push(next);
      }
    }
  }
  return reached.size === walkable.size;
}

/**
 * True if a block put at `cell` would leave part of a known home's room unreachable from its doorway: a
 * cell of the room's floor, or above it at head height, where a block stands in the way just the same.
 * In tluna6 rep 1 a furnace put down in the one gap the beds had left shut two agents in for most of the
 * run. Beds were already checked (sleep.ts); this is the same check for anything else put down.
 */
export function cutsOffRoom(homes: ReadonlyArray<{ x: number; y: number; z: number; size?: number }>, cell: Vec3, open: (cell: Vec3) => boolean): boolean {
  for (const home of homes) {
    const h = home.size === 5 ? 2 : 1;
    const dx = cell.x - home.x, dz = cell.z - home.z, dy = cell.y - home.y;
    if (Math.abs(dx) > h || Math.abs(dz) > h || dy < 0 || dy > 1) continue;
    const floor = cell.offset(0, -dy, 0);
    const room: Vec3[] = [];
    for (let x = -h; x <= h; x++) for (let z = -h; z <= h; z++) room.push(floor.offset(x - dx, 0, z - dz));
    const entry = floor.offset(-dx, 0, h - dz);
    // A floor cell is open only if both it and the cell over it are clear: a head-height block blocks it too.
    const walkable = (c: Vec3) => open(c) && open(c.offset(0, 1, 0));
    if (!roomStaysOpen(room, walkable, entry, [floor])) return true;
  }
  return false;
}

/** Extra path cost per block of water, against 1 for a block of walking. */
export const LIQUID_COST = 8;

const AIR = new Set(["air", "cave_air"]);

/** True when the bot's head is in water, so it is losing air. */
export function headInWater(bot: Bot): boolean {
  return bot.blockAt(bot.entity.position.offset(0, 1.62, 0))?.name === "water";
}

/** Nothing solid between the bot's head and open air within `height` blocks: swimming up gets it out. */
function openWaterAbove(bot: Bot, height = 8): boolean {
  for (let dy = 2; dy <= height; dy++) {
    const block = bot.blockAt(bot.entity.position.offset(0, 1.62 + dy - 1, 0));
    if (!block) return false;
    if (AIR.has(block.name)) return true;
    if (block.name !== "water") return false;
  }
  return false;
}

/**
 * Swims straight up when the surface is open above, else walks or swims to the nearest dry spot to
 * stand within 24 blocks. A reflex, not a decision:
 * an agent that fell into a flooded cave otherwise re-chose its skill, was stopped at once by
 * drowning damage, and repeated that until it died (seen in batch b6). Returns whether it got out.
 */
export async function getOutOfWater(bot: Bot): Promise<boolean> {
  if (openWaterAbove(bot)) {
    bot.setControlState("jump", true);
    for (let tick = 0; tick < 80 && headInWater(bot); tick += 5) await bot.waitForTicks(5);
    bot.setControlState("jump", false);
    if (!headInWater(bot)) return true;
  }
  const airIds = [...AIR].map((name) => bot.registry.blocksByName[name]?.id).filter((id): id is number => id !== undefined);
  const here = bot.entity.position;
  const spots = bot
    .findBlocks({ matching: airIds, maxDistance: 24, count: 2048 })
    .filter((point) => {
      const below = bot.blockAt(point.offset(0, -1, 0));
      const head = bot.blockAt(point.offset(0, 1, 0));
      return below?.boundingBox === "block" && below.name !== "water" && head !== null && AIR.has(head.name);
    })
    .sort((a, b) => a.distanceTo(here) - b.distanceTo(here));
  for (const spot of spots.slice(0, 4)) {
    try {
      await withTimeout(bot.pathfinder.goto(new pathfinderPkg.goals.GoalBlock(spot.x, spot.y, spot.z)), 15_000, "getting out of the water");
    } catch {
      bot.pathfinder.setGoal(null);
    }
    if (!headInWater(bot)) return true;
  }
  return !headInWater(bot);
}

const FACES: Array<[number, number, number]> = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

/**
 * True when at least one side of the block touches air or liquid, so a player could see it.
 * The bot knows every loaded block, including ore sealed inside rock; counting only exposed
 * ore keeps it from seeing through walls ("x-ray"), so finding diamonds takes real searching.
 */
export function isExposed(bot: Bot, point: { offset(dx: number, dy: number, dz: number): any }): boolean {
  return FACES.some(([dx, dy, dz]) => bot.blockAt(point.offset(dx, dy, dz))?.boundingBox === "empty");
}

/** Fewer solid blocks overhead than this is a roof (a shelter's is one layer, two storeys two), not ground. */
export const UNDERGROUND_MIN = 3;
/** The overworld's build limit (1.21). */
const WORLD_TOP = 320;

/**
 * Solid blocks between the bot's head and the top of the world, leaves not counted: 0 under open
 * sky or a tree. A count of UNDERGROUND_MIN or more means the bot is under the ground.
 */
export function groundAbove(bot: Bot): number {
  const head = bot.entity.position.floored().offset(0, 2, 0);
  let solid = 0;
  for (let y = head.y; y < WORLD_TOP; y++) {
    const block = bot.blockAt(head.offset(0, y - head.y, 0));
    if (!block) break;
    if (block.boundingBox === "block" && !block.name.endsWith("_leaves")) solid++;
  }
  return solid;
}

/** Lava or water touching this block, if any: breaking it could flood or burn the bot. */
/**
 * Why ore at `point` is not safe to mine, or null if it is. Lava beside it, water right above it (which
 * pours into the gap), or water all round with no face open to air (the agent would mine under water,
 * as agents once drowned doing). Water only beside or below is fine: it flows into the gap, as a player
 * sees all the time. Ore with any liquid beside it was refused until 28 October, which turned away 82 of
 * 181 tries for iron in the team runs (45%).
 */
export function oreHazard(bot: Bot, point: { offset(dx: number, dy: number, dz: number): any }): "lava beside it" | "water above it" | "under water" | null {
  let open = false;
  for (const [dx, dy, dz] of FACES) {
    const block = bot.blockAt(point.offset(dx, dy, dz));
    if (block?.name === "lava") return "lava beside it";
    if (dy === 1 && block?.name === "water") return "water above it";
    if (block && block.boundingBox === "empty" && block.name !== "water") open = true;
  }
  return open ? null : "under water";
}

export function liquidBeside(bot: Bot, point: { offset(dx: number, dy: number, dz: number): any }): string | null {
  for (const [dx, dy, dz] of FACES) {
    const name = bot.blockAt(point.offset(dx, dy, dz))?.name;
    if (name === "lava" || name === "water") return name;
  }
  return null;
}

/**
 * Blocks that do something when clicked. Placing a block "against" one clicks it instead: a
 * crafting table opens, the block is never placed, and the server then ignores crafts in the
 * inventory grid until that window is closed. Never place against these.
 */
const CLICKABLE = new Set([
  "crafting_table", "furnace", "blast_furnace", "smoker", "chest", "trapped_chest", "barrel", "anvil",
  "chipped_anvil", "damaged_anvil", "enchanting_table", "smithing_table", "loom", "cartography_table",
  "grindstone", "stonecutter", "brewing_stand", "hopper", "dispenser", "dropper", "crafter",
  "note_block", "bell", "lever", "beacon", "lectern", "respawn_anchor", "jukebox",
]);
const CLICKABLE_SUFFIXES = ["_bed", "_door", "_trapdoor", "_fence_gate", "_button", "shulker_box"];

export function opensOnClick(name: string): boolean {
  return CLICKABLE.has(name) || CLICKABLE_SUFFIXES.some((suffix) => name.endsWith(suffix));
}

type Window = NonNullable<Bot["currentWindow"]>;

/**
 * Opens a block's window (a crafting table, a chest), or returns null if the server never opens it.
 * bot.openBlock waits for the window with no limit, and a timeout around it left that wait running:
 * when a later craft opened the table, the stale one woke too and closed the window under it, so one
 * lost click became a run of "timed out" crafts (Haiku in p5: stone_pickaxe 8 times at one table).
 */
async function openBounded(bot: Bot, block: Block, ms: number): Promise<Window | null> {
  let onOpen: ((window: Window) => void) | undefined;
  const opened = new Promise<Window>((resolve) => {
    onOpen = resolve;
    bot.once("windowOpen", onOpen as never);
  });
  let timer: NodeJS.Timeout | undefined;
  const timedOut = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ms); });
  try {
    await bot.activateBlock(block);
    return await Promise.race([opened, timedOut]);
  } finally {
    clearTimeout(timer);
    bot.removeListener("windowOpen", onOpen as never);
  }
}

const OPEN_TIMEOUT_MS = 4000;
const OPEN_WALK_TIMEOUT_MS = 30_000;

/** The block's window: opened where the bot stands, or after stepping right up to it. `what` names it in errors. */
export async function openOrWalk(bot: Bot, block: Block, what: string): Promise<Window> {
  const first = await openBounded(bot, block, OPEN_TIMEOUT_MS);
  if (first) return first;
  const { x, y, z } = block.position;
  await withTimeout(bot.pathfinder.goto(new pathfinderPkg.goals.GoalNear(x, y, z, 1)), OPEN_WALK_TIMEOUT_MS, `walking to the ${what}`).catch(() => undefined);
  await closeStrayWindow(bot);
  const second = await openBounded(bot, block, OPEN_TIMEOUT_MS);
  if (second) return second;
  const away = bot.entity.position.offset(0, bot.entity.height, 0).distanceTo(block.position.offset(0.5, 0.5, 0.5));
  throw new Error(`the ${what} at ${x},${y},${z} did not open (twice; it is ${away.toFixed(1)} blocks from your eyes)`);
}

/** Closes a window the bot has open, such as a table opened by a stray click, so the server's view matches. */
export async function closeStrayWindow(bot: Bot): Promise<void> {
  if (!bot.currentWindow) return;
  bot.closeWindow(bot.currentWindow);
  await bot.waitForTicks(2);
}

/** What can be smelted into what: product -> raw item. */
export const SMELTS: Record<string, string> = {
  iron_ingot: "raw_iron",
  gold_ingot: "raw_gold",
  copper_ingot: "raw_copper",
  stone: "cobblestone",
  glass: "sand",
  cooked_beef: "beef",
  cooked_porkchop: "porkchop",
  cooked_chicken: "chicken",
  cooked_mutton: "mutton",
};

/** The smelted product for a name that is either the product or its raw item; null if neither. */
export function smeltProduct(name: string): string | null {
  const n = name.trim().toLowerCase();
  if (SMELTS[n]) return n;
  return Object.keys(SMELTS).find((product) => SMELTS[product] === n) ?? null;
}

/**
 * Runs a skill so that an error it did not catch becomes a failed result the model can replan
 * against, instead of ending the run. Any goal the skill left on the pathfinder is cleared.
 */
export async function runSkill(skill: Skill, ctx: SkillContext, args: Record<string, unknown>): Promise<SkillResult> {
  try {
    return await skill.run(ctx, args);
  } catch (error) {
    ctx.bot.pathfinder?.setGoal(null);
    return { status: "failed", reason: `${skill.name} hit an unexpected error: ${(error as Error).message}` };
  }
}

/**
 * pathfinder.goto, watched: the pathfinder can stand still against a one-block step and keep "walking"
 * until the timeout (bpoc: 75 s on open grass beside a large shelter). When the bot has not moved for
 * STUCK_MS it jumps forward and the goal is set again, up to MAX_NUDGES times, then it gives up saying
 * where it is.
 */
const STUCK_MS = 4000;
const MAX_NUDGES = 3;
/** Standing on leaves with open air somewhere beneath them, before the ground. */
export function onTreetops(bot: Bot): boolean {
  const feet = bot.entity.position.floored();
  if (!bot.blockAt(feet.offset(0, -1, 0))?.name.endsWith("_leaves")) return false;
  for (let dy = 2; dy <= 12; dy++) {
    const block = bot.blockAt(feet.offset(0, -dy, 0));
    if (!block) return false;
    if (block.boundingBox === "empty") return true;
    if (!block.name.endsWith("_leaves")) return false;
  }
  return false;
}

/** Fall damage is a point per block past 3; keep this much health after it. */
const SPARE_HEALTH_AFTER_DROP = 4;

/** Dig the leaves under the bot so it drops to the ground. False if the fall would cost too much health. */
async function dropThroughLeaves(bot: Bot): Promise<boolean> {
  const feet = bot.entity.position.floored();
  let ground = 0;
  for (let dy = 1; dy <= 24; dy++) {
    const block = bot.blockAt(feet.offset(0, -dy, 0));
    if (!block) return false;
    if (block.boundingBox === "block" && !block.name.endsWith("_leaves")) { ground = dy - 1; break; }
  }
  if (ground === 0 || bot.health - Math.max(0, ground - 3) < SPARE_HEALTH_AFTER_DROP) return false;
  for (let dy = 1; dy <= ground; dy++) {
    const block = bot.blockAt(feet.offset(0, -dy, 0));
    if (!block?.name.endsWith("_leaves")) break;
    try {
      await withTimeout(bot.dig(block), 5000, "digging through leaves");
    } catch {
      return false;
    }
  }
  // Wait for the fall to end.
  for (let tick = 0; tick < 40 && !bot.entity.onGround; tick += 2) await bot.waitForTicks(2);
  await bot.waitForTicks(4);
  return true;
}

const quick = new WeakSet<Bot>();

/**
 * Digs as a player does: facing the block at once, and with both feet down. The library turns the head
 * smoothly unless told otherwise (0.3-0.5 s a block in mine_stone, measured live), and fixes a dig's
 * time when it starts, five times longer in the air: descend began every third dig before landing from
 * the step down, 2.9 s instead of 0.6 s. Wraps bot.dig once, for every skill and the pathfinder.
 */
export function quickDigs(bot: Bot): void {
  if (quick.has(bot)) return;
  quick.add(bot);
  const inner = bot.dig.bind(bot);
  bot.dig = (async (block: Parameters<typeof inner>[0], forceLook?: boolean | "ignore", digFace?: unknown) => {
    // In water or on a ladder the bot never lands; there the wait would only add to the slower dig.
    const climbing = /ladder|vine|scaffolding/.test(bot.blockAt(bot.entity.position.floored())?.name ?? "");
    for (let tick = 0; tick < 10 && !bot.entity.onGround && !(bot.entity as { isInWater?: boolean }).isInWater && !climbing; tick++) await bot.waitForTicks(1);
    return (inner as (...args: unknown[]) => Promise<void>)(block, forceLook ?? true, digFace);
  }) as typeof inner;
}

const honest = new WeakSet<Bot>();

/**
 * Makes a walk that stopped short fail, saying how far short. The pathfinder's walk resolves as if it had
 * arrived whenever its best path is empty, which is also what it does when the goal can't be reached and the
 * bot already stands at the nearest point (seen live: a walk into a sealed box "arrived" 2 blocks short), so
 * skills went on as if they were there. Wraps bot.pathfinder.goto once; goals that follow something moving
 * are left as they are.
 */
export function honestWalks(bot: Bot): void {
  if (honest.has(bot)) return;
  honest.add(bot);
  const inner = bot.pathfinder.goto.bind(bot.pathfinder);
  bot.pathfinder.goto = (async (goal: Parameters<typeof inner>[0]) => {
    await inner(goal);
    const at = bot.entity.position.floored();
    if (goal.constructor.name === "GoalFollow" || goal.isEnd(at as never)) return;
    const g = goal as unknown as { x?: number; y?: number; z?: number };
    const short = typeof g.x === "number" && typeof g.z === "number" ? Math.round(Math.hypot(g.x - at.x, (g.y ?? at.y) - at.y, g.z - at.z)) : null;
    // A block off is within reach of whatever comes next, and callers built on it: only a real shortfall fails.
    if (short !== null && short <= 1) return;
    const error = new Error(`no way all the way there was found: stopped ${short === null ? "short" : `${short} blocks short`}`);
    error.name = "NoPath";
    throw error;
  }) as typeof inner;
}

export async function gotoWatched(bot: Bot, goal: Parameters<Bot["pathfinder"]["goto"]>[0], timeoutMs: number, label: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (let nudge = 0; ; nudge++) {
    let last = bot.entity.position.clone(), lastMoved = Date.now(), stuck = false;
    const watch = setInterval(() => {
      // Digging or pillaring through the way is progress, though the bot stands still for it.
      const working = bot.pathfinder.isMining() || bot.pathfinder.isBuilding();
      if (working || bot.entity.position.distanceTo(last) > 0.3) { last = bot.entity.position.clone(); lastMoved = Date.now(); }
      else if (Date.now() - lastMoved > STUCK_MS) { stuck = true; bot.pathfinder.setGoal(null); }
    }, 500);
    try {
      await withTimeout(bot.pathfinder.goto(goal), Math.max(1000, deadline - Date.now()), label);
      return;
    } catch (error) {
      // Wherever it froze, the next path (this call's retry, or any later skill's) goes round.
      if (stuck) avoidSpot(bot);
      if (!stuck || nudge >= MAX_NUDGES || Date.now() >= deadline) {
        const at = bot.entity.position.floored();
        const where = onTreetops(bot) ? " on top of tree leaves, too high to drop down safely" : "";
        throw stuck ? new Error(`${label}: stuck at ${at.x},${at.y},${at.z}${where}`) : error;
      }
    } finally {
      clearInterval(watch);
    }
    // Up in a tree's canopy the pathfinder finds no way down (it drops at most 4 blocks; in tbase2 three
    // agents were stuck on dark oak leaves 8 blocks up, one of them killed after). Do what a player does:
    // dig through the leaves underfoot and drop, if the fall won't take most of the bot's health.
    if (onTreetops(bot) && (await dropThroughLeaves(bot))) continue;
    // Hop forward, then try again from wherever that lands.
    bot.setControlState("jump", true);
    bot.setControlState("forward", true);
    await bot.waitForTicks(8);
    bot.setControlState("jump", false);
    bot.setControlState("forward", false);
  }
}

/** A library error in words the agent can act on; anything else unchanged. */
export function plainError(message: string): string {
  if (message === "invalid operation") return "the inventory was busy moving an item";
  if (/goal was changed/i.test(message)) return "interrupted before getting there";
  // The pathfinder searched its 5 s and found no way: walled off, or round something it may not dig.
  if (/took to long to decide path/i.test(message)) return "no way there was found (walled off, or a long way round)";
  return message;
}
