import { test } from "node:test";
import assert from "node:assert/strict";
import { deeds, modelName, renderComparison, type Run } from "./compare.js";
import { behaviour, requests } from "./summary.js";
import { summarizeRun } from "./report.js";
import type { LoggedStep, ModelCall, Observation } from "./types.js";
import { GOALS } from "./scenario.js";

const call = (backend: string, model: string): ModelCall => ({ backend, model, inputTokens: 100, outputTokens: 10, ms: 1, text: "" });
const obs = (inventory: Record<string, number> = {}): Observation => ({
  step: 1, scenario: "sandbox", goal: GOALS["team-camp"]!, position: { x: 0, y: 64, z: 0 }, health: 20, food: 20,
  timeOfDay: 1000, isDay: true, inventory, nearbyBlocks: {}, hostiles: [], otherAgents: [], recentEvents: [],
});
const config = { episode: "team-t9-1", memory: "plan" as const, comms: true, stance: "collaborative" as const, team: ["a", "b"] };
const step = (n: number, skill: string, args: Record<string, unknown>, before: Record<string, number>, after: Record<string, number>, extra: Partial<LoggedStep> = {}): LoggedStep => ({
  step: n, at: `2026-10-18T10:0${n}:00.000Z`, observation: obs(before), decision: { skill, args }, result: { status: "success" },
  decisionMs: 0, calls: [call("claude", "claude-haiku-4-5")], config, ticks: n * 600, inventoryAfter: after, ...extra,
});

test("modelName - model ids as people say them", () => {
  const one = (backend: string, model: string) => modelName([{ calls: [call(backend, model)] } as unknown as LoggedStep]);
  assert.equal(one("claude", "claude-sonnet-5-5"), "Claude Sonnet 5.5");
  assert.equal(one("claude", "claude-haiku-4-5-20251001"), "Claude Haiku 4.5");
  assert.equal(one("ollama", "qwen3-4b-instruct:ctx8192"), "Qwen3 4B Instruct, local");
  assert.equal(one("openai", "gpt-6-luna"), "GPT-6 Luna");
  assert.equal(modelName([]), "Scripted baseline");
});

test("deeds - what was made, built, handed over and held at the end", () => {
  const steps = [
    step(1, "craft", { item: "stone_axe", count: 1 }, { cobblestone: 3 }, { stone_axe: 1 }),
    step(2, "build_shelter", { storeys: 2 }, {}, {}, { result: { status: "success", detail: { storeys: 2 } } }),
    step(3, "give", { to: "b", item: "stone_axe", count: 1 }, { stone_axe: 1 }, {}, { result: { status: "success", detail: { gave: 1 } }, decision: { skill: "give", args: { to: "b", item: "stone_axe" }, say: { to: "b", text: "here" } } }),
    step(4, "give", { to: "b", item: "stick" }, {}, {}, { result: { status: "failed", reason: "you have no stick to give" } }),
  ];
  const d = deeds(steps);
  assert.deepEqual(d.crafted, { stone_axe: 1 });
  assert.deepEqual(d.shelters, [2]);
  assert.deepEqual(d.gave.map((g) => [g.item, g.count, g.to]), [["stone_axe", 1, "b"]]);
  assert.equal(d.failedGives, 1);
  assert.deepEqual(d.said, { all: 0, directed: 1 });
  assert.deepEqual(d.toolsAtEnd, []);
});

test("renderComparison - a team episode reads as who did what, with handovers on both sides", () => {
  const run = (file: string, steps: LoggedStep[]): Run => ({ file, steps, s: summarizeRun(steps, file), b: behaviour(steps), r: requests(steps), model: modelName(steps) });
  const a = run("runs/2026-10-18T10-00-00-000Z-a.jsonl", [
    step(1, "craft", { item: "stone_axe", count: 1 }, {}, { stone_axe: 1 }),
    step(2, "give", { to: "b", item: "stone_axe" }, { stone_axe: 1 }, {}, { result: { status: "success", detail: { gave: 1 } }, ended: "goal met" }),
  ]);
  const b = run("runs/2026-10-18T10-00-01-000Z-b.jsonl", [step(1, "wait", { seconds: 5 }, {}, { stone_axe: 1 }, { ended: "goal met" })]);
  const text = renderComparison([a, b], "Team run t9");
  assert.match(text, /^# Team run t9/);
  assert.match(text, /### Team t9, rep 1/);
  assert.match(text, /\*\*a\*\* \(Claude Haiku 4\.5\): made stone axe; gave stone axe to b;/);
  assert.match(text, /\*\*b\*\* .*received stone axe from a; .*ended holding stone axe\./);
  assert.match(text, /0:00 — a made a stone axe/);
});
