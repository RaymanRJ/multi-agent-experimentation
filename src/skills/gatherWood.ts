import pathfinderPkg from "mineflayer-pathfinder";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { countInventory } from "../observe.js";
import { asNumber, threatened, withTimeout } from "./util.js";

const { goals } = pathfinderPkg;

const SEARCH_RADII = [32, 64, 128];
const TRAVEL_TIMEOUT_MS = 30_000;
const DIG_TIMEOUT_MS = 20_000;
const MAX_TRUNK_HEIGHT = 12;

function logsHeld(ctx: SkillContext): number {
  const inventory = countInventory(ctx.bot);
  return Object.entries(inventory)
    .filter(([name]) => name.endsWith("_log"))
    .reduce((total, [, count]) => total + count, 0);
}

/**
 * Illustrates what a skill is, as distinct from a mineflayer primitive.
 *
 * mineflayer gives you bot.dig(block) — break one block. Getting ten logs means
 * finding a reachable tree, felling the whole trunk (break the bottom and the
 * rest float), collecting the drops, widening the search when the area is bare,
 * abandoning the attempt if something is hunting you, and reporting back in a
 * form the model can replan against.
 */
export const gatherWood: Skill = {
  name: "gather_wood",
  description:
    "Collect logs from nearby trees. Takes `count` — how many logs you want in total. " +
    "Fails if there are no trees within range or a hostile interrupts.",
  args: { count: "number" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const target = Math.max(1, Math.min(64, asNumber(rawArgs["count"], 10)));
    const startedWith = logsHeld(ctx);
    const wanted = startedWith + target;

    const logIds = Object.values(ctx.bot.registry.blocksByName)
      .filter((block) => block.name.endsWith("_log"))
      .map((block) => block.id);

    let treesFelled = 0;

    while (logsHeld(ctx) < wanted) {
      if (ctx.shouldStop()) {
        return { status: "aborted", reason: "the run is ending", detail: { gathered: logsHeld(ctx) - startedWith } };
      }

      const danger = threatened(ctx);
      if (danger) {
        return {
          status: "aborted",
          reason: `stopped gathering because ${danger}`,
          detail: { gathered: logsHeld(ctx) - startedWith },
        };
      }

      // Widen the search rather than giving up at the first empty radius.
      let trunkBase = null;
      for (const radius of SEARCH_RADII) {
        trunkBase = ctx.bot.findBlock({ matching: logIds, maxDistance: radius });
        if (trunkBase) break;
      }
      if (!trunkBase) {
        return {
          status: "failed",
          reason: `no trees within ${SEARCH_RADII[SEARCH_RADII.length - 1]} blocks`,
          detail: { gathered: logsHeld(ctx) - startedWith },
        };
      }

      const { x, y, z } = trunkBase.position;
      try {
        await withTimeout(
          ctx.bot.pathfinder.goto(new goals.GoalNear(x, y, z, 2)),
          TRAVEL_TIMEOUT_MS,
          "walking to tree",
        );
      } catch (error) {
        ctx.log(`could not reach tree at ${x},${y},${z}: ${(error as Error).message}`);
        // The tree is unreachable; blacklisting is overkill, another loop picks a different one.
        continue;
      }

      // Fell the trunk bottom-up. Breaking only the base leaves the rest floating.
      let felled = 0;
      for (let height = 0; height < MAX_TRUNK_HEIGHT; height++) {
        const block = ctx.bot.blockAt(trunkBase.position.offset(0, height, 0));
        if (!block || !block.name.endsWith("_log")) break;
        if (!ctx.bot.canDigBlock(block)) break;
        try {
          await withTimeout(ctx.bot.dig(block), DIG_TIMEOUT_MS, "digging log");
          felled++;
        } catch (error) {
          ctx.log(`dig failed: ${(error as Error).message}`);
          break;
        }
      }

      if (felled === 0) {
        ctx.log("reached a tree but could not break any of it");
        continue;
      }
      treesFelled++;

      // Drops do not teleport into the inventory; walk over them.
      try {
        await withTimeout(
          ctx.bot.pathfinder.goto(new goals.GoalNear(x, y, z, 1)),
          TRAVEL_TIMEOUT_MS,
          "collecting drops",
        );
      } catch {
        // Collection is best-effort; the loop re-checks the real inventory count.
      }
      await ctx.bot.waitForTicks(20);
    }

    const gathered = logsHeld(ctx) - startedWith;
    return {
      status: "success",
      detail: { gathered, treesFelled, totalLogs: logsHeld(ctx) },
    };
  },
};
