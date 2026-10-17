import Anthropic from "@anthropic-ai/sdk";
import type { Backend, ChatTurn, ModelCall } from "../types.js";
import { BrainError, classify } from "./errors.js";

/** The subset of the SDK client this backend uses — lets tests inject a fake. */
export type MessagesClient = Pick<Anthropic, "messages">;

export class AnthropicBackend implements Backend {
  readonly name: string;
  private readonly model: string;
  private readonly client: MessagesClient;

  constructor({
    name,
    model,
    apiKey,
    client,
  }: {
    name: string;
    model: string;
    apiKey: string;
    client?: MessagesClient;
  }) {
    this.name = name;
    this.model = model;
    // maxRetries 0: withRetries() owns retrying, so a rate limit is not retried twice over.
    this.client = client ?? new Anthropic({ apiKey, timeout: 120_000, maxRetries: 0 });
  }

  async complete(system: string, turns: ChatTurn[]): Promise<ModelCall> {
    const startMs = Date.now();

    // Models with always-on thinking return thinking blocks alongside the
    // answer; only the text block is the decision.
    const response = await this.client.messages
      .create({
        model: this.model,
        // Room for extended thinking before the answer; only tokens actually produced are billed.
        max_tokens: 16_000,
        system,
        messages: turns,
      })
      .catch((error: unknown) => {
        if (error instanceof Anthropic.APIError && error.status !== undefined) {
          throw classify(this.name, error.status, {
            type: error.type,
            message: error.message,
            retryAfter: error.headers?.get("retry-after") ?? null,
          });
        }
        // Connection errors and timeouts carry no status.
        const timedOut = error instanceof Anthropic.APIConnectionTimeoutError;
        throw new BrainError(`${this.name}: ${error instanceof Error ? error.message : String(error)}`, "transient", undefined, undefined, timedOut);
      });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    // Thinking is kept (separately from the answer) so the log shows what was paid for.
    const thinking = response.content
      .filter((block): block is Anthropic.ThinkingBlock => block.type === "thinking")
      .map((block) => block.thinking)
      .join("");

    return {
      backend: this.name,
      model: this.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      ms: Date.now() - startMs,
      text,
      request: turns,
      ...(thinking && { thinking }),
      ...(response.stop_reason && { stopReason: response.stop_reason }),
      ...(response.id && { requestId: response.id }),
    };
  }
}
