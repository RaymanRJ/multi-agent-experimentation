import pathfinderPkg from "mineflayer-pathfinder";
import type { Bot } from "mineflayer";
import type { Entity } from "prismarine-entity";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { countInventory } from "../observe.js";
import { withTimeout } from "./util.js";

const { goals } = pathfinderPkg;

/** As far as observe() reports items on the ground, so anything listed there can be collected. */
export const PICKUP_RADIUS = 8;
const MAX_ITEMS = 10;
const LEG_TIMEOUT_MS = 10_000;

/** Dropped items within reach, nearest first, with what each one is. */
export function droppedNearby(bot: Bot, radius = PICKUP_RADIUS): Array<{ entity: Entity; name: string; count: number }> {
  const here = bot.entity.position;
  const found: Array<{ entity: Entity; name: string; count: number; distance: number }> = [];
  for (const entity of Object.values(bot.entities)) {
    if (!entity || entity.name !== "item") continue;
    const distance = entity.position.distanceTo(here);
    const item = entity.getDroppedItem?.();
    if (distance > radius || !item) continue;
    found.push({ entity, name: item.name, count: item.count, distance });
  }
  return found.sort((a, b) => a.distance - b.distance);
}

export const pickUp: Skill = {
  name: "pick_up",
  description:
    `Collect items lying on the ground within ${PICKUP_RADIUS} blocks (listed in itemsOnGround), such as ones another ` +
    "agent tossed to you or that fell out of reach. Args: `item` (optional: collect only this item; default everything). " +
    "Walks over each one. Fails if there is nothing there to collect, or none of it could be reached.",
  args: { item: "string" },

  async run(ctx: SkillContext, args: Record<string, unknown>): Promise<SkillResult> {
    const bot = ctx.bot;
    const only = String(args["item"] ?? "").trim().toLowerCase();
    const targets = droppedNearby(bot).filter((d) => !only || d.name === only).slice(0, MAX_ITEMS);
    if (targets.length === 0) {
      return { status: "failed", reason: `there is no dropped ${only || "item"} within ${PICKUP_RADIUS} blocks` };
    }
    const before = countInventory(bot);
    for (const target of targets) {
      if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending" };
      if (!bot.entities[target.entity.id]) continue; // already picked up, by us on the way or by someone else
      try {
        const { x, y, z } = target.entity.position;
        await withTimeout(bot.pathfinder.goto(new goals.GoalNear(x, y, z, 1)), LEG_TIMEOUT_MS, "walking to the item");
        await bot.waitForTicks(10);
      } catch {
        bot.pathfinder.setGoal(null);
      }
    }
    const after = countInventory(bot);
    const gained: Record<string, number> = {};
    for (const [name, n] of Object.entries(after)) if (n > (before[name] ?? 0)) gained[name] = n - (before[name] ?? 0);
    if (Object.keys(gained).length === 0) {
      return { status: "failed", reason: `could not reach the dropped ${only || "items"}; they may be up or down a drop` };
    }
    return { status: "success", detail: { picked: gained } };
  },
};
