import { test } from "node:test";
import assert from "node:assert";
import { BRAINS, createBackend } from "./index.js";

/** Runs `body` with these environment variables set (undefined unsets), then restores them. */
function withEnv(vars: Record<string, string | undefined>, body: () => void): void {
  const saved = Object.fromEntries(Object.keys(vars).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    body();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("BRAINS lists every provider, including the OpenAI-compatible ones", () => {
  for (const brain of ["claude", "gpt", "grok", "gemini", "groq", "openrouter", "ollama"]) {
    assert.ok(BRAINS.includes(brain as never), brain);
  }
});

test("createBackend - a provider without a default model needs both key and model", () => {
  withEnv({ XAI_API_KEY: undefined, XAI_MODEL: "grok-test" }, () => {
    assert.throws(() => createBackend("grok"), /XAI_API_KEY environment variable is required/);
  });
  withEnv({ XAI_API_KEY: "test-key", XAI_MODEL: undefined }, () => {
    assert.throws(() => createBackend("grok"), /XAI_MODEL environment variable is required/);
  });
  withEnv({ XAI_API_KEY: "test-key", XAI_MODEL: "grok-test" }, () => {
    assert.strictEqual(createBackend("grok").name, "grok");
  });
});

test("createBackend - ollama needs no key", () => {
  assert.strictEqual(createBackend("ollama").name, "ollama");
});
