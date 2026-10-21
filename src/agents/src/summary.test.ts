import { test } from "node:test";
import assert from "node:assert/strict";
import { behaviour, gameTime, phases, problemKey, renderSummary, requests } from "./summary.js";
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

const failing = (n: number, item: string, reason = "need 3 more cobblestone", extra: Partial<LoggedStep> = {}): LoggedStep => ({
  ...step(n, "craft", "failed"), decision: { skill: "craft", args: { item }, rationale: `make a ${item}` }, result: { status: "failed", reason }, ...extra,
});

test("behaviour - worked, failed and interrupted; response to failure; repeats and loops", () => {
  const steps = [
    failing(1, "stone_pickaxe"), failing(2, "stone_pickaxe"), failing(3, "stone_pickaxe"), // a loop of 3
    failing(4, "stone_axe"), // changed course
    failing(5, "stone_pickaxe"), // a repeat, not adjacent
    { ...step(6, "mine_stone", "success") },
    { ...step(7, "gather_wood", "success"), result: { status: "aborted" as const, reason: "interrupted: a zombie came within 6 blocks" } },
    { ...step(8, "fly", "failed"), result: { status: "failed" as const, reason: "no such skill: fly" } },
    { ...step(9, "wait", "success"), result: { status: "aborted" as const, reason: "the run is ending" } },
  ];
  const b = behaviour(steps);
  assert.equal(b.decisions, 9);
  assert.deepEqual([b.succeeded, b.failed, b.interrupted], [1, 6, 1], "the run ending is not an interruption");
  assert.equal(b.failuresWithNext, 6);
  assert.equal(b.changedCourse, 4, "steps 3, 4, 5 and 8 were followed by something else");
  assert.equal(b.repeatedFailures, 3, "steps 2, 3 and 5 repeat an earlier failure");
  assert.deepEqual(b.longestLoop, { count: 3, decision: 'craft {"item":"stone_pickaxe"}', reason: "need 3 more cobblestone", from: 1 });
  assert.equal(b.invalid, 1);
});

test("behaviour - counts repeat notes once each, and whether the agent chose the same again", () => {
  const note = 'your last 3 decisions were the same craft({"item":"stone_pickaxe"}) and all got the same result';
  const other = 'your last 3 decisions were the same gather_wood({"count":4}) and each succeeded';
  const told = (n: number, item: string, events: string[]) => failing(n, item, undefined, { observation: { ...obs(), recentEvents: events } });
  const steps = [
    told(4, "stone_pickaxe", [note]), // kept on
    told(5, "stone_pickaxe", [note]), // the same note, still showing: not counted again
    told(6, "stone_axe", [note, other]), // changed course after the second note
  ];
  assert.deepEqual(behaviour(steps).repeatNotes, { shown: 2, keptOn: 1 });
});

test("behaviour - game time splits into thinking and doing", () => {
  // 600 ticks per step; 10 s of thinking is 200 of them.
  const steps = [step(1, "mine_stone", "success", { decisionMs: 10_000 }), step(2, "wait", "success", { decisionMs: 10_000 })];
  assert.deepEqual(behaviour(steps).ticksBySkill, { thinking: 400, mine_stone: 400, wait: 400 });
  const slow = [step(1, "craft", "failed", { decisionMs: 60_000 })];
  assert.deepEqual(behaviour(slow).ticksBySkill, { thinking: 600 }, "thinking never exceeds the span");
});

test("renderSummary - a failed model run: verdict, scorecard, sections and its own words", () => {
  const steps: LoggedStep[] = [
    failing(1, "stone_pickaxe"), failing(2, "stone_pickaxe"), failing(3, "stone_pickaxe"),
    { ...step(4, "done", "failed"), decision: null, result: { status: "failed", reason: "the goal is not met yet: you have no stone_pickaxe" }, events: ["done refused"],
      calls: [{ backend: "ollama", model: "m", inputTokens: 10, outputTokens: 5, ms: 1, text: '{"skill":"done","rationale":"I give up on stone"}' }] },
    { ...step(5, "wait", "success"), ended: "time budget" as const },
  ];
  const md = renderSummary(steps, "runs/x-agent.jsonl");
  assert.match(md, /^# Run report: /);
  assert.match(md, /\*\*Goal not met:\*\* the time budget ran out/);
  for (const section of ["## Verdict", "## Scorecard", "## Progress", "## Where the time went", "## What got in its way", "## In its own words", "## Notable moments", "<details><summary>The run, step by step"]) {
    assert.ok(md.includes(section), section);
  }
  assert.match(md, /Still outstanding at the end: you have no stone_pickaxe/);
  assert.match(md, /failed 3 times in a row from step 1/);
  assert.match(md, /claimed to be done 1 time before the goal was met/);
  assert.match(md, /\*\*3×\*\* \(craft\): need 3 more cobblestone/);
  assert.match(md, /\*\*At the end\*\*, choosing `done`: "I give up on stone"/, "the rationale of a done comes from its reply");
});

test("renderSummary - a run the model gave up on says so first, with its reason", () => {
  const steps: LoggedStep[] = [
    failing(1, "stone_pickaxe"),
    { ...step(2, "give_up", "failed"), decision: { skill: "give_up", args: { reason: "no stone I can reach" } }, result: { status: "failed", reason: "gave up: no stone I can reach" }, ended: "model gave up" as const },
  ];
  const md = renderSummary(steps, "runs/x-agent.jsonl");
  assert.match(md, /\*\*Goal not met:\*\* the model gave up/);
  assert.match(md, /- It gave up after 2 decisions and 1:00 of game time, saying: "no stone I can reach"/);
});

test("renderSummary - a met goal, and a scripted run without the model-only parts", () => {
  const base = { at: "2026-10-17T10:00:00.000Z", config: { brain: "scripted" } as unknown as LoggedStep["config"] };
  const steps: LoggedStep[] = [
    { ...step(1, "mine_stone", "success"), ...base },
    { ...step(2, "craft", "success", { inventoryAfter: { stone_pickaxe: 1 } }), decision: { skill: "craft", args: { item: "stone_pickaxe" }, rationale: "" }, ...base, ended: "goal met" as const },
  ];
  const md = renderSummary(steps, "runs/x-base.jsonl");
  assert.match(md, /\*\*Goal met\*\*/);
  assert.match(md, /Met its goal in 2 decisions/);
  for (const modelOnly of ["## In its own words", "False \"done\" claims", "Tokens", "Cost"]) {
    assert.ok(!md.includes(modelOnly.replace(/\\/g, "")), `no ${modelOnly} for the baseline`);
  }
  assert.match(md, /Nothing failed\./);
});

test("requests - what it asked of others and what it did when asked", () => {
  const steps: LoggedStep[] = [
    step(1, "tell_agent", "success", { decision: { skill: "tell_agent", args: { to: "qwen", skill: "give", args: '{"count":5}' } } }),
    step(2, "ask_agent", "success", { decision: { skill: "ask_agent", args: { to: "qwen", question: "logs?" } }, result: { status: "success", detail: { reply: "40" } } }),
    step(3, "give", "success", { responses: [{ from: "qwen", kind: "tell", skill: "give", args: { count: 5 }, response: "complied" }, { from: "qwen", kind: "ask", question: "ready?", response: "unanswered" }] }),
  ];
  const r = requests(steps);
  assert.deepEqual(r.sent.map((x) => [x.kind, x.to, x.what, x.reply]), [["tell", "qwen", 'give {"count":5}', undefined], ["ask", "qwen", "logs?", "40"]]);
  assert.deepEqual(r.received.map((x) => x.response), ["complied", "unanswered"]);
  const text = renderSummary(steps, "runs/x.jsonl");
  assert.match(text, /## Requests between agents/);
  assert.match(text, /Of 1 request to act, it did 1 as asked\./);
  assert.match(text, /Of 1 question put to it, it answered 0\./);
});
