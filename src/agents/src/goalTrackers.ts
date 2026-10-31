import type { LoggedStep } from "./types.js";
import { COOKED_MEAT, presetName } from "./scenario.js";
import { slept } from "./goalWork.js";

/**
 * What the minds panel's Progress card shows for a run: the parts of that run's goal, not one fixed ladder.
 * The ladder it had (logs to surviving a night) dated from the first single-agent goals: on team-base it lit
 * "survived night" for an agent hiding all night and had no step for sleeping, the part the goal asks for.
 */
export interface Tracker {
  label: string;
  /** Whether it stands now. A tool held is judged on the latest inventory, as the goal is. */
  on: boolean;
  /** The step it was first reached, or null. */
  step: number | null;
}

type Steps = LoggedStep[];
const heldAt = (step: LoggedStep) => step.inventoryAfter ?? step.observation.inventory ?? {};

/** Holding any of `items`: first when, and whether it is still so at the latest step. */
function holding(label: string, steps: Steps, items: string[]): Tracker {
  const has = (step: LoggedStep) => items.some((item) => (heldAt(step)[item] ?? 0) > 0);
  const first = steps.find(has);
  const last = steps.at(-1);
  return { label, on: !!last && has(last), step: first?.step ?? null };
}

/** Done once and stays done: built, slept. */
function once(label: string, steps: Steps, did: (step: LoggedStep) => boolean): Tracker {
  const first = steps.find(did);
  return { label, on: !!first, step: first?.step ?? null };
}

const builtShelter = (step: LoggedStep) => step.decision?.skill === "build_shelter" && step.result?.status === "success";
const shelterOf = (step: LoggedStep) => step.result?.detail as { size?: number; storeys?: number } | undefined;
const LARGE_SEEN = /large (two-storey )?shelter/;

/** A large home stands, as this agent knows it: it built or entered one, or sees a finished one. */
const homeKnown = (step: LoggedStep) =>
  (builtShelter(step) && shelterOf(step)?.size === 5 && !/placed \d+ blocks/.test(step.result?.reason ?? "")) ||
  (step.observation.shelters ?? []).some((line) => LARGE_SEEN.test(line) && !/unfinished/.test(line));

const twoStoreys = (step: LoggedStep) => builtShelter(step) && (shelterOf(step)?.storeys ?? 1) >= 2;

const CHEST_LINE = /^chest at (-?\d+,-?\d+,-?\d+)[^:]*: (.*?)(?: \(seen|$)/;

/** Cooked meat in the chests this agent knows of, step by step, against the number the goal needs. */
function meatInChests(steps: Steps, needed: number): Tracker {
  const chests = new Map<string, Record<string, number>>();
  const total = () => [...chests.values()].reduce((n, holds) => n + COOKED_MEAT.reduce((k, item) => k + (holds[item] ?? 0), 0), 0);
  let first: number | null = null;
  for (const step of steps) {
    for (const line of step.observation.chestsSeen ?? []) {
      const match = CHEST_LINE.exec(line);
      if (!match) continue;
      const holds: Record<string, number> = {};
      for (const part of match[2]!.split(", ")) {
        const item = /^(\d+) (\S+)$/.exec(part);
        if (item) holds[item[2]!] = Number(item[1]);
      }
      chests.set(match[1]!, holds);
    }
    for (const chest of (step.result?.detail?.["chests"] ?? []) as Array<{ at: string; holds: Record<string, number> }>) chests.set(chest.at, chest.holds);
    if (first === null && total() >= needed) first = step.step;
  }
  const now = total();
  return { label: `Cooked meat in a chest (${Math.min(now, 999)} of ${needed})`, on: now >= needed, step: first };
}

const tools = (steps: Steps) => [
  holding("Logs", steps, LOGS),
  holding("Wooden pickaxe", steps, ["wooden_pickaxe"]),
  holding("Cobblestone", steps, ["cobblestone"]),
  holding("Stone pickaxe", steps, ["stone_pickaxe"]),
];
const LOGS = ["oak_log", "spruce_log", "birch_log", "jungle_log", "acacia_log", "dark_oak_log", "mangrove_log", "cherry_log"];
const count = (steps: Steps, test: (item: string) => boolean) => Object.entries(steps.at(-1) ? heldAt(steps.at(-1)!) : {}).reduce((n, [item, k]) => n + (test(item) ? k : 0), 0);
const STONE_TOOLS = ["stone_pickaxe", "stone_axe", "stone_sword", "stone_shovel"];
const DIAMOND_ARMOR = ["diamond_helmet", "diamond_chestplate", "diamond_leggings", "diamond_boots"];

const homeGoal = (home: Tracker, steps: Steps): Tracker[] => [
  home,
  once("Slept in a bed", steps, slept),
  holding("Holds an iron pickaxe", steps, ["iron_pickaxe"]),
  meatInChests(steps, 10),
];

const TRACKERS: Record<string, (steps: Steps) => Tracker[]> = {
  shelter: (steps) => [once("Shelter", steps, builtShelter)],
  tools,
  iron: (steps) => [
    holding("Stone pickaxe", steps, ["stone_pickaxe"]),
    holding("Raw iron", steps, ["raw_iron"]),
    holding("Iron ingot", steps, ["iron_ingot"]),
    holding("Iron pickaxe", steps, ["iron_pickaxe"]),
  ],
  diamond: (steps) => [
    holding("Iron pickaxe", steps, ["iron_pickaxe"]),
    holding("Diamond", steps, ["diamond"]),
    holding("Diamond armor", steps, DIAMOND_ARMOR),
  ],
  outpost: (steps) => [
    ...STONE_TOOLS.map((tool) => holding(`Stone ${tool.slice(6)}`, steps, [tool])),
    once("Shelter", steps, builtShelter),
    once("Survived the night", steps, (step) => step.observation.isDay === true && steps.some((s) => s.step < step.step && !s.observation.isDay) && steps.some((s) => s.step < step.step && builtShelter(s))),
  ],
  gather: (steps) => [
    { label: `Wood held: ${count(steps, (item) => item.endsWith("_log") || item.endsWith("_planks"))}`, on: count(steps, (item) => item.endsWith("_log") || item.endsWith("_planks")) > 0, step: null },
    { label: `Stone held: ${count(steps, (item) => item === "cobblestone" || item === "stone")}`, on: count(steps, (item) => item === "cobblestone" || item === "stone") > 0, step: null },
  ],
  explore: (steps) => {
    const first = steps[0]?.observation.position;
    const far = first ? Math.max(0, ...steps.map((s) => Math.round(Math.hypot(s.observation.position.x - first.x, s.observation.position.z - first.z)))) : 0;
    return [{ label: `Furthest from the start: ${far} blocks`, on: far > 0, step: null }];
  },
  "team-camp": (steps) => [holding("Holds a stone tool", steps, STONE_TOOLS), once("Two-storey shelter", steps, twoStoreys)],
  "team-homestead": (steps) => homeGoal(once("Two-storey shelter", steps, twoStoreys), steps),
  "team-base": (steps) => homeGoal(once("The large home", steps, homeKnown), steps),
};

/**
 * The parts of a run's goal so far, from its log; empty for a goal in free text, which has no parts we know.
 * Once a run ends "goal met" every part stands: a sleep cut off by the goal firing logs as no sleep at all.
 */
export function goalTrackers(goal: string, steps: Steps): Tracker[] {
  const name = presetName(goal)?.replace(/-guided$/, "");
  const trackers = name ? (TRACKERS[name]?.(steps) ?? []) : [];
  const last = steps.at(-1);
  if (last?.ended === "goal met") return trackers.map((t) => ({ ...t, on: true, step: t.step ?? last.step }));
  return trackers;
}
