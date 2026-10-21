import { test } from "node:test";
import assert from "node:assert/strict";
import { PRICED_MODELS, costUSD } from "./pricing.js";

const call = (backend: string, model: string, inputTokens = 1_000_000, outputTokens = 1_000_000, extra = {}) =>
  ({ backend, model, inputTokens, outputTokens, ms: 1, text: "", ...extra });

test("pricing - the local model is free, whatever its name", () => {
  assert.equal(costUSD(call("ollama", "qwen3-4b-instruct:ctx8192")), 0);
});

test("pricing - an unpriced cloud model costs NaN, so a paid run refuses to start rather than report $0", () => {
  assert.ok(Number.isNaN(costUSD(call("claude", "claude-unknown-9"))));
  assert.ok(Number.isNaN(costUSD(call("gemini", "gemini-9-pro"))));
});

test("pricing - every listed model has a positive input and output price", () => {
  for (const model of PRICED_MODELS) {
    const input = costUSD(call("x", model, 1_000_000, 0));
    const output = costUSD(call("x", model, 0, 1_000_000));
    assert.ok(input > 0 && output > input, `${model}: output costs more than input`);
  }
});

test("pricing - no tokens, no cost", () => {
  assert.equal(costUSD(call("claude", "claude-sonnet-5-5", 0, 0)), 0);
});

test("pricing - cached input never makes a call cost more than uncached", () => {
  for (const model of PRICED_MODELS) {
    const plain = costUSD(call("x", model, 10_000, 100));
    const cached = costUSD(call("x", model, 10_000, 100, { cacheReadTokens: 8_000 }));
    assert.ok(cached <= plain, model);
  }
});

test("pricing - an OpenAI model without a listed cached price bills cached input in full", () => {
  const plain = costUSD(call("gpt", "gpt-6.1-sol", 10_000, 0));
  assert.equal(costUSD(call("gpt", "gpt-6.1-sol", 10_000, 0, { cacheReadTokens: 10_000 })), plain);
});
