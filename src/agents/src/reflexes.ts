import pathfinderPkg from "mineflayer-pathfinder";
import type { Bot } from "mineflayer";
import type { Entity } from "prismarine-entity";
import { Vec3 } from "vec3";
import { eyeOf, getOutOfWater, headInWater, inSight } from "./skills/util.js";
import { WEAPONS, cooldownMs } from "./skills/creatures.js";

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
/** A monster inside the home this close is hit: the game lands a blow out to 3 blocks. */
const FIGHT_REACH = 3;
const GUARD_EVERY_MS = 250;
/**
 * A creeper this close is backed away from, CREEPER_STEP blocks at a time, again whenever it closes in. Its fuse
 * starts at 3 blocks and its blast hurts out to about 6, so the step back from mobs within reach (GUARD_RADIUS) came
 * too late: on 11 November 5 of 6 creeper deaths were within two blocks of where the agent stood when it decided.
 */
export const CREEPER_KEEP = 8;
const CREEPER_STEP = 10;
/** Air (0-20) above which backing away from a creeper comes before swimming out. */
const CREEPER_AIR = 8;
/** A step back that hasn't arrived by now is abandoned, so a stuck path can't end the guard. */
const STEP_BACK_MS = 3_000;

/**
 * Mobs that shoot or throw, and how far. Measured live on 26 October: a skeleton with a bow, held in
 * place, fired at 15 and 16.7 blocks and not at 17 or beyond, and never through a wall. Strays and
 * bogged share its bow. A witch's potions, measured on 7 November with the witch held in place, hurt
 * out to 12.7 blocks and not at 14 or 16, and it threw nothing through a wall; in tluna13 one killed
 * two agents through the gaps of a broken home, the team's only iron pickaxe with each.
 */
export const BOW_RANGE = 16;
export const THROW_RANGE = 13;
export const ARCHER_RANGE: Record<string, number> = { skeleton: BOW_RANGE, stray: BOW_RANGE, bogged: BOW_RANGE, witch: THROW_RANGE };
export const ARCHERS = new Set(Object.keys(ARCHER_RANGE));
/** How far to look for cover from an archer: a few steps, not a journey. */
export const COVER_RADIUS = 5;
const EYE = 1.62;

/** Blocks a retreat must not end in or over. */
const LIQUID = /^(water|lava|bubble_column)$|seagrass|kelp/;

/**
 * Where the agent would stand at x, z near `y`: on the first dry, solid block found going down from a
 * few above that has room to stand on it. A ceiling with no room under it is passed over for the floor
 * below: stopping at it found no floor in a tunnel or a low cave, so underground a flee ran straight
 * away at any height, into the rock or down a cave. Null if unloaded, liquid, solid all the way, or a
 * drop of more than a few blocks (a cliff or a cave).
 */
export function standY(bot: Bot, x: number, z: number, y: number): number | null {
  let headroom = 0;
  for (let gy = Math.floor(y) + 3; gy >= Math.floor(y) - 4; gy--) {
    const block = bot.blockAt(new Vec3(x, gy, z));
    if (!block) return null;
    if (LIQUID.test(block.name)) return null;
    if (block.boundingBox === "block") {
      if (headroom >= 2) return gy + 1;
      headroom = 0;
      continue;
    }
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
 * it. Trees and walls on the way don't count: the pathfinder goes round them. Never a spot lower
 * than a step below the agent, and `y` is where to stand there, so the walk keeps to that height: aimed only at
 * x and z, 58 flees in the one-room-home reps ended 6 or more blocks down, dropping into caves on the
 * way, and 13 of those agents died within two decisions. Null when every direction away is unsafe.
 */
export function retreatPoint(bot: Bot, threats: Entity[], step: number): { x: number; y: number; z: number } | null {
  if (threats.length === 0) return null;
  const here = bot.entity.position;
  const cx = threats.reduce((s, e) => s + e.position.x, 0) / threats.length;
  const cz = threats.reduce((s, e) => s + e.position.z, 0) / threats.length;
  const angle = Math.atan2(here.z - cz, here.x - cx);
  for (const turn of [0, 30, -30, 60, -60, 90, -90]) {
    const a = angle + (turn * Math.PI) / 180;
    // The block the point falls in: rounding put an agent in the middle of a block one block sideways,
    // into the rock beside a tunnel one block wide.
    const x = Math.floor(here.x + Math.cos(a) * step);
    const z = Math.floor(here.z + Math.sin(a) * step);
    const y = standY(bot, x, z, here.y);
    if (y === null || y < Math.floor(here.y) - 1) continue; // a step down is level ground; more is a way down
    let dry = true;
    for (let d = 1; d < step && dry; d++) dry = !wet(bot, Math.floor(here.x + Math.cos(a) * d), Math.floor(here.z + Math.sin(a) * d), here.y);
    if (dry) return { x, y, z };
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

/** Archers within their range that can see a body standing at `feet` (the agent's own, by default). */
export function archersWithSight(bot: Bot, feet: Vec3 = bot.entity.position): Entity[] {
  const eye = feet.offset(0, EYE, 0);
  return hostilesWithin(bot, BOW_RANGE + 4).filter(
    (e) => ARCHERS.has(e.name ?? "") && e.position.distanceTo(feet) <= (ARCHER_RANGE[e.name ?? ""] ?? 0) && inSight(bot, eyeOf(e), eye),
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
 * - an archer (a skeleton, or a witch throwing potions) that can see the agent: move to the nearest
 *   cover from it, since stepping back doesn't help against a bow (bpoc4: 12 of 24 deaths to skeletons).
 * In that order, after one more: a monster inside the agent's own home and in reach is fought where it stands,
 * at the weapon's pace. There is nowhere to step back to in a room, and in tluna15 zombies that followed agents in
 * killed three inside a shut home while the reflexes, counting it as safe, did nothing. Nothing else happens inside
 * a closed shelter, where nothing can reach, or with no cover close by. `stop` ends it when the decision arrives and returns what it did, for the next
 * observation, or null if it did nothing.
 */
export function guardWhileDeciding(bot: Bot, sheltered: () => boolean, intruders: () => Entity[] = () => []): { stop: () => string | null } {
  const foughtOff = new Set<string>();
  let blows = 0;
  let lastBlow = 0;
  const steppedFrom = new Set<string>();
  const hidFrom = new Set<string>();
  let backedOff = 0;
  let keptAway = 0;
  let lastKeep = 0;
  let tookCover = 0;
  let movingSince = 0;
  let swimming = false;
  let swam: boolean | null = null;
  const named = (e: Entity) => (e.name ?? "hostile mob").replace(/_/g, " ");
  /**
   * A creeper close outside: back away from it, before anything else, even with the head under water while air
   * lasts: its blast kills in a second and a half, drowning takes about 15 s. At a lakeside spot from tluna27d the
   * body swam in place for the whole decision while a creeper walked up, and was blown up 3 times in 4 (live).
   */
  const keepFromCreepers = (): boolean => {
    if (sheltered() || (bot.oxygenLevel ?? 20) <= CREEPER_AIR) return false;
    const here = bot.entity.position;
    const creepers = hostilesWithin(bot, CREEPER_KEEP).filter((e) => e.name === "creeper");
    if (creepers.length === 0) return false;
    const nearest = Math.min(...creepers.map((e) => e.position.distanceTo(here)));
    if (!movingSince || (nearest < 5 && Date.now() - lastKeep > 750)) {
      // Dry ground away from it, or with none (a lake on that side), straight away through the water: standing still
      // is the one thing that never helps (live, the body stood in the shallows while the creeper walked up).
      const target = retreatPoint(bot, creepers, CREEPER_STEP);
      const cx = creepers.reduce((n, e) => n + e.position.x, 0) / creepers.length;
      const cz = creepers.reduce((n, e) => n + e.position.z, 0) / creepers.length;
      const length = Math.hypot(here.x - cx, here.z - cz) || 1;
      bot.setControlState("jump", false);
      keptAway++;
      lastKeep = Date.now();
      movingSince = Date.now();
      bot.pathfinder.setGoal(target
        ? new goals.GoalNear(target.x, target.y, target.z, 1)
        : new goals.GoalXZ(Math.round(here.x + ((here.x - cx) / length) * CREEPER_STEP), Math.round(here.z + ((here.z - cz) / length) * CREEPER_STEP)));
    }
    return true;
  };
  const tick = () => {
    if (swimming) return;
    if (keepFromCreepers()) return;
    if (headInWater(bot)) {
      swimming = true;
      bot.pathfinder.setGoal(null);
      getOutOfWater(bot, () => hostilesWithin(bot, 16).filter((e) => e.name === "creeper").map((e) => e.position))
        .then((out) => { swam = out; })
        .catch(() => { swam = false; })
        .finally(() => { swimming = false; });
      return;
    }
    const here = bot.entity.position;
    const foe = intruders()
      .filter((e) => e.position.distanceTo(here) <= FIGHT_REACH)
      .sort((a, b) => a.position.distanceTo(here) - b.position.distanceTo(here))[0];
    if (foe) {
      bot.pathfinder.setGoal(null);
      const weapon = WEAPONS.find((name) => bot.inventory.items().some((item) => item.name === name));
      if (Date.now() - lastBlow < cooldownMs(weapon)) return;
      lastBlow = Date.now();
      const held = weapon ? bot.inventory.items().find((item) => item.name === weapon) : undefined;
      void (async () => {
        if (held && bot.heldItem?.name !== held.name) await bot.equip(held, "hand").catch(() => {});
        await bot.lookAt(foe.position.offset(0, foe.height * 0.8, 0), true).catch(() => {});
        bot.attack(foe);
      })();
      foughtOff.add(named(foe));
      blows++;
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
      bot.pathfinder.setGoal(new goals.GoalNear(target.x, target.y, target.z, 1));
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
      if (backedOff + keptAway + tookCover + blows === 0 && swam === null && !swimming) return null;
      bot.pathfinder.setGoal(null);
      const did = [
        ...(swam === true ? ["were under water and swam out"] : swam === false || swimming ? ["were under water and tried to swim out"] : []),
        ...(keptAway ? [`backed away from a creeper${times(keptAway)}`] : []),
        ...(backedOff ? [`stepped back from ${who([...steppedFrom])}${times(backedOff)}`] : []),
        ...(tookCover ? [`took cover from ${who([...hidFrom])}${times(tookCover)}`] : []),
        ...(blows ? [`fought ${who([...foughtOff])} inside your home (${blows} blow${blows === 1 ? "" : "s"})`] : []),
      ];
      return `while you were deciding, you ${did.join(" and ")}`;
    },
  };
}

/**
 * The block the agent's head is inside, if any. The body can't walk into a block, so this happens
 * only when one lands there: gravel or sand falling into a stair just dug, as killed la twice in
 * bpoc7 ("suffocated in a wall"), once mid-climb carrying two iron pickaxes.
 */
export function buriedHead(bot: Bot): { name: string; position: Vec3 } | null {
  const eye = bot.entity.position.offset(0, EYE, 0);
  const block = bot.blockAt(eye.floored());
  if (!block || block.boundingBox !== "block" || LIQUID.test(block.name)) return null;
  // Only a block whose solid part holds the eye. A door, a dripleaf or an amethyst bud fills a sliver of its
  // cell, and an agent walking through its own doorway dug the door out thousands of times (every run from
  // 27 October to tluna26b), leaving the home open to monsters.
  const [x, y, z] = [eye.x - block.position.x, eye.y - block.position.y, eye.z - block.position.z];
  const holds = (block.shapes ?? []).some(([x0, y0, z0, x1, y1, z1]) => x > x0 && x < x1 && y > y0 && y < y1 && z > z0 && z < z1);
  return holds && bot.canDigBlock(block) ? block : null;
}

/**
 * Digs out a block the head is stuck in, during a skill as much as a decision, since suffocating
 * kills in seconds. Checks every tick until `stop`; `onDug` hears each block dug out.
 */
export function unburyHead(bot: Bot, onDug: (name: string) => void): { stop: () => void } {
  let digging = false;
  const timer = setInterval(() => {
    if (digging) return;
    const block = buriedHead(bot);
    if (!block) return;
    digging = true;
    const tool = bot.pathfinder.bestHarvestTool?.(block as never);
    (tool ? bot.equip(tool, "hand") : Promise.resolve())
      .then(() => bot.dig(block as never))
      .then(() => onDug(block.name))
      .catch(() => {})
      .finally(() => { digging = false; });
  }, 50);
  return { stop: () => clearInterval(timer) };
}
