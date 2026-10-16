/**
 * Deterministic mid-skill interrupts: "replan on events", without the model in the loop.
 *
 * Pure logic only — agent.ts feeds it snapshots on bot events and ticks. A watch is
 * created when a skill starts and compares the world *then* against the world *now*.
 *
 * Triggers are edge-triggered. The model chose this skill knowing what it saw in its
 * observation, so a condition that was already true at the start (a zombie at 5 blocks
 * when it chose `flee`) must not interrupt it; only a change does.
 */

export interface Hostile {
  /** Entity id, so the same mob can be compared between snapshots. */
  id: number;
  name: string;
  distance: number;
}

export interface WorldSnapshot {
  health: number;
  hostiles: Hostile[];
  timeOfDay: number;
  /** Messages ever addressed to this agent by name (absent with comms off). */
  directed?: number;
  lastDirected?: { from: string; text: string } | null;
}

/**
 * "message" is the social counterpart of "hostile": someone wants something from
 * this agent now. Only a message addressed to it by name counts — mere proximity of
 * another agent never interrupts (agents working side by side would thrash), and
 * messages to everyone wait for the next decision.
 */
export type Trigger = "damage" | "hostile" | "night" | "message";

/** A hostile at or inside this many blocks is a threat worth stopping for. */
export const HOSTILE_RADIUS = 6;
/** A hostile already known at the start only interrupts if it closes in by this much. */
export const CLOSING_MARGIN = 2;
/** Same cut-off as Observation.isDay. */
export const NIGHT_START = 12000;

/**
 * Skills that handle the danger themselves; the named triggers are suppressed for them.
 * Keyed by skill name (never scenario name), so the Skill contract needs no new field.
 *  - flee: its whole purpose is to run from hostiles that are hitting it, so damage and
 *    hostile interrupts would abort it exactly when it matters. Night is also moot.
 *  - eat: a couple of seconds long; the model replans right after anyway.
 *  - sleep: only starts at night (no night edge) and bails by itself on monsters.
 */
export const SUPPRESSED: Record<string, Trigger[]> = {
  flee: ["damage", "hostile", "night", "message"],
  eat: ["damage", "hostile", "night", "message"],
  sleep: ["damage", "hostile", "night", "message"],
};

export interface Watch {
  /** Returns an interrupt reason the first time one fires, then null forever (one per run). */
  check(now: WorldSnapshot): string | null;
}

export function createWatch(start: WorldSnapshot, suppressed: Trigger[] = []): Watch {
  const off = new Set(suppressed);
  const startDistance = new Map(start.hostiles.map((h) => [h.id, h.distance]));
  const startedDay = start.timeOfDay < NIGHT_START;
  const startDirected = start.directed ?? 0;
  // Damage is a drop from the highest health seen, so healing then being hit again counts.
  let peakHealth = start.health;
  let fired = false;

  function evaluate(now: WorldSnapshot): string | null {
    peakHealth = Math.max(peakHealth, now.health);

    if (!off.has("damage") && now.health < peakHealth) {
      return `interrupted: you took damage (health ${Math.round(now.health)})`;
    }

    if (!off.has("hostile")) {
      for (const h of [...now.hostiles].sort((a, b) => a.distance - b.distance)) {
        if (h.distance > HOSTILE_RADIUS) continue;
        const before = startDistance.get(h.id);
        if (before === undefined || h.distance <= before - CLOSING_MARGIN) {
          return `interrupted: a ${h.name} came within ${HOSTILE_RADIUS} blocks (now ${Math.round(h.distance)})`;
        }
      }
    }

    if (!off.has("night") && startedDay && now.timeOfDay >= NIGHT_START) {
      return "interrupted: night is falling";
    }

    if (!off.has("message") && (now.directed ?? 0) > startDirected && now.lastDirected) {
      return `interrupted: ${now.lastDirected.from} said to you: "${now.lastDirected.text.slice(0, 120)}"`;
    }
    return null;
  }

  return {
    check(now) {
      if (fired) return null;
      const reason = evaluate(now);
      if (reason) fired = true;
      return reason;
    },
  };
}
