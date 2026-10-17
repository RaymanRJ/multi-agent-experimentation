import { test } from "node:test";
import assert from "node:assert/strict";
import { agentNameFromFile, brainLabel, extractThink, formatCost, inventoryDelta, runRow, runStatus, STALLED_MS, sumCost, timeline } from "./minds.js";
import type { LoggedStep, ModelCall } from "./types.js";

const call = (backend: string, model: string, i = 1000, o = 1000, text = ""): ModelCall => ({
  backend, model, inputTokens: i, outputTokens: o, ms: 10, text,
});

test("agent name parsed from file name", () => {
  assert.equal(agentNameFromFile("2026-10-09T15-19-29-683Z-agent_ollama.jsonl"), "agent_ollama");
  assert.equal(agentNameFromFile("notes.txt"), null);
});

test("extractThink", () => {
  assert.equal(extractThink("<think>\n hmm \n</think>{\"skill\":\"x\"}"), "hmm");
  assert.equal(extractThink("<think>a</think> x <think>b</think>"), "a\n\nb");
  assert.equal(extractThink("<think>unfinished"), "unfinished");
  assert.equal(extractThink("no thinking here"), null);
  assert.equal(extractThink(undefined), null);
});

test("cost: ollama free, known summed, unknown NaN", () => {
  const ollama = [call("ollama", "qwen3:4b")];
  assert.equal(sumCost(ollama), 0);
  assert.equal(formatCost(0, ollama), "free");
  const claude = [call("claude", "claude-sonnet-5-5"), call("claude", "claude-sonnet-5-5")];
  assert.ok(Math.abs(sumCost(claude) - 0.024) < 1e-9);
  const unk = [call("openai", "mystery-model"), call("claude", "claude-sonnet-5-5")];
  assert.ok(Number.isNaN(sumCost(unk)));
  assert.equal(formatCost(sumCost(unk), unk), "—");
  assert.equal(formatCost(0, []), "free");
});

const obs = (over: Partial<LoggedStep["observation"]> = {}): LoggedStep["observation"] => ({
  step: 1, scenario: "sandbox", goal: "Craft a stone pickaxe", position: { x: 0, y: 64, z: 0 }, health: 20, food: 20,
  timeOfDay: 0, isDay: true, inventory: {}, nearbyBlocks: {}, hostiles: [], otherAgents: [], recentEvents: [], ...over,
});
const step = (n: number, over: Partial<LoggedStep> = {}): LoggedStep => ({
  step: n, at: new Date(n * 1000).toISOString(), observation: obs(), decision: { skill: "gather_wood", args: { count: 3 } },
  result: { status: "success" }, decisionMs: 3000, calls: [], ...over,
});

test("runStatus: ended when the last line says so, stopped when silent too long, else running", () => {
  assert.equal(runStatus([step(1, { ended: "goal met" })], 0, 10 * STALLED_MS), "ended");
  assert.equal(runStatus([step(1)], 0, STALLED_MS + 1), "stopped");
  assert.equal(runStatus([step(1)], 0, 1000), "running");
});

test("brainLabel reads the model, and scripted runs have none", () => {
  assert.deepEqual(brainLabel([step(1)]), { label: "Scripted baseline", detail: "no model" });
  const qwen = step(1, { calls: [call("ollama", "qwen3-4b-instruct:ctx8192")] });
  assert.deepEqual(brainLabel([qwen]), { label: "Qwen3 4B instruct", detail: "local · 8k context" });
  assert.deepEqual(brainLabel([step(1, { calls: [call("claude", "claude-haiku-4-5")] })]), { label: "claude-haiku-4-5", detail: "claude" });
});

test("inventoryDelta reports gains and losses only", () => {
  assert.deepEqual(inventoryDelta({ stick: 2, cobblestone: 3 }, { cobblestone: 0, stone_pickaxe: 1 }), { stick: -2, cobblestone: -3, stone_pickaxe: 1 });
  assert.deepEqual(inventoryDelta({ a: 1 }, undefined), {});
});

test("timeline shows only messages new on each step", () => {
  const m1 = { from: "bob", to: "all", text: "hi", ageSeconds: 1 };
  const m2 = { from: "bob", to: "me", text: "wood?", ageSeconds: 1 };
  const items = timeline([step(1, { observation: obs({ messages: [m1] }) }), step(2, { observation: obs({ messages: [{ ...m1, ageSeconds: 9 }, m2] }) })]);
  assert.deepEqual(items.map((i) => i.heard.map((m) => m.text)), [["hi"], ["wood?"]]);
});

test("runRow summarises progress and the run's end", () => {
  const steps = [
    step(1, { inventoryAfter: { oak_log: 3 }, ticks: 100 }),
    step(2, { decision: { skill: "craft", args: { item: "wooden_pickaxe" } }, inventoryAfter: { wooden_pickaxe: 1 }, ticks: 200, ended: "model ended" }),
  ];
  const row = runRow("2026-10-17T00-00-00-000Z-qnone_tools_1.jsonl", steps, 0, 0)!;
  assert.equal(row.agent, "qnone_tools_1");
  assert.equal(row.status, "ended");
  assert.equal(row.ended, "model ended");
  assert.equal(row.milestones["logs"], 1);
  assert.equal(row.milestones["wooden_pickaxe"], 2);
  assert.equal(row.milestones["stone"], null);
  assert.equal(row.ticks, 200);
});
