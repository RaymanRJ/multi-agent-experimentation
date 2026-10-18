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
  assert.deepStrictEqual(seen[0].system, [{ type: "text", text: "You are helpful", cache_control: { type: "ephemeral" } }]);
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
  assert.deepStrictEqual(seen[0].messages, [
    { role: "user", content: "a" },
    { role: "assistant", content: [{ type: "text", text: "b", cache_control: { type: "ephemeral" } }] },
    { role: "user", content: "c" },
  ]);
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

test("cachedRequest - breakpoints after the system prompt and after the history before the newest turn", async () => {
  const { cachedRequest } = await import("./anthropic.js");
  const one = cachedRequest("S", [{ role: "user", content: "obs" }]);
  assert.deepStrictEqual(one.messages, [{ role: "user", content: "obs" }], "no history: only the system prompt is marked");
  const turns = [
    { role: "user" as const, content: "o1" }, { role: "assistant" as const, content: "r1" },
    { role: "user" as const, content: "o2" }, { role: "assistant" as const, content: "r2" },
    { role: "user" as const, content: "o3" },
  ];
  const marked = cachedRequest("S", turns).messages.map((m) => typeof m.content !== "string");
  assert.deepStrictEqual(marked, [false, false, false, true, false]);
  const flat = cachedRequest("S", turns).messages.map((m) => (typeof m.content === "string" ? m.content : (m.content[0] as { text: string }).text));
  assert.deepStrictEqual(flat, ["o1", "r1", "o2", "r2", "o3"], "the text sent is unchanged");
});

test("AnthropicBackend - counts cached input in the total and reports reads and writes", async () => {
  const backend = new AnthropicBackend({
    name: "claude",
    model: "claude-sonnet-5-5",
    apiKey: "unused",
    client: fakeClient({
      content: [{ type: "text", text: "ok" }],
      usage: { input_tokens: 300, output_tokens: 10, cache_read_input_tokens: 1500, cache_creation_input_tokens: 200 },
    }),
  });
  const result = await backend.complete("S", [{ role: "user", content: "x" }]);
  assert.strictEqual(result.inputTokens, 2000);
  assert.strictEqual(result.cacheReadTokens, 1500);
  assert.strictEqual(result.cacheWriteTokens, 200);
});

test("Claude pricing - cache reads at a tenth of input, writes at 1.25x", () => {
  const base = { backend: "claude", model: "claude-sonnet-5-5", outputTokens: 0, ms: 1, text: "" };
  // Sonnet 5.5 input is $2/M: 1M plain = $2; 1M read = $0.20; 1M written = $2.50.
  assert.ok(Math.abs(costUSD({ ...base, inputTokens: 1_000_000 }) - 2) < 1e-9);
  assert.ok(Math.abs(costUSD({ ...base, inputTokens: 1_000_000, cacheReadTokens: 1_000_000 }) - 0.2) < 1e-9);
  assert.ok(Math.abs(costUSD({ ...base, inputTokens: 1_000_000, cacheWriteTokens: 1_000_000 }) - 2.5) < 1e-9);
  assert.ok(Math.abs(costUSD({ ...base, inputTokens: 3_000_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 1_000_000 }) - 4.7) < 1e-9);
});

test("AnthropicBackend - offers the decision tool without forcing it, and returns its input apart from the text", async () => {
  const seen: unknown[] = [];
  const tool = { name: "decide", description: "Submit.", schema: { type: "object", properties: {} } };
  const backend = new AnthropicBackend({
    name: "claude",
    model: "claude-sonnet-5-5",
    apiKey: "k",
    client: fakeClient(
      {
        content: [
          { type: "text", text: "Logs first." },
          { type: "tool_use", id: "t1", name: "decide", input: { skill: "gather_wood", args: { count: 12 } } },
        ],
        stop_reason: "tool_use",
        usage: { input_tokens: 10, output_tokens: 5 },
      },
      seen,
    ),
  });
  const call = await backend.complete("System", [{ role: "user", content: "{}" }], tool);
  const params = seen[0] as { tools: Array<{ name: string; input_schema: unknown }>; tool_choice: unknown };
  assert.deepStrictEqual(params.tools.map((t) => t.name), ["decide"]);
  assert.deepStrictEqual(params.tool_choice, { type: "auto" });
  assert.strictEqual(call.text, "Logs first.");
  assert.strictEqual(call.toolInput, '{"skill":"gather_wood","args":{"count":12}}');
  const plain = new AnthropicBackend({ name: "claude", model: "m", apiKey: "k", client: fakeClient({ content: [{ type: "text", text: "{}" }], usage: { input_tokens: 1, output_tokens: 1 } }, seen) });
  await plain.complete("System", [{ role: "user", content: "{}" }]);
  assert.strictEqual((seen[1] as { tools?: unknown }).tools, undefined, "no tool asked for, none sent");
});
