import type { Skill, SkillContext, SkillResult } from "../types.js";
import { countInventory } from "../observe.js";

/** The cause a chosen respawn is logged with, so reports count it apart from being killed. */
export const CHOSE_TO_RESPAWN = "chose to respawn";
const RESPAWN_TIMEOUT_MS = 15_000;

/**
 * Dies on purpose and comes back at the respawn point: the way out of a spot no skill can leave. In
 * thaiku1 hc spent 116 of its 127 decisions in a flooded cave that walking, climbing and tunnelling all
 * refused. The cost is the same as any death, and the description says so plainly.
 */
export const respawn: Skill = {
  name: "respawn",
  description:
    "Die on purpose and come back to life at your respawn point: the bed you last slept in, if it is still there, " +
    "otherwise the world's spawn point. You lose everything you carry: it all drops where you are now, and vanishes " +
    "after 5 minutes unless someone picks it up there. Chests, shelters and beds you made stay as they are. " +
    "Returns where you died, where you came back, and what you left behind.",
  args: {},

  async run(ctx: SkillContext): Promise<SkillResult> {
    const bot = ctx.bot;
    if (!ctx.rcon) return { status: "failed", reason: "respawning is not available here" };
    const from = bot.entity.position.floored();
    const carried = countInventory(bot);
    const back = new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        bot.removeListener("spawn", onSpawn);
        resolve(false);
      }, RESPAWN_TIMEOUT_MS);
      const onSpawn = () => {
        clearTimeout(timer);
        resolve(true);
      };
      // The first spawn after the death; the death itself doesn't fire "spawn".
      bot.once("death", () => {
        bot.once("spawn", onSpawn);
      });
    });
    try {
      await ctx.rcon(`kill ${bot.username}`);
    } catch (error) {
      return { status: "failed", reason: `could not respawn: ${(error as Error).message}` };
    }
    if (!(await back)) return { status: "failed", reason: "did not come back to life within 15 seconds" };
    await bot.waitForTicks(5); // the position arrives just after the respawn
    const to = bot.entity.position.floored();
    const left = Object.entries(carried).map(([name, count]) => `${count} ${name}`).join(", ");
    return {
      status: "success",
      reason:
        `you died at ${from.x},${from.y},${from.z} and came back to life at ${to.x},${to.y},${to.z}` +
        (left ? `; everything you carried (${left}) lies at ${from.x},${from.y},${from.z} and vanishes in 5 minutes` : ", carrying nothing"),
      detail: { from: { x: from.x, y: from.y, z: from.z }, to: { x: to.x, y: to.y, z: to.z }, left: carried },
    };
  },
};
