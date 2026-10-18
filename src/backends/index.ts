import type { Backend } from "../types.js";
import { env } from "../env.js";
import { OpenAIBackend } from "./openai.js";
import { AnthropicBackend } from "./anthropic.js";
import { withRetries } from "./errors.js";

/**
 * Every model-backed brain, as data. Most providers speak OpenAI's /chat/completions,
 * so adding one is an entry here (plus its model's price in pricing.ts), not new code.
 * `scripted` is not here — it needs no backend.
 */
interface Provider {
  /** "anthropic" uses the Anthropic SDK; everything else is OpenAI-compatible. */
  api: "anthropic" | "openai";
  /** Environment variable holding the API key; absent for local models that need none. */
  keyVar?: string;
  /** Environment variable naming the model. */
  modelVar: string;
  /** Used when modelVar is unset. Absent means the model must be named explicitly. */
  defaultModel?: string;
  baseURL?: string;
  /** Environment variable that overrides baseURL. */
  urlVar?: string;
}

export const PROVIDERS = {
  claude: { api: "anthropic", keyVar: "ANTHROPIC_API_KEY", modelVar: "ANTHROPIC_MODEL", defaultModel: "claude-haiku-4-5-20251001" },
  gpt: { api: "openai", keyVar: "OPENAI_API_KEY", modelVar: "OPENAI_MODEL", defaultModel: "gpt-6-luna", baseURL: "https://api.openai.com/v1", urlVar: "OPENAI_BASE_URL" },
  grok: { api: "openai", keyVar: "XAI_API_KEY", modelVar: "XAI_MODEL", baseURL: "https://api.x.ai/v1" },
  gemini: { api: "openai", keyVar: "GEMINI_API_KEY", modelVar: "GEMINI_MODEL", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai" },
  // Hosted open-weight models (Llama, Qwen, gpt-oss...) on Groq's servers.
  groq: { api: "openai", keyVar: "GROQ_API_KEY", modelVar: "GROQ_MODEL", baseURL: "https://api.groq.com/openai/v1" },
  // One key for most providers' models; model names look like "meta-llama/llama-4-maverick".
  openrouter: { api: "openai", keyVar: "OPENROUTER_API_KEY", modelVar: "OPENROUTER_MODEL", baseURL: "https://openrouter.ai/api/v1" },
  ollama: { api: "openai", modelVar: "OLLAMA_MODEL", defaultModel: "qwen3:4b-instruct", baseURL: "http://localhost:11434/v1", urlVar: "OLLAMA_URL" },
} satisfies Record<string, Provider>;

export type BrainName = keyof typeof PROVIDERS;

export const BRAINS = Object.keys(PROVIDERS) as BrainName[];

/**
 * Builds the backend for a brain from environment variables. Throws with a
 * readable message when a cloud brain has no API key or no model — keys come
 * from the environment only, never from a default.
 */
export function createBackend(brain: BrainName): Backend {
  return withRetries(createRawBackend(brain));
}

function createRawBackend(brain: BrainName): Backend {
  const provider: Provider = PROVIDERS[brain];
  const apiKey = provider.keyVar ? env(provider.keyVar, "") : "";
  if (provider.keyVar && !apiKey) {
    throw new Error(`${provider.keyVar} environment variable is required for ${brain} brain`);
  }
  const model = env(provider.modelVar, provider.defaultModel ?? "");
  if (!model) {
    throw new Error(`${provider.modelVar} environment variable is required for ${brain} brain (the model to use)`);
  }

  if (provider.api === "anthropic") {
    return new AnthropicBackend({ name: brain, model, apiKey });
  }

  const baseURL = provider.urlVar ? env(provider.urlVar, provider.baseURL ?? "") : (provider.baseURL ?? "");
  // 8k fits the system prompt plus a few decisions of history; ~0.4GB more than the default 4096.
  const context = brain === "ollama" ? Math.floor(Number(env("OLLAMA_CONTEXT", "8192"))) : 0;
  return new OpenAIBackend({
    name: brain,
    model,
    apiKey,
    baseURL,
    ...(context > 0 && { ollamaContext: context }),
    // No decision tool on the OpenAI-compatible APIs for now: OpenAI's reasoning models refuse
    // tools on /chat/completions unless reasoning is switched off (gpt-6-luna, 18 October), and
    // switching it off would handicap them. They answer in JSON text, as they always have, and
    // never showed Sonnet's tool-call-as-text problem. The local model answers in text too.
    tools: false,
  });
}
