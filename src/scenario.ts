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
