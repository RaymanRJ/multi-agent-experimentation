import { test } from "node:test";
import assert from "node:assert";
import { OpenAIBackend } from "./openai.js";
import { costUSD } from "./pricing.js";

test("OpenAIBackend - successful request", async () => {
  const backend = new OpenAIBackend({
    name: "gpt",
    model: "gpt-4.1-mini",
    apiKey: "test-key",
    baseURL: "http://localhost:8000",
  });

  const mockResponse: Record<string, unknown> = {
    choices: [{ message: { content: "Hello, world!" } }],
    usage: { prompt_tokens: 10, completion_tokens: 5 },
  };

  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  (globalThis as any).fetch = async (url: string, options: RequestInit) => {
    fetchCalled = true;
    assert.strictEqual(url, "http://localhost:8000/chat/completions");
    assert.strictEqual(options.method, "POST");
    const headers = options.headers as Record<string, string>;
    assert.strictEqual(headers["Authorization"], "Bearer test-key");
    const body = JSON.parse(options.body as string);
    assert.strictEqual(body.model, "gpt-4.1-mini");
    assert.deepStrictEqual(body.messages, [
      { role: "system", content: "You are helpful" },
      { role: "user", content: "Hi" },
    ]);

    return new Response(JSON.stringify(mockResponse), { status: 200 });
  };

  try {
    const result = await backend.complete("You are helpful", [{ role: "user", content: "Hi" }]);
    assert(fetchCalled);
    assert.strictEqual(result.backend, "gpt");
    assert.strictEqual(result.model, "gpt-4.1-mini");
    assert.strictEqual(result.inputTokens, 10);
    assert.strictEqual(result.outputTokens, 5);
    assert.strictEqual(result.text, "Hello, world!");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("OpenAIBackend - non-2xx response", async () => {
  const backend = new OpenAIBackend({
    name: "gpt",
    model: "gpt-4.1-mini",
    apiKey: "bad-key",
    baseURL: "http://localhost:8000",
  });

  const originalFetch = globalThis.fetch;
  (globalThis as any).fetch = async () => {
    return new Response(JSON.stringify({ error: "Invalid API key" }), {
      status: 401,
    });
  };

  try {
    await assert.rejects(async () => {
      await backend.complete("You are helpful", [{ role: "user", content: "Hi" }]);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("OpenAI pricing - gpt-4.1-mini", () => {
  const call = {
    backend: "gpt",
    model: "gpt-4.1-mini",
    inputTokens: 1_000_000,
    outputTokens: 1_000_000,
    ms: 1000,
    text: "test",
  };

  const cost = costUSD(call);
  // 1M input * $0.40/1M + 1M output * $1.60/1M = $2.00
  assert.strictEqual(cost, 2);
});

test("Ollama backend - zero cost", () => {
  const call = {
    backend: "ollama",
    model: "qwen3:4b",
    inputTokens: 1_000_000,
    outputTokens: 1_000_000,
    ms: 1000,
    text: "test",
  };

  const cost = costUSD(call);
  assert.strictEqual(cost, 0);
});

test("Unknown model - NaN cost", () => {
  const call = {
    backend: "gpt",
    model: "unknown-model",
    inputTokens: 100,
    outputTokens: 50,
    ms: 1000,
    text: "test",
  };

  const cost = costUSD(call);
  assert(Number.isNaN(cost));
});

test("OpenAIBackend - keeps a separate reasoning field as a <think> block", async () => {
  const backend = new OpenAIBackend({ name: "ollama", model: "qwen3:4b", apiKey: "", baseURL: "http://localhost:11434/v1" });
  const originalFetch = globalThis.fetch;
  (globalThis as any).fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: '{"skill":"wait"}', reasoning: "inventory is empty" } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
      { status: 200 },
    );
  try {
    const result = await backend.complete("System", [{ role: "user", content: "User" }]);
    assert.strictEqual(result.text, '<think>inventory is empty</think>\n{"skill":"wait"}');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("OpenAIBackend - captures thinking, finish_reason, id, request and multi-turn history", async () => {
  const backend = new OpenAIBackend({ name: "ollama", model: "qwen3:4b", apiKey: "", baseURL: "http://x/v1" });
  const originalFetch = globalThis.fetch;
  let sent: any;
  (globalThis as any).fetch = async (_url: string, options: RequestInit) => {
    sent = JSON.parse(options.body as string);
    return new Response(
      JSON.stringify({
        id: "chatcmpl-9",
        choices: [{ message: { content: "{}", reasoning: "hmm" }, finish_reason: "length" }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
      { status: 200 },
    );
  };
  try {
    const turns = [
      { role: "user" as const, content: "a" },
      { role: "assistant" as const, content: "b" },
      { role: "user" as const, content: "c" },
    ];
    const r = await backend.complete("S", turns);
    assert.deepStrictEqual(sent.messages, [{ role: "system", content: "S" }, ...turns]);
    assert.strictEqual(r.thinking, "hmm");
    assert.strictEqual(r.stopReason, "length");
    assert.strictEqual(r.requestId, "chatcmpl-9");
    assert.deepStrictEqual(r.request, turns);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
