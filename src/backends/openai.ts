import type { Backend, ModelCall } from "../types.js";

interface OpenAIResponse {
  choices: Array<{ message: { content: string; reasoning?: string } }>;
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

  async complete(system: string, user: string): Promise<ModelCall> {
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
              { role: "user", content: user },
            ],
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const text = await response.text();
        const excerpt =
          text.length > 200 ? text.substring(0, 200) + "..." : text;
        throw new Error(
          `HTTP ${response.status}: ${excerpt}`,
        );
      }

      const data = (await response.json()) as OpenAIResponse;
      const ms = Date.now() - startMs;

      // Reasoning models served by Ollama (qwen3) return their chain of thought
      // in a separate field. Keep it in the logged text, wrapped the way the
      // model would inline it, so the run log holds what was paid for.
      const message = data.choices[0]?.message;
      const reasoning = message?.reasoning ? `<think>${message.reasoning}</think>\n` : "";
      const text = reasoning + (message?.content ?? "");

      return {
        backend: this.name,
        model: this.model,
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        ms,
        text,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
