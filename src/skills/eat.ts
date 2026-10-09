import type { Skill, SkillContext, SkillResult } from "../types.js";
import { withTimeout } from "./util.js";

const EAT_TIMEOUT_MS = 10_000;
const FULL = 20;
// Items that are edible but hurt, or are too valuable to burn as routine food.
const AVOID = new Set([
  "pufferfish", "spider_eye", "poisonous_potato", "rotten_flesh", "chorus_fruit",
  "golden_apple", "enchanted_golden_apple", "suspicious_stew",
]);

export const eat: Skill = {
  name: "eat",
  description:
    "Eat the best food in your inventory to restore hunger. Takes no arguments. " +
    "Succeeds with detail `not hungry` if food is already 20. Fails with `no food in inventory` if you hold nothing edible " +
    "(raw/cooked meat, bread, apples, etc.). Returns food level before and after.",
  args: {},

  async run(ctx: SkillContext): Promise<SkillResult> {
    const bot = ctx.bot;
    const before = bot.food;
    if (before >= FULL) return { status: "success", detail: { note: "not hungry", food: before } };

    const foods = bot.registry.foodsByName;
    const edible = bot.inventory
      .items()
      .filter((item) => foods[item.name] && !AVOID.has(item.name))
      .sort((a, b) => (foods[b.name]?.foodPoints ?? 0) - (foods[a.name]?.foodPoints ?? 0));
    const best = edible[0];
    if (!best) {
      return { status: "failed", reason: "no food in inventory", detail: { food: before } };
    }

    try {
      await bot.equip(best, "hand");
      await withTimeout(bot.consume(), EAT_TIMEOUT_MS, "eating");
    } catch (error) {
      return {
        status: "failed",
        reason: `could not eat ${best.name}: ${(error as Error).message}`,
        detail: { foodBefore: before, foodAfter: bot.food },
      };
    }
    return { status: "success", detail: { ate: best.name, foodBefore: before, foodAfter: bot.food } };
  },
};
