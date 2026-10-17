import minimist from "minimist";
import mineflayer from "mineflayer";
import "./protocolFix.js"; // patches a minecraft-data bug; must load before any bot is created
import pathfinderPkg from "mineflayer-pathfinder";
import { mineflayer as startViewer } from "prismarine-viewer";

import { env, loadEnv } from "./env.js";
import { countInventory, observe } from "./observe.js";
import { attachComms, narrate, speak, trackActivity, type MessageBuffer } from "./comms.js";
import { createWatch, suppressedFor, type Watch, type WorldSnapshot } from "./interrupts.js";
import { RunLog } from "./log.js";
import { GOAL_CHECKS, GOAL_GAPS, SCENARIOS, applyScenario, goalTask, isNight, presetName, resolveGoal } from "./scenario.js";
import { SKILLS, findSkill } from "./skills/index.js";
import { getOutOfWater, headInWater, movementsFor } from "./skills/util.js";
import { ScriptedPolicy } from "./policy/scripted.js";
import { LLMPolicy } from "./policy/llm.js";
import { BRAINS, createBackend, type BrainName } from "./backends/index.js";
import { costUSD, PRICED_MODELS } from "./backends/pricing.js";
import { BrainError, preflight } from "./backends/errors.js";
import { STANCES, type Backend, type EndReason, type LoggedStep, type MemoryMode, type Policy, type RunConfig, type ScenarioName, type SkillContext, type Stance } from "./types.js";

const { pathfinder } = pathfinderPkg;

loadEnv();

const argv = minimist(process.argv.slice(2), {
  string: ["scenario", "brain", "name", "goal", "memory", "comms", "stance", "episode", "progress"],
  // A run ends on its goal, the model saying "done", or the in-game time budget
  // (one full day by default). --steps is only a safety cap; --budget-usd guards paid models.
  default: { scenario: "sandbox", brain: "scripted", steps: 200, ticks: 24000, "budget-usd": 1, memory: "plan", comms: "on", stance: "neutral", progress: "off" },
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
const progressArg = String(argv["progress"] || "off");
if (!["on", "off"].includes(progressArg)) {
  console.error(`unknown --progress "${progressArg}" — expected on or off`);
  process.exit(1);
}
const progress = progressArg === "on";
const stance = String(argv["stance"] || "neutral") as Stance;
if (!STANCES.includes(stance)) {
  console.error(`unknown --stance "${stance}" — expected ${STANCES.join(", ")}`);
  process.exit(1);
}
const config: RunConfig = {
  episode: String(argv["episode"] || `ep-${new Date().toISOString().replace(/[:.]/g, "-")}`),
  memory,
  comms,
  stance,
  progress,
};

function buildPolicy(brain: string): { policy: Policy; backend?: Backend } {
  switch (brain) {
    case "scripted":
      return { policy: new ScriptedPolicy() };
    default: {
      if (!BRAINS.includes(brain as BrainName)) {
        console.error(`unknown brain "${brain}" — valid: scripted, ${BRAINS.join(", ")}`);
        process.exit(1);
      }
      let backend: Backend;
      try {
        backend = createBackend(brain as BrainName);
      } catch (error) {
        console.error((error as Error).message);
        process.exit(1);
      }
      return { policy: new LLMPolicy(backend, { memory, comms, stance, progress }), backend };
    }
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
    oxygen: bot.oxygenLevel,
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
  const goalCheck = GOAL_CHECKS[goalTask(presetName(goal) ?? "")];
  const goalGaps = GOAL_GAPS[goalTask(presetName(goal) ?? "")];
  const { policy, backend } = buildPolicy(String(argv["brain"]));
  if (backend) {
    // Find a bad key or an empty account now, not ten minutes into an episode.
    let probe;
    try {
      probe = await preflight(backend);
    } catch (error) {
      console.error(`[${agentName}] brain ${backend.name} is not usable, not starting: ${(error as Error).message}`);
      process.exit(3);
    }
    // Without a price the cost would count as $0 and --budget-usd would never stop the run.
    if (!Number.isFinite(costUSD(probe))) {
      console.error(
        `[${agentName}] no price is known for model ${probe.model}, so --budget-usd cannot cap it; not starting. ` +
          `Add its rates to src/backends/pricing.ts (known: ${PRICED_MODELS.join(", ")}).`,
      );
      process.exit(3);
    }
  }
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const runLog = new RunLog(runId, agentName);

  console.log(`[${agentName}] scenario=${scenario.name} brain=${policy.name} episode=${config.episode} memory=${memory} comms=${comms ? "on" : "off"} stance=${stance} progress=${progress ? "on" : "off"} -> ${runLog.file}`);
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
  let lastMessageInterruptMs: number | null = null;

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
  // What the run has achieved, for goals that span more than one skill (outpost).
  let shelterBuilt = false;
  let nightSinceShelter = false;
  let nightSurvivedSinceShelter = false;
  bot.on("death", () => {
    recentEvents.push("you died and respawned");
    if (!nightSurvivedSinceShelter) nightSinceShelter = false; // dying forfeits this night
  });
  bot.on("time", () => {
    if (!shelterBuilt || nightSurvivedSinceShelter) return;
    // Sleeping counts: a bed can be used from dusk, and the night is skipped before it reaches isNight.
    if (isNight(bot.time.timeOfDay) || bot.isSleeping) nightSinceShelter = true;
    else if (nightSinceShelter) nightSurvivedSinceShelter = true;
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
  let doneRefused = false;
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
      ...(progress && goalGaps
        ? { stillNeeded: goalGaps({ skill: "", status: "", inventory: countInventory(bot), shelterBuilt, nightSurvivedSinceShelter }) }
        : {}),
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
      // Fail closed: a price that went unknown mid-run (a different model answered) ends the run.
      spentUSD += Number.isFinite(cost) ? cost : Infinity;
    }
    const extra = { calls, decisionMs, ...(system ? { system } : {}) };

    if (!decision && goalCheck && !doneRefused) {
      // A preset goal is checked after every skill and ends the run the moment it is met, so a
      // "done" now is a claim the game disagrees with. Say so once; a second "done" in a row stands.
      doneRefused = true;
      const gaps = goalGaps?.({ skill: "done", status: "success", inventory: countInventory(bot), shelterBuilt, nightSurvivedSinceShelter }) ?? [];
      const reason = `the goal is not met yet: ${gaps.length ? gaps.join("; ") : "check it against what you have"}`;
      console.log(`[${agentName}] refused done: goal not met`);
      recentEvents.push(`done refused (${reason})`);
      write({ decision: null, result: { status: "failed", reason }, events: ["done refused"], ...extra });
      continue;
    }
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

    doneRefused = false;
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
    if (headInWater(bot)) {
      // A reflex before any skill: every skill would otherwise be stopped at once by drowning damage.
      const out = await getOutOfWater(bot);
      const event = out ? "you were under water and swam out to dry ground" : "you are under water and could not find a way out";
      recentEvents.push(event);
      stepEvents.push(event);
    }
    interruptReason = null;
    watch = createWatch(snapshot(bot, buffer), suppressedFor(skill.name, lastMessageInterruptMs, Date.now()));
    const skillStartAge = bot.time.age;
    let result = await skill.run(ctx, decision.args);
    // A skill that refuses at once and a policy that answers at once would otherwise loop without
    // ever yielding, the bot stops reading its socket, and the server drops it.
    if (bot.time.age === skillStartAge) await bot.waitForTicks(20);
    if (watch.firedBy() === "message") lastMessageInterruptMs = Date.now();
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
    if (decision.skill === "build_shelter" && result.status === "success") shelterBuilt = true;
    if (goalCheck?.({ skill: decision.skill, status: result.status, inventory: countInventory(bot), shelterBuilt, nightSurvivedSinceShelter })) {
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
