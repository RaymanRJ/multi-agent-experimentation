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
  /** Air left, 0-20; 0 means drowning. Absent when unknown. */
  oxygen?: number;
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
export type Trigger = "damage" | "hostile" | "dusk" | "night" | "message";

/** A hostile at or inside this many blocks is a threat worth stopping for. */
export const HOSTILE_RADIUS = 6;
/** A hostile already known at the start only interrupts if it closes in by this much. */
export const CLOSING_MARGIN = 2;
/** Same cut-off as Observation.isDay. */
export const NIGHT_START = 12000;
/** About a minute before NIGHT_START: still time to get under cover. */
export const DUSK_START = 10800;
/**
 * After a message interrupts a skill, further messages wait this long before they can interrupt
 * again. Without it two agents replying to each other abort each other's every skill.
 */
export const MESSAGE_COOLDOWN_MS = 60_000;

/** Triggers to suppress for this skill: its own list, plus "message" while the cooldown runs. */
export function suppressedFor(skill: string, lastMessageInterruptMs: number | null, nowMs: number): Trigger[] {
  const own = SUPPRESSED[skill] ?? [];
  const cooling = lastMessageInterruptMs !== null && nowMs - lastMessageInterruptMs < MESSAGE_COOLDOWN_MS;
  return cooling && !own.includes("message") ? [...own, "message"] : own;
}

/**
 * Skills that handle the danger themselves; the named triggers are suppressed for them.
 * Keyed by skill name (never scenario name), so the Skill contract needs no new field.
 *  - flee: its whole purpose is to run from hostiles that are hitting it, so damage and
 *    hostile interrupts would abort it exactly when it matters. Night is also moot.
 *  - eat: a couple of seconds long; the model replans right after anyway.
 *  - sleep: only starts at night (no night edge) and bails by itself on monsters.
 *  - build_shelter: getting under cover is the answer to dusk and nightfall, not something they should cut short.
 *  - ask_agent: it is waiting for an answer addressed to it, which must not cut the wait short.
 */
export const SUPPRESSED: Record<string, Trigger[]> = {
  flee: ["damage", "hostile", "dusk", "night", "message"],
  eat: ["damage", "hostile", "dusk", "night", "message"],
  sleep: ["damage", "hostile", "dusk", "night", "message"],
  build_shelter: ["dusk", "night"],
  ask_agent: ["message"],
};

export interface Watch {
  /** Returns an interrupt reason the first time one fires, then null forever (one per run). */
  check(now: WorldSnapshot): string | null;
  /** Which trigger fired, once one has. */
  firedBy(): Trigger | null;
}

export function createWatch(start: WorldSnapshot, suppressed: Trigger[] = []): Watch {
  const off = new Set(suppressed);
  const startDistance = new Map(start.hostiles.map((h) => [h.id, h.distance]));
  const startedDay = start.timeOfDay < NIGHT_START;
  const startDirected = start.directed ?? 0;
  // Damage is a drop from the highest health seen, so healing then being hit again counts.
  let peakHealth = start.health;
  let fired: Trigger | null = null;

  function evaluate(now: WorldSnapshot): [Trigger, string] | null {
    peakHealth = Math.max(peakHealth, now.health);

    if (!off.has("damage") && now.health < peakHealth) {
      const drowning = now.oxygen !== undefined && now.oxygen <= 0;
      return ["damage", `interrupted: you took damage (health ${Math.round(now.health)})${drowning ? " — you are under water and out of air; move somewhere else" : ""}`];
    }

    if (!off.has("hostile")) {
      for (const h of [...now.hostiles].sort((a, b) => a.distance - b.distance)) {
        if (h.distance > HOSTILE_RADIUS) continue;
        const before = startDistance.get(h.id);
        if (before === undefined || h.distance <= before - CLOSING_MARGIN) {
          return ["hostile", `interrupted: a ${h.name} came within ${HOSTILE_RADIUS} blocks (now ${Math.round(h.distance)})`];
        }
      }
    }

    if (!off.has("night") && startedDay && now.timeOfDay >= NIGHT_START) {
      return ["night", "interrupted: night is falling"];
    }

    if (!off.has("dusk") && start.timeOfDay < DUSK_START && now.timeOfDay >= DUSK_START && now.timeOfDay < NIGHT_START) {
      return ["dusk", `interrupted: the sun is setting — night falls in about ${Math.round((NIGHT_START - now.timeOfDay) / 20)} seconds`];
    }

    if (!off.has("message") && (now.directed ?? 0) > startDirected && now.lastDirected) {
      return ["message", `interrupted: ${now.lastDirected.from} said to you: "${now.lastDirected.text.slice(0, 120)}"`];
    }
    return null;
  }

  return {
    check(now) {
      if (fired) return null;
      const hit = evaluate(now);
      if (!hit) return null;
      fired = hit[0];
      return hit[1];
    },
    firedBy: () => fired,
  };
}
