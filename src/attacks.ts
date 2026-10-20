import type { Bot } from "mineflayer";
import type { Entity } from "prismarine-entity";
import { SIGHT_RADIUS } from "./observe.js";

/**
 * Who hit whom, as a player would see it. Before this an agent that was hit was told only that it
 * took damage, so a fight between agents showed in the attacker's log and nowhere else. The server
 * reports every hit with its source (the 1.20+ damage event) to everyone who can see the victim, so:
 *
 *   - the agent hit is told by whom: "you were hit by qa (another agent)", "you were hit by a zombie"
 *   - the attacker is told when it hits another agent: "you hit qa" (hits on animals and mobs are
 *     its `hunt` and need no line each)
 *   - an agent that sees one agent hit another (within SIGHT_RADIUS) is told: "qa hit qb"
 *
 * Hits come every half second in a fight, so the same line again within REPEAT_MS is folded into the
 * last one ("you were hit by a zombie (x4)") rather than pushing everything else out of recentEvents.
 */
const REPEAT_MS = 10_000;

function who(entity: Entity): string {
  return entity.type === "player" ? (entity.username ?? "a player") : `a ${entity.name ?? "creature"}`;
}

/** Calls `report` with a new line, or with `replaceLast` true when the line repeats the previous one. */
export function watchAttacks(bot: Bot, report: (line: string, replaceLast: boolean) => void, now = () => Date.now()): void {
  let last = { text: "", count: 0, at: 0 };
  const say = (text: string) => {
    const t = now();
    if (text === last.text && t - last.at <= REPEAT_MS) {
      last = { text, count: last.count + 1, at: t };
      report(`${text} (x${last.count})`, true);
    } else {
      last = { text, count: 1, at: t };
      report(text, false);
    }
  };

  bot.on("entityHurt", (victim: Entity, source?: Entity) => {
    if (!source || source === victim) return; // a fall, drowning, fire: no one did it
    if (victim === bot.entity) {
      say(`you were hit by ${who(source)}${source.type === "player" ? " (another agent)" : ""}`);
    } else if (source === bot.entity) {
      if (victim.type === "player") say(`you hit ${who(victim)}`);
    } else if (victim.type === "player" && source.type === "player" && victim.position.distanceTo(bot.entity.position) <= SIGHT_RADIUS) {
      say(`${who(source)} hit ${who(victim)}`);
    }
  });
}
