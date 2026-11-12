import type { ModelCall } from "../types.js";

/**
 * US dollars (USD) per million tokens: [input, output] or [input, output, cached input]. Claude's
 * cache rates are multiples of its input price (below). Elsewhere, cached input is billed at its listed
 * price, or at the full input price where none is listed.
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

  // OpenAI models, with the GPT-6 models' listed cached-input prices (Luna $0.01, Sol $0.10, Astra $1.00).
  // Until 10 November cached input was priced in full, which put Luna runs at about 2.7 times the bill
  // (tluna20: $1.45 estimated, $0.53 billed). Then uncached input was priced as plain input, but it is billed
  // as cache writes (OPENAI_CACHE_WRITE): the 12 November night (tluna29-31, 47.9M input of which 37.3M cached,
  // 2.9M output) was estimated at $2.90 and billed $3.16; at the write rate it prices at $3.17.
  "gpt-4.1-mini": [0.4, 1.6, 0.1],
  "gpt-6-luna": [0.1, 0.5, 0.01],
  "gpt-6.1-terra": [1.0, 5.0],
  "gpt-6.1-sol": [2.0, 10.0, 0.1],
  "gpt-6-sol": [2.0, 10.0, 0.1],
  "gpt-6-astra": [10.0, 50.0, 1.0],
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
/** Anthropic's 1-hour cache writes, against 1.25x for the 5-minute ones. */
export const CLAUDE_CACHE_WRITE_1H = 2;
const CLAUDE_CACHE_READ_BY_MODEL: Record<string, number> = {
  "claude-opus-5-5": 0.05,
  "claude-sonnet-5-5": 0.05,
  "claude-fable-5-1": 0.025,
};

/**
 * Uncached input to a GPT-6 model with a listed cached price is billed as a cache write, at this multiple of its
 * input price (Luna: $0.125 against $0.10). The API doesn't say which tokens were written, and nearly all uncached
 * input in our runs is: the prompt's fixed head is cached and each call adds to it.
 */
export const OPENAI_CACHE_WRITE = 1.25;

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
  // GPT-6 with a cached price: uncached input is billed as cache writes.
  const plainPrice = base.startsWith("gpt-6") && listedCached !== undefined ? inputPrice * OPENAI_CACHE_WRITE : inputPrice;
  // Anthropic's 1-hour cache writes cost twice the input price, not 1.25x (the 5-minute default we ask for).
  const write1h = claude ? Math.min(write, call.cacheWrite1hTokens ?? 0) : 0;
  const write1hPrice = inputPrice * CLAUDE_CACHE_WRITE_1H;
  return (plain * plainPrice + read * readPrice + (write - write1h) * writePrice + write1h * write1hPrice + call.outputTokens * outputPrice) / 1_000_000;
}
