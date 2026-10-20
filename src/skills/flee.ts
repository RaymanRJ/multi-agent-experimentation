import pathfinderPkg from "mineflayer-pathfinder";
import type { Entity } from "prismarine-entity";
import { Vec3 } from "vec3";
import type { Bot } from "mineflayer";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { asNumber, opensOnClick, withTimeout } from "./util.js";
import { isBuildingBlock } from "./buildShelter.js";

const { goals } = pathfinderPkg;

const THREAT_RADIUS = 16;
const SAFE_RADIUS = 12;
const LEG_TIMEOUT_MS = 8_000;
const MAX_LEGS = 5;
const MAX_FAILED_LEGS = 2;
const PLACE_TIMEOUT_MS = 4_000;
const SIDES = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
const FACES = [...SIDES, new Vec3(0, 1, 0), new Vec3(0, -1, 0)];

/**
 * The cells to fill to wall the bot in, in an order where each has something to build against:
 * the four sides at foot level (against the floor), then at head level, then one more on top of
 * a wall so the block over the head has a neighbour, then the block over the head.
 */
export function enclosure(feet: Vec3): Vec3[] {
  const sides = SIDES.map((d) => feet.plus(d));
  return [...sides, ...sides.map((c) => c.offset(0, 1, 0)), sides[0]!.offset(0, 2, 0), feet.offset(0, 2, 0)];
}

/**
 * Cornered with no path away: wall the bot in where it stands, as a player would. Mobs can't reach
 * through, and the pathfinder can dig back out later. Returns how many cells are still open.
 */
async function sealIn(bot: Bot): Promise<{ placed: number; open: number; noBlocks: boolean }> {
  const feet = bot.entity.position.floored();
  const isOpen = (cell: Vec3) => bot.blockAt(cell)?.boundingBox !== "block";
  let placed = 0;
  let noBlocks = false;
  for (const cell of enclosure(feet)) {
    if (!isOpen(cell)) continue;
    const stack = bot.inventory.items().find((item) => isBuildingBlock(item.name));
    if (!stack) {
      noBlocks = true;
      break;
    }
    for (const direction of FACES) {
      const reference = bot.blockAt(cell.plus(direction));
      if (!reference || reference.boundingBox !== "block" || opensOnClick(reference.name)) continue;
      try {
        await bot.equip(stack, "hand");
        await withTimeout(bot.placeBlock(reference, direction.scaled(-1)), PLACE_TIMEOUT_MS, "placing block");
      } catch {
        // The block update can arrive after mineflayer gave up waiting for it.
        await bot.waitForTicks(4);
      }
      if (!isOpen(cell)) {
        placed++;
        break;
      }
    }
  }
  return { placed, open: enclosure(feet).filter(isOpen).length, noBlocks };
}

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
    "If there is no path away (cornered, in a pit or a cave), it walls you in where you stand with blocks you carry " +
    "(dirt, cobblestone, planks) so mobs can't reach you; wait there, then carry on — any later move digs back out. " +
    "Fails only if it can't run and can't wall you in. Fleeing does not fight; follow up with shelter or sleep.",
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

    const cornered = async (): Promise<SkillResult> => {
      const sealed = await sealIn(ctx.bot);
      if (sealed.open === 0) {
        return {
          status: "success",
          reason: `no path away, so you walled yourself in (${sealed.placed} blocks placed): mobs can't reach you here — wait for them to leave or for daylight`,
          detail: { ...report(), sealedIn: true },
        };
      }
      return {
        status: "failed",
        reason: `could not find a path away from the hostiles, and could not wall yourself in (${sealed.open} gaps left${sealed.noBlocks ? ": no dirt, cobblestone or planks to place" : ""})`,
        detail: report(),
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

      const before = ctx.bot.entity.position.clone();
      let stuck = false;
      try {
        await withTimeout(ctx.bot.pathfinder.goto(new goals.GoalXZ(tx, tz)), LEG_TIMEOUT_MS, "fleeing");
      } catch (error) {
        ctx.bot.pathfinder.setGoal(null);
        ctx.log(`flee leg toward ${tx},${tz} failed: ${(error as Error).message}`);
        stuck = true;
      }
      // With no way out the pathfinder sometimes gives up without an error and without moving.
      // Cornered only if it never got away: after a run, the result below says how far and who is left.
      if (stuck || ctx.bot.entity.position.distanceTo(before) < 2) {
        if (++failedLegs >= MAX_FAILED_LEGS) {
          if (covered() < 4) return cornered();
          break;
        }
      }
    }

    const detail = report();
    if (detail.hostilesWithin12 === 0) return { status: "success", detail };
    if (detail.distanceCovered >= distance) {
      return {
        status: "success",
        reason: `ran ${detail.distanceCovered} blocks but still being chased — ${detail.hostilesWithin12} hostile(s) within 12 blocks`,
        detail,
      };
    }
    if (detail.distanceCovered < 4) return cornered();
    return {
      status: "failed",
      reason: `ran ${detail.distanceCovered} blocks but ${detail.hostilesWithin12} hostile(s) are still within ${SAFE_RADIUS} blocks`,
      detail,
    };
  },
};
