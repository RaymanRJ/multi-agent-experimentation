import type { Bot } from "mineflayer";
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
  return movements;
}

const AIR = new Set(["air", "cave_air"]);

/** True when the bot's head is in water, so it is losing air. */
export function headInWater(bot: Bot): boolean {
  return bot.blockAt(bot.entity.position.offset(0, 1.62, 0))?.name === "water";
}

/**
 * Walks or swims to the nearest dry spot to stand within 16 blocks. A reflex, not a decision:
 * an agent that fell into a flooded cave otherwise re-chose its skill, was stopped at once by
 * drowning damage, and repeated that until it died (seen in batch b6). Returns whether it got out.
 */
export async function getOutOfWater(bot: Bot): Promise<boolean> {
  const airIds = [...AIR].map((name) => bot.registry.blocksByName[name]?.id).filter((id): id is number => id !== undefined);
  const here = bot.entity.position;
  const spots = bot
    .findBlocks({ matching: airIds, maxDistance: 16, count: 1024 })
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
