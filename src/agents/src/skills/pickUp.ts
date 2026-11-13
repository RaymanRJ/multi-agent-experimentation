import pathfinderPkg from "mineflayer-pathfinder";
import type { Bot } from "mineflayer";
import type { Entity } from "prismarine-entity";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { countInventory } from "../observe.js";
import { asNumber, withTimeout } from "./util.js";
import { goTo } from "./goTo.js";

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

/**
 * The pathfinder stops in the block next to an item, which can leave one lying in the far corner of its block just out
 * of a player's reach: in tluna33a an iron pickaxe on open grass 2 blocks off was "could not reach" five times running
 * until it vanished. Walk straight at it for a second, as a player would.
 */
async function stepOnto(bot: Bot, item: Entity): Promise<void> {
  try {
    for (let tick = 0; tick < 20 && bot.entities[item.id]; tick++) {
      const at = item.position;
      if (Math.hypot(at.x - bot.entity.position.x, at.z - bot.entity.position.z) < 0.3 || Math.abs(at.y - bot.entity.position.y) > 1.5) break;
      await bot.lookAt(at.offset(0, 0.2, 0), true);
      bot.setControlState("forward", true);
      await bot.waitForTicks(1);
    }
  } finally {
    bot.setControlState("forward", false);
  }
}

export const pickUp: Skill = {
  name: "pick_up",
  description:
    `Collect items lying on the ground within ${PICKUP_RADIUS} blocks (listed in itemsOnGround), such as ones another ` +
    "agent tossed to you or that fell out of reach. Args: `item` (optional: collect only this item; default everything); " +
    "`x`, `y` and `z` (optional: a spot further off, such as one in dropsSeen; it walks there first, as go_to does, then " +
    `collects within ${PICKUP_RADIUS} blocks of it). ` +
    "Walks over each one. Fails if there is nothing there to collect, or none of it could be reached.",
  args: { item: "string?", x: "number?", y: "number?", z: "number?" },

  async run(ctx: SkillContext, args: Record<string, unknown>): Promise<SkillResult> {
    const bot = ctx.bot;
    const only = String(args["item"] ?? "").trim().toLowerCase();
    const x = asNumber(args["x"], NaN), y = asNumber(args["y"], NaN), z = asNumber(args["z"], NaN);
    const spot = Number.isFinite(x) && Number.isFinite(z) ? { x, z, ...(Number.isFinite(y) ? { y } : {}) } : undefined;
    // A spot out of reach: walk there first, the way go_to does, and say how far it got if it fell short.
    if (spot && Math.hypot(spot.x - bot.entity.position.x, spot.z - bot.entity.position.z) > PICKUP_RADIUS - 2) {
      const walked = await goTo.run(ctx, spot);
      if (walked.status !== "success") {
        return { ...walked, reason: `did not reach ${Math.round(x)},${Number.isFinite(y) ? `${Math.round(y)},` : ""}${Math.round(z)}: ${walked.reason ?? walked.status}` };
      }
    }
    const targets = droppedNearby(bot).filter((d) => !only || d.name === only).slice(0, MAX_ITEMS);
    if (targets.length === 0) {
      return { status: "failed", reason: `there is no dropped ${only || "item"} within ${PICKUP_RADIUS} blocks${spot ? " of there" : ""}` };
    }
    const before = countInventory(bot);
    for (const target of targets) {
      if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending" };
      if (!bot.entities[target.entity.id]) continue; // already picked up, by us on the way or by someone else
      try {
        const { x, y, z } = target.entity.position;
        await withTimeout(bot.pathfinder.goto(new goals.GoalNear(x, y, z, 1)), LEG_TIMEOUT_MS, "walking to the item");
        await bot.waitForTicks(10);
        if (bot.entities[target.entity.id]) await stepOnto(bot, target.entity);
      } catch {
        bot.pathfinder.setGoal(null);
      }
    }
    const after = countInventory(bot);
    const gained: Record<string, number> = {};
    for (const [name, n] of Object.entries(after)) if (n > (before[name] ?? 0)) gained[name] = n - (before[name] ?? 0);
    if (only && !gained[only]) {
      const got = Object.entries(gained).map(([name, n]) => `${n} ${name}`).join(", ");
      return { status: "failed", reason: `could not reach the dropped ${only}${got ? `; picked up ${got} on the way` : ""}; it may be up or down a drop`, ...(got ? { detail: { picked: gained } } : {}) };
    }
    if (Object.keys(gained).length === 0) {
      return { status: "failed", reason: `could not reach the dropped ${only || "items"}; they may be up or down a drop` };
    }
    return { status: "success", detail: { picked: gained } };
  },
};
