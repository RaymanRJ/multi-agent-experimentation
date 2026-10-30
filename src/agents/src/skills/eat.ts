import type { Skill, SkillContext, SkillResult } from "../types.js";
import { withTimeout } from "./util.js";

const EAT_TIMEOUT_MS = 10_000;
const FULL = 20;
/** Rotten flesh is eaten only when nothing else is carried and hunger is this low or lower. */
const LAST_RESORT_BELOW = 14;
// Items that are edible but hurt, or are too valuable to burn as routine food.
const AVOID = new Set([
  "pufferfish", "spider_eye", "poisonous_potato", "rotten_flesh", "chorus_fruit",
  "golden_apple", "enchanted_golden_apple", "suspicious_stew",
]);

export const eat: Skill = {
  name: "eat",
  description:
    "Eat the best food in your inventory to restore hunger. Takes no arguments. " +
    "Succeeds with detail `not hungry` if food is already 20. Rotten flesh is eaten only when it is all you carry and hunger is 14 or below. " +
    "Fails with `no food in inventory` if you hold nothing edible " +
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
    // Rotten flesh when it is all there is and the agent is hungry, as a player eats it: 4 hunger back, and a
    // chance of a short hunger effect. Refused outright, lb in tluna5a was told "no food in inventory" 27
    // times while it held rotten flesh it could see, and kept trying.
    const flesh = bot.inventory.items().find((item) => item.name === "rotten_flesh");
    const lastResort = !edible[0] && flesh && before <= LAST_RESORT_BELOW ? flesh : undefined;
    const best = edible[0] ?? lastResort;
    if (!best) {
      const unsafe = [...new Set(bot.inventory.items().filter((item) => AVOID.has(item.name)).map((item) => item.name))];
      const reason = unsafe.length
        ? `nothing safe to eat: you carry only ${unsafe.join(", ")}${flesh ? ` (rotten flesh is eaten only when hunger is ${LAST_RESORT_BELOW} or below)` : ""}`
        : "no food in inventory";
      return { status: "failed", reason, detail: { food: before } };
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
    return {
      status: "success",
      ...(lastResort && { reason: "you ate rotten flesh, the only food you carry: it may leave you hungrier for half a minute" }),
      detail: { ate: best.name, foodBefore: before, foodAfter: bot.food },
    };
  },
};
