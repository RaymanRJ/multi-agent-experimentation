import { test } from "node:test";
import assert from "node:assert/strict";
import { GOALS, SCENARIOS, resolveGoal } from "./scenario.js";

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
