import pathfinderPkg from "mineflayer-pathfinder";
import type { Entity } from "prismarine-entity";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { asNumber, withTimeout } from "./util.js";

const { goals } = pathfinderPkg;

const THREAT_RADIUS = 16;
const SAFE_RADIUS = 12;
const LEG_TIMEOUT_MS = 8_000;
const MAX_LEGS = 5;
const MAX_FAILED_LEGS = 2;

function hostilesNear(ctx: SkillContext, radius: number): Entity[] {
  return Object.values(ctx.bot.entities).filter(
    (e): e is Entity => !!e && e.type === "hostile" && e.position.distanceTo(ctx.bot.entity.position) <= radius,
  );
}

export const flee: Skill = {
  name: "flee",
  description:
    "Run directly away from nearby hostile mobs (the centre of those within 16 blocks). " +
    "Takes `distance` — how far to run (clamped 8-64). Succeeds when no hostile is within 12 blocks or the distance is covered; " +
    "succeeds immediately with `no threat` if no hostile is within 16. Returns new position and how many hostiles remain within 12. " +
    "Fails if you cannot find a path away (cornered). Fleeing does not fight; follow up with shelter or sleep.",
  args: { distance: "number" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const distance = Math.max(8, Math.min(64, asNumber(rawArgs["distance"], 24)));
    const start = ctx.bot.entity.position.clone();
    if (hostilesNear(ctx, THREAT_RADIUS).length === 0) {
      return { status: "success", detail: { note: "no threat" } };
    }

    const covered = () => Math.hypot(ctx.bot.entity.position.x - start.x, ctx.bot.entity.position.z - start.z);
    const report = () => {
      const here = ctx.bot.entity.position;
      return {
        position: { x: Math.round(here.x), y: Math.round(here.y), z: Math.round(here.z) },
        distanceCovered: Math.round(covered()),
        hostilesWithin12: hostilesNear(ctx, SAFE_RADIUS).length,
      };
    };

    let failedLegs = 0;
    for (let leg = 0; leg < MAX_LEGS; leg++) {
      if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };
      if (covered() >= distance) break;

      const threats = hostilesNear(ctx, THREAT_RADIUS);
      if (threats.length === 0 || (leg > 0 && hostilesNear(ctx, SAFE_RADIUS).length === 0)) break;

      const here = ctx.bot.entity.position;
      const centroid = threats.reduce(
        (c, e) => ({ x: c.x + e.position.x / threats.length, z: c.z + e.position.z / threats.length }),
        { x: 0, z: 0 },
      );
      const dx = here.x - centroid.x;
      const dz = here.z - centroid.z;
      const length = Math.hypot(dx, dz) || 1;
      const step = Math.max(10, Math.min(distance - covered(), 20));
      const tx = Math.round(here.x + (dx / length) * step);
      const tz = Math.round(here.z + (dz / length) * step);

      try {
        await withTimeout(ctx.bot.pathfinder.goto(new goals.GoalXZ(tx, tz)), LEG_TIMEOUT_MS, "fleeing");
      } catch (error) {
        ctx.bot.pathfinder.stop();
        ctx.log(`flee leg toward ${tx},${tz} failed: ${(error as Error).message}`);
        if (++failedLegs >= MAX_FAILED_LEGS) {
          return {
            status: "failed",
            reason: "could not find a path away from the hostiles; you may be cornered or boxed in",
            detail: report(),
          };
        }
      }
    }

    const detail = report();
    if (detail.hostilesWithin12 === 0 || detail.distanceCovered >= distance) return { status: "success", detail };
    return {
      status: "failed",
      reason: `ran ${detail.distanceCovered} blocks but ${detail.hostilesWithin12} hostile(s) are still within ${SAFE_RADIUS} blocks`,
      detail,
    };
  },
};
