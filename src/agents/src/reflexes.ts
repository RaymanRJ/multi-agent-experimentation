import pathfinderPkg from "mineflayer-pathfinder";
import type { Bot } from "mineflayer";
import type { Entity } from "prismarine-entity";
import { Vec3 } from "vec3";
import { eyeOf, getOutOfWater, headInWater, inSight } from "./skills/util.js";

const { goals } = pathfinderPkg;

/**
 * Reflexes: what the body does by itself, in the seconds the model can't act. The model still
 * chooses every goal; a reflex only keeps the agent alive until it has, and the next observation
 * says what it did. The others live where they act: swimming out (agent.ts, before each decision
 * and skill), a skill stopped at half air or by a death, the doorway closed behind the agent.
 */

/** A hostile this close can hit the agent: melee reach, plus the step it takes while the model thinks. */
export const GUARD_RADIUS = 3;
/** How far to step back each time: out of reach, not out of the area. */
export const BACK_OFF = 6;
const GUARD_EVERY_MS = 250;
/** A step back that hasn't arrived by now is abandoned, so a stuck path can't end the guard. */
const STEP_BACK_MS = 3_000;

/**
 * Mobs that shoot, and how far. Measured live on 26 October: a skeleton with a bow, held in place,
 * fired at 15 and 16.7 blocks and not at 17 or beyond, and never through a wall. Strays and bogged
 * share its bow.
 */
export const ARCHERS = new Set(["skeleton", "stray", "bogged"]);
export const BOW_RANGE = 16;
/** How far to look for cover from an archer: a few steps, not a journey. */
export const COVER_RADIUS = 5;
const EYE = 1.62;

/** Blocks a retreat must not end in or over. */
const LIQUID = /^(water|lava|bubble_column)$|seagrass|kelp/;

/**
 * Where the agent would stand at x, z near `y`: on the first block found going down from a few above,
 * if it is dry and solid with room to stand. Null if unloaded, liquid, or a drop of more than a few
 * blocks (a cliff or a cave).
 */
export function standY(bot: Bot, x: number, z: number, y: number): number | null {
  let headroom = 0;
  for (let gy = Math.floor(y) + 3; gy >= Math.floor(y) - 4; gy--) {
    const block = bot.blockAt(new Vec3(x, gy, z));
    if (!block) return null;
    if (LIQUID.test(block.name)) return null;
    if (block.boundingBox === "block") return headroom >= 2 ? gy + 1 : null;
    headroom++;
  }
  return null;
}

/** Dry, solid ground near `y` at x, z, with room to stand. */
export function safeGround(bot: Bot, x: number, z: number, y: number): boolean {
  return standY(bot, x, z, y) !== null;
}

/** Liquid is the first thing below x, z near `y`: a lake or river surface, which the pathfinder would swim. */
function wet(bot: Bot, x: number, z: number, y: number): boolean {
  for (let gy = Math.floor(y) + 3; gy >= Math.floor(y) - 4; gy--) {
    const block = bot.blockAt(new Vec3(x, gy, z));
    if (!block) return false;
    if (LIQUID.test(block.name)) return true;
    if (block.boundingBox === "block") return false;
  }
  return false;
}

/**
 * Where to run from these hostiles: `step` blocks straight away from their centre, or, when that
 * spot is water, a drop or unloaded, or the way there crosses water, the nearest turn off it (30°,
 * then 60°, then 90°, either way) that does neither. In bpoc3, three agents fled straight into a lake
 * and were killed there by drowned; checked live, a dry spot past a lake still drew the path across
 * it. Trees and walls on the way don't count: the pathfinder goes round them. Null when every
 * direction away is unsafe.
 */
export function retreatPoint(bot: Bot, threats: Entity[], step: number): { x: number; z: number } | null {
  if (threats.length === 0) return null;
  const here = bot.entity.position;
  const cx = threats.reduce((s, e) => s + e.position.x, 0) / threats.length;
  const cz = threats.reduce((s, e) => s + e.position.z, 0) / threats.length;
  const angle = Math.atan2(here.z - cz, here.x - cx);
  for (const turn of [0, 30, -30, 60, -60, 90, -90]) {
    const a = angle + (turn * Math.PI) / 180;
    const x = Math.round(here.x + Math.cos(a) * step);
    const z = Math.round(here.z + Math.sin(a) * step);
    if (!safeGround(bot, x, z, here.y)) continue;
    let dry = true;
    for (let d = 1; d < step && dry; d++) dry = !wet(bot, Math.round(here.x + Math.cos(a) * d), Math.round(here.z + Math.sin(a) * d), here.y);
    if (dry) return { x, z };
  }
  return null;
}

/** Hostile mobs within `radius` of the bot. */
export function hostilesWithin(bot: Bot, radius: number): Entity[] {
  return Object.values(bot.entities).filter(
    (e): e is Entity => !!e && e !== bot.entity && e.type === "hostile" && e.position.distanceTo(bot.entity.position) <= radius,
  );
}

// The sight test lives in util.ts, where the digging skills' danger check uses it too.
export { inSight };

/** Archers within bow range that can see a body standing at `feet` (the agent's own, by default). */
export function archersWithSight(bot: Bot, feet: Vec3 = bot.entity.position): Entity[] {
  const eye = feet.offset(0, EYE, 0);
  return hostilesWithin(bot, BOW_RANGE + 4).filter(
    (e) => ARCHERS.has(e.name ?? "") && e.position.distanceTo(feet) <= BOW_RANGE && inSight(bot, eyeOf(e), eye),
  );
}

/**
 * The nearest place within COVER_RADIUS to stand where none of these archers can see the agent:
 * behind a tree, a wall, a rise. A skeleton shoots only what it can see (measured), and stepping
 * back from one keeps the agent in range: in bpoc4 skeletons killed 12 of 24, some of them agents
 * that had run 19-57 blocks across open ground. Null when there is none so close.
 */
export function coverPoint(bot: Bot, archers: Entity[]): { x: number; y: number; z: number } | null {
  const here = bot.entity.position;
  const cells: Array<{ x: number; z: number; d: number }> = [];
  for (let dx = -COVER_RADIUS; dx <= COVER_RADIUS; dx++) {
    for (let dz = -COVER_RADIUS; dz <= COVER_RADIUS; dz++) {
      const d = Math.hypot(dx, dz);
      if (d > 0 && d <= COVER_RADIUS) cells.push({ x: Math.floor(here.x) + dx, z: Math.floor(here.z) + dz, d });
    }
  }
  cells.sort((a, b) => a.d - b.d);
  for (const { x, z } of cells) {
    const y = standY(bot, x, z, here.y);
    if (y === null) continue;
    const eye = new Vec3(x + 0.5, y + EYE, z + 0.5);
    if (archers.every((a) => !inSight(bot, eyeOf(a), eye))) return { x, y, z };
  }
  return null;
}

/**
 * While the model decides, keep out of harm's way, in three ways:
 * - head under water: swim out, as the agent already does before each decision and skill. In bpoc6 an
 *   agent drowned underground while its model decided, carrying the team's three iron pickaxes;
 * - a monster within reach: step back from it. In bpoc3, 9 of 17 deaths came while the model was
 *   still deciding, most with a mob 0-2 blocks away;
 * - an archer that can see the agent: move to the nearest cover from it, since stepping back doesn't
 *   help against a bow (bpoc4: 12 of 24 deaths to skeletons).
 * In that order. Nothing happens inside a closed shelter, where nothing can reach, or with no cover
 * close by. `stop` ends it when the decision arrives and returns what it did, for the next
 * observation, or null if it did nothing.
 */
export function guardWhileDeciding(bot: Bot, sheltered: () => boolean): { stop: () => string | null } {
  const steppedFrom = new Set<string>();
  const hidFrom = new Set<string>();
  let backedOff = 0;
  let tookCover = 0;
  let movingSince = 0;
  let swimming = false;
  let swam: boolean | null = null;
  const named = (e: Entity) => (e.name ?? "hostile mob").replace(/_/g, " ");
  const tick = () => {
    if (swimming) return;
    if (headInWater(bot)) {
      swimming = true;
      bot.pathfinder.setGoal(null);
      getOutOfWater(bot)
        .then((out) => { swam = out; })
        .catch(() => { swam = false; })
        .finally(() => { swimming = false; });
      return;
    }
    if (movingSince && Date.now() - movingSince < STEP_BACK_MS) return;
    movingSince = 0;
    if (sheltered()) return;
    const threats = hostilesWithin(bot, GUARD_RADIUS);
    if (threats.length > 0) {
      const target = retreatPoint(bot, threats, BACK_OFF);
      if (!target) return;
      for (const t of threats) steppedFrom.add(named(t));
      backedOff++;
      movingSince = Date.now();
      bot.pathfinder.setGoal(new goals.GoalXZ(target.x, target.z));
      return;
    }
    const archers = archersWithSight(bot);
    if (archers.length === 0) return;
    const cover = coverPoint(bot, archers);
    if (!cover) return;
    for (const a of archers) hidFrom.add(named(a));
    tookCover++;
    movingSince = Date.now();
    bot.pathfinder.setGoal(new goals.GoalBlock(cover.x, cover.y, cover.z));
  };
  const arrived = () => {
    movingSince = 0;
  };
  const updated = (path: { status: string }) => {
    if (path.status === "noPath") movingSince = 0;
  };
  bot.on("goal_reached", arrived);
  bot.on("path_stop", arrived);
  bot.on("path_update", updated);
  const timer = setInterval(tick, GUARD_EVERY_MS);
  tick();
  const who = (mobs: string[]) => (mobs.length === 1 ? `a ${mobs[0]}` : `hostile mobs (${mobs.join(", ")})`);
  const times = (n: number) => (n > 1 ? ` ${n} times` : "");
  return {
    stop: () => {
      clearInterval(timer);
      bot.removeListener("goal_reached", arrived);
      bot.removeListener("path_stop", arrived);
      bot.removeListener("path_update", updated);
      if (swimming) {
        // The decision has come: the swim stops here, and agent.ts swims out again before the skill if still under.
        bot.setControlState("jump", false);
        bot.pathfinder.setGoal(null);
      }
      if (backedOff + tookCover === 0 && swam === null && !swimming) return null;
      bot.pathfinder.setGoal(null);
      const did = [
        ...(swam === true ? ["were under water and swam out"] : swam === false || swimming ? ["were under water and tried to swim out"] : []),
        ...(backedOff ? [`stepped back from ${who([...steppedFrom])}${times(backedOff)}`] : []),
        ...(tookCover ? [`took cover from ${who([...hidFrom])}${times(tookCover)}`] : []),
      ];
      return `while you were deciding, you ${did.join(" and ")}`;
    },
  };
}
