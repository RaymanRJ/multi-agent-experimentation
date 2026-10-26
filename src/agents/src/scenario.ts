import { Rcon } from "rcon-client";
import type { ScenarioName } from "./types.js";
import { inChests, type ChestViews } from "./team.js";
import { spotKey, type ShelterSpot } from "./skills/buildShelter.js";
import { GOALS, TEAM_GOALS } from "./goals.js";

// The goals live in goals.ts, which imports nothing, so the project site can read them too.
export { GOALS, TEAM_GOALS };

export interface Scenario {
  name: ScenarioName;
  goal: string;
  /** Server commands applied over RCON before the episode starts. */
  setup: string[];
}

/**
 * Animals placed at the start, the same in both scenarios. Spawn is in dark oak forest, whose canopy
 * keeps the ground too dark for farm animals: a fresh world has none within 64 blocks of spawn and
 * 3 sheep within 128 (survey, 20 October), and they only come back slowly. Agents explore 32 blocks
 * at a time, so food and wool were out of reach in practice. Each herd stands on open grass 45–60
 * blocks from spawn (8, 38); `y` is the ground there on this seed.
 */
export const HERDS = [
  { animal: "sheep", count: 6, x: 8, y: 76, z: 83 }, // south
  { animal: "cow", count: 4, x: 40, y: 70, z: 70 }, // south-east
  { animal: "pig", count: 4, x: -23, y: 76, z: 70 }, // south-west
  { animal: "chicken", count: 4, x: -34, y: 69, z: -4 }, // north-west
] as const;

/**
 * Commands that place the herds. The chunk is force-loaded for the summon (no player is near yet),
 * and every animal carries its own tag, so an agent joining a world that already has it (a team
 * run, or a second run on the main server) adds nothing.
 */
export function herdCommands(): string[] {
  const commands: string[] = [];
  for (const herd of HERDS) {
    commands.push(`forceload add ${herd.x} ${herd.z}`);
    for (let n = 0; n < herd.count; n++) {
      const tag = `mae_herd_${herd.animal}_${n}`;
      // Spread over a 3x2 patch, dropped from 2 blocks up so uneven ground can't bury one.
      const x = herd.x + (n % 3) - 1, z = herd.z + Math.floor(n / 3);
      commands.push(`execute unless entity @e[tag=${tag}] run summon ${herd.animal} ${x} ${herd.y + 2} ${z} {Tags:["mae_herd","${tag}"]}`);
    }
    commands.push(`forceload remove ${herd.x} ${herd.z}`);
  }
  return commands;
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
      ...herdCommands(),
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
      ...herdCommands(),
    ],
  },
};


/**
 * Deterministic "is the goal met?" checks for preset goals, run after each skill.
 * Open-ended goals (gather, explore, the scenario defaults) have none: they run
 * until the model ends them or the time budget does. Keyed by goal, never by
 * scenario — the same goal ends the same way in either world.
 */
export const DIAMOND_ARMOR = ["diamond_helmet", "diamond_chestplate", "diamond_leggings", "diamond_boots"];


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
  /** Chests opened by the agent (or, for a team goal, any member), as last seen; see `inChests` in team.ts. */
  chests?: ChestViews;
  /** This agent has slept in a bed (for a team goal: any member has). */
  sleptInBed?: boolean;
  /** Whether each team member has slept in a bed, by name, for goals that ask it of every member. */
  membersSlept?: Record<string, boolean>;
  /** Each team member's own inventory, by name, for team goals that ask something of every member. */
  members?: Record<string, Record<string, number>>;
  /** Every shelter the agent (or, for a team goal, any member) built or worked on. */
  shelters?: ShelterSpot[];
  /** The shelters (by "x,y,z") this agent has slept in a bed inside. */
  sleptIn?: string[];
  /** The same for each team member, by name. */
  membersSleptIn?: Record<string, string[]>;
}

export const GOAL_CHECKS: Record<string, (state: GoalState) => boolean> = {
  shelter: ({ skill, status }) => skill === "build_shelter" && status === "success",
  tools: ({ inventory }) => (inventory["stone_pickaxe"] ?? 0) > 0,
  iron: ({ inventory }) => (inventory["iron_pickaxe"] ?? 0) > 0,
  diamond: ({ inventory }) => DIAMOND_ARMOR.some((piece) => (inventory[piece] ?? 0) > 0),
  outpost: ({ inventory, shelterBuilt, nightSurvivedSinceShelter }) =>
    shelterBuilt && nightSurvivedSinceShelter && OUTPOST_TOOLS.every((tool) => (inventory[tool] ?? 0) > 0),
  "team-camp": (state) => GOAL_GAPS["team-camp"]!(state).length === 0,
  "team-homestead": (state) => GOAL_GAPS["team-homestead"]!(state).length === 0,
  "team-base": (state) => GOAL_GAPS["team-base"]!(state).length === 0,
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
  "team-homestead": ({ shelterStoreys, members, membersSlept, chests, sleptInBed, inventory }) => {
    // Alone, an agent is a team of one.
    const held = members ?? { you: inventory };
    const slept = membersSlept ?? { you: !!sleptInBed };
    const meat = COOKED_MEAT.reduce((n, item) => n + (inChests(chests)[item] ?? 0), 0);
    return [
      ...((shelterStoreys ?? 0) >= 2 ? [] : ["nobody on the team has built a two-storey shelter yet"]),
      ...Object.entries(slept).filter(([, did]) => !did).map(([name]) => `${name} has not slept in a bed yet`),
      ...Object.entries(held).filter(([, items]) => (items["iron_pickaxe"] ?? 0) === 0).map(([name]) => `${name} carries no iron_pickaxe`),
      ...(meat >= HOMESTEAD_MEAT ? [] : [`the chests the team has opened hold ${meat} cooked meat, not ${HOMESTEAD_MEAT}`]),
    ];
  },
};

/** The shelter `team-base` asks for: large, two storeys, finished. */
const isBase = (spot: ShelterSpot) => (spot.size ?? 3) === 5 && spot.storeys >= 2 && spot.complete !== false;

GOAL_GAPS["team-base"] = ({ shelters, members, membersSleptIn, sleptIn, chests, inventory }) => {
  const held = members ?? { you: inventory };
  const sleptBy = membersSleptIn ?? { you: sleptIn ?? [] };
  const bases = (shelters ?? []).filter(isBase);
  // The base everyone has slept in, or failing that, the one most of them have; then the first finished,
  // so every teammate is told of the same one. Before, a tie went to each agent's own (tlunap1: in rep 3
  // lc's list named its own second base for 118 decisions while la's and lb's named the first).
  const finished = (spot: ShelterSpot) => spot.finishedAt ?? Infinity;
  const best = bases
    .map((spot) => ({ spot, sleepers: Object.values(sleptBy).filter((keys) => keys.includes(spotKey(spot))).length }))
    .sort((a, b) => b.sleepers - a.sleepers || finished(a.spot) - finished(b.spot) || spotKey(a.spot).localeCompare(spotKey(b.spot)))[0];
  const meat = COOKED_MEAT.reduce((n, item) => n + (inChests(chests)[item] ?? 0), 0);
  return [
    ...(best ? [] : ["nobody on the team has finished a large two-storey shelter yet"]),
    ...(best
      ? Object.entries(sleptBy).filter(([, keys]) => !keys.includes(spotKey(best.spot))).map(([name]) => `${name} has not slept in a bed inside the large shelter at ${spotKey(best.spot)}`)
      : []),
    ...Object.entries(held).filter(([, items]) => (items["iron_pickaxe"] ?? 0) === 0).map(([name]) => `${name} carries no iron_pickaxe`),
    ...(meat >= HOMESTEAD_MEAT ? [] : [`the chests the team has opened hold ${meat} cooked meat, not ${HOMESTEAD_MEAT}`]),
  ];
};

/** Cooked meat for `team-homestead` and `team-base`: any kind counts. */
export const COOKED_MEAT = ["cooked_beef", "cooked_porkchop", "cooked_chicken", "cooked_mutton", "cooked_rabbit", "cooked_cod", "cooked_salmon"];
export const HOMESTEAD_MEAT = 10;

function missing(inventory: Record<string, number>, items: string[]): string[] {
  return items.filter((item) => (inventory[item] ?? 0) === 0).map((item) => `you have no ${item}`);
}

/** Night as far as the goal is concerned: from when hostiles spawn until they burn at sunrise. */
export { isNight } from "./daytime.js";
import { isNight } from "./daytime.js";

/**
 * Whether a whole night has passed since the shelter was built, alive. A death forfeits the night
 * it happens in: the next one has to be survived from its start. Sleeping counts (a bed can be used
 * from dusk, and the night is skipped before it reaches isNight).
 */
export class NightWatch {
  survived = false;
  private inNight = false;
  private forfeited = false;

  /** On every game tick: has the shelter been built, the time of day, whether the agent is asleep. */
  tick(shelterBuilt: boolean, timeOfDay: number, sleeping: boolean): void {
    if (this.survived) return;
    const night = isNight(timeOfDay) || sleeping;
    if (this.forfeited) {
      if (!night) this.forfeited = false; // the night it died in is over
      return;
    }
    if (!shelterBuilt) return;
    if (night) this.inNight = true;
    else if (this.inNight) this.survived = true;
  }

  died(): void {
    if (this.survived) return;
    this.inNight = false;
    this.forfeited = true;
  }
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

/**
 * Gives a player who has just joined every recipe. Crafting asks the server to fill the grid from the
 * recipe book, and the server does that only for recipes the player has unlocked; a chest unlocks only
 * once 10 or more stacks are held, so a chest craft failed with planks to spare. Agents already learn
 * what they can make from `canCraft` and failure messages, the way a player who knows the game would.
 */
export async function unlockRecipes(player: string, opts: { host: string; port: number; password: string }): Promise<void> {
  const rcon = await Rcon.connect({ host: opts.host, port: opts.port, password: opts.password });
  try {
    await rcon.send(`recipe give ${player} *`);
  } finally {
    await rcon.end();
  }
}
