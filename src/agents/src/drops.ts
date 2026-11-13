import type { Vec3 } from "vec3";

/**
 * What an agent dropped when it died, where and when: a fact a player keeps in mind ("my stuff is back there"),
 * shared with teammates through the team board like ore sightings. Dropped items vanish 5 minutes after they drop.
 *
 * Why: over sets B to D (30 reps of three Lunas), iron lost in deaths was the main cause of 6 of the 9 losses. Of 56
 * deaths carrying goal items, 49 were within 100 blocks of where the agent came back and only 3 were recovered: the
 * death message said where once, and pick_up looked only 8 blocks round the agent.
 */
export interface Drop {
  by: string;
  x: number;
  y: number;
  z: number;
  items: Record<string, number>;
  /** World age in ticks when it was dropped. */
  at: number;
}

/** The game removes a dropped item 6000 ticks (5 minutes) after it lands. */
export const DROP_LIFETIME_TICKS = 6000;
/** How near the spot an agent has to be to see what is still lying there. */
export const DROP_SEEN_RANGE = 12;

/** Items further than this from the spot (scattered, or carried off by water) don't count as still there. */
export const DROP_SCATTER = 6;

/** One name per drop, the same for every agent that hears of it. */
export const dropKey = (d: Drop) => `${d.by}@${d.x},${d.y},${d.z}@${d.at}`;

/** A drop is worth listing while it can still be on the ground. */
export const live = (drop: Drop, age: number) => age - drop.at < DROP_LIFETIME_TICKS && Object.keys(drop.items).length > 0;

/** What was still lying at a drop when someone last looked from near it, and when (world age); nothing means gone. */
export type DropLooks = Record<string, { items: Record<string, number>; at: number }>;

/**
 * The drops an agent knows of: its own, and what it saw still lying at any drop it came near (part picked up, all of
 * it gone, burnt or despawned). Both reach teammates through the team board; the latest look at a drop wins.
 */
export class DropLog {
  private own: Drop[] = [];
  private looks: DropLooks = {};

  died(drop: Drop) {
    if (Object.keys(drop.items).length > 0) this.own.push(drop);
  }

  /** Own drops still possibly on the ground, for the board. */
  mine(age: number): Drop[] {
    this.own = this.own.filter((d) => live(d, age));
    return this.own;
  }

  /** This agent's looks at drops that can still be there, for the board. */
  seen(age: number): DropLooks {
    for (const key of Object.keys(this.looks)) if (age - this.looks[key]!.at >= DROP_LIFETIME_TICKS) delete this.looks[key];
    return this.looks;
  }

  /**
   * Of the drops given, the ones that can still be there, each with what was last seen lying there. From near a spot,
   * `lyingAt` says what lies within DROP_SCATTER of it; further off it gives undefined and the latest look stands.
   */
  current(all: Drop[], othersLooks: DropLooks[], age: number, here: Vec3, lyingAt: (d: Drop) => Record<string, number> | undefined): Drop[] {
    const keys = new Set<string>();
    const out: Drop[] = [];
    for (const d of all) {
      const key = dropKey(d);
      if (keys.has(key) || !live(d, age)) continue;
      keys.add(key);
      if (Math.hypot(d.x - here.x, d.y - here.y, d.z - here.z) <= DROP_SEEN_RANGE) {
        const lying = lyingAt(d);
        if (lying) this.looks[key] = { items: lying, at: age };
      }
      const latest = [this.looks[key], ...othersLooks.map((l) => l[key])]
        .filter((l): l is NonNullable<typeof l> => !!l)
        .sort((a, b) => b.at - a.at)[0];
      const items = latest ? latest.items : d.items;
      if (Object.keys(items).length > 0) out.push({ ...d, items });
    }
    return out;
  }
}

/** The items, biggest stacks first, as "15 raw iron, 2 iron ingot". */
export function describeItems(items: Record<string, number>, max = 16): string {
  const entries = Object.entries(items).sort((a, b) => b[1] - a[1]);
  const shown = entries.slice(0, max).map(([name, n]) => `${n} ${name.replace(/_/g, " ")}`);
  return entries.length > max ? `${shown.join(", ")} and ${entries.length - max} more kinds` : shown.join(", ");
}

/**
 * One line per drop that can still be on the ground: whose, what, where, how long ago and how far. Facts only: the
 * agent decides whether to go back for it.
 */
export function dropLines(drops: Drop[], here: Vec3, age: number, me: string): string[] {
  return drops
    .filter((d) => live(d, age))
    .sort((a, b) => b.at - a.at)
    .map((d) => {
      const whose = d.by === me ? "your" : `${d.by}'s`;
      const ago = Math.max(0, Math.round((age - d.at) / 20));
      const far = Math.round(Math.hypot(d.x - here.x, d.y - here.y, d.z - here.z));
      const left = Math.max(0, Math.round((DROP_LIFETIME_TICKS - (age - d.at)) / 20));
      return `${whose} ${describeItems(d.items)}, dropped at ${d.x},${d.y},${d.z} when ${d.by === me ? "you" : d.by} died, ${ago}s ago, ${far} blocks from you; dropped items vanish ${left}s from now`;
    });
}
