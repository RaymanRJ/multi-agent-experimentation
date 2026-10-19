import pathfinderPkg from "mineflayer-pathfinder";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { asNumber, threatened, withTimeout } from "./util.js";

const { goals } = pathfinderPkg;

/** Pathfinding plans poorly over long distances, so a long trip is walked in legs of this length. */
const LEG = 32;
const LEG_TIMEOUT_MS = 40_000;
const MAX_FAILED_LEGS = 3;
const MAX_DISTANCE = 512;
/** Arrived: within this many blocks of the spot, or of the agent. */
const ARRIVED = 3;

export const goTo: Skill = {
  name: "go_to",
  description:
    "Walk to another agent or to a place. Args: `to` (an agent's name, if you can see them in otherAgents), or " +
    "`x` and `z` (coordinates, e.g. a position someone told you; your own is in your observation), and optionally `y`, " +
    "a height to reach; without it only x and z count. Walks in legs, " +
    `up to ${MAX_DISTANCE} blocks. Fails if the agent is out of sight (ask where they are, then use x and z), or ` +
    "if the way is blocked repeatedly. Aborts if a hostile comes within 8 blocks.",
  args: { to: "string?", x: "number?", y: "number?", z: "number?" },

  async run(ctx: SkillContext, args: Record<string, unknown>): Promise<SkillResult> {
    const bot = ctx.bot;
    const to = String(args["to"] ?? "").trim();
    const agent = () =>
      Object.values(bot.entities).find(
        (e) => e && e !== bot.entity && e.type === "player" && e.username?.toLowerCase() === to.toLowerCase(),
      );
    let target: { x: number; y?: number; z: number };
    if (to) {
      if (to.toLowerCase() === bot.username.toLowerCase()) return { status: "failed", reason: "you are already where you are" };
      const seen = agent();
      if (!seen) return { status: "failed", reason: `${to} is not in sight; ask them where they are, then go_to with x and z` };
      target = { x: seen.position.x, z: seen.position.z };
    } else {
      const x = asNumber(args["x"], NaN), z = asNumber(args["z"], NaN);
      if (!Number.isFinite(x) || !Number.isFinite(z)) return { status: "failed", reason: "say where to go: `to` an agent's name, or `x` and `z`" };
      const y = asNumber(args["y"], NaN);
      target = { x, z, ...(Number.isFinite(y) ? { y } : {}) };
    }
    const here = () => bot.entity.position;
    // With a height asked for, it counts towards the distance; otherwise only the ground plan does.
    // Measured from the block the bot stands in, as the pathfinder's goal is: from its exact position,
    // a bot the pathfinder had already brought within range could be a fraction short, forever.
    const left = () => {
      const at = here().floored();
      return Math.hypot(target.x - at.x, target.y === undefined ? 0 : target.y - at.y, target.z - at.z);
    };
    if (left() > MAX_DISTANCE) return { status: "failed", reason: `that is ${Math.round(left())} blocks away, more than ${MAX_DISTANCE}; go part of the way first` };
    const report = () => ({ position: { x: Math.round(here().x), y: Math.round(here().y), z: Math.round(here().z) }, blocksLeft: Math.round(left()) });

    let failedLegs = 0;
    // A ceiling on legs, in case pathfinding keeps "arriving" without getting any closer.
    for (let legs = 0; left() > ARRIVED; legs++) {
      if (legs >= (2 * MAX_DISTANCE) / LEG) return { status: "failed", reason: `could not get closer, ${Math.round(left())} blocks short`, detail: report() };
      if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };
      const danger = threatened(ctx);
      if (danger) {
        bot.pathfinder.setGoal(null);
        return { status: "aborted", reason: `stopped walking because ${danger}`, detail: report() };
      }
      if (failedLegs >= MAX_FAILED_LEGS) {
        return { status: "failed", reason: `the way was blocked ${failedLegs} times (water, cliffs or walls), ${Math.round(left())} blocks short`, detail: report() };
      }
      // Follow a moving agent: aim at where they are now.
      const seen = to ? agent() : undefined;
      if (seen) target = { x: seen.position.x, z: seen.position.z };
      const step = Math.min(1, LEG / left());
      const leg = {
        x: here().x + (target.x - here().x) * step,
        y: target.y === undefined ? here().y : here().y + (target.y - here().y) * step,
        z: here().z + (target.z - here().z) * step,
      };
      try {
        const goal = step === 1 && seen
          ? new goals.GoalNear(seen.position.x, seen.position.y, seen.position.z, ARRIVED - 1)
          : new goals.GoalNear(leg.x, leg.y, leg.z, ARRIVED);
        await withTimeout(bot.pathfinder.goto(goal), LEG_TIMEOUT_MS, "walking");
      } catch (error) {
        bot.pathfinder.setGoal(null);
        ctx.log(`go_to leg toward ${Math.round(leg.x)},${Math.round(leg.z)} failed: ${(error as Error).message}`);
        failedLegs++;
      }
    }
    return { status: "success", detail: report() };
  },
};
