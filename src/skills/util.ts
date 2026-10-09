import type { SkillContext } from "../types.js";

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
