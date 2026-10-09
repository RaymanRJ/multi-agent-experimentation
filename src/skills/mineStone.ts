import pathfinderPkg from "mineflayer-pathfinder";
import type { Block } from "prismarine-block";
import type { Vec3 } from "vec3";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { countInventory } from "../observe.js";
import { asNumber, threatened, withTimeout } from "./util.js";

const { goals } = pathfinderPkg;

const SEARCH_RADII = [16, 32, 64];
const TRAVEL_TIMEOUT_MS = 30_000;
const DIG_TIMEOUT_MS = 20_000;
const MAX_FAILED_BLOCKS = 6;
const MAX_TOTAL_MS = 4 * 60_000;
/** Best first. */
const PICKAXES = ["netherite_pickaxe", "diamond_pickaxe", "iron_pickaxe", "stone_pickaxe", "golden_pickaxe", "wooden_pickaxe"];
const STONE_BLOCKS = ["stone", "cobblestone"];

function cobbleHeld(ctx: SkillContext): number {
  return countInventory(ctx.bot)["cobblestone"] ?? 0;
}

const NEIGHBOURS: Array<[number, number, number]> = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

/** Stone with at least one open side can be reached without tunnelling, and has no lava behind it. */
function exposure(ctx: SkillContext, point: Vec3): "open" | "buried" | "hazard" {
  let open = false;
  for (const [dx, dy, dz] of NEIGHBOURS) {
    const neighbour = ctx.bot.blockAt(point.offset(dx, dy, dz));
    if (!neighbour) continue;
    if (neighbour.name === "lava") return "hazard";
    if (neighbour.boundingBox === "empty") open = true;
  }
  return open ? "open" : "buried";
}

export const mineStone: Skill = {
  name: "mine_stone",
  description:
    "Mine exposed stone and collect cobblestone. Takes `count` — how many cobblestone you want to gain. " +
    "Requires a pickaxe in inventory (at least a wooden_pickaxe; the best one is equipped automatically) — " +
    "it does not craft one, so use craft first. Fails if no pickaxe, no stone is visible within range, " +
    "or blocks cannot be reached. Returns how many cobblestone were gained and the new total.",
  args: { count: "number" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const bot = ctx.bot;
    const target = Math.max(1, Math.min(64, asNumber(rawArgs["count"], 8)));

    const inventory = countInventory(ctx.bot);
    const pickaxe = PICKAXES.find((name) => (inventory[name] ?? 0) > 0);
    if (!pickaxe) {
      return { status: "failed", reason: "need a wooden_pickaxe — craft one first" };
    }
    const held = bot.inventory.items().find((item) => item.name === pickaxe);
    if (held) {
      try {
        await bot.equip(held, "hand");
      } catch (error) {
        return { status: "failed", reason: `could not equip ${pickaxe}: ${(error as Error).message}` };
      }
    }

    const startedWith = cobbleHeld(ctx);
    const wanted = startedWith + target;
    const startedAt = Date.now();
    const gained = () => cobbleHeld(ctx) - startedWith;

    const stoneIds = STONE_BLOCKS.map((name) => bot.registry.blocksByName[name]?.id).filter(
      (id): id is number => id !== undefined,
    );
    const skipped = new Set<string>();
    const key = (position: Vec3) => `${position.x},${position.y},${position.z}`;
    let mined = 0;

    while (cobbleHeld(ctx) < wanted) {
      if (ctx.shouldStop()) {
        return { status: "aborted", reason: "the run is ending", detail: { gained: gained() } };
      }
      const danger = threatened(ctx);
      if (danger) {
        return { status: "aborted", reason: `stopped mining because ${danger}`, detail: { gained: gained() } };
      }
      if (Date.now() - startedAt > MAX_TOTAL_MS) {
        return {
          status: "failed",
          reason: `ran out of time after gaining ${gained()} of ${target} cobblestone`,
          detail: { gained: gained() },
        };
      }
      if (skipped.size >= MAX_FAILED_BLOCKS) {
        return {
          status: "failed",
          reason: `gave up after ${skipped.size} stone blocks could not be reached or broken`,
          detail: { gained: gained(), mined },
        };
      }

      let block: Block | null = null;
      for (const radius of SEARCH_RADII) {
        const points = bot.findBlocks({ matching: stoneIds, maxDistance: radius, count: 128 });
        // findBlocks is not distance-sorted for every case; nearest first keeps travel short.
        points.sort((a, b) => a.distanceTo(bot.entity.position) - b.distanceTo(bot.entity.position));
        for (const point of points) {
          if (skipped.has(key(point))) continue;
          const kind = exposure(ctx, point);
          if (kind === "hazard") {
            skipped.add(key(point));
            continue;
          }
          if (kind === "open") {
            block = bot.blockAt(point);
            break;
          }
        }
        if (block) break;
      }
      if (!block) {
        return {
          status: "failed",
          reason: `no exposed stone within ${SEARCH_RADII[SEARCH_RADII.length - 1]} blocks — look for a hillside or cave, or move to a rocky area`,
          detail: { gained: gained() },
        };
      }

      const { x, y, z } = block.position;
      try {
        await withTimeout(
          bot.pathfinder.goto(new goals.GoalNear(x, y, z, 3)),
          TRAVEL_TIMEOUT_MS,
          "walking to stone",
        );
      } catch (error) {
        ctx.log(`could not reach stone at ${x},${y},${z}: ${(error as Error).message}`);
        skipped.add(key(block.position));
        continue;
      }

      const fresh = bot.blockAt(block.position);
      if (!fresh || !STONE_BLOCKS.includes(fresh.name) || !bot.canDigBlock(fresh)) {
        skipped.add(key(block.position));
        continue;
      }
      try {
        await withTimeout(bot.dig(fresh), DIG_TIMEOUT_MS, "digging stone");
        mined++;
      } catch (error) {
        ctx.log(`dig failed at ${x},${y},${z}: ${(error as Error).message}`);
        skipped.add(key(block.position));
        continue;
      }

      // The drop lands where the block was; walk onto it to pick it up.
      try {
        await withTimeout(
          bot.pathfinder.goto(new goals.GoalNear(x, y, z, 1)),
          TRAVEL_TIMEOUT_MS,
          "collecting drops",
        );
      } catch {
        // Best-effort; the loop re-checks the real inventory count.
      }
      await bot.waitForTicks(10);
    }

    return {
      status: "success",
      detail: { gained: gained(), mined, totalCobblestone: cobbleHeld(ctx), pickaxe },
    };
  },
};
