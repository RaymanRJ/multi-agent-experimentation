import { test } from "node:test";
import assert from "node:assert/strict";

import { LLMPolicy } from "./llm.js";
import type { Backend, ModelCall, Observation, Skill } from "../types.js";

function fakeBackend(texts: string[]): Backend & { users: string[] } {
  let i = 0;
  const users: string[] = [];
  return {
    name: "fake",
    users,
    async complete(_system, turns): Promise<ModelCall> {
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
