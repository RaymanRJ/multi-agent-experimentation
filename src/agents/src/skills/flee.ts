import { plainError } from "./underground.js";
import pathfinderPkg from "mineflayer-pathfinder";
import type { Entity } from "prismarine-entity";
import { Vec3 } from "vec3";
import type { Bot } from "mineflayer";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { asNumber, gotoWatched, opensOnClick, withTimeout } from "./util.js";
import { describeShelter, enterShelter, half, hostilesAtDoorway, hostilesInside, insideClosedShelter, insideSpot, isBuildingBlock, spotKey, standing, type ShelterSpot } from "./buildShelter.js";
import { ARCHERS, BOW_RANGE, archersWithSight, coverPoint, retreatPoint } from "../reflexes.js";

const { goals } = pathfinderPkg;

const THREAT_RADIUS = 16;
const SAFE_RADIUS = 12;
const LEG_TIMEOUT_MS = 8_000;
const MAX_LEGS = 5;
const MAX_FAILED_LEGS = 2;
const PLACE_TIMEOUT_MS = 4_000;
const COVER_TIMEOUT_MS = 5_000;
/**
 * Digging in takes about 3.5 s; a melee mob closer than this gets there first and can follow the agent
 * into the hole (live, digging with a zombie 2 blocks off: down to 1-17 health, and in half the tries
 * the zombie ended up in the hole with it). A run usually opens this gap before it ends.
 */
const DIG_LEAD = 5;
/** A melee mob this close stops a dig half done: better to run on than be trapped with it. */
const DIG_ABORT = 2;
/** A zombie follows from about 35 blocks; at night a melee mob this close is still coming (16 let one back in live). */
const HUNTED_RADIUS = 32;
/**
 * How far flee will run to a known shelter rather than into the open. 40 at first; in bpoc3 and bpoc4,
 * 21 more of the flees that ran into the open had a finished shelter 41-64 blocks off.
 */
export const REFUGE_RANGE = 64;
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
 * Shut in on every side, at the feet and the head, and over the head: in a burrow or walled in. No
 * mob can reach the agent, as in a closed shelter, so nothing should lead it out.
 */
export function enclosed(bot: Bot): boolean {
  const feet = bot.entity.position.floored();
  const solid = (cell: Vec3) => bot.blockAt(cell)?.boundingBox === "block";
  return solid(feet.offset(0, 2, 0)) && SIDES.every((d) => solid(feet.plus(d)) && solid(feet.plus(d).offset(0, 1, 0))) && !hostileInside(bot);
}

/**
 * A hostile in the agent's own cell: shut in with it, not away from it. In bpoc9 a zombie close
 * behind dropped into the hole before it was covered, and the agent, counted as dug in, was killed.
 */
function hostileInside(bot: Bot): boolean {
  const here = bot.entity.position;
  return Object.values(bot.entities).some(
    (e) => e?.type === "hostile" && Math.abs(e.position.x - here.x) < 1 && Math.abs(e.position.z - here.z) < 1 && Math.abs(e.position.y - here.y) < 2,
  );
}

/** Three deep, so the block over the head sits in the ground, with ground beside it to build against. */
const BURROW_DEPTH = 3;
/** A block slower than this to dig, with the best tool held, makes digging in too slow to be safe. */
const BURROW_DIG_MS = 1500;
/** Room for one dig of up to BURROW_DIG_MS, with the server's lag. */
const BURROW_DIG_TIMEOUT_MS = 6_000;

/**
 * Dig in where the agent stands: three blocks straight down, then a block over the head, as a player
 * does when caught out at night. It needs no blocks carried (the digging gives them) and on dirt no
 * tool, which matters most just after a death: in bpoc8, 13 of 20 agents killed during a flee held
 * fewer than the 10 blocks walling in takes, 8 of them none. Returns null when dug in, or why not.
 */
export async function burrow(bot: Bot): Promise<string | null> {
  // Land first: measured mid-jump, the hole is planned in the air, and a dig made off the ground takes
  // five times as long (bpoc9's lb: "digging the stone timed out" with a stone pickaxe, then killed).
  bot.pathfinder.setGoal(null);
  bot.clearControlStates();
  const landed = async () => {
    for (let tick = 0; tick < 40 && !bot.entity.onGround; tick++) await bot.waitForTicks(1);
  };
  await landed();
  const feet = bot.entity.position.floored();
  const dig = [1, 2, 3].slice(0, BURROW_DEPTH).map((d) => feet.offset(0, -d, 0));
  const solid = (cell: Vec3) => bot.blockAt(cell)?.boundingBox === "block";
  const effects = bot.entity.effects ?? {};
  for (const cell of dig) {
    const block = bot.blockAt(cell);
    if (!block) return "unloaded ground";
    if (block.boundingBox !== "block") return `${block.name.replace(/_/g, " ")} below`;
    if (!bot.canDigBlock(block)) return `unbreakable ${block.name} below`;
    const tool = bot.pathfinder.bestHarvestTool(block);
    if (block.digTime(tool ? tool.type : null, false, false, false, [], effects) > BURROW_DIG_MS) {
      return `the ${block.name.replace(/_/g, " ")} below is too slow to dig${tool?.maxDurability ? "" : " without a pickaxe"}`;
    }
  }
  if (!solid(feet.offset(0, -BURROW_DEPTH - 1, 0))) return "no solid floor under where the hole would end";
  // The body stands in the two lowest cells: shut in on all sides there, and with no water or lava
  // anywhere round the hole.
  for (const [i, cell] of dig.entries()) {
    for (const d of SIDES) {
      const side = bot.blockAt(cell.plus(d));
      if (!side) return "unloaded ground";
      if (/water|lava/.test(side.name)) return `${side.name} beside where the hole would be`;
      if (i > 0 && side.boundingBox !== "block") return "an opening beside where the hole would be";
    }
  }
  const cap = dig[0]!;
  if (!SIDES.some((d) => solid(cap.plus(d)))) return "nothing to build the cover against";

  // A hit knocks the body sideways: once off the hole's column it is digging a hole it isn't in
  // (bpoc9: lb went from 20 health to 5 while digging, ended beside its hole, and was told it had dug in).
  const inColumn = () => {
    const at = bot.entity.position.floored();
    return at.x === feet.x && at.z === feet.z;
  };
  for (const cell of dig) {
    const block = bot.blockAt(cell);
    if (!block || block.boundingBox !== "block") continue;
    const tool = bot.pathfinder.bestHarvestTool(block);
    if (tool) await bot.equip(tool, "hand");
    await landed();
    if (!inColumn()) return "knocked out of the hole while digging it";
    const close = Object.values(bot.entities).find(
      (e) => e?.type === "hostile" && !ARCHERS.has(e.name ?? "") && e.position.distanceTo(bot.entity.position) <= DIG_ABORT,
    );
    if (close) return `a ${(close.name ?? "monster").replace(/_/g, " ")} reached you before the hole was deep enough`;
    await withTimeout(bot.dig(block), BURROW_DIG_TIMEOUT_MS, `digging the ${block.name}`);
    for (let tick = 0; tick < 20 && bot.entity.position.y > cell.y + 0.01; tick++) await bot.waitForTicks(1);
  }
  await landed();
  if (!inColumn()) return "knocked out of the hole while digging it";
  // Now standing at the bottom: the cover goes where the first block was dug, over the head.
  const stack = bot.inventory.items().find((item) => isBuildingBlock(item.name));
  if (!stack) return "dug down but had nothing to cover the hole with";
  for (const d of SIDES) {
    const reference = bot.blockAt(cap.plus(d));
    if (!reference || reference.boundingBox !== "block" || opensOnClick(reference.name)) continue;
    try {
      await bot.equip(stack, "hand");
      await withTimeout(bot.placeBlock(reference, d.scaled(-1)), PLACE_TIMEOUT_MS, "covering the hole");
    } catch {
      await bot.waitForTicks(4);
    }
    if (solid(cap)) break;
  }
  if (!solid(cap)) return "dug down but could not cover the hole";
  // Only shut in if it really is: in the hole, closed round, and alone in it.
  if (hostileInside(bot)) return "a monster fell into the hole with you";
  return enclosed(bot) ? null : "dug down, but the hole is not closed round you";
}

/**
 * A shelter to run into rather than away into the open: a finished one that stands, that the agent
 * isn't in, within REFUGE_RANGE of the cell in front of its doorway, on the side away from the mobs,
 * and with no hostile at its doorway. Unfinished ones are left out: in bpoc4 every failed way in (26)
 * was an agent trying to finish building a large shelter with monsters behind it. Nearest first. In bpoc3, 7 of 17 deaths came during a flee, four of them
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
    .filter((spot) => spot.complete !== false && !insideSpot(bot, spot) && standing(bot, spot) && hostilesAtDoorway(bot, spot).length === 0)
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
    "Get away from nearby hostile mobs (those within 16 blocks). Inside a closed shelter with nothing in it, you stay put: " +
    "nothing outside can reach you there. If a finished shelter you know (yours or another agent's) stands within " +
    `${REFUGE_RANGE} blocks on the side away from them (on any side, if a skeleton can see you), with no hostile at its doorway, ` +
    "you run into it and its doorway is closed behind you. " +
    "Otherwise you run directly away from them, turning aside rather than into water or off a drop, and if a skeleton can still " +
    "see you at the end you step behind the nearest cover (a skeleton shoots up to 16 blocks, only at what it can see). " +
    "Takes `distance` — how far to run in the open (clamped 8-64). Succeeds when no hostile is within 12 blocks and no skeleton " +
    `within ${BOW_RANGE} can see you, or the distance is covered; ` +
    "succeeds immediately with `no threat` if no hostile is within 16. Returns new position, how many hostiles remain within 12 and how many archers can see you. " +
    "If at night monsters are still after you once it has a few blocks' lead, you are still in danger after running, or there is no path away, it digs you in where you " +
    "stand: three blocks down and a block over your head, which needs no blocks carried and on dirt no tool (not on rock " +
    "without a pickaxe, nor beside water or lava). Failing that it walls you in with blocks you carry (dirt, cobblestone, planks). " +
    "Dug in or walled in, mobs can't reach you; wait there, then carry on — any later move digs back out. " +
    "Fails only if it can't run, dig in or wall you in. Fleeing does not fight; follow up with shelter or sleep.",
  args: { distance: "number" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const distance = Math.max(8, Math.min(64, asNumber(rawArgs["distance"], 24)));
    const start = ctx.bot.entity.position.clone();
    if (hostilesNear(ctx, THREAT_RADIUS).length === 0) {
      return { status: "success", detail: { note: "no threat" } };
    }

    // Already in the one place nothing can reach: running would mean going out to the monsters. In
    // bpoc4, 15 flees started inside a shelter, and 6 of the 11 that ended in one fled again at once.
    const inside = (ctx.shelters?.() ?? []).find((spot) => insideClosedShelter(ctx.bot, spot) && hostilesInside(ctx.bot, spot).length === 0);
    if (inside) {
      return {
        status: "success",
        reason: `you are inside a closed shelter at ${spotKey(inside)}: nothing outside can reach you here, so you stayed; leaving would take you out to them`,
        detail: { stayed: true, shelter: spotKey(inside) },
      };
    }
    if (enclosed(ctx.bot)) {
      return {
        status: "success",
        reason: "you are shut in on every side (dug in or walled in): nothing can reach you here, so you stayed; any move digs back out",
        detail: { stayed: true },
      };
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
    /** No mob that strikes up close is near enough to reach the hole before it is covered. */
    const lead = () => !hostilesNear(ctx, DIG_LEAD).some((e) => !ARCHERS.has(e.name ?? ""));

    /** Dig in where it stands; the result, or null with why not in `refused`. */
    let refused = "";
    const digIn = async (why: string): Promise<SkillResult | null> => {
      const problem = await burrow(ctx.bot).catch((error: Error) => error.message);
      if (problem === null) {
        return {
          status: "success",
          reason: `${why}, so you dug in and covered the hole over your head: nothing can reach you here — wait for daylight or for them to leave; any move digs back out`,
          detail: { ...report(), dugIn: true },
        };
      }
      refused = problem;
      ctx.log(`could not dig in: ${problem}`);
      return null;
    };

    const cornered = async (): Promise<SkillResult> => {
      const dug = await digIn("no path away");
      if (dug) return dug;
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
        reason: `could not find a path away from the hostiles, could not dig in (${refused}), and could not wall yourself in (${sealed.open} gaps left${sealed.noBlocks ? ": no dirt, cobblestone or planks to place" : ""})`,
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
        ctx.log(`flee leg toward ${tx},${tz} failed: ${plainError((error as Error).message)}`);
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
      // At night, stop as soon as the run has bought a lead and dig in, rather than run on into the next
      // monsters in the dark.
      if (!ctx.bot.time.isDay && lead()) break;
    }

    // Still in danger after running, or at night still hunted: dig in where it stands, if the run has
    // bought enough of a lead, and unless an archer can be hidden from. A run at night only buys time:
    // live, a bot that ran 20 blocks from three zombies and stopped "safe" at 12 was caught and killed
    // within 30 s in 5 of 6 tries (in bpoc8, 18 of 124 flees at night ended in a death).
    const hunted = !ctx.bot.time.isDay && hostilesNear(ctx, HUNTED_RADIUS).some((e) => !ARCHERS.has(e.name ?? ""));
    if ((hunted || (!safe() && archersWithSight(ctx.bot).length === 0)) && lead()) {
      const why = hunted ? "it is night and monsters are still after you" : `you ran ${Math.round(covered())} blocks but were still in danger`;
      const dug = await digIn(why);
      if (dug) return dug;
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
