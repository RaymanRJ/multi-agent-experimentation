import pathfinderPkg from "mineflayer-pathfinder";
import type { Block } from "prismarine-block";
import type { Vec3 } from "vec3";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { countInventory } from "../observe.js";
import { asNumber, threatened, withTimeout } from "./util.js";

const { goals } = pathfinderPkg;

const SEARCH_RADII = [32, 64, 128];
const TRAVEL_TIMEOUT_MS = 30_000;
const DIG_TIMEOUT_MS = 20_000;
const MAX_TRUNK_HEIGHT = 12;
const MAX_FAILED_TREES = 5;

function logsHeld(ctx: SkillContext): number {
  const inventory = countInventory(ctx.bot);
  return Object.entries(inventory)
    .filter(([name]) => name.endsWith("_log"))
    .reduce((total, [, count]) => total + count, 0);
}

/**
 * Walks down from any log to the bottom of its trunk, and returns that base only
 * if it stands on solid ground. Logs left floating by an earlier felling are out
 * of reach and would otherwise be picked over and over.
 */
function groundedTrunkBase(ctx: SkillContext, point: Vec3): Block | null {
  let base = ctx.bot.blockAt(point);
  while (base) {
    const below = ctx.bot.blockAt(base.position.offset(0, -1, 0));
    if (!below) return null;
    if (below.name.endsWith("_log")) {
      base = below;
      continue;
    }
    return below.boundingBox === "block" && !below.name.endsWith("_leaves") ? base : null;
  }
  return null;
}

/**
 * True when solid terrain sits above the trunk — a log underground or under an
 * overhang. Nearest-first search otherwise picks buried logs deep below the
 * surface, which the pathfinder can never reach.
 */
function underCover(ctx: SkillContext, base: Block): boolean {
  for (let height = 1; height <= 24; height++) {
    const block = ctx.bot.blockAt(base.position.offset(0, height, 0));
    if (!block) return false;
    if (block.name.endsWith("_log") || block.name.endsWith("_leaves") || block.boundingBox === "empty") continue;
    return true;
  }
  return false;
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
    "Collect logs from nearby trees. Takes `count` — the total number of logs you want in your inventory. " +
    "If you already have that many, it returns at once without gathering. " +
    "Fails if there are no reachable trees nearby or a hostile interrupts.",
  args: { count: "number" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const target = Math.max(1, Math.min(64, asNumber(rawArgs["count"], 10)));
    const startedWith = logsHeld(ctx);
    // `count` is a total, as the description tells the model. Treating it as
    // "this many more" let a model that already had plenty loop forever.
    const wanted = target;
    if (startedWith >= wanted) {
      return {
        status: "success",
        reason: `you already have ${startedWith} logs, at least the ${wanted} asked for — no need to gather more`,
        detail: { gathered: 0, totalLogs: startedWith },
      };
    }

    const logIds = Object.values(ctx.bot.registry.blocksByName)
      .filter((block) => block.name.endsWith("_log"))
      .map((block) => block.id);

    let treesFelled = 0;
    // Without this, findBlock keeps returning the same nearest unbreakable log forever.
    const skipped = new Set<string>();
    const key = (position: Vec3) => `${position.x},${position.y},${position.z}`;

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

      if (skipped.size >= MAX_FAILED_TREES) {
        return {
          status: "failed",
          reason: `gave up after ${skipped.size} trees here could not be reached or broken — explore to find trees somewhere else`,
          detail: { gathered: logsHeld(ctx) - startedWith, treesFelled },
        };
      }

      // Widen the search rather than giving up at the first empty radius.
      let trunkBase: Block | null = null;
      for (const radius of SEARCH_RADII) {
        for (const point of ctx.bot.findBlocks({ matching: logIds, maxDistance: radius, count: 64 })) {
          const base = groundedTrunkBase(ctx, point);
          if (base && !skipped.has(key(base.position)) && !underCover(ctx, base)) {
            trunkBase = base;
            break;
          }
        }
        if (trunkBase) break;
      }
      if (!trunkBase) {
        return {
          status: "failed",
          reason: `no reachable trees within ${SEARCH_RADII[SEARCH_RADII.length - 1]} blocks — explore to find some`,
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
        skipped.add(key(trunkBase.position));
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
        ctx.log(`reached a tree at ${x},${y},${z} but could not break any of it`);
        skipped.add(key(trunkBase.position));
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
