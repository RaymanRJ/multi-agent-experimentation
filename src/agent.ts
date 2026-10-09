import minimist from "minimist";
import mineflayer from "mineflayer";
import pathfinderPkg from "mineflayer-pathfinder";

import { env, loadEnv } from "./env.js";
import { observe } from "./observe.js";
import { RunLog } from "./log.js";
import { SCENARIOS, applyScenario } from "./scenario.js";
import { SKILLS, findSkill } from "./skills/index.js";
import { ScriptedPolicy } from "./policy/scripted.js";
import { LLMPolicy } from "./policy/llm.js";
import { BRAINS, createBackend, type BrainName } from "./backends/index.js";
import type { Policy, ScenarioName, SkillContext } from "./types.js";

const { pathfinder, Movements } = pathfinderPkg;

loadEnv();

const argv = minimist(process.argv.slice(2), {
  string: ["scenario", "brain", "name"],
  default: { scenario: "sandbox", brain: "scripted", steps: 12 },
});

const scenarioName = argv["scenario"] as ScenarioName;
const scenario = SCENARIOS[scenarioName];
if (!scenario) {
  console.error(`unknown scenario "${scenarioName}" — expected sandbox or survival`);
  process.exit(1);
}

function buildPolicy(brain: string): Policy {
  switch (brain) {
    case "scripted":
      return new ScriptedPolicy();
    case "claude":
    case "gpt":
    case "ollama":
      return new LLMPolicy(createBackend(brain as BrainName));
    default:
      console.error(`unknown brain "${brain}" — valid: scripted, ${BRAINS.join(", ")}`);
      process.exit(1);
  }
}

async function main(): Promise<void> {
  const agentName = String(argv["name"] || `agent_${argv["brain"]}`);
  const maxSteps = Number(argv["steps"]);
  const policy = buildPolicy(String(argv["brain"]));
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const runLog = new RunLog(runId, agentName);

  console.log(`[${agentName}] scenario=${scenario.name} brain=${policy.name} -> ${runLog.file}`);

  await applyScenario(scenario, {
    host: env("MC_HOST", "localhost"),
    port: Number(env("RCON_PORT", "25575")),
    password: env("RCON_PASSWORD", "devpassword"),
  });
  console.log(`[${agentName}] scenario applied`);

  const bot = mineflayer.createBot({
    host: env("MC_HOST", "localhost"),
    port: Number(env("MC_PORT", "25565")),
    username: agentName,
    auth: "offline",
  });
  bot.loadPlugin(pathfinder);

  const recentEvents: string[] = [];
  let stopping = false;

  bot.on("kicked", (reason) => console.error(`[${agentName}] kicked: ${reason}`));
  bot.on("error", (error) => console.error(`[${agentName}] error: ${error.message}`));
  bot.on("death", () => {
    recentEvents.push("you died and respawned");
  });

  await new Promise<void>((resolve) => bot.once("spawn", () => resolve()));
  bot.pathfinder.setMovements(new Movements(bot));
  // Chunks stream in after spawn; findBlock only sees loaded ones, so observing
  // immediately reports an empty world.
  await bot.waitForChunksToLoad();
  console.log(`[${agentName}] spawned at ${bot.entity.position.floored()}`);

  const ctx: SkillContext = {
    bot,
    log: (message) => {
      recentEvents.push(message);
      console.log(`[${agentName}]   ${message}`);
    },
    shouldStop: () => stopping,
  };

  for (let step = 1; step <= maxSteps; step++) {
    const observation = observe(bot, {
      step,
      scenario: scenario.name,
      goal: scenario.goal,
      recentEvents,
    });

    const startedAt = Date.now();
    const { decision, calls } = await policy.decide(observation, SKILLS);
    const decisionMs = Date.now() - startedAt;

    if (!decision) {
      runLog.write({ step, at: new Date().toISOString(), observation, decision: null, result: null, decisionMs, calls });
      console.log(`[${agentName}] policy ended the episode`);
      break;
    }

    const skill = findSkill(decision.skill);
    if (!skill) {
      const result = { status: "failed" as const, reason: `no such skill: ${decision.skill}` };
      runLog.write({ step, at: new Date().toISOString(), observation, decision, result, decisionMs, calls });
      recentEvents.push(result.reason);
      continue;
    }

    console.log(`[${agentName}] step ${step}: ${decision.skill}(${JSON.stringify(decision.args)})`);
    const result = await skill.run(ctx, decision.args);
    console.log(`[${agentName}]   -> ${result.status}${result.reason ? `: ${result.reason}` : ""} ${JSON.stringify(result.detail ?? {})}`);

    recentEvents.push(`${decision.skill} ${result.status}${result.reason ? ` (${result.reason})` : ""}`);
    runLog.write({ step, at: new Date().toISOString(), observation, decision, result, decisionMs, calls });
  }

  stopping = true;
  console.log(`[${agentName}] done — log at ${runLog.file}`);
  bot.quit();
  setTimeout(() => process.exit(0), 500);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
