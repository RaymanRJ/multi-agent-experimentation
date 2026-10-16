import type { Backend } from "../types.js";
import { env } from "../env.js";
import { OpenAIBackend } from "./openai.js";
import { AnthropicBackend } from "./anthropic.js";
import { withRetries } from "./errors.js";

/** The model-backed brains. `scripted` is not here — it needs no backend. */
export type BrainName = "claude" | "gpt" | "ollama";

export const BRAINS: BrainName[] = ["claude", "gpt", "ollama"];

/**
 * Builds the backend for a brain from environment variables. Throws with a
 * readable message when a cloud brain has no API key — keys come from the
 * environment only, never from a default.
 */
export function createBackend(brain: BrainName): Backend {
  return withRetries(createRawBackend(brain));
}

function createRawBackend(brain: BrainName): Backend {
  switch (brain) {
    case "claude": {
      const apiKey = env("ANTHROPIC_API_KEY", "");
      if (!apiKey) {
        throw new Error(
          "ANTHROPIC_API_KEY environment variable is required for claude brain",
        );
      }
      const model = env("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001");
      return new AnthropicBackend({
        name: "claude",
        model,
        apiKey,
      });
    }

    case "gpt": {
      const apiKey = env("OPENAI_API_KEY", "");
      if (!apiKey) {
        throw new Error(
          "OPENAI_API_KEY environment variable is required for gpt brain",
        );
      }
      const model = env("OPENAI_MODEL", "gpt-4.1-mini");
      const baseURL = env("OPENAI_BASE_URL", "https://api.openai.com/v1");
      return new OpenAIBackend({
        name: "gpt",
        model,
        apiKey,
        baseURL,
      });
    }

    case "ollama": {
      const model = env("OLLAMA_MODEL", "qwen3:4b-instruct");
      const baseURL = env("OLLAMA_URL", "http://localhost:11434/v1");
      return new OpenAIBackend({
        name: "ollama",
        model,
        apiKey: "", // Ollama doesn't require an API key
        baseURL,
      });
    }
  }
}
