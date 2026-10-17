import { test } from "node:test";
import assert from "node:assert/strict";
import { byCondition, scoreStances, summarizeRun, wilson, type RunSummary } from "./report.js";
import { GOALS } from "./scenario.js";
import type { LoggedStep } from "./types.js";

function makeObservation(overrides: Partial<LoggedStep["observation"]> = {}): LoggedStep["observation"] {
  return {
    step: 1,
    scenario: "sandbox",
    goal: "Explore and gather useful resources at your own pace. There is no threat and no deadline. Decide for yourself what is worth doing.",
    position: { x: 0, y: 71, z: 0 },
    health: 20,
    food: 20,
    timeOfDay: 1000,
    isDay: true,
    inventory: {},
    nearbyBlocks: {},
    hostiles: [],
    otherAgents: [],
    recentEvents: [],
    ...overrides,
  };
}

function makeStep(overrides: Partial<LoggedStep> = {}): LoggedStep {
  return {
    step: 1,
    at: "2026-10-09T14:52:13.027Z",
    observation: makeObservation(),
    decision: null,
    result: null,
    decisionMs: 0,
    calls: [],
    ...overrides,
  };
}

test("howEnded: policy ended when last step has decision and result null", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      decision: { skill: "gather_wood", args: { count: 5 } },
      result: { status: "success" },
      decisionMs: 100,
    }),
    makeStep({
      step: 2,
      decision: null,
      result: null,
      decisionMs: 0,
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.howEnded, "policy ended");
});

test("howEnded: brain failed when last 3 steps have decision null with result.status failed", () => {
  const steps: LoggedStep[] = [
    makeStep({ step: 1, decision: { skill: "gather_wood", args: { count: 5 } }, result: { status: "success" } }),
    makeStep({ step: 2, decision: null, result: { status: "failed", reason: "timeout" }, decisionMs: 120000 }),
    makeStep({ step: 3, decision: null, result: { status: "failed", reason: "timeout" }, decisionMs: 120000 }),
    makeStep({ step: 4, decision: null, result: { status: "failed", reason: "timeout" }, decisionMs: 120000 }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.howEnded, "brain failed");
});

test("howEnded: step limit when last step is not policy ended or brain failed", () => {
  const steps: LoggedStep[] = [
    makeStep({ step: 1, decision: { skill: "gather_wood", args: { count: 5 } }, result: { status: "success" } }),
    makeStep({ step: 2, decision: { skill: "explore", args: {} }, result: { status: "failed" } }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.howEnded, "step limit / stopped");
});

test("deaths: dedupe death events across steps", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      observation: makeObservation({ recentEvents: ["you died"] }),
      decision: { skill: "respawn", args: {} },
      result: { status: "success" },
    }),
    makeStep({
      step: 2,
      observation: makeObservation({ recentEvents: ["you died", "other event"] }),
      decision: { skill: "wait", args: {} },
      result: { status: "success" },
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.deaths, 1, "should dedupe the same death across steps");
});

test("deaths: count multiple distinct death events", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      observation: makeObservation({ recentEvents: ["you died"] }),
    }),
    makeStep({
      step: 2,
      observation: makeObservation({ recentEvents: ["you died", "respawned"] }),
    }),
    makeStep({
      step: 3,
      observation: makeObservation({ recentEvents: ["respawned", "you died"] }),
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  // Step 1: new=["you died"]=1, Step 2: overlap at "you died", new=["respawned"]=1, Step 3: overlap at "respawned", new=["you died"]=1
  assert.equal(summary.deaths, 3, "counts 'you died' and 'respawned' events across steps");
});

test("goalMet: shelter met when build_shelter succeeds", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      observation: makeObservation({
        goal: "Build a shelter. It needs 11 logs in your inventory (the shelter turns them into planks itself). If you have fewer than 11 logs, gather wood; once you have 11 or more, build the shelter. Once it is built, end the episode.",
      }),
      decision: { skill: "gather_wood", args: { count: 11 } },
      result: { status: "success" },
    }),
    makeStep({
      step: 2,
      observation: makeObservation({
        goal: "Build a shelter. It needs 11 logs in your inventory (the shelter turns them into planks itself). If you have fewer than 11 logs, gather wood; once you have 11 or more, build the shelter. Once it is built, end the episode.",
        inventory: { oak_log: 11 },
      }),
      decision: { skill: "build_shelter", args: {} },
      result: { status: "success" },
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.goalMet, true);
  assert.equal(summary.goalName, "shelter-guided"); // the old preset text: older logs report as guided
});

test("goalMet: shelter not met when build_shelter fails", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      observation: makeObservation({
        goal: "Build a shelter. It needs 11 logs in your inventory (the shelter turns them into planks itself). If you have fewer than 11 logs, gather wood; once you have 11 or more, build the shelter. Once it is built, end the episode.",
      }),
      decision: { skill: "build_shelter", args: {} },
      result: { status: "failed", reason: "not enough logs" },
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.goalMet, false);
});

test("goalMet: tools met when stone_pickaxe craft succeeds", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      observation: makeObservation({
        goal: "Craft a stone pickaxe. Check your inventory and do the first step you have not done yet: gather a few logs, craft a wooden_pickaxe, mine 3 stone, craft a stone_pickaxe. Once you have it, end the episode.",
      }),
      decision: { skill: "craft", args: { item: "stone_pickaxe" } },
      result: { status: "success" },
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.goalMet, true);
  assert.equal(summary.goalName, "tools-guided");
});

test("goalMet: the bare tools goal is judged like the guided one", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      observation: makeObservation({ goal: GOALS["tools"]! }),
      decision: { skill: "craft", args: { item: "stone_pickaxe" } },
      result: { status: "success" },
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.goalName, "tools");
  assert.equal(summary.goalMet, true);
});

test("goalMet: tools met when stone_pickaxe in inventory", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      observation: makeObservation({
        goal: "Craft a stone pickaxe. Check your inventory and do the first step you have not done yet: gather a few logs, craft a wooden_pickaxe, mine 3 stone, craft a stone_pickaxe. Once you have it, end the episode.",
        inventory: { stone_pickaxe: 1 },
      }),
      decision: { skill: "wait", args: { seconds: 1 } },
      result: { status: "success" },
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.goalMet, true);
});

test("goalMet: n/a when goal is neither shelter nor tools", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      observation: makeObservation({
        goal: "Explore and gather useful resources at your own pace.",
      }),
      decision: { skill: "explore", args: {} },
      result: { status: "success" },
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.goalMet, "n/a");
});

test("survivedNight: unknown when night never reached", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      observation: makeObservation({ isDay: true }),
      decision: { skill: "explore", args: {} },
      result: { status: "success" },
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.nightReached, false);
  assert.equal(summary.survivedNight, "unknown");
});

test("survivedNight: true when night reached, no deaths, and day comes again", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      observation: makeObservation({ isDay: true }),
      decision: { skill: "explore", args: {} },
      result: { status: "success" },
    }),
    makeStep({
      step: 2,
      observation: makeObservation({ isDay: false }),
      decision: { skill: "hide", args: {} },
      result: { status: "success" },
    }),
    makeStep({
      step: 3,
      observation: makeObservation({ isDay: true }),
      decision: { skill: "explore", args: {} },
      result: { status: "success" },
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.nightReached, true);
  assert.equal(summary.survivedNight, true);
});

test("survivedNight: false when night reached but deaths > 0", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      observation: makeObservation({ isDay: true }),
      decision: { skill: "explore", args: {} },
      result: { status: "success" },
    }),
    makeStep({
      step: 2,
      observation: makeObservation({ isDay: false, recentEvents: ["you died"] }),
      decision: { skill: "respawn", args: {} },
      result: { status: "success" },
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.nightReached, true);
  assert.equal(summary.survivedNight, false);
});

test("survivedNight: unknown when the run ends during the night without a death", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      observation: makeObservation({ isDay: true }),
      decision: { skill: "explore", args: {} },
      result: { status: "success" },
    }),
    makeStep({
      step: 2,
      observation: makeObservation({ isDay: false }),
      decision: { skill: "hide", args: {} },
      result: { status: "success" },
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.nightReached, true);
  assert.equal(summary.survivedNight, "unknown");
});

test("retries: count calls beyond the first per step", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      decision: { skill: "gather_wood", args: { count: 5 } },
      result: { status: "success" },
      decisionMs: 100,
      calls: [
        { backend: "ollama", model: "qwen3:4b", inputTokens: 10, outputTokens: 5, ms: 100, text: "" },
        { backend: "ollama", model: "qwen3:4b", inputTokens: 10, outputTokens: 5, ms: 50, text: "" },
      ],
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.retries, 1);
  assert.equal(summary.totalModelCalls, 2);
});

test("fallbackWaits: count decisions starting with 'fallback:'", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      decision: { skill: "gather_wood", args: { count: 5 }, rationale: "fallback: retrying after timeout" },
      result: { status: "success" },
    }),
    makeStep({
      step: 2,
      decision: { skill: "explore", args: {}, rationale: "normal decision" },
      result: { status: "success" },
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.fallbackWaits, 1);
});

test("costUSD: ollama costs 0", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      decision: { skill: "gather_wood", args: {} },
      result: { status: "success" },
      decisionMs: 100,
      calls: [{ backend: "ollama", model: "qwen3:4b", inputTokens: 1000, outputTokens: 1000, ms: 100, text: "" }],
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.costUSD, 0);
});

test("costUSD: unknown model shows as 'unknown'", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      decision: { skill: "gather_wood", args: {} },
      result: { status: "success" },
      decisionMs: 100,
      calls: [
        { backend: "unknown", model: "unknown-model", inputTokens: 1000, outputTokens: 1000, ms: 100, text: "" },
      ],
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.costUSD, "unknown");
});

test("costUSD: known cloud model computes correctly", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      decision: { skill: "gather_wood", args: {} },
      result: { status: "success" },
      decisionMs: 100,
      calls: [
        {
          backend: "anthropic",
          model: "claude-haiku-4-5",
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
          ms: 100,
          text: "",
        },
      ],
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  // claude-haiku-4-5: [1.0, 5.0] per million tokens
  // cost = (1_000_000 * 1.0 + 1_000_000 * 5.0) / 1_000_000 = 6.0
  assert.equal(summary.costUSD, 6.0);
});

test("decisionMsMedian and p90 computed correctly", () => {
  const steps: LoggedStep[] = [
    makeStep({ step: 1, decision: { skill: "explore", args: {} }, result: { status: "success" }, decisionMs: 100 }),
    makeStep({ step: 2, decision: { skill: "gather_wood", args: {} }, result: { status: "success" }, decisionMs: 200 }),
    makeStep({
      step: 3,
      decision: { skill: "explore", args: {} },
      result: { status: "success" },
      decisionMs: 300,
    }),
    makeStep({
      step: 4,
      decision: { skill: "gather_wood", args: {} },
      result: { status: "success" },
      decisionMs: 400,
    }),
    makeStep({
      step: 5,
      decision: { skill: "explore", args: {} },
      result: { status: "success" },
      decisionMs: 500,
    }),
    makeStep({
      step: 6,
      decision: { skill: "gather_wood", args: {} },
      result: { status: "success" },
      decisionMs: 600,
    }),
    makeStep({
      step: 7,
      decision: { skill: "explore", args: {} },
      result: { status: "success" },
      decisionMs: 700,
    }),
    makeStep({
      step: 8,
      decision: { skill: "gather_wood", args: {} },
      result: { status: "success" },
      decisionMs: 800,
    }),
    makeStep({
      step: 9,
      decision: { skill: "explore", args: {} },
      result: { status: "success" },
      decisionMs: 900,
    }),
    makeStep({
      step: 10,
      decision: { skill: "gather_wood", args: {} },
      result: { status: "success" },
      decisionMs: 1000,
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  // Sorted: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
  // Median (10 elements): floor(10/2) = 5, so index 5 = 600
  assert.equal(summary.decisionMsMedian, 600);
  // P90 (10 elements): floor(10 * 0.9) = 9, so index 9 = 1000
  assert.equal(summary.decisionMsP90, 1000);
});

test("agentName extracted from filename", () => {
  const steps = [makeStep()];
  const summary = summarizeRun(steps, "2026-10-09T14-52-12-575Z-agent_scripted.jsonl");
  assert.equal(summary.agentName, "scripted");
});

test("brain extracted from first ModelCall", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      decision: { skill: "explore", args: {} },
      result: { status: "success" },
      calls: [{ backend: "anthropic", model: "claude-opus-5-5", inputTokens: 10, outputTokens: 5, ms: 100, text: "" }],
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.brain, "anthropic:claude-opus-5-5");
});

test("brain defaults to scripted when no ModelCall", () => {
  const steps = [makeStep({ step: 1, decision: { skill: "explore", args: {} }, result: { status: "success" }, calls: [] })];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.brain, "scripted");
});

test("milestones: logs milestone reached when inventory has oak_log", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      at: "2026-10-09T14:52:13.027Z",
      observation: makeObservation({ inventory: { oak_log: 1 } }),
      decision: { skill: "gather_wood", args: {} },
      result: { status: "success" },
      decisionMs: 100,
      calls: [{ backend: "ollama", model: "qwen3:4b", inputTokens: 100, outputTokens: 50, ms: 100, text: "" }],
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.ok(summary.milestones.logs);
  assert.equal(summary.milestones.logs?.step, 1);
  assert.equal(summary.milestones.logs?.tokens, 150);
  assert.equal(summary.furthestMilestone, "logs");
});

test("milestones: stone milestone reached when inventory has cobblestone", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      at: "2026-10-09T14:52:13.027Z",
      observation: makeObservation({ inventory: { oak_log: 1 } }),
      decision: { skill: "gather_wood", args: {} },
      result: { status: "success" },
      decisionMs: 100,
      calls: [{ backend: "ollama", model: "qwen3:4b", inputTokens: 100, outputTokens: 50, ms: 100, text: "" }],
    }),
    makeStep({
      step: 2,
      at: "2026-10-09T14:52:14.027Z",
      observation: makeObservation({ inventory: { oak_log: 1, cobblestone: 3 } }),
      decision: { skill: "mine", args: {} },
      result: { status: "success" },
      decisionMs: 100,
      calls: [],
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.ok(summary.milestones.logs);
  assert.ok(summary.milestones.stone);
  assert.equal(summary.furthestMilestone, "stone");
});

test("milestones: shelter milestone reached when build_shelter succeeds", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      at: "2026-10-09T14:52:13.027Z",
      observation: makeObservation({
        goal: "Build a shelter. It needs 11 logs in your inventory (the shelter turns them into planks itself). If you have fewer than 11 logs, gather wood; once you have 11 or more, build the shelter. Once it is built, end the episode.",
        inventory: { oak_log: 11 },
      }),
      decision: { skill: "gather_wood", args: {} },
      result: { status: "success" },
      decisionMs: 100,
      calls: [],
    }),
    makeStep({
      step: 2,
      at: "2026-10-09T14:52:14.027Z",
      observation: makeObservation({
        goal: "Build a shelter. It needs 11 logs in your inventory (the shelter turns them into planks itself). If you have fewer than 11 logs, gather wood; once you have 11 or more, build the shelter. Once it is built, end the episode.",
        inventory: { oak_planks: 44 },
      }),
      decision: { skill: "build_shelter", args: {} },
      result: { status: "success" },
      decisionMs: 100,
      calls: [],
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.ok(summary.milestones.shelter);
  assert.equal(summary.milestones.shelter?.step, 2);
  assert.equal(summary.furthestMilestone, "shelter");
});

test("milestones: survived_night milestone reached after night with no deaths", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      at: "2026-10-09T14:52:13.027Z",
      observation: makeObservation({ isDay: true }),
      decision: { skill: "explore", args: {} },
      result: { status: "success" },
      decisionMs: 100,
      calls: [],
    }),
    makeStep({
      step: 2,
      at: "2026-10-09T14:52:14.027Z",
      observation: makeObservation({ isDay: false }),
      decision: { skill: "hide", args: {} },
      result: { status: "success" },
      decisionMs: 100,
      calls: [],
    }),
    makeStep({
      step: 3,
      at: "2026-10-09T14:52:15.027Z",
      observation: makeObservation({ isDay: true }),
      decision: { skill: "explore", args: {} },
      result: { status: "success" },
      decisionMs: 100,
      calls: [],
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.ok(summary.milestones.survived_night);
  assert.equal(summary.furthestMilestone, "survived_night");
});

test("deaths: two distinct death events in different steps", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      observation: makeObservation({ recentEvents: ["you died"] }),
      decision: { skill: "wait", args: {} },
      result: { status: "success" },
    }),
    makeStep({
      step: 2,
      observation: makeObservation({ recentEvents: ["you died", "other"] }),
      decision: { skill: "wait", args: {} },
      result: { status: "success" },
    }),
    makeStep({
      step: 3,
      observation: makeObservation({ recentEvents: ["you died", "other", "you died"] }),
      decision: { skill: "wait", args: {} },
      result: { status: "success" },
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  // Step 1: new=["you died"]=1, Step 2: overlap=1, new=["other"]=0, Step 3: overlap=2, new=["you died"]=1
  assert.equal(summary.deaths, 2);
});

test("deaths: same death visible across 3 windows counts as 1", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      observation: makeObservation({ recentEvents: ["you died"] }),
      decision: { skill: "wait", args: {} },
      result: { status: "success" },
    }),
    makeStep({
      step: 2,
      observation: makeObservation({ recentEvents: ["you died", "other"] }),
      decision: { skill: "wait", args: {} },
      result: { status: "success" },
    }),
    makeStep({
      step: 3,
      observation: makeObservation({ recentEvents: ["you died", "other", "explore start"] }),
      decision: { skill: "explore", args: {} },
      result: { status: "success" },
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  // Step 1: new events = ["you died"] = 1 (matches "died")
  // Step 2: prev=["you died"], current=["you died","other"], overlap=1, new=["other"] = 0
  // Step 3: prev=["you died","other"], current=["you died","other","explore start"], overlap=2, new=["explore start"] = 0
  // Total deaths: 1
  assert.equal(summary.deaths, 1);
});

test("deaths: multiple death events in window", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      observation: makeObservation({ recentEvents: ["you died", "other", "you died"] }),
      decision: { skill: "wait", args: {} },
      result: { status: "success" },
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  // Step 1: new = ["you died", "other", "you died"] = 2 events matching "died"
  assert.equal(summary.deaths, 2);
});

test("deaths: 6+ new events (full window shift)", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      observation: makeObservation({ recentEvents: ["event1", "event2", "event3", "event4", "event5", "you died"] }),
      decision: { skill: "explore", args: {} },
      result: { status: "success" },
    }),
    makeStep({
      step: 2,
      observation: makeObservation({ recentEvents: ["new1", "new2", "new3", "new4", "new5", "you died"] }),
      decision: { skill: "respawn", args: {} },
      result: { status: "success" },
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  // Step 1: all new, count 1 death
  // Step 2: no overlap (all 6 events are new), count 1 death
  assert.equal(summary.deaths, 2);
});

test("milestones: gameTicks accumulates with timeOfDay wrapping at 24000", () => {
  const steps: LoggedStep[] = [
    makeStep({
      step: 1,
      at: "2026-10-09T14:52:13.027Z",
      observation: makeObservation({ timeOfDay: 10000 }),
      decision: { skill: "gather_wood", args: {} },
      result: { status: "success" },
      decisionMs: 100,
      calls: [],
    }),
    makeStep({
      step: 2,
      at: "2026-10-09T14:52:14.027Z",
      observation: makeObservation({ timeOfDay: 20000, inventory: { oak_log: 1 } }),
      decision: { skill: "explore", args: {} },
      result: { status: "success" },
      decisionMs: 100,
      calls: [],
    }),
    makeStep({
      step: 3,
      at: "2026-10-09T14:52:15.027Z",
      observation: makeObservation({ timeOfDay: 5000 }), // Wrapped around
      decision: { skill: "explore", args: {} },
      result: { status: "success" },
      decisionMs: 100,
      calls: [],
    }),
    makeStep({
      step: 4,
      at: "2026-10-09T14:52:16.027Z",
      observation: makeObservation({ timeOfDay: 15000 }),
      decision: { skill: "explore", args: {} },
      result: { status: "success" },
      decisionMs: 100,
      calls: [],
    }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.ok(summary.milestones.logs);
  // At step 1, timeOfDay=10000, no prior, so gameTicks=0
  // At step 2, timeOfDay=20000, delta from step 1 = 20000-10000 = 10000, so gameTicks=10000
  // Logs found at step 2 with gameTicks=10000
  assert.equal(summary.milestones.logs?.step, 2);
  assert.equal(summary.milestones.logs?.gameTicks, 10000);
});

test("howEnded uses the end reason the agent recorded", () => {
  const base = {
    at: "2026-10-16T00:00:00.000Z",
    observation: { step: 1, scenario: "sandbox", goal: "x", isDay: true, timeOfDay: 0, inventory: {}, recentEvents: [] },
    decision: { skill: "wait", args: { seconds: 1 } },
    result: { status: "success" },
    decisionMs: 1,
    calls: [],
  } as unknown as LoggedStep;
  const s = summarizeRun([{ ...base, step: 1 }, { ...base, step: 2, ended: "time budget" }], "runs/2026-x-agent_a.jsonl");
  assert.equal(s.howEnded, "time budget");
});

test("the logs milestone counts any kind of wood", () => {
  const step = (n: number, inventory: Record<string, number>) =>
    ({
      step: n,
      at: "2026-10-16T00:00:00.000Z",
      observation: { step: n, scenario: "sandbox", goal: "x", isDay: true, timeOfDay: 0, inventory, recentEvents: [] },
      decision: { skill: "gather_wood", args: { count: 5 } },
      result: { status: "success" },
      decisionMs: 1,
      calls: [],
      ticks: n * 100,
    }) as unknown as LoggedStep;
  const s = summarizeRun([step(1, {}), step(2, { dark_oak_log: 11 })], "runs/2026-x-agent_a.jsonl");
  assert.equal(s.furthestMilestone, "logs");
  assert.equal(s.milestones.logs?.step, 2);
  assert.equal(s.milestones.logs?.gameTicks, 200);
});

test("a milestone reached on the final step counts, via inventoryAfter", () => {
  const s = summarizeRun(
    [
      {
        step: 1,
        at: "2026-10-16T00:00:00.000Z",
        observation: { step: 1, scenario: "sandbox", goal: "x", isDay: true, timeOfDay: 0, inventory: { cobblestone: 3 }, recentEvents: [] },
        decision: { skill: "craft", args: { item: "stone_pickaxe", count: 1 } },
        result: { status: "success" },
        decisionMs: 1,
        calls: [],
        inventoryAfter: { stone_pickaxe: 1 },
        ended: "goal met",
      } as unknown as LoggedStep,
    ],
    "runs/2026-x-agent_a.jsonl",
  );
  assert.equal(s.furthestMilestone, "stone_pickaxe");
});

test("a run whose brain became unavailable is invalid, and so is the rest of its episode", async () => {
  const { markEpisodes } = await import("./report.js");
  const line = (episode: string, ended?: string) =>
    ({
      step: 1,
      at: "2026-10-16T00:00:00.000Z",
      observation: { step: 1, scenario: "sandbox", goal: "x", isDay: true, timeOfDay: 0, inventory: {}, recentEvents: [] },
      decision: null,
      result: { status: "failed", reason: "x" },
      decisionMs: 1,
      calls: [],
      config: { episode, memory: "plan", comms: true },
      ...(ended ? { ended } : {}),
    }) as unknown as LoggedStep;
  const runs = [
    summarizeRun([line("ep1", "brain unavailable")], "runs/2026-a-agent_claude.jsonl"),
    summarizeRun([line("ep1", "time budget")], "runs/2026-a-agent_ollama.jsonl"),
    summarizeRun([line("ep2", "time budget")], "runs/2026-b-agent_ollama.jsonl"),
  ];
  markEpisodes(runs);
  assert.deepEqual(runs.map((r) => r.validity), ["brain unavailable", "episode incomplete", "valid"]);
});

/** A summary with only the fields stance scoring and aggregation read. */
function run(fields: Partial<RunSummary>): RunSummary {
  return {
    brain: "ollama:qwen", memory: "plan", stance: "neutral", goalName: "tools", scenario: "sandbox",
    validity: "valid", goalMet: false, outcome: false, goalMetAt: null, ticksToGoal: null, episode: null,
    decisions: 5, tokensIn: 100, decisionMsMedian: 1000, costUSD: 0,
    ...fields,
  } as RunSummary;
}

test("wilson - honest intervals at small n", () => {
  const [lo, hi] = wilson(3, 3);
  assert.ok(Math.abs(lo - 0.438) < 0.01 && hi === 1, `${lo} ${hi}`);
  assert.deepStrictEqual(wilson(0, 0), [0, 1]);
});

test("scoreStances - collaborative needs the whole team, competitive needs to be first", () => {
  const team = [
    run({ episode: "e1", stance: "collaborative", goalMet: true, goalMetAt: "2026-10-17T01:00:00Z" }),
    run({ episode: "e1", stance: "collaborative", goalMet: false }),
  ];
  const race = [
    run({ episode: "e2", stance: "competitive", goalMet: true, goalMetAt: "2026-10-17T01:05:00Z" }),
    run({ episode: "e2", stance: "competitive", goalMet: true, goalMetAt: "2026-10-17T01:02:00Z" }),
  ];
  const alone = run({ episode: "e3", stance: "neutral", goalMet: true, goalMetAt: "2026-10-17T01:00:00Z" });
  scoreStances([...team, ...race, alone]);
  assert.deepStrictEqual(team.map((s) => s.outcome), [false, false]);
  assert.deepStrictEqual(race.map((s) => s.outcome), [false, true]);
  assert.strictEqual(alone.outcome, true);
});

test("byCondition - one row per condition, excluding runs whose brain was unavailable", () => {
  const rows = byCondition([
    run({ outcome: true, ticksToGoal: 100 }),
    run({ outcome: false }),
    run({ outcome: true, ticksToGoal: 300 }),
    run({ validity: "brain unavailable" }),
    run({ memory: "full", outcome: true, ticksToGoal: 50 }),
  ]);
  assert.strictEqual(rows.length, 2);
  const plan = rows.find((r) => r.memory === "plan")!;
  assert.strictEqual(plan.runs, 3);
  assert.strictEqual(plan.successes, 2);
  assert.strictEqual(plan.excluded, 1);
  assert.strictEqual(plan.ticksToGoal, 200);
});

test("doneRefused: counts each done the agent was told was premature", () => {
  const refused = makeStep({ result: { status: "failed", reason: "the goal is not met yet" }, events: ["done refused"] });
  const steps: LoggedStep[] = [
    makeStep({ decision: { skill: "gather_wood", args: { count: 5 } }, result: { status: "success" } }),
    { ...refused, step: 2 },
    makeStep({ step: 3, decision: { skill: "gather_wood", args: { count: 5 } }, result: { status: "success" } }),
    { ...refused, step: 4 },
    makeStep({ step: 5 }),
  ];
  const summary = summarizeRun(steps, "test-run.jsonl");
  assert.equal(summary.doneRefused, 2);
  assert.equal(summary.howEnded, "policy ended");
});
