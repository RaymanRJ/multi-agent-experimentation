import Anthropic from "@anthropic-ai/sdk";
import type { Backend, ChatTurn, ModelCall } from "../types.js";

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
    this.client = client ?? new Anthropic({ apiKey, timeout: 60_000 });
  }

  async complete(system: string, turns: ChatTurn[]): Promise<ModelCall> {
    const startMs = Date.now();

    // Models with always-on thinking return thinking blocks alongside the
    // answer; only the text block is the decision.
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system,
      messages: turns,
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    return {
      backend: this.name,
      model: this.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      ms: Date.now() - startMs,
      text,
      request: turns,
    };
  }
}
