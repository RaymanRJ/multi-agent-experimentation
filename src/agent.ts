import minimist from "minimist";
import mineflayer from "mineflayer";
import "./protocolFix.js"; // patches a minecraft-data bug; must load before any bot is created
import pathfinderPkg from "mineflayer-pathfinder";
import { mineflayer as startViewer } from "prismarine-viewer";

import { env, loadEnv } from "./env.js";
import { countInventory, observe } from "./observe.js";
import { attachComms, narrate, responseTo, speak, trackActivity, type MessageBuffer } from "./comms.js";
import { createWatch, suppressedFor, type Watch, type WorldSnapshot } from "./interrupts.js";
import { describeShelter, HOME_RANGE, insideClosedShelter, insideSpot, REUSE_RANGE, spotKey, standing, type ShelterSpot } from "./skills/buildShelter.js";
import { readFileSync, writeFileSync } from "node:fs";
import { RunLog } from "./log.js";
import { brainLabel, liveFileFor, parseSteps, startFileFor, type LiveStep, type RunStart } from "./minds.js";
import { writeSummary } from "./summary.js";
import { fixOwnAir } from "./breathFix.js";
import { watchBreaks } from "./toolWear.js";
import { watchAttacks } from "./attacks.js";
import { GOAL_CHECKS, GOAL_GAPS, SCENARIOS, TEAM_GOALS, applyScenario, unlockRecipes, goalTask, NightWatch, presetName, resolveGoal } from "./scenario.js";
import { TeamBoard, combine, mergeShelters, stillWorking, type ChestViews } from "./team.js";
import { Vec3 } from "vec3";
import { SKILLS, findSkill } from "./skills/index.js";
import { COMMS_SKILLS } from "./skills/tellAgent.js";
import { getOutOfWater, headInWater, movementsFor, runSkill } from "./skills/util.js";
import { ScriptedPolicy } from "./policy/scripted.js";
import { GIVE_UP, LLMPolicy } from "./policy/llm.js";
import { BRAINS, createBackend, type BrainName } from "./backends/index.js";
import { costUSD, PRICED_MODELS } from "./backends/pricing.js";
import { BrainError, preflight } from "./backends/errors.js";
import { STANCES, type Backend, type ModelCall, type EndReason, type LoggedStep, type MemoryMode, type Observation, type Policy, type RunConfig, type ScenarioName, type SkillContext, type Stance } from "./types.js";

const { pathfinder } = pathfinderPkg;

loadEnv();

const argv = minimist(process.argv.slice(2), {
  string: ["scenario", "brain", "name", "goal", "memory", "comms", "stance", "episode", "progress", "team"],
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
  ticks: Number(argv["ticks"]),
  budgetUSD: Number(argv["budget-usd"]),
  maxSteps: Number(argv["steps"]),
  world: scenario.setup,
};
// `--team a,b,c`: the agents launched together as one team (scripts/team.sh passes it). A team goal is
// judged on all of them, and a collaborative agent's run ends only when the whole team is done.
// With comms off nobody hears anything, so the skills that only pass words are not offered.
const skills = comms ? SKILLS : SKILLS.filter((skill) => !COMMS_SKILLS.has(skill.name));
const team = String(argv["team"] ?? "").split(",").map((name) => name.trim()).filter(Boolean);
if (team.length > 0) config.team = team;

const agentName = String(argv["name"] || `agent_${argv["brain"]}`);

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
      return { policy: new LLMPolicy(backend, { name: agentName, memory, comms, stance, progress }), backend };
    }
  }
}

/** The slice of world state the interrupt triggers compare, taken straight from the bot. */
function snapshot(bot: mineflayer.Bot, buffer: MessageBuffer | null, enclosed: boolean): WorldSnapshot {
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
    ...(enclosed ? { enclosed } : {}),
    ...(buffer ? { directed: buffer.directed, lastDirected: buffer.lastDirected } : {}),
  };
}

async function main(): Promise<void> {
  const maxSteps = Number(argv["steps"]);
  const maxTicks = Number(argv["ticks"]);
  const budgetUSD = Number(argv["budget-usd"]);
  const goalCheck = GOAL_CHECKS[goalTask(presetName(goal) ?? "")];
  const teamGoal = TEAM_GOALS.has(goalTask(presetName(goal) ?? ""));
  const goalGaps = GOAL_GAPS[goalTask(presetName(goal) ?? "")];
  const { policy, backend } = buildPolicy(String(argv["brain"]));
  let probe: ModelCall | undefined;
  if (backend) {
    // Find a bad key or an empty account now, not ten minutes into an episode.
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
  // Lets the minds panel list this agent now, not only once its first decision is logged.
  const brain = brainLabel(probe ? [{ calls: [probe] } as unknown as LoggedStep] : []);
  const start: RunStart = {
    agent: agentName, brain: brain.label, brainDetail: brain.detail, goal, scenario: scenario.name,
    memory: backend ? memory : null, comms, stance: backend ? stance : null, episode: config.episode, startedAt: new Date().toISOString(),
  };
  writeFileSync(startFileFor(runLog.file), JSON.stringify(start));

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
  fixOwnAir(bot); // mineflayer reports any nearby creature's air as the bot's

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
    const reason = watch.check(snapshot(bot, buffer, inShelter()));
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
  // A dropped connection (batch p3: Opus, mid-night) used to crash the agent with nothing logged
  // about why, and the report counted the run as a valid failure. Stop and say so instead.
  let disconnected = false;
  bot.on("end", (reason) => {
    if (stopping) return; // our own quit at the end of the run
    disconnected = true;
    stopping = true;
    console.error(`[${agentName}] lost the connection to the server: ${reason}`);
  });
  bot.on("error", (error) => console.error(`[${agentName}] error: ${error.message}`));
  // What the run has achieved, for goals that span more than one skill (outpost).
  let shelterBuilt = false;
  // Every shelter this agent built or worked on; with its teammates' (knownShelters), to tell when it
  // is inside one that is still closed, and for build_shelter to go into one rather than build another.
  const shelters: ShelterSpot[] = [];
  const knownShelters = (): ShelterSpot[] => mergeShelters([shelters, ...Object.values(board?.read() ?? {}).map((m) => m?.shelters ?? [])]);
  const inShelter = () => knownShelters().some((spot) => insideClosedShelter(bot, spot));
  /** The shelters in sight, nearest first, as the agent would describe them. */
  const sheltersInSight = (): string[] => {
    const here = bot.entity.position;
    return knownShelters()
      .map((spot) => ({ spot, d: Math.round(here.distanceTo(new Vec3(spot.x + 0.5, spot.y, spot.z + 0.5))) }))
      // In sight; and the agent's own large shelters further off, which it remembers (bpoc: Luna built three).
      .filter(({ spot, d }) => (d <= REUSE_RANGE && standing(bot, spot)) || (d <= HOME_RANGE && spot.by === agentName && (spot.size ?? 3) === 5))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .map(({ spot, d }) => {
        const owner = spot.by && spot.by !== agentName ? ` (${spot.by}'s)` : spot.by === agentName ? " (yours)" : "";
        const where = insideSpot(bot, spot) ? "you are inside it" : `${d} blocks away`;
        const state = spot.complete === false ? "" : insideClosedShelter(bot, spot) ? ", closed" : insideSpot(bot, spot) ? ", not closed" : "";
        return `${describeShelter(spot)}${owner} at ${spotKey(spot)}, ${where}${state}`;
      });
  };
  // The shelters this agent has slept in a bed inside, for goals that ask for one shared shelter.
  const sleptIn = new Set<string>();
  const night = new NightWatch();
  bot.on("death", () => {
    // Where, so it can go back: a player sees where they fell. Dropped items vanish after 5 minutes.
    const { x, y, z } = bot.entity.position.floored();
    recentEvents.push(`you died at ${x},${y},${z} and respawned; what you carried was dropped there and disappears 5 minutes after you died`);
    night.died(); // dying forfeits the night it happens in
  });
  bot.on("time", () => night.tick(shelterBuilt, bot.time.timeOfDay, bot.isSleeping));

  const board = team.length > 1 ? new TeamBoard("runs", config.episode, agentName, team.includes(agentName) ? team : [...team, agentName]) : null;
  const collaborative = board !== null && stance === "collaborative";
  // Sticky: some checks (shelter) pass only on the step that achieved them.
  let ownGoalMet = false;
  let toldTeamWaiting = false;
  let shelterStoreys = 0;
  // Chests this agent has opened, as it last saw each: for goals (and team goals) that count what is in them.
  const chestViews: ChestViews = {};
  let sleptInBed = false;
  bot.on("sleep", () => {
    sleptInBed = true;
    for (const spot of knownShelters()) if (insideSpot(bot, spot)) sleptIn.add(spotKey(spot));
  });
  const ownState = () => ({ inventory: countInventory(bot), shelterBuilt, nightSurvivedSinceShelter: night.survived, shelterStoreys, chests: chestViews, sleptInBed, shelters, sleptIn: [...sleptIn] });
  /** What the goal check sees: this agent, or for a team goal, the whole team added together. */
  const goalState = (skill: string, status: string) => {
    const own = ownState();
    if (!teamGoal) return { skill, status, ...own };
    const others = board ? board.read() : {};
    // A teammate that hasn't reported yet still counts, as a member holding nothing.
    const members: Record<string, Record<string, number>> = { [agentName]: own.inventory };
    const membersSlept: Record<string, boolean> = { [agentName]: own.sleptInBed };
    const membersSleptIn: Record<string, string[]> = { [agentName]: own.sleptIn };
    for (const name of board?.teammates ?? []) {
      members[name] = others[name]?.inventory ?? {};
      membersSlept[name] = !!others[name]?.sleptInBed;
      membersSleptIn[name] = others[name]?.sleptIn ?? [];
    }
    const states = [own, ...Object.values(others).filter((m) => m !== undefined)];
    return { skill, status, ...combine(states), members, membersSlept, membersSleptIn };
  };
  const publish = () => board?.publish({ ...ownState(), goalMet: ownGoalMet });
  /** A team goal can be met by a teammate's step, while this agent is busy or thinking. */
  const refreshTeamGoal = () => {
    if (teamGoal && !ownGoalMet && goalCheck?.(goalState("wait", "success"))) ownGoalMet = true;
  };
  /** Over for this agent: its goal is met and, in a collaborative team, every teammate's is too. */
  const finished = () => ownGoalMet && (teamGoal || !collaborative || stillWorking(board!.read()).length === 0);

  await new Promise<void>((resolve) => bot.once("spawn", () => resolve()));
  // bot.inventory exists only once the bot has spawned.
  watchBreaks(bot, (name) => recentEvents.push(`your ${name} broke`));
  let lastAttackLine = "";
  let stepHits: NonNullable<LoggedStep["hits"]> = [];
  watchAttacks(bot, {
    report: (line, replaceLast) => {
      // Fold a repeat into the line it repeats, only if nothing else has been said since.
      if (replaceLast && recentEvents.at(-1) === lastAttackLine) recentEvents[recentEvents.length - 1] = line;
      else recentEvents.push(line);
      lastAttackLine = line;
    },
    onHit: (hit) => stepHits.push(hit),
  });
  bot.pathfinder.setMovements(movementsFor(bot));
  // Chunks stream in after spawn; findBlock only sees loaded ones, so observing
  // immediately reports an empty world.
  await bot.waitForChunksToLoad();
  await unlockRecipes(agentName, {
    host: env("MC_HOST", "localhost"),
    port: Number(env("RCON_PORT", "25575")),
    password: env("RCON_PASSWORD", "devpassword"),
  });
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
  publish();
  // Notice a teammate finishing the job in the middle of this agent's own skill, and stop it.
  const teamTimer = board
    ? setInterval(() => {
        refreshTeamGoal();
        if (!watch || interruptReason || !finished()) return;
        interruptReason = teamGoal ? "the team goal is met" : "every member of the team has met the goal";
        bot.pathfinder.setGoal(null);
        bot.stopDigging();
      }, 2000)
    : null;

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
    shelters: knownShelters,
  };

  let policyFailures = 0;
  // Identical decisions getting the identical result: reported as a fact (not advice) in
  // recentEvents, every 3 repeats, so a looping brain can see it is looping.
  let lastOutcome = "";
  let repeats = 0;
  // Waiting in a row with nothing to wait out, counted whatever the seconds: the loop note above leaves waiting alone.
  let idleWaits = 0;
  let doneRefused = false;
  let ended: EndReason | undefined;

  /**
   * The water reflex, run by the code and never left to a model: before the agent decides, since a
   * model thinking for ten seconds under water drowned (team trio2), and again before each skill.
   */
  const escapeWater = async (): Promise<string | null> => {
    if (!headInWater(bot)) return null;
    const out = await getOutOfWater(bot);
    const event = out ? "you were under water and swam out" : "you are under water and could not find a way out";
    recentEvents.push(event);
    return event;
  };
  // Asking or telling the same agent again and again, in different words each time: the repeat note
  // below only catches identical decisions (Haiku asked qwen 17 questions in trio2).
  let asking = { key: "", count: 0 };

  let lastObservation: Observation | null = null;
  let lastStep = 0;
  try {
  for (let step = 1; !ended; step++) {
    lastStep = step;
    if (disconnected) break;
    const surfaced = await escapeWater();
    const asked = buffer?.pending() ?? { requests: [], mark: 0 };
    const observation = observe(bot, {
      step,
      scenario: scenario.name,
      goal,
      recentEvents,
      activities,
      inShelter: inShelter(),
      shelters: sheltersInSight(),
      ...(buffer ? { messages: buffer.snapshot(), requests: asked.requests } : {}),
      ...(memory !== "none" && lastPlan ? { plan: lastPlan } : {}),
      ...(progress && goalGaps
        ? { stillNeeded: goalGaps(goalState("", "")) }
        : {}),
    });
    lastObservation = observation;
    stepEvents = surfaced ? [surfaced] : [];
    let responses: LoggedStep["responses"];
    const write = (fields: Omit<LoggedStep, "step" | "at" | "observation" | "config" | "ticks" | "ended" | "responses">) => {
      // Checked last, so a goal met or a model "done" on the final step wins.
      if (!ended && disconnected) ended = "disconnected";
      if (!ended && timeUp) ended = "time budget";
      if (!ended && spentUSD >= budgetUSD) ended = "cost budget";
      if (!ended && step >= maxSteps) ended = "step limit";
      runLog.write({ step, at: new Date().toISOString(), observation, ...fields, ...(responses ? { responses } : {}), ...(stepHits.length ? { hits: stepHits } : {}), config, ticks: elapsedTicks(), inventoryAfter: countInventory(bot), ...(ended ? { ended } : {}) });
      stepHits = [];
    };

    const startedAt = Date.now();
    let output;
    try {
      output = await policy.decide(observation, skills);
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
    if (asked.requests.length) {
      // This decision is the agent's answer to every request it was shown; they leave its list.
      responses = asked.requests.map(({ ageSeconds: _age, ...request }) => ({ ...request, response: responseTo(request, decision) }));
      buffer?.settle(asked.mark);
    }
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
      const gaps = ownGoalMet && collaborative
        ? stillWorking(board!.read()).map((name) => `${name} has not met the goal yet`)
        : (goalGaps?.(goalState("done", "success")) ?? []);
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

    refreshTeamGoal();
    if (board && finished()) {
      // A teammate's step finished the job while this agent was deciding.
      console.log(`[${agentName}] goal met by the team`);
      ended = "goal met";
      write({ decision, result: { status: "aborted", reason: "the team's goal was met while deciding" }, ...extra });
      break;
    }
    if (decision.skill === GIVE_UP) {
      // Not refused like an early "done": the model says it can't, and that is the result.
      const reason = String(decision.args["reason"]);
      console.log(`[${agentName}] GAVE UP: ${reason}`);
      ended = "model gave up";
      write({ decision, result: { status: "failed", reason: `gave up: ${reason}` }, events: ["gave up"], ...extra });
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
    // For the minds panel: the log gets this step only when the skill ends. Never worth failing a run over.
    try {
      const live: LiveStep = { step, skill: decision.skill, args: decision.args, ...(decision.rationale ? { rationale: decision.rationale } : {}), startedAt: new Date().toISOString() };
      writeFileSync(liveFileFor(runLog.file), JSON.stringify(live));
    } catch {
      // the panel falls back to the last logged step
    }
    lastPlan = decision.plan ?? lastPlan;
    // Said to itself, a message reaches nobody (qwen gave its coordinates that way in trio2): say it to everyone.
    const sayTo = decision.say?.to.toLowerCase() === agentName.toLowerCase() ? "all" : decision.say?.to ?? "all";
    if (buffer && decision.say?.text) speak(bot, sayTo, decision.say.text);
    const wet = await escapeWater();
    if (wet) stepEvents.push(wet);
    interruptReason = null;
    watch = createWatch(snapshot(bot, buffer, inShelter()), suppressedFor(skill.name, lastMessageInterruptMs, Date.now()));
    const skillStartAge = bot.time.age;
    let result = await runSkill(skill, ctx, decision.args);
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
    const askKey = COMMS_SKILLS.has(decision.skill) ? `${decision.skill} to ${String(decision.args["to"] ?? "").toLowerCase()}` : "";
    asking = askKey && askKey === asking.key ? { key: askKey, count: asking.count + 1 } : { key: askKey, count: askKey ? 1 : 0 };
    if (asking.count >= 3 && asking.count % 3 === 0) {
      const note = `your last ${asking.count} decisions were all ${asking.key}`;
      recentEvents.push(note);
      stepEvents.push(note);
    }
    // Waiting out a night or a mob is legitimate; waiting in daylight with no mob in sight is a loop.
    idleWaits = decision.skill === "wait" && observation.isDay && observation.hostiles.length === 0 ? idleWaits + 1 : 0;
    if (idleWaits >= 3 && idleWaits % 3 === 0) {
      const note = `your last ${idleWaits} decisions were all wait, in daylight with no hostile mobs in sight`;
      recentEvents.push(note);
      stepEvents.push(note);
    }
    for (const view of (result.detail?.["chests"] as Array<{ at: string; holds: Record<string, number> }> | undefined) ?? []) {
      chestViews[view.at] = { holds: view.holds, seenAt: Date.now() };
    }
    // Any shelter built, finished, gone into or started (a large one, part-built) is one the team knows of.
    const at = decision.skill === "build_shelter" ? (result.detail?.["position"] as { x: number; y: number; z: number } | undefined) : undefined;
    if (at) {
      const complete = result.status === "success";
      const spot: ShelterSpot = { ...at, storeys: Number(result.detail?.["storeys"] ?? 1), size: Number(result.detail?.["size"] ?? 3) === 5 ? 5 : 3, by: String(result.detail?.["by"] ?? agentName), complete };
      const i = shelters.findIndex((s) => spotKey(s) === spotKey(spot));
      if (i >= 0) shelters[i] = mergeShelters([[shelters[i]!], [spot]])[0]!;
      else shelters.push(spot);
    }
    if (decision.skill === "build_shelter" && result.status === "success") {
      shelterBuilt = true;
      shelterStoreys = Math.max(shelterStoreys, Number(result.detail?.["storeys"] ?? 1));
    }
    if (goalCheck?.(goalState(decision.skill, result.status))) ownGoalMet = true;
    publish();
    if (finished()) {
      console.log(`[${agentName}] goal met`);
      ended = "goal met";
    } else if (ownGoalMet && collaborative && !toldTeamWaiting) {
      toldTeamWaiting = true;
      const waiting = stillWorking(board!.read());
      const note = `you have met the goal yourself; the team succeeds only when every member has, and ${waiting.join(", ")} ${waiting.length === 1 ? "has" : "have"} not yet`;
      recentEvents.push(note);
      stepEvents.push(note);
    }
    write({ decision, result, events: stepEvents, ...extra });
  }
  } catch (error) {
    if (!disconnected) throw error; // anything else is a real crash, as before
  }
  if (disconnected && ended !== "disconnected") {
    // Lost between steps or mid-step: one more line says so, with the last thing it saw.
    ended = "disconnected";
    if (lastObservation) {
      runLog.write({ step: lastStep, at: new Date().toISOString(), observation: lastObservation, decision: null, result: { status: "aborted", reason: "lost the connection to the game server" }, decisionMs: 0, calls: [], config, ticks: elapsedTicks(), ended });
    }
  }

  console.log(`[${agentName}] ended: ${ended} after ${elapsedTicks()} ticks, $${spentUSD.toFixed(4)}`);
  stopping = true;
  if (teamTimer) clearInterval(teamTimer);
  publish();
  console.log(`[${agentName}] done — log at ${runLog.file}`);
  try {
    console.log(`[${agentName}] report at ${writeSummary(parseSteps(readFileSync(runLog.file, "utf8")), runLog.file)}`);
  } catch (error) {
    // The log is what matters; a report can be rebuilt from it later with npm run summary.
    console.error(`[${agentName}] could not write the run report: ${(error as Error).message}`);
  }
  bot.quit();
  setTimeout(() => process.exit(0), 500);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
