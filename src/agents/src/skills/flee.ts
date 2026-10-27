import pathfinderPkg from "mineflayer-pathfinder";
import type { Entity } from "prismarine-entity";
import { Vec3 } from "vec3";
import type { Bot } from "mineflayer";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { asNumber, gotoWatched, opensOnClick, withTimeout } from "./util.js";
import { describeShelter, enterShelter, half, hostilesAtDoorway, insideSpot, isBuildingBlock, spotKey, standing, type ShelterSpot } from "./buildShelter.js";
import { ARCHERS, BOW_RANGE, archersWithSight, coverPoint, retreatPoint } from "../reflexes.js";

const { goals } = pathfinderPkg;

const THREAT_RADIUS = 16;
const SAFE_RADIUS = 12;
const LEG_TIMEOUT_MS = 8_000;
const MAX_LEGS = 5;
const MAX_FAILED_LEGS = 2;
const PLACE_TIMEOUT_MS = 4_000;
const COVER_TIMEOUT_MS = 5_000;
/** How far flee will run to a known shelter rather than into the open. */
export const REFUGE_RANGE = 40;
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

/**
 * A shelter to run into rather than away into the open: one that stands, that the agent isn't in,
 * within REFUGE_RANGE of the cell in front of its doorway, on the side away from the mobs, and with
 * no hostile at its doorway. Nearest first. In bpoc3, 7 of 17 deaths came during a flee, four of them
 * 55-70 blocks from the team's home, in the dark or in a lake, after running straight away from it.
 * `anySide`: with an archer in sight, a shelter on any side will do, since running in the open keeps
 * the agent in bow range (bpoc4: five flee deaths to arrows).
 */
export function refuge(bot: Bot, shelters: ShelterSpot[], threats: Entity[], anySide = false): ShelterSpot | null {
  if (threats.length === 0) return null;
  const here = bot.entity.position;
  const cx = threats.reduce((sum, e) => sum + e.position.x, 0) / threats.length;
  const cz = threats.reduce((sum, e) => sum + e.position.z, 0) / threats.length;
  const [ax, az] = [here.x - cx, here.z - cz];
  const options = shelters
    .filter((spot) => !insideSpot(bot, spot) && standing(bot, spot) && hostilesAtDoorway(bot, spot).length === 0)
    .map((spot) => {
      const front = new Vec3(spot.x + 0.5, spot.y, spot.z + half(spot.size ?? 3) + 1.5);
      const [fx, fz] = [front.x - here.x, front.z - here.z];
      return { spot, d: here.distanceTo(front), away: ax * fx + az * fz > 0 };
    })
    .filter(({ d, away }) => d <= REFUGE_RANGE && (away || anySide))
    .sort((a, b) => a.d - b.d);
  return options[0]?.spot ?? null;
}

function hostilesNear(ctx: SkillContext, radius: number): Entity[] {
  return Object.values(ctx.bot.entities).filter(
    (e): e is Entity => !!e && e.type === "hostile" && e.position.distanceTo(ctx.bot.entity.position) <= radius,
  );
}

export const flee: Skill = {
  name: "flee",
  description:
    "Get away from nearby hostile mobs (those within 16 blocks). If a shelter you know (yours or another agent's) stands within " +
    `${REFUGE_RANGE} blocks on the side away from them (on any side, if a skeleton can see you), with no hostile at its doorway, ` +
    "you run into it and its doorway is closed behind you. " +
    "Otherwise you run directly away from them, turning aside rather than into water or off a drop, and if a skeleton can still " +
    "see you at the end you step behind the nearest cover (a skeleton shoots up to 16 blocks, only at what it can see). " +
    "Takes `distance` — how far to run in the open (clamped 8-64). Succeeds when no hostile is within 12 blocks and no skeleton " +
    `within ${BOW_RANGE} can see you, or the distance is covered; ` +
    "succeeds immediately with `no threat` if no hostile is within 16. Returns new position, how many hostiles remain within 12 and how many archers can see you. " +
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

    // Somewhere safe to run to beats running into the open; with an archer in sight, on any side.
    const home = refuge(ctx.bot, ctx.shelters?.() ?? [], hostilesNear(ctx, THREAT_RADIUS), archersWithSight(ctx.bot).length > 0);
    if (home) {
      const entered = await enterShelter(ctx, home);
      const owner = home.by && home.by !== ctx.bot.username ? ` (${home.by}'s)` : home.by ? " (yours)" : "";
      if (entered.ok) {
        const here = ctx.bot.entity.position;
        return {
          status: "success",
          reason: `ran into ${describeShelter(home)}${owner} at ${spotKey(home)}, ${entered.closed ? "and its doorway is closed behind you" : "but its doorway is open: no building block left to close it"}`,
          detail: { position: { x: Math.round(here.x), y: Math.round(here.y), z: Math.round(here.z) }, shelter: spotKey(home), doorwayClosed: entered.closed },
        };
      }
      if (entered.result.status === "aborted") return entered.result;
      ctx.log(`could not get into the shelter at ${spotKey(home)} (${entered.result.reason}); running instead`);
    }

    const covered = () => Math.hypot(ctx.bot.entity.position.x - start.x, ctx.bot.entity.position.z - start.z);
    // Safe: nothing that strikes up close within 12 blocks, and no archer that can see the agent. A
    // skeleton at 13-16 blocks with a clear shot is not safe (measured: it fires out to 16).
    const report = () => {
      const here = ctx.bot.entity.position;
      return {
        position: { x: Math.round(here.x), y: Math.round(here.y), z: Math.round(here.z) },
        distanceCovered: Math.round(covered()),
        hostilesWithin12: hostilesNear(ctx, SAFE_RADIUS).filter((e) => !ARCHERS.has(e.name ?? "")).length,
        archersInSight: archersWithSight(ctx.bot).length,
      };
    };
    const safe = () => {
      const r = report();
      return r.hostilesWithin12 === 0 && r.archersInSight === 0;
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
      if (threats.length === 0 || (leg > 0 && safe())) break;

      const step = Math.max(10, Math.min(distance - covered(), 20));
      // Straight away, or the nearest turn off it onto dry ground; with none, straight away anyway.
      const here = ctx.bot.entity.position;
      const centroid = threats.reduce((c, e) => ({ x: c.x + e.position.x / threats.length, z: c.z + e.position.z / threats.length }), { x: 0, z: 0 });
      const length = Math.hypot(here.x - centroid.x, here.z - centroid.z) || 1;
      const { x: tx, z: tz } = retreatPoint(ctx.bot, threats, step) ?? {
        x: Math.round(here.x + ((here.x - centroid.x) / length) * step),
        z: Math.round(here.z + ((here.z - centroid.z) / length) * step),
      };

      const before = ctx.bot.entity.position.clone();
      let stuck = false;
      try {
        await gotoWatched(ctx.bot, new goals.GoalXZ(tx, tz), LEG_TIMEOUT_MS, "fleeing");
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

    // An archer that can still see the agent: end the run behind the nearest cover from it.
    let hid = false;
    const archers = archersWithSight(ctx.bot);
    const cover = archers.length > 0 && !ctx.shouldStop() ? coverPoint(ctx.bot, archers) : null;
    if (cover) {
      try {
        await gotoWatched(ctx.bot, new goals.GoalBlock(cover.x, cover.y, cover.z), COVER_TIMEOUT_MS, "taking cover");
        hid = archersWithSight(ctx.bot).length === 0;
      } catch (error) {
        ctx.bot.pathfinder.setGoal(null);
        ctx.log(`taking cover failed: ${(error as Error).message}`);
      }
    }

    const detail = report();
    const left = () => {
      const parts: string[] = [];
      if (detail.hostilesWithin12) parts.push(`${detail.hostilesWithin12} hostile(s) are still within ${SAFE_RADIUS} blocks`);
      if (detail.archersInSight) {
        const names = [...new Set(archersWithSight(ctx.bot).map((e) => e.name ?? "skeleton"))].join(", ");
        parts.push(`${detail.archersInSight === 1 ? `a ${names}` : `${detail.archersInSight} archers (${names})`} within ${BOW_RANGE} blocks can still see you`);
      }
      return parts.join(" and ");
    };
    if (safe()) {
      return hid
        ? { status: "success", reason: `ran ${detail.distanceCovered} blocks and took cover where no archer can see you`, detail }
        : { status: "success", detail };
    }
    if (detail.distanceCovered >= distance) {
      return { status: "success", reason: `ran ${detail.distanceCovered} blocks but still in danger: ${left()}`, detail };
    }
    if (detail.distanceCovered < 4) return cornered();
    return { status: "failed", reason: `ran ${detail.distanceCovered} blocks but ${left()}`, detail };
  },
};
