import type { Backend } from "../types.js";

/** The model-backed brains. `scripted` is not here — it needs no backend. */
export type BrainName = "claude" | "gpt" | "ollama";

export const BRAINS: BrainName[] = ["claude", "gpt", "ollama"];

/**
 * Builds the backend for a brain from environment variables. Throws with a
 * readable message when a cloud brain has no API key — keys come from the
 * environment only, never from a default.
 */
export function createBackend(brain: BrainName): Backend {
  throw new Error(`backend "${brain}" is not implemented yet`);
}
