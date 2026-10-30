import pathfinderPkg from "mineflayer-pathfinder";
import type { Entity } from "prismarine-entity";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { asNumber, withTimeout } from "./util.js";
import { autoText, formatSpeech } from "../comms.js";

const { goals } = pathfinderPkg;

/**
 * Right beside them. A toss flies two or three blocks, past someone that close, so the items are
 * dropped straight down instead: at the giver's feet, which is within the receiver's pickup reach.
 */
const HAND_OVER = 1;
/**
 * Close but not reachable (furniture between them, a teammate on the far side of a bed): thrown across
 * instead. In tluna5c la tried 62 times to hand lb one wool from 2 blocks away, told it "could not catch up".
 */
const THROW_RANGE = 3.5;
const LEGS = 3;
const LEG_TIMEOUT_MS = 20_000;
/** Tossed items can't be picked up for 2 s; then the receiver has to be standing on them. */
const PICKUP_WAIT_MS = 8_000;
/** About two blocks of walking backwards: out of reach of the toss, still in sight. */
const STEP_BACK_TICKS = 12;
/** Out of a player's 1-block pickup reach of the drop, with a margin. */
const STEP_AWAY = 2.5;

function findAgent(ctx: SkillContext, name: string): Entity | undefined {
  const wanted = name.toLowerCase();
  return Object.values(ctx.bot.entities).find(
    (e) => e && e !== ctx.bot.entity && e.type === "player" && e.username?.toLowerCase() === wanted,
  );
}

export const give: Skill = {
  name: "give",
  description:
    "Walk to another agent and hand them items from your inventory: you drop the items beside them and they " +
    "pick them up by standing there. Args: `to` (the agent's name, as in otherAgents), `item` (e.g. cobblestone, " +
    "stick, stone_pickaxe), `count` (default: all you have). Fails if that agent is not in sight, if you hold none " +
    "of the item, or if they don't pick it up within a few seconds (the items are then left on the ground, where " +
    "they can pick_up them). It tells them in chat that it is coming, which pauses what they are doing.",
  args: { to: "string", item: "string", count: "number?" },

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
    bot.chat(formatSpeech(seen.username ?? to, autoText(`bringing you ${count} ${item}, stay where you are`)));

    let throwAcross = false;
    for (let leg = 0; ; leg++) {
      if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending" };
      const target = findAgent(ctx, to);
      if (!target) return { status: "failed", reason: `${to} is not in sight; ask where they are, or go to them first` };
      const distance = target.position.distanceTo(bot.entity.position);
      if (distance <= HAND_OVER + 0.6) break;
      // Tried to get beside them and couldn't: close enough to throw.
      if (leg > 0 && distance <= THROW_RANGE) {
        throwAcross = true;
        break;
      }
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
    const receiverHead = bot.blockAt(target.position.offset(0, 1.62, 0));
    if (receiverHead?.name === "water") {
      return { status: "failed", reason: `${to} is under water, where dropped items float away; wait until they are out` };
    }
    // Dropped at the giver's feet, or thrown across if it couldn't get beside them; aimed at the receiver's
    // own feet if the giver swept its toss back up, so it lands out of the giver's reach: in tluna5e la,
    // inside the home 1-1.5 blocks from lc, picked its own stone pickaxe back up 16 times.
    let aim: "down" | "across" | "feet" = throwAcross ? "across" : "down";
    let picked = false;
    let gave = 0;
    let dropped = bot.entity.position.clone();
    for (;;) {
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
      const receiver = findAgent(ctx, to) ?? target;
      try {
        // Face them (so stepping back moves away from them), look straight down, and let the server
        // see the new heading before dropping: the drop goes the way it thinks you face.
        if (aim === "across") {
          // At their chest height: a toss flies two or three blocks, over a bed or a chest between them.
          await bot.lookAt(receiver.position.offset(0, 1.2, 0), true);
        } else if (aim === "feet") {
          // A block past their feet: aimed at their feet it still landed in the giver's reach (4 of 5 live).
          const away = receiver.position.minus(bot.entity.position);
          away.y = 0;
          await bot.lookAt(receiver.position.plus(away.normalize()), true);
        } else {
          await bot.lookAt(receiver.position, true);
          await bot.look(bot.entity.yaw, -Math.PI / 2, true);
        }
        await bot.waitForTicks(2);
        await bot.toss(def.id, null, count);
      } catch (error) {
        return { status: "failed", reason: `could not toss the ${item}: ${(error as Error).message}` };
      }
      ctx.log(`${aim === "down" ? "tossed" : "threw"} ${count} ${item} to ${to} from ${receiver.position.distanceTo(bot.entity.position).toFixed(1)} blocks`);
      // Back off before the 2 s pickup delay ends, or the giver sweeps its own toss back up. Walking
      // backwards blind failed against a wall (trio2: inside a shelter), so path away from the drop instead.
      dropped = aim === "down" ? bot.entity.position.clone() : receiver.position.clone();
      bot.setControlState("back", true);
      await bot.waitForTicks(STEP_BACK_TICKS);
      bot.setControlState("back", false);
      if (bot.entity.position.distanceTo(dropped) < STEP_AWAY) {
        try {
          await withTimeout(bot.pathfinder.goto(new goals.GoalInvert(new goals.GoalNear(dropped.x, dropped.y, dropped.z, STEP_AWAY))), 1500, "stepping away");
        } catch {
          bot.pathfinder.setGoal(null);
        }
      }

      picked = await collected;
      await bot.waitForTicks(10);
      gave = held - bot.inventory.count(def.id, null);
      const still = findAgent(ctx, to);
      if (gave > 0 || aim === "feet" || ctx.shouldStop() || !still || still.position.distanceTo(bot.entity.position) > THROW_RANGE) break;
      ctx.log(`picked the ${item} back up; throwing it at ${to}'s feet instead`);
      aim = "feet";
    }
    if (gave <= 0) {
      return { status: "failed", reason: `you tossed the ${item} but picked it all back up yourself; try again from a step further away` };
    }
    if (!picked) {
      // Say where it lies and how far that is from them now: a receiver that walked off isn't "beside" it
      // (tbase-luna1: two iron pickaxes "beside" lc lay 29 blocks from it, and a third agent walked over them).
      const at = dropped.floored();
      const where = `${at.x},${at.y},${at.z}`;
      const now = seen.isValid ? Math.round(seen.position.distanceTo(dropped)) : null;
      const near = now !== null && now <= 4;
      bot.chat(formatSpeech(seen.username ?? to, autoText(near ? `the ${item} is on the ground beside you, use pick_up to take it` : `the ${item} is on the ground near ${where}, go there and pick_up to take it`)));
      return {
        status: "failed",
        reason: `tossed ${gave} ${item} to ${to}, but they had not picked it up after ${PICKUP_WAIT_MS / 1000} s; it is on the ground near ${where}` +
          `${near ? ", beside them" : now !== null ? `, ${now} blocks from them now` : ", and they are out of sight"}, and they have been told`,
        detail: { tossed: gave, item, to, at: where },
      };
    }
    if (gave < count) return { status: "success", reason: `${to} got ${gave} of the ${count} ${item}; the rest came back to you`, detail: { gave, item, to } };
    return { status: "success", detail: { gave, item, to } };
  },
};
