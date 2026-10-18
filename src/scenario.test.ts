import { test } from "node:test";
import assert from "node:assert/strict";
import { GOALS, GOAL_CHECKS, GOAL_GAPS, SCENARIOS, goalTask, isNight, presetName, resolveGoal } from "./scenario.js";

test("resolveGoal - no goal uses the scenario's own", () => {
  assert.equal(resolveGoal(SCENARIOS.survival, undefined), SCENARIOS.survival.goal);
  assert.equal(resolveGoal(SCENARIOS.sandbox, "  "), SCENARIOS.sandbox.goal);
});

test("resolveGoal - preset names, case-insensitive", () => {
  assert.equal(resolveGoal(SCENARIOS.sandbox, "shelter"), GOALS["shelter"]);
  assert.equal(resolveGoal(SCENARIOS.sandbox, "Tools"), GOALS["tools"]);
});

test("resolveGoal - a sentence is used as the goal itself", () => {
  assert.equal(resolveGoal(SCENARIOS.survival, "Mine 10 stone"), "Mine 10 stone");
});

test("resolveGoal - an unknown single word is rejected as a likely typo", () => {
  assert.throws(() => resolveGoal(SCENARIOS.sandbox, "shleter"), /unknown goal "shleter"/);
});

test("outpost - needs all four stone tools, a shelter, and a night survived after it", () => {
  const tools = { stone_pickaxe: 1, stone_axe: 1, stone_sword: 1, stone_shovel: 1 };
  const check = GOAL_CHECKS["outpost"]!;
  const done = { skill: "wait", status: "success", inventory: tools, shelterBuilt: true, nightSurvivedSinceShelter: true };
  assert.equal(check(done), true);
  assert.equal(check({ ...done, nightSurvivedSinceShelter: false }), false);
  assert.equal(check({ ...done, shelterBuilt: false }), false);
  assert.equal(check({ ...done, inventory: { ...tools, stone_shovel: 0 } }), false);
  assert.equal(isNight(18000), true);
  assert.equal(isNight(23500), false);
});

test("goal gaps name what is missing, and nothing once the goal is met", () => {
  const state = { skill: "done", status: "success", inventory: { stone_pickaxe: 1, stone_axe: 1 }, shelterBuilt: true, nightSurvivedSinceShelter: false };
  assert.deepEqual(GOAL_GAPS["tools"]!(state), []);
  assert.deepEqual(GOAL_GAPS["iron"]!(state), ["you have no iron_pickaxe"]);
  assert.deepEqual(GOAL_GAPS["outpost"]!(state), [
    "you have no stone_sword",
    "you have no stone_shovel",
    "you have not yet survived a night since building the shelter",
  ]);
});

const OPEN_ENDED = new Set(["gather", "explore"]);
const state = (inventory: Record<string, number>, more: Partial<{ skill: string; status: string; shelterBuilt: boolean; nightSurvivedSinceShelter: boolean }> = {}) =>
  ({ skill: "wait", status: "success", inventory, shelterBuilt: false, nightSurvivedSinceShelter: false, ...more });

test("every preset with an end has a check and gaps; open-ended ones have neither", () => {
  for (const preset of Object.keys(GOALS)) {
    const task = goalTask(preset);
    if (OPEN_ENDED.has(task)) {
      assert.equal(GOAL_CHECKS[task], undefined, task);
      continue;
    }
    assert.ok(GOAL_CHECKS[task], `${preset} has a check`);
    assert.ok(GOAL_GAPS[task], `${preset} has gaps`);
  }
});

test("goal checks and gaps agree: unmet goals list a gap, met ones list none", () => {
  const kit = { stone_pickaxe: 1, stone_axe: 1, stone_sword: 1, stone_shovel: 1 };
  const cases: Array<[string, ReturnType<typeof state>, ReturnType<typeof state>]> = [
    ["tools", state({}), state({ stone_pickaxe: 1 })],
    ["iron", state({ stone_pickaxe: 1, iron_ingot: 3 }), state({ iron_pickaxe: 1 })],
    ["diamond", state({ diamond: 4 }), state({ diamond_boots: 1 })],
    ["outpost", state(kit, { shelterBuilt: true }), state(kit, { shelterBuilt: true, nightSurvivedSinceShelter: true })],
  ];
  for (const [goal, unmet, met] of cases) {
    assert.equal(GOAL_CHECKS[goal]!(unmet), false, `${goal} not met`);
    assert.ok(GOAL_GAPS[goal]!(unmet).length > 0, `${goal} names a gap`);
    assert.equal(GOAL_CHECKS[goal]!(met), true, `${goal} met`);
    assert.deepEqual(GOAL_GAPS[goal]!(met), [], `${goal} has no gap left`);
  }
});

test("shelter - met only by a build_shelter that succeeds", () => {
  const check = GOAL_CHECKS["shelter"]!;
  assert.equal(check(state({}, { skill: "build_shelter", status: "success" })), true);
  assert.equal(check(state({}, { skill: "build_shelter", status: "failed" })), false);
  assert.equal(check(state({ oak_planks: 64 }, { skill: "wait", shelterBuilt: true })), false, "only the build itself");
});

test("guided presets share their task's success rule", () => {
  assert.equal(goalTask("tools-guided"), "tools");
  assert.equal(goalTask("shelter-guided"), "shelter");
  assert.equal(goalTask("iron"), "iron");
});

test("presetName - finds a preset by its text, and nothing for free text", () => {
  for (const [name, text] of Object.entries(GOALS)) assert.equal(presetName(text), name);
  assert.equal(presetName("Mine 10 stone"), undefined);
});

test("isNight - from 13000 until 23000", () => {
  assert.equal(isNight(12999), false);
  assert.equal(isNight(13000), true);
  assert.equal(isNight(22999), true);
  assert.equal(isNight(23000), false);
  assert.equal(isNight(0), false);
});

test("scenario parity - sandbox and survival differ only in setup and goal text", () => {
  const { sandbox, survival } = SCENARIOS;
  const rest = (s: typeof sandbox) => {
    const { setup: _setup, goal: _goal, ...other } = s;
    return Object.keys(other).filter((k) => k !== "name");
  };
  assert.deepEqual(rest(sandbox), rest(survival));
  assert.notDeepEqual(sandbox.setup, survival.setup);
});
