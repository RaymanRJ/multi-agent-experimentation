import type { Backend, ChatTurn, ModelCall } from "../types.js";
import { BrainError, classify } from "./errors.js";

interface OpenAIResponse {
  id?: string;
  choices: Array<{ message: { content: string; reasoning?: string }; finish_reason?: string | null }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    /** OpenAI caches long prompt prefixes by itself and reports the hits here. */
    prompt_tokens_details?: { cached_tokens?: number } | null;
  };
}

export class OpenAIBackend implements Backend {
  name: string;
  contextTokens?: number;
  private model: string;
  /** Set while the Ollama context model still has to be made; cleared once it exists. */
  private pendingContext: number | undefined;
  private apiKey: string;
  private baseURL: string;

  constructor({
    name,
    model,
    apiKey,
    baseURL,
    ollamaContext,
  }: {
    name: string;
    model: string;
    apiKey: string;
    baseURL: string;
    /** Ollama only: run the model with this context window instead of Ollama's default 4096. */
    ollamaContext?: number;
  }) {
    this.name = name;
    this.model = model;
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    if (ollamaContext) {
      this.contextTokens = ollamaContext;
      this.pendingContext = ollamaContext;
    }
  }

  /**
   * Ollama's OpenAI-compatible endpoint ignores num_ctx and reloads the model at its default
   * 4096 tokens, so derive a model with the window baked in (a few-KB manifest over the same
   * weights; idempotent) and talk to that. Its name says so, and that name is what gets logged.
   */
  private async useOllamaContext(tokens: number): Promise<void> {
    const derived = `${this.model.replace(/:/g, "-")}:ctx${tokens}`;
    const root = this.baseURL.replace(/\/v1\/?$/, "");
    const response = await fetch(`${root}/api/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: derived, from: this.model, parameters: { num_ctx: tokens }, stream: false }),
    }).catch((error: unknown) => {
      throw new BrainError(`${this.name}: ${(error as Error).message}`, "transient");
    });
    if (!response.ok) {
      throw new BrainError(`${this.name}: could not set a ${tokens}-token context for ${this.model}: HTTP ${response.status} ${await response.text()}`, "fatal");
    }
    this.model = derived;
  }

  async complete(system: string, turns: ChatTurn[]): Promise<ModelCall> {
    if (this.pendingContext) {
      await this.useOllamaContext(this.pendingContext); // throws a BrainError; tried again next call
      this.pendingContext = undefined;
    }
    const startMs = Date.now();

    // Reasoning models can think for over a minute on a long full-memory prompt.
    const timeoutMs = 120_000;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(new Error(`${this.name} gave no answer within ${timeoutMs / 1000}s`)),
      timeoutMs,
    );

    try {
      const response = await fetch(
        `${this.baseURL}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: "system", content: system },
              ...turns,
            ],
          }),
          signal: controller.signal,
        },
      ).catch((error: unknown) => {
        // Timeouts and refused connections: the provider may well answer next time.
        const reason = controller.signal.aborted ? controller.signal.reason : error;
        throw new BrainError(`${this.name}: ${reason instanceof Error ? reason.message : String(reason)}`, "transient", undefined, undefined, controller.signal.aborted);
      });

      if (!response.ok) {
        const text = await response.text();
        const excerpt =
          text.length > 200 ? text.substring(0, 200) + "..." : text;
        let body: { error?: { code?: string; type?: string; message?: string } | string } = {};
        try {
          const parsed = JSON.parse(text);
          // Gemini wraps its error object in a one-element array.
          body = Array.isArray(parsed) ? (parsed[0] ?? {}) : parsed;
        } catch {
          // not JSON; the excerpt is the message
        }
        const err = typeof body.error === "object" ? body.error : undefined;
        throw classify(this.name, response.status, {
          code: err?.code ?? null,
          type: err?.type ?? null,
          message: `HTTP ${response.status}: ${err?.message ?? (typeof body.error === "string" ? body.error : excerpt)}`,
          retryAfter: response.headers.get("retry-after"),
        });
      }

      const data = (await response.json()) as OpenAIResponse;
      const ms = Date.now() - startMs;

      // Reasoning models served by Ollama (qwen3) return their chain of thought
      // in a separate field. Keep it in the logged text, wrapped the way the
      // model would inline it, so the run log holds what was paid for.
      const choice = data.choices[0];
      const message = choice?.message;
      const reasoning = message?.reasoning ? `<think>${message.reasoning}</think>\n` : "";
      const text = reasoning + (message?.content ?? "");

      return {
        backend: this.name,
        model: this.model,
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        ...(data.usage.prompt_tokens_details?.cached_tokens && { cacheReadTokens: data.usage.prompt_tokens_details.cached_tokens }),
        ms,
        text,
        request: turns,
        ...(message?.reasoning && { thinking: message.reasoning }),
        ...(choice?.finish_reason && { stopReason: choice.finish_reason }),
        ...(data.id && { requestId: data.id }),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
