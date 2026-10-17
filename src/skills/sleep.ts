import pathfinderPkg from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { opensOnClick, threatened, withTimeout } from "./util.js";

const { goals } = pathfinderPkg;

const BED_RANGE = 32;
const TRAVEL_TIMEOUT_MS = 30_000;
const SLEEP_TIMEOUT_MS = 90_000;
const MONSTER_RANGE = 10;

/** Tries to put a bed from inventory on flat ground next to the bot. */
async function placeBed(ctx: SkillContext): Promise<boolean> {
  const bot = ctx.bot;
  const bed = bot.inventory.items().find((item) => item.name.endsWith("_bed"));
  if (!bed) return false;
  await bot.equip(bed, "hand");
  const origin = bot.entity.position.floored();
  const offsets = [
    new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1),
    new Vec3(2, 0, 0), new Vec3(-2, 0, 0),
  ];
  for (const offset of offsets) {
    const ground = bot.blockAt(origin.plus(offset).offset(0, -1, 0));
    const above = bot.blockAt(origin.plus(offset));
    if (!ground || !above || ground.boundingBox !== "block" || opensOnClick(ground.name) || above.name !== "air") continue;
    try {
      await bot.lookAt(ground.position.offset(0.5, 1, 0.5), true);
      await bot.placeBlock(ground, new Vec3(0, 1, 0));
      return true;
    } catch (error) {
      ctx.log(`bed placement at ${ground.position} failed: ${(error as Error).message}`);
    }
  }
  return false;
}

export const sleep: Skill = {
  name: "sleep",
  description:
    "Sleep through the night in a bed: finds a bed within 32 blocks (or places one from your inventory), walks to it and sleeps " +
    "until morning or until woken. Takes no arguments. Only works at night. Fails with `it is daytime — can only sleep at night`, " +
    "`no bed nearby or in inventory`, or `monsters nearby` (hostiles within 10 blocks stop you sleeping). " +
    "The night is only skipped when every player is asleep; otherwise this fails and says so.",
  args: {},

  async run(ctx: SkillContext): Promise<SkillResult> {
    const bot = ctx.bot;
    if (bot.time.isDay) {
      return {
        status: "failed",
        reason: "it is daytime — can only sleep at night",
        detail: { timeOfDay: bot.time.timeOfDay },
      };
    }
    const danger = threatened(ctx, MONSTER_RANGE);
    if (danger) return { status: "failed", reason: `monsters nearby: ${danger}` };

    const bedIds = Object.values(bot.registry.blocksByName)
      .filter((b) => b.name.endsWith("_bed"))
      .map((b) => b.id);
    let bedBlock = bot.findBlock({ matching: bedIds, maxDistance: BED_RANGE });
    if (!bedBlock) {
      const placed = await placeBed(ctx).catch((error: Error) => {
        ctx.log(`placing bed failed: ${error.message}`);
        return false;
      });
      if (placed) bedBlock = bot.findBlock({ matching: bedIds, maxDistance: 6 });
    }
    if (!bedBlock) return { status: "failed", reason: "no bed nearby or in inventory" };

    const { x, y, z } = bedBlock.position;
    try {
      await withTimeout(bot.pathfinder.goto(new goals.GoalNear(x, y, z, 2)), TRAVEL_TIMEOUT_MS, "walking to bed");
    } catch (error) {
      return { status: "failed", reason: `could not reach the bed at ${x},${y},${z}: ${(error as Error).message}` };
    }

    try {
      await bot.sleep(bedBlock);
    } catch (error) {
      const message = (error as Error).message;
      const reason = /monster/i.test(message)
        ? "monsters nearby"
        : /day/i.test(message)
          ? "it is daytime — can only sleep at night"
          : `could not sleep: ${message}`;
      return { status: "failed", reason };
    }

    const woke = new Promise<void>((resolve) => bot.once("wake", () => resolve()));
    try {
      await withTimeout(woke, SLEEP_TIMEOUT_MS, "sleeping");
    } catch {
      // Other players may not be asleep, so the night never skips; get up rather than hang.
      try {
        await bot.wake();
      } catch {
        // already awake
      }
      return {
        status: "failed",
        reason: `got up after 90s and it is still night — the night only passes when every player in the world is asleep`,
        detail: { slept: true, health: bot.health },
      };
    }
    if (!bot.time.isDay) {
      return {
        status: "failed",
        reason: `woke before morning — the night only passes when every player in the world is asleep, or something woke you`,
        detail: { slept: true, health: bot.health },
      };
    }
    return { status: "success", detail: { slept: true, health: bot.health } };
  },
};
