import type { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { ANIMAL_TYPES, isDying } from "./skills/creatures.js";
import { isExposed, oreHazard } from "./skills/util.js";

/**
 * Where animals were seen: what a player remembers ("there were sheep down south") and what the
 * observation, which lists only animals in view, forgot the moment they left it. In bpoc3-bpoc5 a sheep
 * was in view in 6-7% of observations, up to 11 hunts a run found "no sheep within 32 blocks", and a
 * sighting by one agent never reached its teammates. Teammates share them through the team board.
 */
export interface Sighting {
  name: string;
  count: number;
  x: number;
  y: number;
  z: number;
  /** When it was seen (ms since epoch). */
  at: number;
  by: string;
}

/** As far as the agent is shown animals (observe.ts NEARBY_RADIUS): it remembers what it was shown, no more. */
export const SIGHT_RANGE = 24;
/** Animals wander, so a sighting is forgotten after this long. */
export const SIGHTING_TTL_MS = 10 * 60_000;
/** Two sightings of a kind closer than this are the same group. */
const SAME_GROUP = 16;
const MAX_KEPT = 12;
const MAX_SHOWN = 5;

export class AnimalMemory {
  private spots: Sighting[] = [];
  constructor(private readonly by: string) {}

  /** Records the animals in view now, a group per kind: how many, and where their middle is. */
  look(bot: Bot, now = Date.now()): void {
    if (!bot.entity) return;
    const here = bot.entity.position;
    const seen = new Map<string, Vec3[]>();
    for (const e of Object.values(bot.entities)) {
      if (!e || !ANIMAL_TYPES.has(e.type) || isDying(bot, e) || e.position.distanceTo(here) > SIGHT_RANGE) continue;
      const name = e.name ?? "animal";
      seen.set(name, [...(seen.get(name) ?? []), e.position]);
    }
    for (const [name, points] of seen) {
      const mid = points.reduce((s, p) => s.plus(p), new Vec3(0, 0, 0)).scaled(1 / points.length);
      const spot = { name, count: points.length, x: Math.round(mid.x), y: Math.round(mid.y), z: Math.round(mid.z), at: now, by: this.by };
      this.spots = this.spots.filter((s) => !(s.name === name && Math.hypot(s.x - spot.x, s.z - spot.z) < SAME_GROUP));
      this.spots.push(spot);
    }
    this.spots = this.spots.filter((s) => now - s.at < SIGHTING_TTL_MS).slice(-MAX_KEPT);
  }

  list(): Sighting[] {
    return [...this.spots];
  }
}

/** "south", "north-east": the way from `from` to (x, z), with north as -z, as in the game. */
export function direction(from: Vec3, x: number, z: number): string {
  const angle = (Math.atan2(x - from.x, -(z - from.z)) * 180) / Math.PI;
  const names = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
  return names[Math.round(((angle + 360) % 360) / 45) % 8]!;
}

/**
 * Sightings out of the agent's view now, its own and its teammates', newest per group, nearest first:
 * "3 sheep at 10,76,80, 45 blocks south, seen by lb 2 min ago". Ones within view are left out, since
 * the observation's `animals` says what is there now.
 */
export function describeSightings(here: Vec3, spots: Sighting[], me: string, now = Date.now()): string[] {
  const fresh = spots.filter((s) => now - s.at < SIGHTING_TTL_MS).sort((a, b) => b.at - a.at);
  const groups: Sighting[] = [];
  for (const s of fresh) if (!groups.some((g) => g.name === s.name && Math.hypot(g.x - s.x, g.z - s.z) < SAME_GROUP)) groups.push(s);
  return groups
    .map((s) => ({ s, d: Math.round(Math.hypot(s.x - here.x, s.z - here.z)) }))
    .filter(({ d }) => d > SIGHT_RANGE)
    .sort((a, b) => a.d - b.d)
    .slice(0, MAX_SHOWN)
    .map(({ s, d }) => {
      const mins = Math.round((now - s.at) / 60_000);
      const ago = mins < 1 ? "just now" : `${mins} min ago`;
      return `${s.count} ${s.name} at ${s.x},${s.y},${s.z}, ${d} blocks ${direction(here, s.x, s.z)}, seen by ${s.by === me ? "you" : s.by} ${ago}`;
    });
}

/**
 * Where ore was seen: as for animals, what a player remembers ("there was iron down that cave"). The
 * observation counts only ore in view, so ore an agent walked past, or saw down a cave and left, was
 * forgotten; in tbase5 iron came into view right after an `explore` twice in two reps. Only ore a player
 * could see is recorded (an exposed face, as in the observation), and only within SIGHT_RANGE.
 */
export interface OreSighting extends Sighting {
  /** Every ore in the group touches water or lava, which `mine_ore` won't mine. */
  wet?: boolean;
}

/** Ore stays put, so a sighting lasts longer than an animal's; one found mined out is dropped sooner. */
export const ORE_TTL_MS = 30 * 60_000;
/** Two ore blocks of a kind closer than this are one vein. */
const SAME_VEIN = 8;

/** "iron ore" for iron_ore and deepslate_iron_ore: one kind to the model, as to mine_ore. */
const oreKind = (name: string) => name.replace(/^deepslate_/, "").replace(/_/g, " ");

export class OreMemory {
  private spots: OreSighting[] = [];
  constructor(private readonly by: string) {}

  look(bot: Bot, now = Date.now()): void {
    if (!bot.entity) return;
    const here = bot.entity.position;
    const ids = Object.values(bot.registry.blocksByName).filter((b) => b.name.endsWith("_ore")).map((b) => b.id);
    const seen = new Map<string, Array<{ p: Vec3; wet: boolean }>>();
    for (const point of bot.findBlocks({ matching: ids, maxDistance: SIGHT_RANGE, count: 128 })) {
      const block = bot.blockAt(point);
      if (!block || !isExposed(bot, point)) continue;
      const wet = oreHazard(bot, point) !== null;
      const kind = oreKind(block.name);
      seen.set(kind, [...(seen.get(kind) ?? []), { p: point, wet }]);
    }
    // A vein seen before, near enough to look at now, with none of its ore left in view: mined, or never
    // there to see from here; either way it isn't worth a trip on this memory.
    this.spots = this.spots.filter((s) => {
      if (s.by !== this.by || here.distanceTo(new Vec3(s.x, s.y, s.z)) > SIGHT_RANGE / 2) return true;
      return (seen.get(s.name) ?? []).some(({ p }) => p.distanceTo(new Vec3(s.x, s.y, s.z)) < SAME_VEIN);
    });
    for (const [name, blocks] of seen) {
      const veins: Array<typeof blocks> = [];
      for (const b of blocks) {
        const vein = veins.find((v) => v[0]!.p.distanceTo(b.p) < SAME_VEIN);
        if (vein) vein.push(b); else veins.push([b]);
      }
      for (const vein of veins) {
        const mid = vein.reduce((s, { p }) => s.plus(p), new Vec3(0, 0, 0)).scaled(1 / vein.length);
        const spot: OreSighting = { name, count: vein.length, x: Math.round(mid.x), y: Math.round(mid.y), z: Math.round(mid.z), at: now, by: this.by, ...(vein.every((v) => v.wet) ? { wet: true } : {}) };
        this.spots = this.spots.filter((s) => !(s.name === name && Math.hypot(s.x - spot.x, s.y - spot.y, s.z - spot.z) < SAME_VEIN));
        this.spots.push(spot);
      }
    }
    this.spots = this.spots.filter((s) => now - s.at < ORE_TTL_MS).slice(-MAX_KEPT * 2);
  }

  list(): OreSighting[] {
    return [...this.spots];
  }
}

/**
 * Ore seen out of the agent's view now, its own and its teammates', nearest first, with how far above or
 * below: "3 iron ore at -6,32,13, 23 blocks south-west and 42 below you, seen by sonnet 5 min ago".
 */
export function describeOreSightings(here: Vec3, spots: OreSighting[], me: string, now = Date.now()): string[] {
  const fresh = spots.filter((s) => now - s.at < ORE_TTL_MS).sort((a, b) => b.at - a.at);
  const veins: OreSighting[] = [];
  for (const s of fresh) if (!veins.some((v) => v.name === s.name && Math.hypot(v.x - s.x, v.y - s.y, v.z - s.z) < SAME_VEIN)) veins.push(s);
  return veins
    .map((s) => ({ s, d: Math.round(here.distanceTo(new Vec3(s.x, s.y, s.z))), across: Math.round(Math.hypot(s.x - here.x, s.z - here.z)) }))
    .filter(({ d }) => d > SIGHT_RANGE)
    .sort((a, b) => a.d - b.d)
    .slice(0, MAX_SHOWN)
    .map(({ s, across }) => {
      const dy = Math.round(s.y - here.y);
      const height = Math.abs(dy) < 3 ? "" : ` and ${Math.abs(dy)} ${dy < 0 ? "below" : "above"} you`;
      const mins = Math.round((now - s.at) / 60_000);
      const ago = mins < 1 ? "just now" : `${mins} min ago`;
      return `${s.count} ${s.name} at ${s.x},${s.y},${s.z}, ${across} blocks ${direction(here, s.x, s.z)}${height}, seen by ${s.by === me ? "you" : s.by} ${ago}${s.wet ? " (beside lava, under water or below water, which mine_ore won't mine)" : ""}`;
    });
}
