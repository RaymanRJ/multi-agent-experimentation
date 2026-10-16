import type { Skill, SkillContext, SkillResult } from "../types.js";
import { asNumber } from "./util.js";

export const wait: Skill = {
  name: "wait",
  description: "Stand still for `seconds`. Useful when there is nothing worth doing yet.",
  args: { seconds: "number" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const seconds = Math.max(1, Math.min(60, asNumber(rawArgs["seconds"], 5)));
    // In short slices so an interrupt (damage, a mob arriving) ends the wait promptly.
    for (let waited = 0; waited < seconds * 20; waited += 10) {
      if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: { waited: Math.round(waited / 20) } };
      await ctx.bot.waitForTicks(10);
    }
    return { status: "success", detail: { seconds } };
  },
};
