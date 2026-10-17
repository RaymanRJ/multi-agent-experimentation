import { test } from "node:test";
import assert from "node:assert/strict";
import { GOALS, GOAL_CHECKS, SCENARIOS, isNight, resolveGoal } from "./scenario.js";

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
