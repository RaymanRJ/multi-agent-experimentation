import { test } from "node:test";
import assert from "node:assert/strict";
import { MessageBuffer, formatNarration, formatSpeech, isNarration, parseSpeech } from "./comms.js";

test("parseSpeech reads addressed, @all and bare lines", () => {
  assert.deepEqual(parseSpeech("@agent_b take the stone"), { to: "agent_b", text: "take the stone" });
  assert.deepEqual(parseSpeech("@all hello"), { to: "all", text: "hello" });
  assert.deepEqual(parseSpeech("hello there"), { to: "all", text: "hello there" });
  assert.deepEqual(parseSpeech("@agent_b"), { to: "all", text: "@agent_b" });
});

test("formatSpeech round-trips through parseSpeech", () => {
  for (const [to, text] of [["agent_b", "hi"], ["all", "hi"], ["all", "@weird start"]] as const) {
    assert.deepEqual(parseSpeech(formatSpeech(to, text)), { to, text });
  }
});

test("formatSpeech clips to the chat limit", () => {
  assert.ok(formatSpeech("all", "x".repeat(500)).length <= 250);
});

test("narration is marked and never heard", () => {
  const line = formatNarration("gather_wood({})");
  assert.ok(isNarration(line));
  const buf = new MessageBuffer("a");
  assert.equal(buf.hear("b", line), false);
  assert.deepEqual(buf.snapshot(), []);
});

test("an agent never hears its own messages", () => {
  const buf = new MessageBuffer("a");
  assert.equal(buf.hear("a", "@b on it", 1000), false);
  assert.deepEqual(buf.snapshot(1000), []);
});

test("buffer keeps the last 8, oldest first, with ages", () => {
  const buf = new MessageBuffer("a");
  for (let i = 0; i < 10; i++) buf.hear("b", `@a msg${i}`, 1000 * i);
  const snap = buf.snapshot(10_000);
  assert.equal(snap.length, 8);
  assert.equal(snap[0]!.text, "msg2");
  assert.equal(snap[0]!.ageSeconds, 8);
  assert.equal(snap[7]!.ageSeconds, 1);
  assert.equal(snap[7]!.to, "a");
  assert.equal(snap[7]!.from, "b");
});

test("parseActivity reads the skill from a narration line, nothing else", async () => {
  const { parseActivity } = await import("./comms.js");
  assert.equal(parseActivity('[act] gather_wood({"count":10}) — need logs'), 'gather_wood({"count":10})');
  assert.equal(parseActivity("[act] online — brain: llm:ollama"), null);
  assert.equal(parseActivity("@agent_a I'll take stone"), null);
});

test("only messages addressed to this agent by name count as directed", async () => {
  const { MessageBuffer } = await import("./comms.js");
  const b = new MessageBuffer("agent_a");
  b.hear("agent_b", "everyone: trees to the north");
  b.hear("agent_b", "@agent_c you mine");
  assert.equal(b.directed, 0);
  b.hear("agent_b", "@agent_a can you mine the stone?");
  assert.equal(b.directed, 1);
  assert.deepEqual(b.lastDirected, { from: "agent_b", text: "can you mine the stone?" });
});

test("the same words from the same sender interrupt only once", () => {
  const b = new MessageBuffer("qwen");
  b.hear("haiku", "@qwen bringing you a sword", 0);
  b.hear("haiku", "@qwen bringing you a sword", 1);
  assert.equal(b.directed, 1, "a repeat is heard but doesn't interrupt again");
  assert.equal(b.snapshot(2).length, 2);
  b.hear("haiku", "@qwen it is beside you", 3);
  b.hear("bob", "@qwen it is beside you", 4);
  assert.equal(b.directed, 3, "new words, or another sender, do");
});

test("requests addressed to an agent are kept apart from its messages, once each, until it decides", async () => {
  const { MessageBuffer, formatSpeech, requestText } = await import("./comms.js");
  const buf = new MessageBuffer("qwen");
  const tell = formatSpeech("qwen", requestText({ kind: "tell", skill: "give", args: { to: "sonnet", item: "oak_log", count: 20 } }));
  assert.equal(tell, '@qwen [tell] give {"to":"sonnet","item":"oak_log","count":20}');
  buf.hear("sonnet", tell, 1000);
  buf.hear("sonnet", tell, 2000);
  buf.hear("haiku", formatSpeech("qwen", requestText({ kind: "ask", question: "how many logs?" })), 3000);
  buf.hear("haiku", formatSpeech("sonnet", requestText({ kind: "ask", question: "where are you?" })), 3000);
  assert.equal(buf.directed, 2, "both requests interrupt; the repeat does not");
  const { requests, mark } = buf.pending(4000);
  assert.deepEqual(requests, [
    { from: "sonnet", kind: "tell", skill: "give", args: { to: "sonnet", item: "oak_log", count: 20 }, ageSeconds: 3 },
    { from: "haiku", kind: "ask", question: "how many logs?", ageSeconds: 1 },
  ]);
  assert.deepEqual(buf.snapshot(4000).map((m) => m.text), ["[ask] where are you?"], "a request for someone else is ordinary chat");
  buf.hear("haiku", formatSpeech("qwen", requestText({ kind: "ask", question: "still there?" })), 5000);
  buf.settle(mark);
  assert.deepEqual(buf.pending(5000).requests.map((r) => r.question), ["still there?"], "one heard while deciding waits for the next decision");
});

test("parseRequest reads tells and asks, keeps the skill when args are mangled, ignores plain speech", async () => {
  const { parseRequest } = await import("./comms.js");
  assert.deepEqual(parseRequest('[tell] craft {"item":"stone_axe"}'), { kind: "tell", skill: "craft", args: { item: "stone_axe" } });
  assert.deepEqual(parseRequest('[tell] give {"to":"a","ite...'), { kind: "tell", skill: "give", args: {} });
  assert.deepEqual(parseRequest("[ask] got logs?"), { kind: "ask", question: "got logs?" });
  assert.equal(parseRequest("[ask] "), null);
  assert.equal(parseRequest("I'll take stone"), null);
});

test("responseTo judges compliance from the decision alone", async () => {
  const { responseTo } = await import("./comms.js");
  const tell = { from: "sonnet", kind: "tell" as const, skill: "give", args: { to: "sonnet", item: "oak_log", count: 20 } };
  const give = (args: Record<string, unknown>) => ({ skill: "give", args });
  assert.equal(responseTo(tell, give({ to: "Sonnet", item: "oak_log", count: 20 })), "complied");
  assert.equal(responseTo(tell, give({ to: "sonnet", item: "oak_log", count: 5 })), "partly");
  assert.equal(responseTo(tell, { skill: "gather_wood", args: { count: 40 } }), "other");
  assert.equal(responseTo(tell, null), "other");
  const ask = { from: "haiku", kind: "ask" as const, question: "logs?" };
  assert.equal(responseTo(ask, { skill: "wait", args: {}, say: { to: "haiku", text: "40" } }), "answered");
  assert.equal(responseTo(ask, { skill: "wait", args: {}, say: { to: "all", text: "40" } }), "answered");
  assert.equal(responseTo(ask, { skill: "wait", args: {}, say: { to: "sonnet", text: "hi" } }), "unanswered");
  assert.equal(responseTo(ask, { skill: "wait", args: {} }), "unanswered");
});
