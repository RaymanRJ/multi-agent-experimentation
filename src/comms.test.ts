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

test("own echoes are ignored; sent messages are recorded", () => {
  const buf = new MessageBuffer("a");
  buf.sent("b", "on it", 1000);
  assert.equal(buf.hear("a", "@b on it", 1000), false);
  assert.equal(buf.snapshot(1000).length, 1);
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
