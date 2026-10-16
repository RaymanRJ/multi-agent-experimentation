import { Rcon } from "rcon-client";
import type { ScenarioName } from "./types.js";

export interface Scenario {
  name: ScenarioName;
  goal: string;
  /** Server commands applied over RCON before the episode starts. */
  setup: string[];
}

/**
 * Two scenarios, one switch. They are not difficulty levels — they test
 * different things, and the relaxed one is the harder test: pressure supplies
 * focus, an open-ended goal does not.
 *
 * These must differ ONLY in world settings and goal text. If a code path
 * branches on the scenario name for anything else, that is a bug.
 */
export const SCENARIOS: Record<ScenarioName, Scenario> = {
  sandbox: {
    name: "sandbox",
    goal:
      "Explore and gather useful resources at your own pace. There is no threat and no deadline. " +
      "Decide for yourself what is worth doing.",
    setup: [
      "difficulty peaceful",
      "gamerule doDaylightCycle true",
      "gamerule doMobSpawning false",
      "time set day",
    ],
  },
  survival: {
    name: "survival",
    goal:
      "Survive the first night. Gather wood, craft tools, and build or find shelter before dark. " +
      "Hostile mobs will spawn once night falls.",
    setup: [
      "difficulty normal",
      "gamerule doDaylightCycle true",
      "gamerule doMobSpawning true",
      "time set day",
    ],
  },
};

/**
 * Preset goals for `--goal <name>`. The scenario sets the world rules; the goal
 * sets what the agents are asked to do, so any goal works in either scenario.
 * Written for the model: it names the steps the skill library can carry out.
 */
export const GOALS: Record<string, string> = {
  shelter:
    "Build a shelter. It needs 11 logs in your inventory (the shelter turns them into planks itself). " +
    "If you have fewer than 11 logs, gather wood; once you have 11 or more, build the shelter. " +
    "Once it is built, end the episode.",
  tools:
    "Craft a stone pickaxe. Check your inventory and do the first step you have not done yet: " +
    "gather a few logs, craft a wooden_pickaxe, mine 3 stone, craft a stone_pickaxe. Once you have it, end the episode.",
  gather: "Gather as much wood and stone as you can.",
  explore: "Explore as far as you can, and gather anything useful you find on the way.",
};

/**
 * Deterministic "is the goal met?" checks for preset goals, run after each skill.
 * Open-ended goals (gather, explore, the scenario defaults) have none: they run
 * until the model ends them or the time budget does. Keyed by goal, never by
 * scenario — the same goal ends the same way in either world.
 */
export const GOAL_CHECKS: Record<string, (after: { skill: string; status: string; inventory: Record<string, number> }) => boolean> = {
  shelter: ({ skill, status }) => skill === "build_shelter" && status === "success",
  tools: ({ inventory }) => (inventory["stone_pickaxe"] ?? 0) > 0,
};

/** The preset name for a resolved goal text, if it is one. */
export function presetName(goal: string): string | undefined {
  return Object.keys(GOALS).find((name) => GOALS[name] === goal);
}

/**
 * `--goal` takes a preset name or the goal text itself. A single word that is
 * not a preset is almost certainly a typo, so it is rejected rather than sent
 * to the model as the goal.
 */
export function resolveGoal(scenario: Scenario, goal: string | undefined): string {
  const value = goal?.trim();
  if (!value) return scenario.goal;
  const preset = GOALS[value.toLowerCase()];
  if (preset) return preset;
  if (!/\s/.test(value)) {
    throw new Error(`unknown goal "${value}" — use one of ${Object.keys(GOALS).join(", ")}, or a sentence in quotes`);
  }
  return value;
}

export async function applyScenario(
  scenario: Scenario,
  opts: { host: string; port: number; password: string },
): Promise<void> {
  const rcon = await Rcon.connect({
    host: opts.host,
    port: opts.port,
    password: opts.password,
  });
  try {
    for (const command of scenario.setup) {
      await rcon.send(command);
    }
  } finally {
    await rcon.end();
  }
}
