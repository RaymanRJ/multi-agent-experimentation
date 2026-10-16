import { test } from "node:test";
import assert from "node:assert";
import { AnthropicBackend, type MessagesClient } from "./anthropic.js";
import { costUSD } from "./pricing.js";

/** A fake SDK client that records the request and returns a canned message. */
function fakeClient(reply: unknown, seen: unknown[] = []): MessagesClient {
  return {
    messages: {
      create: async (params: unknown) => {
        seen.push(params);
        if (reply instanceof Error) throw reply;
        return reply;
      },
    },
  } as unknown as MessagesClient;
}

test("AnthropicBackend - request shape and token parsing", async () => {
  const seen: any[] = [];
  const backend = new AnthropicBackend({
    name: "claude",
    model: "claude-haiku-4-5",
    apiKey: "unused",
    client: fakeClient(
      { content: [{ type: "text", text: "Hello" }], usage: { input_tokens: 20, output_tokens: 15 } },
      seen,
    ),
  });

  const result = await backend.complete("You are helpful", [{ role: "user", content: "Hi" }]);

  assert.strictEqual(seen[0].model, "claude-haiku-4-5");
  assert.strictEqual(seen[0].system, "You are helpful");
  assert.deepStrictEqual(seen[0].messages, [{ role: "user", content: "Hi" }]);
  assert.strictEqual(result.backend, "claude");
  assert.strictEqual(result.inputTokens, 20);
  assert.strictEqual(result.outputTokens, 15);
  assert.strictEqual(result.text, "Hello");
});

test("AnthropicBackend - keeps thinking apart from text, joins text blocks", async () => {
  const backend = new AnthropicBackend({
    name: "claude",
    model: "claude-opus-5-5",
    apiKey: "unused",
    client: fakeClient({
      content: [
        { type: "thinking", thinking: "weighing options", signature: "x" },
        { type: "text", text: '{"skill":' },
        { type: "text", text: '"wait"}' },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
      stop_reason: "end_turn",
      id: "msg_123",
    }),
  });

  const result = await backend.complete("System", [{ role: "user", content: "User" }]);
  assert.strictEqual(result.text, '{"skill":"wait"}');
  assert.strictEqual(result.thinking, "weighing options");
  assert.strictEqual(result.stopReason, "end_turn");
  assert.strictEqual(result.requestId, "msg_123");
  assert.deepStrictEqual(result.request, [{ role: "user", content: "User" }]);
});

test("AnthropicBackend - sends multi-turn history in order", async () => {
  const seen: any[] = [];
  const backend = new AnthropicBackend({
    name: "claude",
    model: "claude-haiku-4-5",
    apiKey: "unused",
    client: fakeClient({ content: [{ type: "text", text: "ok" }], usage: { input_tokens: 1, output_tokens: 1 } }, seen),
  });
  const turns = [
    { role: "user" as const, content: "a" },
    { role: "assistant" as const, content: "b" },
    { role: "user" as const, content: "c" },
  ];
  const result = await backend.complete("S", turns);
  assert.deepStrictEqual(seen[0].messages, turns);
  assert.strictEqual(result.thinking, undefined);
});

test("AnthropicBackend - API errors propagate", async () => {
  const backend = new AnthropicBackend({
    name: "claude",
    model: "claude-haiku-4-5",
    apiKey: "unused",
    client: fakeClient(new Error("401 invalid x-api-key")),
  });

  await assert.rejects(() => backend.complete("System", [{ role: "user", content: "User" }]), /401/);
});

test("Claude pricing - haiku", () => {
  const call = { backend: "claude", model: "claude-haiku-4-5", inputTokens: 1_000_000, outputTokens: 1_000_000, ms: 1, text: "" };
  assert.strictEqual(costUSD(call), 6);
});

test("Claude pricing - dated snapshot ids resolve to their base model", () => {
  const call = { backend: "claude", model: "claude-haiku-4-5-20251001", inputTokens: 1_000_000, outputTokens: 1_000_000, ms: 1, text: "" };
  assert.strictEqual(costUSD(call), 6);
});

test("Claude pricing - opus-5-5", () => {
  const call = { backend: "claude", model: "claude-opus-5-5", inputTokens: 1_000_000, outputTokens: 1_000_000, ms: 1, text: "" };
  assert.strictEqual(costUSD(call), 24);
});
