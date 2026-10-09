import type { Skill, SkillContext, SkillResult } from "../types.js";
import { asNumber } from "./util.js";

export const wait: Skill = {
  name: "wait",
  description: "Stand still for `seconds`. Useful when there is nothing worth doing yet.",
  args: { seconds: "number" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const seconds = Math.max(1, Math.min(60, asNumber(rawArgs["seconds"], 5)));
    await ctx.bot.waitForTicks(seconds * 20);
    return { status: "success", detail: { seconds } };
  },
};
