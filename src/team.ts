/**
 * What each member of a team has achieved, shared between agents that run as separate processes.
 * Each agent writes only its own file, so there is nothing to lock; readers take whatever is there.
 * The board is how a team goal is checked against the whole team, and how a collaborative agent
 * knows whether its teammates are done. It is never shown to the model: teammates learn about each
 * other the way players do, by looking and by talking.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface MemberState {
  inventory: Record<string, number>;
  shelterBuilt: boolean;
  nightSurvivedSinceShelter: boolean;
  /** Storeys of the tallest shelter this member has built; 0 for none. */
  shelterStoreys: number;
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
  };
}

/** Teammates whose own goal is not met yet, by name, for "the team is not done" messages. */
export function stillWorking(board: Record<string, MemberState | undefined>): string[] {
  return Object.entries(board).filter(([, s]) => !s?.goalMet).map(([name]) => name);
}
