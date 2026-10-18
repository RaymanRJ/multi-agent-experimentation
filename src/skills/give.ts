import pathfinderPkg from "mineflayer-pathfinder";
import type { Entity } from "prismarine-entity";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { asNumber, withTimeout } from "./util.js";
import { formatSpeech } from "../comms.js";

const { goals } = pathfinderPkg;

/** Close enough that a toss lands at their feet: thrown items fly a block or two. */
const HAND_OVER = 2;
const LEGS = 3;
const LEG_TIMEOUT_MS = 20_000;
/** Tossed items can't be picked up for 2 s; then the receiver has to be standing on them. */
const PICKUP_WAIT_MS = 8_000;

function findAgent(ctx: SkillContext, name: string): Entity | undefined {
  const wanted = name.toLowerCase();
  return Object.values(ctx.bot.entities).find(
    (e) => e && e !== ctx.bot.entity && e.type === "player" && e.username?.toLowerCase() === wanted,
  );
}

export const give: Skill = {
  name: "give",
  description:
    "Walk to another agent and hand them items from your inventory: you toss the items at their feet and they " +
    "pick them up by standing there. Args: `to` (the agent's name, as in otherAgents), `item` (e.g. cobblestone, " +
    "stick, stone_pickaxe), `count` (default: all you have). Fails if that agent is not in sight, if you hold none " +
    "of the item, or if they don't pick it up within a few seconds (the items are then left on the ground, where " +
    "they can pick_up them). It tells them in chat that it is coming, which pauses what they are doing.",
  args: { to: "string", item: "string", count: "number" },

  async run(ctx: SkillContext, args: Record<string, unknown>): Promise<SkillResult> {
    const bot = ctx.bot;
    const to = String(args["to"] ?? "").trim();
    const item = String(args["item"] ?? "").trim().toLowerCase();
    if (!to) return { status: "failed", reason: "say who to give to: `to` is an agent's name" };
    if (to.toLowerCase() === bot.username.toLowerCase()) return { status: "failed", reason: "you can't give items to yourself" };
    if (!item) return { status: "failed", reason: "say what to give: `item` is an item name, e.g. cobblestone" };
    const def = bot.registry.itemsByName[item];
    if (!def) return { status: "failed", reason: `there is no item called ${item}` };
    const held = bot.inventory.count(def.id, null);
    if (held === 0) return { status: "failed", reason: `you have no ${item} to give` };
    const count = Math.min(held, Math.max(1, Math.floor(asNumber(args["count"], held))));
    const seen = findAgent(ctx, to);
    if (!seen) return { status: "failed", reason: `${to} is not in sight; ask where they are, or go to them first` };
    // Addressed by name, so it pauses their current skill: they stop walking off, and their model hears why.
    bot.chat(formatSpeech(seen.username ?? to, `bringing you ${count} ${item}, stay where you are`));

    for (let leg = 0; ; leg++) {
      if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending" };
      const target = findAgent(ctx, to);
      if (!target) return { status: "failed", reason: `${to} is not in sight; ask where they are, or go to them first` };
      const distance = target.position.distanceTo(bot.entity.position);
      if (distance <= HAND_OVER + 0.5) break;
      if (leg === LEGS) return { status: "failed", reason: `could not catch up with ${to}: still ${Math.round(distance)} blocks away; ask them to wait` };
      try {
        const { x, y, z } = target.position;
        await withTimeout(bot.pathfinder.goto(new goals.GoalNear(x, y, z, HAND_OVER)), LEG_TIMEOUT_MS, `walking to ${to}`);
      } catch (error) {
        bot.pathfinder.setGoal(null);
        // They may have moved on: try again from where they are now.
        if (leg === LEGS - 1) return { status: "failed", reason: `could not reach ${to}: ${(error as Error).message}` };
      }
    }

    const target = findAgent(ctx, to)!;
    const collected = new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => done(false), PICKUP_WAIT_MS);
      const onCollect = (collector: Entity) => {
        if (collector.username?.toLowerCase() === to.toLowerCase()) done(true);
      };
      const done = (picked: boolean) => {
        clearTimeout(timer);
        bot.removeListener("playerCollect", onCollect);
        resolve(picked);
      };
      bot.on("playerCollect", onCollect);
    });
    try {
      // Aim at their feet, and let the server see the new heading: a toss flies the way it thinks you face.
      await bot.lookAt(target.position, true);
      await bot.waitForTicks(2);
      await bot.toss(def.id, null, count);
    } catch (error) {
      return { status: "failed", reason: `could not toss the ${item}: ${(error as Error).message}` };
    }
    ctx.log(`tossed ${count} ${item} to ${to}`);
    if (!(await collected)) {
      const p = bot.entity.position.floored();
      return {
        status: "failed",
        reason: `tossed ${count} ${item} at ${to}'s feet, but they had not picked it up after ${PICKUP_WAIT_MS / 1000} s; it is on the ground near ${p.x}, ${p.y}, ${p.z}`,
        detail: { tossed: count, item, to },
      };
    }
    // Standing close, the giver can sweep part of its own toss back up once the pickup delay ends.
    await bot.waitForTicks(20);
    const gave = held - bot.inventory.count(def.id, null);
    if (gave <= 0) return { status: "failed", reason: `you tossed the ${item} but picked it all back up yourself; step back and try again` };
    if (gave < count) return { status: "success", reason: `${to} got ${gave} of the ${count} ${item}; the rest came back to you`, detail: { gave, item, to } };
    return { status: "success", detail: { gave, item, to } };
  },
};
