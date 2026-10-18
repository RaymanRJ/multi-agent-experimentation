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
 *
 * Plain presets state only the outcome: working out the steps is part of what is being
 * measured, and what the game requires reaches the model the way it would reach a player,
 * through skill descriptions, failure messages and `canCraft`. Each `-guided` variant spells
 * the steps out, so the gap between the two measures how much a model needs that help.
 * The guided texts are exactly the earlier plain ones, so older logs report as guided.
 */
export const GOALS: Record<string, string> = {
  shelter: "Build a shelter. Once it is built, end the episode.",
  "shelter-guided":
    "Build a shelter. It needs 11 logs in your inventory (the shelter turns them into planks itself). " +
    "If you have fewer than 11 logs, gather wood; once you have 11 or more, build the shelter. " +
    "Once it is built, end the episode.",
  tools: "Craft a stone pickaxe. Once you have it, end the episode.",
  "tools-guided":
    "Craft a stone pickaxe. Check your inventory and do the first step you have not done yet: " +
    "gather a few logs, craft a wooden_pickaxe, mine 3 stone, craft a stone_pickaxe. Once you have it, end the episode.",
  outpost:
    "Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. " +
    "Then survive the night. The episode ends by itself at sunrise once you have all of that.",
  // A team goal: met by what the agents hold between them, so it pays to split the work and hand things over.
  "team-camp":
    "Between you, your team must end up holding a stone pickaxe, a stone axe, a stone sword and a stone shovel, " +
    "with every member carrying at least one of them, and one of you must build a two-storey shelter. " +
    "It does not matter who builds. The episode ends by itself once the team has all of that.",
  iron: "Craft an iron pickaxe. Once you have it, end the episode.",
  diamond: "Make a piece of diamond armor. Once you have it, end the episode.",
  gather: "Gather as much wood and stone as you can.",
  explore: "Explore as far as you can, and gather anything useful you find on the way.",
};

/**
 * Deterministic "is the goal met?" checks for preset goals, run after each skill.
 * Open-ended goals (gather, explore, the scenario defaults) have none: they run
 * until the model ends them or the time budget does. Keyed by goal, never by
 * scenario — the same goal ends the same way in either world.
 */
export const DIAMOND_ARMOR = ["diamond_helmet", "diamond_chestplate", "diamond_leggings", "diamond_boots"];

/**
 * Goals judged on the whole team: the check sees every member's inventory added together, each
 * member's own inventory, and a shelter built by any of them. Alone, an agent is a team of one.
 */
export const TEAM_GOALS = new Set(["team-camp"]);

/** The stone tools the outpost goal asks for. */
export const OUTPOST_TOOLS = ["stone_pickaxe", "stone_axe", "stone_sword", "stone_shovel"];

/** What a goal check sees after each skill: that skill's result, plus what the run has achieved so far. */
export interface GoalState {
  skill: string;
  status: string;
  inventory: Record<string, number>;
  /** A build_shelter has succeeded at some point in the run. */
  shelterBuilt: boolean;
  /** A whole night has passed, without dying, since the shelter was built. */
  nightSurvivedSinceShelter: boolean;
  /** Storeys of the tallest shelter built so far (0 for none). Absent where no goal needs it. */
  shelterStoreys?: number;
  /** Each team member's own inventory, by name, for team goals that ask something of every member. */
  members?: Record<string, Record<string, number>>;
}

export const GOAL_CHECKS: Record<string, (state: GoalState) => boolean> = {
  shelter: ({ skill, status }) => skill === "build_shelter" && status === "success",
  tools: ({ inventory }) => (inventory["stone_pickaxe"] ?? 0) > 0,
  iron: ({ inventory }) => (inventory["iron_pickaxe"] ?? 0) > 0,
  diamond: ({ inventory }) => DIAMOND_ARMOR.some((piece) => (inventory[piece] ?? 0) > 0),
  outpost: ({ inventory, shelterBuilt, nightSurvivedSinceShelter }) =>
    shelterBuilt && nightSurvivedSinceShelter && OUTPOST_TOOLS.every((tool) => (inventory[tool] ?? 0) > 0),
  "team-camp": (state) => GOAL_GAPS["team-camp"]!(state).length === 0,
};

/**
 * What still stands between the run and its preset goal, as plain facts — what a player would see
 * by looking at their inventory, never the steps to take. Told to a model that says "done" too early.
 */
export const GOAL_GAPS: Record<string, (state: GoalState) => string[]> = {
  shelter: () => ["no shelter has been built yet"],
  tools: ({ inventory }) => missing(inventory, ["stone_pickaxe"]),
  iron: ({ inventory }) => missing(inventory, ["iron_pickaxe"]),
  diamond: ({ inventory }) => (DIAMOND_ARMOR.some((piece) => (inventory[piece] ?? 0) > 0) ? [] : ["you have no piece of diamond armor"]),
  outpost: ({ inventory, shelterBuilt, nightSurvivedSinceShelter }) => [
    ...missing(inventory, OUTPOST_TOOLS),
    ...(shelterBuilt ? [] : ["no shelter has been built yet"]),
    ...(nightSurvivedSinceShelter ? [] : ["you have not yet survived a night since building the shelter"]),
  ],
  "team-camp": ({ inventory, shelterStoreys, members }) => [
    ...OUTPOST_TOOLS.filter((tool) => (inventory[tool] ?? 0) === 0).map((tool) => `nobody on the team has a ${tool}`),
    ...Object.entries(members ?? {})
      .filter(([, held]) => !OUTPOST_TOOLS.some((tool) => (held[tool] ?? 0) > 0))
      .map(([name]) => `${name} carries no stone tool`),
    ...((shelterStoreys ?? 0) >= 2 ? [] : ["nobody on the team has built a two-storey shelter yet"]),
  ],
};

function missing(inventory: Record<string, number>, items: string[]): string[] {
  return items.filter((item) => (inventory[item] ?? 0) === 0).map((item) => `you have no ${item}`);
}

/** Night as far as the goal is concerned: from when hostiles spawn until they burn at sunrise. */
export function isNight(timeOfDay: number): boolean {
  return timeOfDay >= 13000 && timeOfDay < 23000;
}

/** "tools" for "tools-guided": the task a preset sets, whatever help it gives. Success is judged per task. */
export function goalTask(preset: string): string {
  return preset.replace(/-guided$/, "");
}

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
