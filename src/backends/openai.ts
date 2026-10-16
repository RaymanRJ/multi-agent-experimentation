import type { Backend, ChatTurn, ModelCall } from "../types.js";
import { BrainError, classify } from "./errors.js";

interface OpenAIResponse {
  id?: string;
  choices: Array<{ message: { content: string; reasoning?: string }; finish_reason?: string | null }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export class OpenAIBackend implements Backend {
  name: string;
  private model: string;
  private apiKey: string;
  private baseURL: string;

  constructor({
    name,
    model,
    apiKey,
    baseURL,
  }: {
    name: string;
    model: string;
    apiKey: string;
    baseURL: string;
  }) {
    this.name = name;
    this.model = model;
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async complete(system: string, turns: ChatTurn[]): Promise<ModelCall> {
    const startMs = Date.now();

    const timeoutMs = this.name === "ollama" ? 120_000 : 60_000;
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
          body = JSON.parse(text);
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
