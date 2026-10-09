import { test } from "node:test";
import assert from "node:assert/strict";
import { agentNameFromFile, buildMind, extractThink, formatCost, pickLatestFiles, sumCost } from "./minds.js";
import type { LoggedStep, ModelCall } from "./types.js";

const call = (backend: string, model: string, i = 1000, o = 1000, text = ""): ModelCall => ({
  backend, model, inputTokens: i, outputTokens: o, ms: 10, text,
});

test("agent name parsed from file name", () => {
  assert.equal(agentNameFromFile("2026-10-09T15-19-29-683Z-agent_ollama.jsonl"), "agent_ollama");
  assert.equal(agentNameFromFile("notes.txt"), null);
});

test("pickLatestFiles keeps newest per agent and drops stale", () => {
  const now = 10_000_000;
  const f = (name: string, age: number) => ({ name, mtimeMs: now - age });
  const got = pickLatestFiles(
    [
      f("2026-10-09T10-00-00-000Z-a.jsonl", 60_000),
      f("2026-10-09T11-00-00-000Z-a.jsonl", 10_000),
      f("2026-10-09T09-00-00-000Z-b.jsonl", 31 * 60_000),
      f("2026-10-09T09-00-00-000Z-c.jsonl", 5_000),
    ],
    now,
  );
  assert.deepEqual([...got.keys()].sort(), ["a", "c"]);
  assert.equal(got.get("a")?.name, "2026-10-09T11-00-00-000Z-a.jsonl");
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

test("buildMind uses latest step and call", () => {
  const obs = {} as LoggedStep["observation"];
  const steps: LoggedStep[] = [
    { step: 1, at: new Date(0).toISOString(), observation: obs, decision: null, result: null, decisionMs: 5, calls: [] },
    {
      step: 2, at: new Date(100_000).toISOString(), observation: obs,
      decision: { skill: "explore", args: { distance: 16 }, rationale: "look around" },
      result: { status: "success" }, decisionMs: 42_000,
      calls: [call("ollama", "qwen3:4b", 10, 20, "<think>deep</think>ok")],
    },
  ];
  const m = buildMind("agent_ollama", steps, 100_000, 118_000)!;
  assert.equal(m.step, 2);
  assert.equal(m.model, "qwen3:4b");
  assert.equal(m.reasoning, "deep");
  assert.equal(m.cost, "free");
  assert.equal(m.tokensIn, 10);
  assert.equal(m.secondsSinceLast, 18);
  assert.equal(buildMind("a", [], 0, 0), null);
});
