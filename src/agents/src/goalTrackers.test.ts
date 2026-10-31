import { test } from "node:test";
import assert from "node:assert/strict";
import { goalTrackers } from "./goalTrackers.js";
import { GOALS } from "./goals.js";
import type { LoggedStep, Observation } from "./types.js";

const obs = (over: Partial<Observation> = {}): Observation => ({
  step: 1, scenario: "survival", goal: GOALS["team-base"]!, position: { x: 0, y: 64, z: 0 }, health: 20, food: 20,
  timeOfDay: 1000, isDay: true, inventory: {}, nearbyBlocks: {}, hostiles: [], otherAgents: [], recentEvents: [], ...over,
});
const step = (n: number, over: Partial<LoggedStep> = {}, seen: Partial<Observation> = {}): LoggedStep => ({
  step: n, at: new Date(n * 1000).toISOString(), observation: obs(seen), decision: { skill: "wait", args: {} }, result: { status: "success" }, decisionMs: 0, calls: [], ticks: n * 100, inventoryAfter: {}, ...over,
});
const base = GOALS["team-base"]!;
const shown = (steps: LoggedStep[]) => goalTrackers(base, steps).map((t) => [t.label, t.on, t.step]);

test("goalTrackers - team-base shows its own four parts, not a fixed ladder", () => {
  assert.deepEqual(goalTrackers(base, []).map((t) => t.label), ["The large home", "Slept in a bed", "Holds an iron pickaxe", "Cooked meat in a chest (0 of 10)"]);
});

test("goalTrackers - the home from a teammate's, seen; an unfinished one doesn't count", () => {
  const steps = [
    step(1, {}, { shelters: ["an unfinished large shelter (lb's) at 1,64,1, 9 blocks away"] }),
    step(2, {}, { shelters: ["a large shelter (lb's) at 1,64,1, 9 blocks away"] }),
  ];
  assert.deepEqual(shown(steps)[0], ["The large home", true, 2]);
});

test("goalTrackers - a pickaxe counts while held: lost, it goes dark and says when it was had", () => {
  const steps = [step(1, { inventoryAfter: { iron_pickaxe: 1 } }), step(2, { inventoryAfter: {} })];
  assert.deepEqual(shown(steps)[2], ["Holds an iron pickaxe", false, 1]);
});

test("goalTrackers - slept comes from the sleep itself, not from surviving the night", () => {
  const waited = [step(1, {}, { isDay: false }), step(2, {}, { isDay: true })];
  assert.equal(shown(waited)[1]![1], false, "hid through the night");
  const inBed = [step(1, { decision: { skill: "sleep", args: {} }, result: { status: "success", detail: { slept: true } } })];
  assert.deepEqual(shown(inBed)[1], ["Slept in a bed", true, 1]);
});

test("goalTrackers - meat from what the agent knows of the chests, across kinds", () => {
  const steps = [
    step(1, {}, { chestsSeen: ["chest at 4,75,29, 8 blocks away: 4 cooked_beef, 2 cooked_mutton, 3 stick (seen by you 2 min ago)"] }),
    step(2, { result: { status: "success", detail: { chests: [{ at: "4,75,29", holds: { cooked_beef: 10 } }] } } }),
  ];
  assert.deepEqual(goalTrackers(base, steps.slice(0, 1))[3]!.label, "Cooked meat in a chest (6 of 10)");
  assert.deepEqual(shown(steps)[3], ["Cooked meat in a chest (10 of 10)", true, 2]);
});

test("goalTrackers - a run that met the goal lights every part; a free-text goal has none", () => {
  const met = [step(1, { ended: "goal met", inventoryAfter: { iron_pickaxe: 1 } })];
  assert.ok(goalTrackers(base, met).every((t) => t.on));
  assert.deepEqual(goalTrackers("Mine 10 stone", met), []);
  assert.deepEqual(goalTrackers(GOALS["tools-guided"]!, []).map((t) => t.label), goalTrackers(GOALS["tools"]!, []).map((t) => t.label), "a guided goal tracks as its plain one");
});
