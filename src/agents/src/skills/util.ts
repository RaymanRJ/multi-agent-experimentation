import type { Bot } from "mineflayer";
import type { Block } from "prismarine-block";
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

/** A hostile close enough that continuing is a bad idea. */
export function threatened(ctx: SkillContext, within = 8): string | null {
  for (const entity of Object.values(ctx.bot.entities)) {
    if (!entity || entity.type !== "hostile") continue;
    const distance = entity.position.distanceTo(ctx.bot.entity.position);
    if (distance <= within) return `${entity.name ?? "a hostile mob"} is ${Math.round(distance)} blocks away`;
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
export function movementsFor(bot: Bot): InstanceType<typeof Movements> {
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
  return movements;
}

const FURNITURE = /_bed$|^(trapped_)?chest$|^furnace$|^crafting_table$/;

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

