import type { Backend, ChatTurn, ModelCall } from "../types.js";

/**
 * A model call that failed, sorted by what the agent should do about it.
 *   fatal     — retrying cannot help: out of credits, quota exhausted, bad key, unknown model.
 *               The run ends as "brain unavailable" and is excluded from comparisons.
 *   transient — the provider is busy or the network blipped: rate limit, overload, 5xx,
 *               timeout. Retried with backoff before it counts as a failed decision.
 */
export class BrainError extends Error {
  constructor(
    message: string,
    readonly kind: "fatal" | "transient",
    readonly status?: number,
    /** How long the provider asked us to wait (retry-after), if it said. */
    readonly retryAfterMs?: number,
    /**
     * The model took too long. Not retried here: a slow answer is a fact about the
     * model, already worth a failed decision, and retrying a 120s timeout four times
     * would stall the agent for ten minutes.
     */
    readonly timedOut = false,
  ) {
    super(message);
    this.name = "BrainError";
  }
}

const FATAL_TYPES = new Set(["billing_error", "authentication_error", "permission_error", "not_found_error"]);
const FATAL_CODES = new Set(["insufficient_quota", "invalid_api_key", "model_not_found", "billing_hard_limit_reached"]);

/**
 * Sorts an HTTP error by provider conventions. `type` is Anthropic's error.type,
 * `code` is OpenAI's error.code; either may be absent.
 */
export function classify(
  backend: string,
  status: number | undefined,
  detail: { type?: string | null; code?: string | null; message?: string; retryAfter?: string | null },
): BrainError {
  const message = `${backend}: ${detail.message ?? `HTTP ${status ?? "error"}`}`;
  const retryAfterMs = parseRetryAfter(detail.retryAfter);
  const fatal =
    (detail.type && FATAL_TYPES.has(detail.type)) ||
    (detail.code && FATAL_CODES.has(detail.code)) ||
    status === 401 || status === 402 || status === 403 || status === 404 ||
    // Anthropic has reported low credit as a 400 invalid_request_error.
    /credit balance is too low/i.test(detail.message ?? "");
  return new BrainError(message, fatal ? "fatal" : "transient", status, retryAfterMs);
}

function parseRetryAfter(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isFinite(at) ? Math.max(0, at - Date.now()) : undefined;
}

export const RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 16_000];
const MAX_RETRY_AFTER_MS = 60_000;

/**
 * Retries transient failures with backoff (honouring retry-after, capped), so a
 * rate limit does not count as the brain failing. Fatal errors and exhausted
 * retries are rethrown. Time spent waiting is real: the world keeps ticking.
 */
export function withRetries(
  backend: Backend,
  opts: { delays?: number[]; sleep?: (ms: number) => Promise<void>; log?: (message: string) => void } = {},
): Backend {
  const delays = opts.delays ?? RETRY_DELAYS_MS;
  const sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const log = opts.log ?? ((message) => console.error(message));
  return {
    name: backend.name,
    ...(backend.contextTokens !== undefined && { contextTokens: backend.contextTokens }),
    async complete(system: string, turns: ChatTurn[]): Promise<ModelCall> {
      for (let attempt = 0; ; attempt++) {
        try {
          return await backend.complete(system, turns);
        } catch (error) {
          const brainError = error instanceof BrainError ? error : new BrainError(String((error as Error)?.message ?? error), "transient");
          if (brainError.kind === "fatal" || brainError.timedOut || attempt >= delays.length) throw brainError;
          const wait = Math.min(brainError.retryAfterMs ?? delays[attempt]!, MAX_RETRY_AFTER_MS);
          log(`${brainError.message} — retrying in ${Math.round(wait / 1000)}s (${attempt + 1}/${delays.length})`);
          await sleep(wait);
        }
      }
    },
  };
}

/**
 * One tiny call before the run, so a bad key or empty account is found at
 * startup rather than mid-episode. Costs a few tokens on paid brains.
 */
export async function preflight(backend: Backend): Promise<void> {
  await backend.complete("Reply with the single word OK.", [{ role: "user", content: "Ready?" }]);
}
