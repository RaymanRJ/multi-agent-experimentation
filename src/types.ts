/**
 * The contracts. Freeze these before parallelising work on skills or backends —
 * changing one mid-flight invalidates everything built against it at once.
 */
import type { Bot } from "mineflayer";

export type ScenarioName = "sandbox" | "survival";

/**
 * How much of its own past a model brain sees. An experiment setting, not a
 * fixed design choice — runs are compared across it.
 *   none — the current observation only
 *   plan — also the plan it wrote on its previous decision (fixed size)
 *   full — the whole exchange as chat turns, trimmed to fit the context
 */
export type MemoryMode = "none" | "plan" | "full";

/** One chat message between agents (or from a human in the world). */
export interface Message {
  from: string;
  /** An agent's name, or "all". */
  to: string;
  text: string;
  /** Seconds before the observation was taken. */
  ageSeconds: number;
}

/**
 * What an agent is told about its situation.
 *
 * Deliberately small. The temptation is to hand the model everything the bot can
 * see; that blows up prompt cost and buries the signal. If you are adding a field,
 * justify it against a decision the model cannot make without it.
 */
export interface Observation {
  step: number;
  scenario: ScenarioName;
  goal: string;
  position: { x: number; y: number; z: number };
  health: number;
  food: number;
  timeOfDay: number;
  isDay: boolean;
  inventory: Record<string, number>;
  nearbyBlocks: Record<string, number>;
  hostiles: Array<{ name: string; distance: number }>;
  otherAgents: string[];
  recentEvents: string[];
  /** Recent messages heard and sent, oldest first. Absent when comms are off. */
  messages?: Message[];
  /** The plan this agent wrote on its previous decision. Only with memory "plan" or "full". */
  plan?: string;
}

export type SkillStatus = "success" | "failed" | "aborted";

/**
 * Always structured, never a thrown exception. The model replans against this,
 * so `reason` is written to be read by a model, not by a developer.
 */
export interface SkillResult {
  status: SkillStatus;
  reason?: string;
  detail?: Record<string, unknown>;
}

export interface SkillContext {
  bot: Bot;
  log: (message: string) => void;
  /** Flips when the run is winding down; long skills should check it and bail. */
  shouldStop: () => boolean;
}

export type SkillArgSpec = Record<string, "number" | "string">;

/**
 * A goal an agent may pursue — not a mechanical operation. Skills are composed
 * from mineflayer primitives; mineflayer is not the skill layer.
 *
 * A skill owns: finding its own targets, retrying, widening its search, giving
 * up cleanly, and reporting why.
 */
export interface Skill {
  name: string;
  /** Shown verbatim to the model. Write it for a reader who cannot see the code. */
  description: string;
  args: SkillArgSpec;
  run(ctx: SkillContext, args: Record<string, unknown>): Promise<SkillResult>;
}

export interface Decision {
  skill: string;
  args: Record<string, unknown>;
  rationale?: string;
  /** Said while starting the skill — talking costs no extra step or model call. */
  say?: { to: string; text: string };
  /** The model's plan for its next few decisions, fed back with memory "plan" or "full". */
  plan?: string;
}

/**
 * One metered model call. Cost is derived from these after the fact, against a
 * pricing table — never estimated at call time.
 */
export interface ModelCall {
  backend: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  ms: number;
  /** Raw model output, kept so an episode can be replayed without re-calling. */
  text: string;
  /** Exactly what was sent. The system prompt is logged once per step in LoggedStep.system. */
  request?: ChatTurn[];
  /** Reasoning the provider returned separately from the answer (Claude thinking, Ollama reasoning). */
  thinking?: string;
  /** Why generation stopped, as the provider reports it (e.g. "end_turn", "max_tokens", "length"). */
  stopReason?: string;
  requestId?: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface PolicyOutput {
  /** Null ends the episode. */
  decision: Decision | null;
  /** Every model call made to reach this decision, retries included. Empty for ScriptedPolicy. */
  calls: ModelCall[];
  /** The system prompt used, so the agent loop can log it. Absent for ScriptedPolicy. */
  system?: string;
}

export interface Policy {
  name: string;
  decide(observation: Observation, skills: Skill[]): Promise<PolicyOutput>;
}

/**
 * One model provider. Ollama is OpenAI-compatible and shares that adapter.
 * `turns` is a single user turn for memory "none"/"plan", or the running
 * conversation (alternating, ending with a user turn) for memory "full".
 */
export interface Backend {
  name: string;
  complete(system: string, turns: ChatTurn[]): Promise<ModelCall>;
}

export interface LoggedStep {
  step: number;
  at: string;
  observation: Observation;
  decision: Decision | null;
  result: SkillResult | null;
  /** Milliseconds spent waiting on the policy — the metered part. */
  decisionMs: number;
  calls: ModelCall[];
  /** Everything the skill reported while running, unabridged (observations keep only the last few). */
  events?: string[];
  /** The system prompt sent to the model on this step, if any. */
  system?: string;
  /** Run settings, repeated on every line so any line stands alone. */
  config?: RunConfig;
  /** World age in ticks since the run's first observation. Sleeping does not skip it. */
  ticks?: number;
  /** Inventory once the step's skill finished — observations are taken before, so the last result is otherwise lost. */
  inventoryAfter?: Record<string, number>;
  /** Set on the last line of a run: why it stopped. */
  ended?: EndReason;
}

export type EndReason =
  | "goal met"        // a deterministic check on a preset goal passed
  | "model ended"     // the policy returned no decision ("done")
  | "time budget"     // the in-game time budget ran out
  | "cost budget"     // paid model calls reached the dollar cap
  | "brain failed"    // three failed decisions in a row
  | "brain unavailable" // the provider refused for good: no credits, quota, bad key — not the model's fault
  | "step limit";     // the safety cap on decisions

export interface RunConfig {
  /** Shared by every agent launched together, so their logs can be merged into one episode. */
  episode: string;
  memory: MemoryMode;
  comms: boolean;
}
