import type { ModelCall } from "../types.js";

/** USD per million tokens (input, output) */
const PRICING: Record<string, [number, number]> = {
  // Claude models — Anthropic first-party rates (claude-api skill table, cached 2026-09-25)
  "claude-haiku-4-5": [1.0, 5.0],
  "claude-opus-5-5": [4.0, 20.0],
  "claude-opus-5": [5.0, 25.0],
  "claude-opus-4-8": [5.0, 25.0],
  "claude-opus-4-7": [5.0, 25.0],
  "claude-opus-4-6": [5.0, 25.0],
  "claude-sonnet-5-5": [2.0, 10.0],
  "claude-sonnet-5": [2.0, 10.0],
  "claude-sonnet-4-6": [3.0, 15.0],

  // OpenAI models
  // gpt-4.1-mini list price since its April 2025 launch; verify at
  // https://openai.com/api/pricing before quoting costs.
  "gpt-4.1-mini": [0.4, 1.6],
};

export function costUSD(call: ModelCall): number {
  // Local/unknown models have zero cost
  if (call.backend === "ollama") {
    return 0;
  }

  // Dated snapshot ids (claude-haiku-4-5-20251001) price as their base model.
  const prices = PRICING[call.model] ?? PRICING[call.model.replace(/-\d{8}$/, "")];
  if (!prices) {
    // Unknown cloud model
    return NaN;
  }

  const [inputPrice, outputPrice] = prices;
  return (call.inputTokens * inputPrice + call.outputTokens * outputPrice) / 1_000_000;
}
