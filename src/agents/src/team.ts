/**
 * What each member of a team has achieved, shared between agents that run as separate processes.
 * Each agent writes only its own file, so there is nothing to lock; readers take whatever is there.
 * The board is how a team goal is checked against the whole team, and how a collaborative agent
 * knows whether its teammates are done. It is never shown to the model: teammates learn about each
 * other the way players do, by looking and by talking.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spotKey, type ShelterSpot } from "./skills/buildShelter.js";
import type { OreSighting, Sighting } from "./sightings.js";

/** What a chest held when an agent last opened it, by "x,y,z", with when (ms since epoch) and who. */
export type ChestViews = Record<string, { holds: Record<string, number>; seenAt: number; by?: string }>;

export interface MemberState {
  inventory: Record<string, number>;
  /** Chests this member has opened (store, take), as it last saw them. */
  chests?: ChestViews;
  shelterBuilt: boolean;
  nightSurvivedSinceShelter: boolean;
  /** Storeys of the tallest shelter this member has built; 0 for none. */
  shelterStoreys: number;
  /** This member has slept in a bed at least once. Absent in boards written before it existed. */
  sleptInBed?: boolean;
  /** Shelters this member built or worked on. */
  shelters?: ShelterSpot[];
  /** The shelters (by "x,y,z" of their centre) this member has slept in a bed inside. */
  sleptIn?: string[];
  /** Animals this member has seen lately, and where (sightings.ts). */
  sightings?: Sighting[];
  /** Ore this member has seen lately, and where (sightings.ts). */
  oreSightings?: OreSighting[];
  /** The member's own goal is met (for a team goal: the team's). */
  goalMet: boolean;
  at: string;
}

/** Only these characters reach the file system, so an episode name can't point outside the board. */
const safe = (name: string) => name.replace(/[^A-Za-z0-9_-]/g, "_");

export class TeamBoard {
  readonly dir: string;

  constructor(
    root: string,
    episode: string,
    readonly self: string,
    readonly members: string[],
  ) {
    this.dir = join(root, ".teams", safe(episode));
    mkdirSync(this.dir, { recursive: true });
  }

  get teammates(): string[] {
    return this.members.filter((m) => m !== this.self);
  }

  publish(state: Omit<MemberState, "at">): void {
    const file = join(this.dir, `${safe(this.self)}.json`);
    // Write then rename, so a reader never sees half a file.
    writeFileSync(`${file}.tmp`, JSON.stringify({ ...state, at: new Date().toISOString() }));
    renameSync(`${file}.tmp`, file);
  }

  /** Each teammate's latest state; undefined for one that hasn't written yet. */
  read(): Record<string, MemberState | undefined> {
    const out: Record<string, MemberState | undefined> = {};
    for (const name of this.teammates) {
      try {
        out[name] = JSON.parse(readFileSync(join(this.dir, `${safe(name)}.json`), "utf8")) as MemberState;
      } catch {
        out[name] = undefined;
      }
    }
    return out;
  }
}

/** The team as one: everything its members hold, and whatever any of them has done. */
export function combine(states: Array<Omit<MemberState, "at" | "goalMet">>): Omit<MemberState, "at" | "goalMet"> {
  const inventory: Record<string, number> = {};
  for (const s of states) for (const [name, n] of Object.entries(s.inventory)) inventory[name] = (inventory[name] ?? 0) + n;
  return {
    inventory,
    shelterBuilt: states.some((s) => s.shelterBuilt),
    nightSurvivedSinceShelter: states.some((s) => s.nightSurvivedSinceShelter),
    shelterStoreys: Math.max(0, ...states.map((s) => s.shelterStoreys ?? 0)),
    chests: latestChests(states.map((s) => s.chests ?? {})),
    sleptInBed: states.some((s) => s.sleptInBed),
    shelters: mergeShelters(states.map((s) => s.shelters ?? [])),
  };
}

/**
 * One entry per shelter, whoever reported it; finished if anyone saw it finished, tallest and widest as
 * last built, finished when the first of them saw it so.
 */
export function mergeShelters(lists: ShelterSpot[][]): ShelterSpot[] {
  const out = new Map<string, ShelterSpot>();
  for (const spot of lists.flat()) {
    const seen = out.get(spotKey(spot));
    if (!seen) {
      out.set(spotKey(spot), spot);
      continue;
    }
    const finishedAt = Math.min(seen.finishedAt ?? Infinity, spot.finishedAt ?? Infinity);
    out.set(spotKey(spot), {
      ...seen,
      storeys: Math.max(seen.storeys, spot.storeys),
      size: Math.max(seen.size ?? 3, spot.size ?? 3) as 3 | 5,
      complete: seen.complete !== false || spot.complete !== false ? true : false,
      ...(finishedAt < Infinity ? { finishedAt } : {}),
    });
  }
  return [...out.values()];
}

/**
 * Each chest as whoever opened it last saw it. Only agents move items in and out (store, take), and
 * each reports the whole chest afterwards, so the latest view is the chest's contents; a chest
 * broken by a creeper would still count until someone opens it again.
 */
export function latestChests(views: ChestViews[]): ChestViews {
  const out: ChestViews = {};
  for (const view of views) {
    for (const [at, seen] of Object.entries(view)) if (!out[at] || out[at]!.seenAt < seen.seenAt) out[at] = seen;
  }
  return out;
}

/** "10 cooked porkchop, 4 cobblestone", or "empty". */
function contents(holds: Record<string, number>): string {
  const items = Object.entries(holds).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (items.length === 0) return "empty";
  const shown = items.slice(0, 6).map(([name, n]) => `${n} ${name}`);
  return items.length > 6 ? `${shown.join(", ")} and ${items.length - 6} more kinds` : shown.join(", ");
}

const MAX_CHESTS_SHOWN = 4;

/**
 * The chests the team knows, each as whoever opened it last saw it, nearest first: "chest at
 * 1,78,90, 18 blocks away: empty (seen by la 6 min ago)". A chest's contents are a fact a teammate
 * could tell you, like a shelter or a sighting. In bpoc10 la emptied the team's food chest, and its
 * teammates, whose last look had been before, spent the rest of the run sure the food was stored.
 */
export function describeChests(here: { x: number; y: number; z: number }, chests: ChestViews, me: string, now = Date.now()): string[] {
  return Object.entries(chests)
    .map(([at, seen]) => {
      const [x, y, z] = at.split(",").map(Number) as [number, number, number];
      return { at, seen, d: Math.round(Math.hypot(x - here.x, y - here.y, z - here.z)) };
    })
    .sort((a, b) => a.d - b.d)
    .slice(0, MAX_CHESTS_SHOWN)
    .map(({ at, seen, d }) => {
      const mins = Math.round((now - seen.seenAt) / 60_000);
      const who = !seen.by || seen.by === me ? "you" : seen.by;
      return `chest at ${at}, ${d} blocks away: ${contents(seen.holds)} (seen by ${who} ${mins < 1 ? "just now" : `${mins} min ago`})`;
    });
}

/**
 * Chests a teammate has seen change since this agent last knew them, as one line each, and `known`
 * brought up to date. A chest first heard of is learnt quietly; the observation lists it.
 */
export function chestChanges(known: Map<string, string>, chests: ChestViews, me: string): string[] {
  const lines: string[] = [];
  for (const [at, seen] of Object.entries(chests)) {
    const now = contents(seen.holds);
    const before = known.get(at);
    if (before !== undefined && before !== now && seen.by && seen.by !== me) {
      const held = (what: string) => (what === "empty" ? "empty" : `holding ${what}`);
      lines.push(`${seen.by} found the chest at ${at} ${held(now)}; when you last knew it, it was ${held(before)}`);
    }
    known.set(at, now);
  }
  return lines;
}

/** Everything in all the chests, added up. */
export function inChests(chests: ChestViews | undefined): Record<string, number> {
  const total: Record<string, number> = {};
  for (const { holds } of Object.values(chests ?? {})) for (const [name, n] of Object.entries(holds)) total[name] = (total[name] ?? 0) + n;
  return total;
}

/** Teammates whose own goal is not met yet, by name, for "the team is not done" messages. */
export function stillWorking(board: Record<string, MemberState | undefined>): string[] {
  return Object.entries(board).filter(([, s]) => !s?.goalMet).map(([name]) => name);
}
