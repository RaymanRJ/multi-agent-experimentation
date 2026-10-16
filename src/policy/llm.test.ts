import { test } from "node:test";
import assert from "node:assert/strict";

import { LLMPolicy, buildSystemPrompt, FULL_MEMORY_TOKEN_BUDGET, estimateTokens } from "./llm.js";
import type { Backend, ChatTurn, ModelCall, Observation, Skill } from "../types.js";

function fakeBackend(texts: string[]): Backend & { users: string[]; sent: ChatTurn[][] } {
  let i = 0;
  const users: string[] = [];
  const sent: ChatTurn[][] = [];
  return {
    name: "fake",
    users,
    sent,
    async complete(_system, turns): Promise<ModelCall> {
      sent.push(turns);
      users.push(turns.at(-1)!.content);
      const text = texts[Math.min(i++, texts.length - 1)]!;
      return { backend: "fake", model: "fake-1", inputTokens: 10, outputTokens: 5, ms: 1, text };
    },
  };
}

const skills: Skill[] = [
  { name: "gather_wood", description: "Collect logs.", args: { count: "number" }, run: async () => ({ status: "success" }) },
  { name: "wait", description: "Idle.", args: { seconds: "number" }, run: async () => ({ status: "success" }) },
];

const obs = { step: 1 } as unknown as Observation;

test("clean JSON", async () => {
  const p = new LLMPolicy(fakeBackend(['{"skill":"gather_wood","args":{"count":5},"rationale":"need wood"}']));
  const out = await p.decide(obs, skills);
  assert.deepEqual(out.decision, { skill: "gather_wood", args: { count: 5 }, rationale: "need wood" });
  assert.equal(out.calls.length, 1);
});

test("fenced JSON", async () => {
  const p = new LLMPolicy(fakeBackend(['Sure:\n```json\n{"skill":"wait","args":{"seconds":2}}\n```']));
  assert.deepEqual((await p.decide(obs, skills)).decision?.args, { seconds: 2 });
});

test("think prefix", async () => {
  const p = new LLMPolicy(fakeBackend(['<think>maybe {"skill":"x"} hmm</think>\n{"skill":"wait","args":{"seconds":1}}']));
  assert.equal((await p.decide(obs, skills)).decision?.skill, "wait");
});

test("invalid skill then valid retries with the error", async () => {
  const b = fakeBackend(['{"skill":"fly","args":{}}', '{"skill":"wait","args":{"seconds":1}}']);
  const out = await new LLMPolicy(b).decide(obs, skills);
  assert.equal(out.decision?.skill, "wait");
  assert.equal(out.calls.length, 2);
  assert.match(b.users[1]!, /unknown skill "fly"/);
});

test("three garbage replies fall back to wait", async () => {
  const out = await new LLMPolicy(fakeBackend(["garbage"])).decide(obs, skills);
  assert.equal(out.calls.length, 3);
  assert.equal(out.decision?.skill, "wait");
  assert.deepEqual(out.decision?.args, { seconds: 5 });
  assert.match(out.decision?.rationale ?? "", /fallback/);
});

test("done ends the episode", async () => {
  const out = await new LLMPolicy(fakeBackend(['{"skill":"done"}'])).decide(obs, skills);
  assert.equal(out.decision, null);
  assert.equal(out.calls.length, 1);
});

test("string number args are coerced", async () => {
  const out = await new LLMPolicy(fakeBackend(['{"skill":"gather_wood","args":{"count":"7"}}'])).decide(obs, skills);
  assert.deepEqual(out.decision?.args, { count: 7 });
});

const wait = '{"skill":"wait","args":{"seconds":1}';

test("prompt varies by options", () => {
  const none = buildSystemPrompt(skills, { memory: "none", comms: false });
  assert.doesNotMatch(none, /"plan"/);
  assert.doesNotMatch(none, /"say"/);
  const plan = buildSystemPrompt(skills, { memory: "plan", comms: false });
  assert.match(plan, /"plan"/);
  assert.doesNotMatch(plan, /"say"/);
  const comms = buildSystemPrompt(skills, { memory: "none", comms: true });
  assert.match(comms, /"say"/);
  assert.match(comms, /Speaking is free/);
  assert.match(comms, /Other agents share this world/);
  assert.doesNotMatch(comms, /"plan"/);
  assert.match(buildSystemPrompt(skills, { memory: "full", comms: true }), /older turns may be dropped/);
});

test("default options are plan + comms, and system is returned", async () => {
  const out = await new LLMPolicy(fakeBackend([`${wait}}`])).decide(obs, skills);
  assert.equal(out.system, buildSystemPrompt(skills, { memory: "plan", comms: true }));
});

test("plan and say are parsed and capped", async () => {
  const long = "x".repeat(500);
  const b = fakeBackend([`${wait},"plan":"  chop then build  ","say":{"to":"Bob","text":"${long}"}}`]);
  const out = await new LLMPolicy(b).decide(obs, skills);
  assert.equal(out.decision?.plan, "chop then build");
  assert.equal(out.decision?.say?.to, "Bob");
  assert.equal(out.decision?.say?.text.length, 200);
});

test("say without a target defaults to all", async () => {
  const out = await new LLMPolicy(fakeBackend([`${wait},"say":{"text":"hi"}}`])).decide(obs, skills);
  assert.deepEqual(out.decision?.say, { to: "all", text: "hi" });
});

test("malformed plan and say are dropped without failing the decision", async () => {
  for (const extra of ['"plan":42,"say":"hello"', '"plan":"","say":{"to":"a"}', '"plan":["a"],"say":[1]', '"say":{"to":"a","text":7}']) {
    const out = await new LLMPolicy(fakeBackend([`${wait},${extra}}`])).decide(obs, skills);
    assert.equal(out.calls.length, 1, extra);
    assert.equal(out.decision?.skill, "wait");
    assert.equal(out.decision?.say, undefined, extra);
    assert.equal(out.decision?.plan, undefined, extra);
  }
});

test("say is dropped when comms is off, plan when memory is none", async () => {
  const reply = `${wait},"plan":"p","say":{"to":"all","text":"t"}}`;
  const a = await new LLMPolicy(fakeBackend([reply]), { memory: "plan", comms: false }).decide(obs, skills);
  assert.equal(a.decision?.plan, "p");
  assert.equal(a.decision?.say, undefined);
  const b = await new LLMPolicy(fakeBackend([reply]), { memory: "none", comms: true }).decide(obs, skills);
  assert.equal(b.decision?.plan, undefined);
  assert.deepEqual(b.decision?.say, { to: "all", text: "t" });
});

test("memory none/plan send a single user turn, retries too", async () => {
  const b = fakeBackend(['{"skill":"fly"}', `${wait}}`]);
  await new LLMPolicy(b, { memory: "plan", comms: false }).decide(obs, skills);
  assert.equal(b.sent[0]!.length, 1);
  assert.equal(b.sent[1]!.length, 1);
  assert.equal(b.sent[1]![0]!.role, "user");
  assert.match(b.sent[1]![0]!.content, /unknown skill/);
});

test("full memory: history grows as alternating turns", async () => {
  const b = fakeBackend([`${wait}}`]);
  const p = new LLMPolicy(b, { memory: "full", comms: false });
  await p.decide({ step: 1 } as unknown as Observation, skills);
  await p.decide({ step: 2 } as unknown as Observation, skills);
  await p.decide({ step: 3 } as unknown as Observation, skills);
  assert.deepEqual(b.sent.map((t) => t.length), [1, 3, 5]);
  assert.deepEqual(b.sent[2]!.map((t) => t.role), ["user", "assistant", "user", "assistant", "user"]);
  assert.equal(b.sent[2]![0]!.content, '{"step":1}');
  assert.equal(b.sent[2]![4]!.content, '{"step":3}');
  assert.equal(b.sent[2]![1]!.content, `${wait}}`);
});

test("full memory: oldest pairs are trimmed to the budget, latest turn kept", async () => {
  const b = fakeBackend([`${wait}}`]);
  const p = new LLMPolicy(b, { memory: "full", comms: false, historyTokens: FULL_MEMORY_TOKEN_BUDGET });
  const big = (n: number) => ({ step: n, pad: "x".repeat(4000) }) as unknown as Observation; // ~1000 tokens each
  for (let i = 1; i <= 6; i++) await p.decide(big(i), skills);
  const system = buildSystemPrompt(skills, { memory: "full", comms: false });
  for (const turns of b.sent) {
    const total = estimateTokens(system) + turns.reduce((n, t) => n + estimateTokens(t.content), 0);
    assert.ok(turns.length === 1 || total <= FULL_MEMORY_TOKEN_BUDGET, `${total} tokens over ${turns.length} turns`);
  }
  const last = b.sent[5]!;
  assert.ok(last.length < 11);
  assert.equal(last.length % 2, 1);
  assert.match(last[last.length - 1]!.content, /"step":6/);
  assert.equal(last[0]!.role, "user");
});

test("full memory: the budget is small for the local model and large for cloud models", async () => {
  const big = (n: number) => ({ step: n, pad: "x".repeat(4000) }) as unknown as Observation; // ~1000 tokens each
  const local = { ...fakeBackend([`${wait}}`]), name: "ollama" };
  const cloud = fakeBackend([`${wait}}`]);
  const pl = new LLMPolicy(local, { memory: "full", comms: false });
  const pc = new LLMPolicy(cloud, { memory: "full", comms: false });
  for (let i = 1; i <= 6; i++) {
    await pl.decide(big(i), skills);
    await pc.decide(big(i), skills);
  }
  assert.ok(local.sent[5]!.length <= 5, `local kept ${local.sent[5]!.length} turns`);
  assert.equal(cloud.sent[5]!.length, 11); // nothing trimmed at ~6000 tokens
});

test("full memory: retry is real back-and-forth but failures stay out of history", async () => {
  const b = fakeBackend(['{"skill":"fly"}', `${wait}}`, `${wait}}`]);
  const p = new LLMPolicy(b, { memory: "full", comms: false });
  await p.decide({ step: 1 } as unknown as Observation, skills);
  const retry = b.sent[1]!;
  assert.deepEqual(retry.map((t) => t.role), ["user", "assistant", "user"]);
  assert.equal(retry[1]!.content, '{"skill":"fly"}');
  assert.match(retry[2]!.content, /unknown skill "fly"/);
  await p.decide({ step: 2 } as unknown as Observation, skills);
  const next = b.sent[2]!;
  assert.deepEqual(next.map((t) => t.content), ['{"step":1}', `${wait}}`, '{"step":2}']);
});

test("full memory: fallback leaves history untouched", async () => {
  const b = fakeBackend(["garbage"]);
  const p = new LLMPolicy(b, { memory: "full", comms: false });
  await p.decide({ step: 1 } as unknown as Observation, skills);
  assert.equal(b.sent[2]!.length, 5);
  await p.decide({ step: 2 } as unknown as Observation, skills);
  assert.equal(b.sent[3]!.length, 1);
});
