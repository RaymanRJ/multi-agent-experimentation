import minimist from "minimist";
import mineflayer from "mineflayer";
import "./protocolFix.js"; // patches a minecraft-data bug; must load before any bot is created
import pathfinderPkg from "mineflayer-pathfinder";
import { mineflayer as startViewer } from "prismarine-viewer";

import { env, loadEnv } from "./env.js";
import { countInventory, observe } from "./observe.js";
import { attachComms, narrate, speak, trackActivity, type MessageBuffer } from "./comms.js";
import { createWatch, SUPPRESSED, type Watch, type WorldSnapshot } from "./interrupts.js";
import { RunLog } from "./log.js";
import { GOAL_CHECKS, SCENARIOS, applyScenario, presetName, resolveGoal } from "./scenario.js";
import { SKILLS, findSkill } from "./skills/index.js";
import { movementsFor } from "./skills/util.js";
import { ScriptedPolicy } from "./policy/scripted.js";
import { LLMPolicy } from "./policy/llm.js";
import { BRAINS, createBackend, type BrainName } from "./backends/index.js";
import { costUSD } from "./backends/pricing.js";
import { BrainError, preflight } from "./backends/errors.js";
import type { Backend, EndReason, LoggedStep, MemoryMode, Policy, RunConfig, ScenarioName, SkillContext } from "./types.js";

const { pathfinder } = pathfinderPkg;

loadEnv();

const argv = minimist(process.argv.slice(2), {
  string: ["scenario", "brain", "name", "goal", "memory", "comms", "episode"],
  // A run ends on its goal, the model saying "done", or the in-game time budget
  // (one full day by default). --steps is only a safety cap; --budget-usd guards paid models.
  default: { scenario: "sandbox", brain: "scripted", steps: 200, ticks: 24000, "budget-usd": 1, memory: "plan", comms: "on" },
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

function buildPolicy(brain: string): { policy: Policy; backend?: Backend } {
  switch (brain) {
    case "scripted":
      return { policy: new ScriptedPolicy() };
    case "claude":
    case "gpt":
    case "ollama": {
      const backend = createBackend(brain as BrainName);
      return { policy: new LLMPolicy(backend, { memory, comms }), backend };
    }
    default:
      console.error(`unknown brain "${brain}" — valid: scripted, ${BRAINS.join(", ")}`);
      process.exit(1);
  }
}

/** The slice of world state the interrupt triggers compare, taken straight from the bot. */
function snapshot(bot: mineflayer.Bot, buffer: MessageBuffer | null): WorldSnapshot {
  const hostiles: WorldSnapshot["hostiles"] = [];
  for (const entity of Object.values(bot.entities)) {
    if (!entity || entity.type !== "hostile") continue;
    hostiles.push({ id: entity.id, name: entity.name ?? "hostile mob", distance: entity.position.distanceTo(bot.entity.position) });
  }
  return {
    health: bot.health,
    hostiles,
    timeOfDay: bot.time.timeOfDay,
    ...(buffer ? { directed: buffer.directed, lastDirected: buffer.lastDirected } : {}),
  };
}

async function main(): Promise<void> {
  const agentName = String(argv["name"] || `agent_${argv["brain"]}`);
  const maxSteps = Number(argv["steps"]);
  const maxTicks = Number(argv["ticks"]);
  const budgetUSD = Number(argv["budget-usd"]);
  const goalCheck = GOAL_CHECKS[presetName(goal) ?? ""];
  const { policy, backend } = buildPolicy(String(argv["brain"]));
  if (backend) {
    // Find a bad key or an empty account now, not ten minutes into an episode.
    try {
      await preflight(backend);
    } catch (error) {
      console.error(`[${agentName}] brain ${backend.name} is not usable, not starting: ${(error as Error).message}`);
      process.exit(3);
    }
  }
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
  const activities = trackActivity(bot, agentName);
  let lastPlan: string | undefined;
  let stepEvents: string[] = [];
  let stopping = false;
  // Set while a skill runs; the first trigger that fires stores its reason here and
  // flips shouldStop(), so the skill aborts at its next check.
  let watch: Watch | null = null;
  let interruptReason: string | null = null;

  const checkInterrupts = () => {
    if (!watch || interruptReason) return;
    const reason = watch.check(snapshot(bot, buffer));
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
  bot.pathfinder.setMovements(movementsFor(bot));
  // Chunks stream in after spawn; findBlock only sees loaded ones, so observing
  // immediately reports an empty world.
  await bot.waitForChunksToLoad();
  console.log(`[${agentName}] spawned at ${bot.entity.position.floored()}`);

  // The budget is world age, not time of day: sleeping skips the clock, not the age.
  const startAge = bot.time.age;
  const elapsedTicks = () => bot.time.age - startAge;
  let timeUp = false;
  bot.on("physicsTick", () => {
    if (timeUp || elapsedTicks() < maxTicks) return;
    timeUp = true;
    stopping = true; // running skills see shouldStop() and bail
    console.log(`[${agentName}] time budget of ${maxTicks} ticks used up`);
  });
  let spentUSD = 0;
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
  // Identical decisions getting the identical result: reported as a fact (not advice) in
  // recentEvents, every 3 repeats, so a looping brain can see it is looping.
  let lastOutcome = "";
  let repeats = 0;
  let ended: EndReason | undefined;

  for (let step = 1; !ended; step++) {
    const observation = observe(bot, {
      step,
      scenario: scenario.name,
      goal,
      recentEvents,
      activities,
      ...(buffer ? { messages: buffer.snapshot() } : {}),
      ...(memory !== "none" && lastPlan ? { plan: lastPlan } : {}),
    });
    stepEvents = [];
    const write = (fields: Omit<LoggedStep, "step" | "at" | "observation" | "config" | "ticks" | "ended">) => {
      // Checked last, so a goal met or a model "done" on the final step wins.
      if (!ended && timeUp) ended = "time budget";
      if (!ended && spentUSD >= budgetUSD) ended = "cost budget";
      if (!ended && step >= maxSteps) ended = "step limit";
      runLog.write({ step, at: new Date().toISOString(), observation, ...fields, config, ticks: elapsedTicks(), inventoryAfter: countInventory(bot), ...(ended ? { ended } : {}) });
    };

    const startedAt = Date.now();
    let output;
    try {
      output = await policy.decide(observation, SKILLS);
      policyFailures = 0;
    } catch (error) {
      // A slow or unreachable model must not end the run. Log the failed step,
      // let the world tick on, and ask again — the timeout is itself data.
      const reason = `the brain failed to decide: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`[${agentName}] step ${step}: ${reason}`);
      if (error instanceof BrainError && error.kind === "fatal") {
        // No credits, no quota, bad key: retrying cannot help, and it is not the model failing.
        console.error(`[${agentName}] brain unavailable — ending the run`);
        ended = "brain unavailable";
      } else if (++policyFailures >= 3) {
        console.error(`[${agentName}] giving up after 3 failed decisions in a row`);
        ended = "brain failed";
      }
      write({ decision: null, result: { status: "failed", reason }, decisionMs: Date.now() - startedAt, calls: [] });
      if (!ended) await bot.waitForTicks(100);
      continue;
    }
    const { decision, calls, system } = output;
    const decisionMs = Date.now() - startedAt;
    for (const call of calls) {
      const cost = costUSD(call);
      if (Number.isFinite(cost)) spentUSD += cost; // unknown cloud models show as "unknown" in the report
    }
    const extra = { calls, decisionMs, ...(system ? { system } : {}) };

    if (!decision) {
      console.log(`[${agentName}] policy ended the episode`);
      ended = "model ended";
      write({ decision: null, result: null, ...extra });
      break;
    }

    if (timeUp) {
      // The budget ran out while the model was deciding; don't start a skill that would abort at once.
      write({ decision, result: { status: "aborted", reason: "the time budget ran out" }, ...extra });
      break;
    }

    const skill = findSkill(decision.skill);
    if (!skill) {
      const result = { status: "failed" as const, reason: `no such skill: ${decision.skill}` };
      recentEvents.push(result.reason);
      write({ decision, result, events: [], ...extra });
      continue;
    }

    console.log(`[${agentName}] step ${step}: ${decision.skill}(${JSON.stringify(decision.args)})`);
    narrate(bot, `${decision.skill}(${JSON.stringify(decision.args)})${decision.rationale ? ` — ${decision.rationale}` : ""}`);
    lastPlan = decision.plan ?? lastPlan;
    if (buffer && decision.say?.text) speak(bot, buffer, decision.say.to, decision.say.text);
    interruptReason = null;
    watch = createWatch(snapshot(bot, buffer), SUPPRESSED[skill.name] ?? []);
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
    const outcome = `${decision.skill} ${JSON.stringify(decision.args)} ${result.status} ${result.reason ?? ""}`;
    repeats = outcome === lastOutcome ? repeats + 1 : 1;
    lastOutcome = outcome;
    // Only waiting legitimately repeats. Plain successes count too: a small model will run
    // mine_stone(3) forty times, each one succeeding, while holding everything the next step needs.
    if (repeats >= 3 && repeats % 3 === 0 && decision.skill !== "wait") {
      const how = result.status === "success" && !result.reason ? "each succeeded" : "all got the same result";
      const note = `your last ${repeats} decisions were the same ${decision.skill}(${JSON.stringify(decision.args)}) and ${how}`;
      recentEvents.push(note);
      stepEvents.push(note);
    }
    if (goalCheck?.({ skill: decision.skill, status: result.status, inventory: countInventory(bot) })) {
      console.log(`[${agentName}] goal met`);
      ended = "goal met";
    }
    write({ decision, result, events: stepEvents, ...extra });
  }

  console.log(`[${agentName}] ended: ${ended} after ${elapsedTicks()} ticks, $${spentUSD.toFixed(4)}`);
  stopping = true;
  console.log(`[${agentName}] done — log at ${runLog.file}`);
  bot.quit();
  setTimeout(() => process.exit(0), 500);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
