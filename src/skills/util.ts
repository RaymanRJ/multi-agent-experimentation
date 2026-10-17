import type { Bot } from "mineflayer";
import pathfinderPkg from "mineflayer-pathfinder";
import type { SkillContext } from "../types.js";

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
