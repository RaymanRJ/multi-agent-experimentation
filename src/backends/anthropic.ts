import Anthropic from "@anthropic-ai/sdk";
import type { Backend, ChatTurn, DecisionTool, ModelCall } from "../types.js";
import { BrainError, classify } from "./errors.js";

/** The subset of the SDK client this backend uses — lets tests inject a fake. */
export type MessagesClient = Pick<Anthropic, "messages">;

const EPHEMERAL = { type: "ephemeral" } as const;

/**
 * The request with prompt-cache breakpoints: one after the system prompt (the same on every
 * decision of a run), and one after the history that precedes the newest observation (full
 * memory, where each call repeats the last one's turns). The provider then bills those prefixes
 * at a tenth of the input price when the next call starts with them. Prompts shorter than the
 * model's minimum cacheable length are simply not cached. Exported for tests.
 */
export function cachedRequest(system: string, turns: ChatTurn[]) {
  const messages: Anthropic.MessageParam[] = turns.map((turn, i) =>
    i === turns.length - 2
      ? { role: turn.role, content: [{ type: "text", text: turn.content, cache_control: EPHEMERAL }] }
      : { role: turn.role, content: turn.content },
  );
  return { system: [{ type: "text" as const, text: system, cache_control: EPHEMERAL }], messages };
}

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

  async complete(system: string, turns: ChatTurn[], tool?: DecisionTool): Promise<ModelCall> {
    const startMs = Date.now();

    // Models with always-on thinking return thinking blocks alongside the
    // answer; only the text block is the decision.
    const response = await this.client.messages
      .create({
        model: this.model,
        // Room for extended thinking before the answer; only tokens actually produced are billed.
        max_tokens: 16_000,
        ...cachedRequest(system, turns),
        // Offered, not forced ("auto"): the model may write its reasoning first, and forcing a tool
        // would also rule out extended thinking. The tool sits before the system prompt in the cache.
        ...(tool && {
          tools: [{ name: tool.name, description: tool.description, input_schema: tool.schema as Anthropic.Tool.InputSchema }],
          tool_choice: { type: "auto" as const },
        }),
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

    const used = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === tool?.name);

    // Thinking is kept (separately from the answer) so the log shows what was paid for.
    const thinking = response.content
      .filter((block): block is Anthropic.ThinkingBlock => block.type === "thinking")
      .map((block) => block.thinking)
      .join("");

    // input_tokens counts only what came after the last cache breakpoint; the total is all three.
    const cacheRead = response.usage.cache_read_input_tokens ?? 0;
    const cacheWrite = response.usage.cache_creation_input_tokens ?? 0;
    return {
      backend: this.name,
      model: this.model,
      inputTokens: response.usage.input_tokens + cacheRead + cacheWrite,
      outputTokens: response.usage.output_tokens,
      ...(cacheRead && { cacheReadTokens: cacheRead }),
      ...(cacheWrite && { cacheWriteTokens: cacheWrite }),
      ms: Date.now() - startMs,
      text,
      ...(used && { toolInput: JSON.stringify(used.input) }),
      request: turns,
      ...(thinking && { thinking }),
      ...(response.stop_reason && { stopReason: response.stop_reason }),
      ...(response.id && { requestId: response.id }),
    };
  }
}
