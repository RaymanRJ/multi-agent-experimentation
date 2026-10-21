import type { ModelCall } from "../types.js";

/**
 * USD per million tokens: [input, output] or [input, output, cached input]. Claude's cache rates
 * are fixed multiples of its input price (below). Elsewhere, cached input without a listed price
 * is billed at the full input price, so a cost is never understated.
 */
const PRICING: Record<string, [number, number] | [number, number, number]> = {
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
  // gpt-4.1-mini list price since its April 2025 launch. The GPT-6 rates come from
  // price aggregators (2026-10-16; gpt-6-luna rechecked 2026-10-18 against two more), not
  // openai.com, which refuses automated reads; verify there before quoting costs. Luna's cached
  // input is listed at $0.01 but its cache writes at $0.125, which this adapter does not count,
  // so cached input is left at the full price: costs may be overstated, never understated.
  "gpt-4.1-mini": [0.4, 1.6, 0.1],
  "gpt-6-luna": [0.1, 0.5],
  "gpt-6.1-sol": [2.0, 10.0],
  "gpt-6-astra": [10.0, 50.0],
};

/** Models with a known price, for error messages. */
export const PRICED_MODELS = Object.keys(PRICING);

/** Claude prompt caching: a read costs a tenth of input, a write (5-minute lifetime) a quarter more. */
export const CLAUDE_CACHE_READ = 0.1;
export const CLAUDE_CACHE_WRITE = 1.25;

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

  const [inputPrice, outputPrice, listedCached] = prices;
  const claude = call.model.startsWith("claude-");
  const read = call.cacheReadTokens ?? 0;
  const write = call.cacheWriteTokens ?? 0;
  const plain = call.inputTokens - read - write;
  const readPrice = claude ? inputPrice * CLAUDE_CACHE_READ : (listedCached ?? inputPrice);
  const writePrice = claude ? inputPrice * CLAUDE_CACHE_WRITE : inputPrice;
  return (plain * inputPrice + read * readPrice + write * writePrice + call.outputTokens * outputPrice) / 1_000_000;
}
