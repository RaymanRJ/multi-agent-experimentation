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
  /** Inside a shelter with every wall, roof and doorway block in place: no mob can reach the agent. */
  enclosed?: boolean;
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
export type Trigger = "air" | "damage" | "hostile" | "dusk" | "night" | "message";

/**
 * Air (0-20, about 15 s under water from full) at or below which a skill is stopped. Drowning damage
 * only starts at 0, which was too late: by the time a model had decided, the agent had drowned.
 */
export const LOW_AIR = 10;
/** A hostile at or inside this many blocks is a threat worth stopping for. */
export const HOSTILE_RADIUS = 6;
/** A hostile already known at the start only interrupts if it closes in by this much. */
export const CLOSING_MARGIN = 2;
export { NIGHT_START, DUSK_START } from "./daytime.js";
import { DUSK_START, NIGHT_START, isNight } from "./daytime.js";
import { shownHealth } from "./observe.js";
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
 *  - sleep: only starts at night (no night edge) and bails by itself on monsters; a teammate's message
 *    still wakes it.
 *  - build_shelter: getting under cover is the answer to dusk, nightfall and a mob close by, not something they should cut short,
 *    and a message can wait the minute it takes.
 *  - ask_agent: it is waiting for an answer addressed to it, which must not cut the wait short.
 */
export const SUPPRESSED: Record<string, Trigger[]> = {
  flee: ["damage", "hostile", "dusk", "night", "message"],
  eat: ["damage", "hostile", "dusk", "night", "message"],
  // Not message: asleep until the night passes, an agent must still hear a teammate who asks it for
  // something (in tbase3 one held a spare bed while another, beside it, had none).
  sleep: ["damage", "hostile", "dusk", "night"],
  // Hostile too: going into a shelter is the answer to a zombie close by (in bpoc it was interrupted 13
  // times on the way in). Building in the open still stops for a mob or a hit by itself (construct), and
  // damage interrupts the way in only when health is low (DAMAGE_FLOOR). Message too: a teammate's message
  // stopped 3 entries in bpoc2; it waits for the next decision, made once inside.
  build_shelter: ["dusk", "night", "hostile", "message"],
  // A fight means taking hits with a mob close by; hunt stops by itself when health runs low.
  hunt: ["damage", "hostile"],
  ask_agent: ["message"],
};

/**
 * Skills that a hit stops only once health is at or below this. Getting inside is the escape from a mob
 * hitting the agent on the way in: in bpoc2, 7 entries were stopped by a hit and 4 of those agents fled
 * instead and never went back in. Low enough health is still the model's to decide on.
 */
export const DAMAGE_FLOOR: Record<string, number> = {
  build_shelter: 6,
};

export interface Watch {
  /** Returns an interrupt reason the first time one fires, then null forever (one per run). */
  check(now: WorldSnapshot): string | null;
  /** Which trigger fired, once one has. */
  firedBy(): Trigger | null;
}

export function createWatch(start: WorldSnapshot, suppressed: Trigger[] = [], damageFloor?: number): Watch {
  const off = new Set(suppressed);
  const startDistance = new Map(start.hostiles.map((h) => [h.id, h.distance]));
  // Night falls during the skill: not night when it started, night now. (At dawn the time is past
  // NIGHT_START but it is not night.)
  const startedDay = !isNight(start.timeOfDay);
  const startDirected = start.directed ?? 0;
  // Damage is a drop from the highest health seen, so healing then being hit again counts.
  let peakHealth = start.health;
  let fired: Trigger | null = null;

  function evaluate(now: WorldSnapshot): [Trigger, string] | null {
    peakHealth = Math.max(peakHealth, now.health);

    // Never suppressed: no skill handles running out of air itself.
    if (now.oxygen !== undefined && now.oxygen <= LOW_AIR && (start.oxygen ?? 20) > LOW_AIR) {
      return ["air", "interrupted: you are under water and running out of air"];
    }

    if (!off.has("damage") && now.health < peakHealth && (damageFloor === undefined || now.health <= damageFloor)) {
      const drowning = now.oxygen !== undefined && now.oxygen <= 0;
      return ["damage", `interrupted: you took damage (health ${shownHealth(now.health)})${drowning ? " — you are under water and out of air; move somewhere else" : ""}`];
    }

    // A mob outside closed walls can't reach the agent; damage still interrupts if one somehow does.
    if (!off.has("hostile") && !now.enclosed) {
      for (const h of [...now.hostiles].sort((a, b) => a.distance - b.distance)) {
        if (h.distance > HOSTILE_RADIUS) continue;
        const before = startDistance.get(h.id);
        if (before === undefined || h.distance <= before - CLOSING_MARGIN) {
          return ["hostile", `interrupted: a ${h.name} came within ${HOSTILE_RADIUS} blocks (now ${Math.round(h.distance)})`];
        }
      }
    }

    if (!off.has("night") && startedDay && isNight(now.timeOfDay)) {
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
