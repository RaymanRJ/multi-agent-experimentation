import pathfinderPkg from "mineflayer-pathfinder";
import type { Bot } from "mineflayer";
import type { Entity } from "prismarine-entity";
import { Vec3 } from "vec3";

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

/** Blocks a retreat must not end in or over. */
const LIQUID = /^(water|lava|bubble_column)$|seagrass|kelp/;

/**
 * Dry, solid ground near `y` at x, z, with room to stand: the first block found going down from a
 * few above. False if unloaded, liquid, or a drop of more than a few blocks (a cliff or a cave).
 */
export function safeGround(bot: Bot, x: number, z: number, y: number): boolean {
  let headroom = 0;
  for (let gy = Math.floor(y) + 3; gy >= Math.floor(y) - 4; gy--) {
    const block = bot.blockAt(new Vec3(x, gy, z));
    if (!block) return false;
    if (LIQUID.test(block.name)) return false;
    if (block.boundingBox === "block") return headroom >= 2;
    headroom++;
  }
  return false;
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

/**
 * While the model decides, step back from any hostile within reach. A decision takes seconds, and the
 * body used to stand still through them: in bpoc3, 9 of 17 deaths came while the model was still
 * deciding, each with the agent already at 2-8 health and a mob 0-2 blocks away. Nothing happens
 * inside a closed shelter, where nothing can reach. `stop` ends it when the decision arrives and
 * returns what it did, for the next observation, or null if it did nothing.
 */
export function guardWhileDeciding(bot: Bot, sheltered: () => boolean): { stop: () => string | null } {
  const from = new Set<string>();
  let backedOff = 0;
  let movingSince = 0;
  const tick = () => {
    if (movingSince && Date.now() - movingSince < STEP_BACK_MS) return;
    movingSince = 0;
    if (sheltered()) return;
    const threats = hostilesWithin(bot, GUARD_RADIUS);
    if (threats.length === 0) return;
    const target = retreatPoint(bot, threats, BACK_OFF);
    if (!target) return;
    for (const t of threats) from.add((t.name ?? "hostile mob").replace(/_/g, " "));
    backedOff++;
    movingSince = Date.now();
    bot.pathfinder.setGoal(new goals.GoalXZ(target.x, target.z));
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
  return {
    stop: () => {
      clearInterval(timer);
      bot.removeListener("goal_reached", arrived);
      bot.removeListener("path_stop", arrived);
      bot.removeListener("path_update", updated);
      if (backedOff === 0) return null;
      bot.pathfinder.setGoal(null);
      const mobs = [...from];
      const who = mobs.length === 1 ? `a ${mobs[0]}` : `hostile mobs (${mobs.join(", ")})`;
      return `while you were deciding, you stepped back from ${who}${backedOff > 1 ? ` ${backedOff} times` : ""}`;
    },
  };
}
