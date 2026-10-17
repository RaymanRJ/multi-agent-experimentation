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
