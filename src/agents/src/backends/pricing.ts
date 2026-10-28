import type { ModelCall } from "../types.js";

/**
 * US dollars (USD) per million tokens: [input, output] or [input, output, cached input]. Claude's
 * cache rates are multiples of its input price (below). Elsewhere, cached input without a listed price
 * is billed at the full input price, so a cost is never understated.
 *
 * Checked against the providers' own pages on 28 October 2026, both in USD:
 * platform.claude.com/docs/en/about-claude/pricing ("All prices are in USD") and
 * developers.openai.com/api/docs/pricing (OpenAI bills API credits in USD only). Standard tier, global
 * routing, short prompts; batch, fast mode, US-only inference and long-context prices are not used here.
 */
const PRICING: Record<string, [number, number] | [number, number, number]> = {
  // Claude models: Anthropic first-party rates.
  "claude-fable-5-1": [10.0, 50.0],
  "claude-fable-5": [10.0, 50.0],
  "claude-opus-5-5": [4.0, 20.0],
  "claude-opus-5": [5.0, 25.0],
  "claude-opus-4-8": [5.0, 25.0],
  "claude-opus-4-7": [5.0, 25.0],
  "claude-opus-4-6": [5.0, 25.0],
  "claude-sonnet-5-5": [2.0, 10.0],
  "claude-sonnet-5": [2.0, 10.0],
  "claude-sonnet-4-6": [3.0, 15.0],
  // Haiku 5.5 for prompts up to 100,000 tokens (ours are about 6,000); $0.50 / $2.50 above that.
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-haiku-4-5": [1.0, 5.0],

  // OpenAI models. The GPT-6 models list cached input (Luna $0.01, Sol $0.10, Astra $1.00) but also
  // cache writes above the input price (Luna $0.125), and the API doesn't report how many tokens were
  // written, so cached input is billed at the full price: costs may be overstated, never understated.
  "gpt-4.1-mini": [0.4, 1.6, 0.1],
  "gpt-6-luna": [0.1, 0.5],
  "gpt-6.1-terra": [1.0, 5.0],
  "gpt-6.1-sol": [2.0, 10.0],
  "gpt-6-sol": [2.0, 10.0],
  "gpt-6-astra": [10.0, 50.0],
};

/** Models with a known price, for error messages. */
export const PRICED_MODELS = Object.keys(PRICING);

/**
 * Claude prompt caching: a write (5-minute lifetime) costs a quarter more than input; a read costs a
 * tenth of input, except on the models below. Before 28 October every Claude read was billed at a
 * tenth, which overstated Opus 5.5 and Sonnet 5.5 costs a little.
 */
export const CLAUDE_CACHE_READ = 0.1;
export const CLAUDE_CACHE_WRITE = 1.25;
const CLAUDE_CACHE_READ_BY_MODEL: Record<string, number> = {
  "claude-opus-5-5": 0.05,
  "claude-sonnet-5-5": 0.05,
  "claude-fable-5-1": 0.025,
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

  const [inputPrice, outputPrice, listedCached] = prices;
  const claude = call.model.startsWith("claude-");
  const read = call.cacheReadTokens ?? 0;
  const write = call.cacheWriteTokens ?? 0;
  const plain = call.inputTokens - read - write;
  const base = call.model.replace(/-\d{8}$/, "");
  const readPrice = claude ? inputPrice * (CLAUDE_CACHE_READ_BY_MODEL[base] ?? CLAUDE_CACHE_READ) : (listedCached ?? inputPrice);
  const writePrice = claude ? inputPrice * CLAUDE_CACHE_WRITE : inputPrice;
  return (plain * inputPrice + read * readPrice + write * writePrice + call.outputTokens * outputPrice) / 1_000_000;
}
