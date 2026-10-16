import { test } from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";

import { BrainError, classify, withRetries } from "./errors.js";
import { AnthropicBackend, type MessagesClient } from "./anthropic.js";
import { OpenAIBackend } from "./openai.js";
import type { Backend, ModelCall } from "../types.js";

const ok: ModelCall = { backend: "fake", model: "m", inputTokens: 1, outputTokens: 1, ms: 1, text: "{}" };

// ---- classify: the error shapes each provider actually returns ----

test("out of credits is fatal (Anthropic billing_error, and the older 400 wording)", () => {
  assert.equal(classify("claude", 402, { type: "billing_error", message: "Your credit balance is too low" }).kind, "fatal");
  assert.equal(
    classify("claude", 400, { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." }).kind,
    "fatal",
  );
});

test("an exhausted OpenAI quota is fatal even though it is a 429", () => {
  assert.equal(classify("gpt", 429, { code: "insufficient_quota", message: "You exceeded your current quota" }).kind, "fatal");
});

test("bad keys and unknown models are fatal", () => {
  assert.equal(classify("claude", 401, { type: "authentication_error" }).kind, "fatal");
  assert.equal(classify("ollama", 404, { message: 'model "nope" not found' }).kind, "fatal");
});

test("rate limits, overload and server errors are transient, with retry-after parsed", () => {
  const limited = classify("gpt", 429, { code: "rate_limit_exceeded", retryAfter: "7" });
  assert.equal(limited.kind, "transient");
  assert.equal(limited.retryAfterMs, 7000);
  assert.equal(classify("claude", 529, { type: "overloaded_error" }).kind, "transient");
  assert.equal(classify("claude", 500, { type: "api_error" }).kind, "transient");
});

// ---- withRetries ----

function flaky(errors: Error[]): Backend & { calls: number } {
  const backend = {
    name: "fake",
    calls: 0,
    async complete(): Promise<ModelCall> {
      const error = errors[backend.calls++];
      if (error) throw error;
      return ok;
    },
  };
  return backend;
}
const quiet = { log: () => {} };

test("transient errors are retried with backoff, honouring retry-after", async () => {
  const slept: number[] = [];
  const inner = flaky([new BrainError("busy", "transient"), new BrainError("slow down", "transient", 429, 5000)]);
  const call = await withRetries(inner, { ...quiet, delays: [100, 200, 400], sleep: async (ms) => void slept.push(ms) }).complete("s", []);
  assert.equal(call, ok);
  assert.equal(inner.calls, 3);
  assert.deepEqual(slept, [100, 5000]);
});

test("fatal errors and timeouts are not retried", async () => {
  for (const error of [new BrainError("no credits", "fatal", 402), new BrainError("too slow", "transient", undefined, undefined, true)]) {
    const inner = flaky([error]);
    await assert.rejects(withRetries(inner, { ...quiet, sleep: async () => {} }).complete("s", []), (e) => e === error);
    assert.equal(inner.calls, 1);
  }
});

test("retries give up after the last delay", async () => {
  const inner = flaky(Array.from({ length: 5 }, () => new BrainError("busy", "transient")));
  await assert.rejects(withRetries(inner, { ...quiet, delays: [1, 1], sleep: async () => {} }).complete("s", []), /busy/);
  assert.equal(inner.calls, 3);
});

// ---- the adapters produce classified errors ----

test("AnthropicBackend turns a billing error into a fatal BrainError", async () => {
  const sdkError = new Anthropic.APIError(
    402,
    { type: "error", error: { type: "billing_error", message: "Your credit balance is too low" } },
    "402 Your credit balance is too low",
    new Headers(),
    "billing_error",
  );
  const client = { messages: { create: async () => Promise.reject(sdkError) } } as unknown as MessagesClient;
  const backend = new AnthropicBackend({ name: "claude", model: "claude-haiku-4-5", apiKey: "x", client });
  await assert.rejects(backend.complete("s", [{ role: "user", content: "u" }]), (e: unknown) => e instanceof BrainError && e.kind === "fatal");
});

test("OpenAIBackend turns insufficient_quota into fatal and a rate limit into transient", async () => {
  const backend = new OpenAIBackend({ name: "gpt", model: "gpt-4.1-mini", apiKey: "x", baseURL: "http://localhost:8000" });
  const originalFetch = globalThis.fetch;
  try {
    (globalThis as any).fetch = async () =>
      new Response(JSON.stringify({ error: { code: "insufficient_quota", type: "insufficient_quota", message: "You exceeded your current quota" } }), { status: 429 });
    await assert.rejects(backend.complete("s", [{ role: "user", content: "u" }]), (e: unknown) => e instanceof BrainError && e.kind === "fatal");

    (globalThis as any).fetch = async () =>
      new Response(JSON.stringify({ error: { code: "rate_limit_exceeded", message: "Rate limit reached" } }), {
        status: 429,
        headers: { "retry-after": "3" },
      });
    await assert.rejects(
      backend.complete("s", [{ role: "user", content: "u" }]),
      (e: unknown) => e instanceof BrainError && e.kind === "transient" && e.retryAfterMs === 3000,
    );

    (globalThis as any).fetch = async () => Promise.reject(new TypeError("fetch failed"));
    await assert.rejects(backend.complete("s", [{ role: "user", content: "u" }]), (e: unknown) => e instanceof BrainError && e.kind === "transient" && !e.timedOut);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
