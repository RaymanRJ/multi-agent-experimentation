import minimist from "minimist";
import mineflayer from "mineflayer";
import pathfinderPkg from "mineflayer-pathfinder";
import { mineflayer as startViewer } from "prismarine-viewer";

import { env, loadEnv } from "./env.js";
import { observe } from "./observe.js";
import { attachComms, narrate, speak } from "./comms.js";
import { createWatch, SUPPRESSED, type Watch, type WorldSnapshot } from "./interrupts.js";
import { RunLog } from "./log.js";
import { SCENARIOS, applyScenario, resolveGoal } from "./scenario.js";
import { SKILLS, findSkill } from "./skills/index.js";
import { ScriptedPolicy } from "./policy/scripted.js";
import { LLMPolicy } from "./policy/llm.js";
import { BRAINS, createBackend, type BrainName } from "./backends/index.js";
import type { Backend, MemoryMode, Policy, RunConfig, ScenarioName, SkillContext } from "./types.js";

const { pathfinder, Movements } = pathfinderPkg;

loadEnv();

const argv = minimist(process.argv.slice(2), {
  string: ["scenario", "brain", "name", "goal", "memory", "comms", "episode"],
  default: { scenario: "sandbox", brain: "scripted", steps: 12, memory: "plan", comms: "on" },
});

const scenarioName = argv["scenario"] as ScenarioName;
const scenario = SCENARIOS[scenarioName];
if (!scenario) {
  console.error(`unknown scenario "${scenarioName}" — expected sandbox or survival`);
  process.exit(1);
}

let goal: string;
try {
  goal = resolveGoal(scenario, argv["goal"]);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

const memory = String(argv["memory"] || "plan") as MemoryMode;
if (!["none", "plan", "full"].includes(memory)) {
  console.error(`unknown --memory "${memory}" — expected none, plan or full`);
  process.exit(1);
}
const commsArg = String(argv["comms"] || "on");
if (!["on", "off"].includes(commsArg)) {
  console.error(`unknown --comms "${commsArg}" — expected on or off`);
  process.exit(1);
}
const comms = commsArg === "on";
const config: RunConfig = {
  episode: String(argv["episode"] || `ep-${new Date().toISOString().replace(/[:.]/g, "-")}`),
  memory,
  comms,
};

function buildPolicy(brain: string): Policy {
  switch (brain) {
    case "scripted":
      return new ScriptedPolicy();
    case "claude":
    case "gpt":
    case "ollama":
      // TODO: drop the cast once the memory branch merges (LLMPolicy then accepts options).
      return new (LLMPolicy as unknown as new (backend: Backend, options: { memory: MemoryMode; comms: boolean }) => Policy)(
        createBackend(brain as BrainName),
        { memory, comms },
      );
    default:
      console.error(`unknown brain "${brain}" — valid: scripted, ${BRAINS.join(", ")}`);
      process.exit(1);
  }
}

/** The slice of world state the interrupt triggers compare, taken straight from the bot. */
function snapshot(bot: mineflayer.Bot): WorldSnapshot {
  const hostiles: WorldSnapshot["hostiles"] = [];
  for (const entity of Object.values(bot.entities)) {
    if (!entity || entity.type !== "hostile") continue;
    hostiles.push({ id: entity.id, name: entity.name ?? "hostile mob", distance: entity.position.distanceTo(bot.entity.position) });
  }
  return { health: bot.health, hostiles, timeOfDay: bot.time.timeOfDay };
}

async function main(): Promise<void> {
  const agentName = String(argv["name"] || `agent_${argv["brain"]}`);
  const maxSteps = Number(argv["steps"]);
  const policy = buildPolicy(String(argv["brain"]));
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const runLog = new RunLog(runId, agentName);

  console.log(`[${agentName}] scenario=${scenario.name} brain=${policy.name} episode=${config.episode} memory=${memory} comms=${comms ? "on" : "off"} -> ${runLog.file}`);
  console.log(`[${agentName}] goal: ${goal}`);

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
  const buffer = attachComms(bot, agentName, comms);
  let lastPlan: string | undefined;
  let stepEvents: string[] = [];
  let stopping = false;
  // Set while a skill runs; the first trigger that fires stores its reason here and
  // flips shouldStop(), so the skill aborts at its next check.
  let watch: Watch | null = null;
  let interruptReason: string | null = null;

  const checkInterrupts = () => {
    if (!watch || interruptReason) return;
    const reason = watch.check(snapshot(bot));
    if (!reason) return;
    interruptReason = reason;
    console.log(`[${agentName}]   ${reason}`);
    // setGoal(null), not stop(): stop() latches and would instantly cancel the next skill's first goto.
    // Skills only look at shouldStop() between actions; cancel whatever is in flight
    // (walking, digging) so the abort lands promptly.
    bot.pathfinder.setGoal(null);
    bot.stopDigging();
  };
  bot.on("physicsTick", checkInterrupts);
  bot.on("health", checkInterrupts);

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
  narrate(bot, `online — brain: ${policy.name}`);

  // `--view` serves this bot's view of the world in a browser. Pass a port
  // (`--view 3008`) to watch several agents at once. It observes only — no
  // extra player joins the world.
  if (argv["view"] !== undefined && argv["view"] !== false) {
    const port = argv["view"] === true ? 3007 : Number(argv["view"]);
    startViewer(bot, { port, firstPerson: false, viewDistance: 6 });
    console.log(`[${agentName}] viewer at http://localhost:${port}`);
  }

  const ctx: SkillContext = {
    bot,
    log: (message) => {
      recentEvents.push(message);
      stepEvents.push(message);
      console.log(`[${agentName}]   ${message}`);
    },
    shouldStop: () => stopping || interruptReason !== null,
  };

  let policyFailures = 0;

  for (let step = 1; step <= maxSteps; step++) {
    const observation = observe(bot, {
      step,
      scenario: scenario.name,
      goal,
      recentEvents,
      ...(buffer ? { messages: buffer.snapshot() } : {}),
      ...(memory !== "none" && lastPlan ? { plan: lastPlan } : {}),
    });
    stepEvents = [];

    const startedAt = Date.now();
    let output;
    try {
      output = await policy.decide(observation, SKILLS);
      policyFailures = 0;
    } catch (error) {
      // A slow or unreachable model must not end the run. Log the failed step,
      // let the world tick on, and ask again — the timeout is itself data.
      const reason = `the brain failed to decide: ${error instanceof Error ? error.message : String(error)}`;
      const decisionMs = Date.now() - startedAt;
      runLog.write({ step, at: new Date().toISOString(), observation, decision: null, result: { status: "failed", reason }, decisionMs, calls: [], config });
      console.error(`[${agentName}] step ${step}: ${reason}`);
      if (++policyFailures >= 3) {
        console.error(`[${agentName}] giving up after 3 failed decisions in a row`);
        break;
      }
      await bot.waitForTicks(100);
      continue;
    }
    const { decision, calls, system } = output;
    const extra = { config, ...(system ? { system } : {}) };
    const decisionMs = Date.now() - startedAt;

    if (!decision) {
      runLog.write({ step, at: new Date().toISOString(), observation, decision: null, result: null, decisionMs, calls, ...extra });
      console.log(`[${agentName}] policy ended the episode`);
      break;
    }

    const skill = findSkill(decision.skill);
    if (!skill) {
      const result = { status: "failed" as const, reason: `no such skill: ${decision.skill}` };
      runLog.write({ step, at: new Date().toISOString(), observation, decision, result, decisionMs, calls, ...extra });
      recentEvents.push(result.reason);
      continue;
    }

    console.log(`[${agentName}] step ${step}: ${decision.skill}(${JSON.stringify(decision.args)})`);
    narrate(bot, `${decision.skill}(${JSON.stringify(decision.args)})${decision.rationale ? ` — ${decision.rationale}` : ""}`);
    lastPlan = decision.plan ?? lastPlan;
    if (buffer && decision.say?.text) speak(bot, buffer, decision.say.to, decision.say.text);
    interruptReason = null;
    watch = createWatch(snapshot(bot), SUPPRESSED[skill.name] ?? []);
    let result = await skill.run(ctx, decision.args);
    watch = null;
    if (interruptReason && !stopping) {
      // Tell the model why, in place of the skill's generic "the run is ending".
      if (result.status === "aborted") result = { ...result, reason: interruptReason };
      recentEvents.push(interruptReason);
      stepEvents.push(interruptReason);
    }
    console.log(`[${agentName}]   -> ${result.status}${result.reason ? `: ${result.reason}` : ""} ${JSON.stringify(result.detail ?? {})}`);

    recentEvents.push(`${decision.skill} ${result.status}${result.reason ? ` (${result.reason})` : ""}`);
    runLog.write({ step, at: new Date().toISOString(), observation, decision, result, decisionMs, calls, events: stepEvents, ...extra });
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
