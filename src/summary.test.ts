import { test } from "node:test";
import assert from "node:assert/strict";
import { gameTime, phases, problemKey, renderSummary } from "./summary.js";
import type { LoggedStep, Observation } from "./types.js";
import { GOALS } from "./scenario.js";

const obs = (inventory: Record<string, number> = {}, y = 64): Observation => ({
  step: 1, scenario: "sandbox", goal: GOALS["tools"]!, position: { x: 0, y, z: 0 }, health: 20, food: 20,
  timeOfDay: 1000, isDay: true, inventory, nearbyBlocks: {}, hostiles: [], otherAgents: [], recentEvents: [],
});
const step = (n: number, skill: string, status: "success" | "failed", extra: Partial<LoggedStep> = {}): LoggedStep => ({
  step: n, at: `2026-10-17T10:0${n}:00.000Z`, observation: obs(), decision: { skill, args: {}, rationale: "" },
  result: { status, ...(status === "failed" ? { reason: `need ${n} more cobblestone` } : {}) }, decisionMs: 0, calls: [], ticks: n * 600, ...extra,
});

test("gameTime - ticks as minutes of a 20-minute day", () => {
  assert.equal(gameTime(24000), "20:00");
  assert.equal(gameTime(610), "0:31");
});

test("problemKey - reasons differing only in numbers are one problem", () => {
  assert.equal(problemKey("ore 14 blocks below"), problemKey("ore 15 blocks below"));
});

test("phases - folds repeats and back-and-forth, and adds up what was gained", () => {
  const steps = [
    step(1, "gather_wood", "success", { inventoryAfter: { oak_log: 4 } }),
    step(2, "tunnel", "success"), step(3, "mine_ore", "failed"),
    step(4, "tunnel", "success"), step(5, "mine_ore", "failed"),
    step(6, "wait", "success"), step(7, "wait", "success"),
  ];
  const p = phases(steps);
  assert.deepEqual(p.map((x) => [x.skill, x.from, x.to, x.count]), [
    ["gather_wood", 1, 1, 1], ["tunnel ↔ mine_ore", 2, 5, 4], ["wait", 6, 7, 2],
  ]);
  assert.deepEqual(p[0]!.gained, { oak_log: 4 });
  assert.equal(p[1]!.failed, 2);
});

test("renderSummary - outcome, sections and the grouped problems", () => {
  const steps = [step(1, "craft", "failed"), step(2, "craft", "failed"), { ...step(3, "wait", "success"), ended: "time budget" as const }];
  const md = renderSummary(steps, "runs/x-agent.jsonl");
  assert.match(md, /^# Run summary: /);
  assert.match(md, /\*\*Goal not met:\*\* the time budget ran out/);
  for (const section of ["## Setup", "## At a glance", "## Milestones", "## What it did", "## What went wrong", "## The run, step by step", "## Final inventory"]) {
    assert.ok(md.includes(section), section);
  }
  assert.match(md, /\*\*2×\*\* \(craft\): need 1 more cobblestone/);
});
