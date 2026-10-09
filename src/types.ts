/**
 * The contracts. Freeze these before parallelising work on skills or backends —
 * changing one mid-flight invalidates everything built against it at once.
 */
import type { Bot } from "mineflayer";

export type ScenarioName = "sandbox" | "survival";

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
}

export interface PolicyOutput {
  /** Null ends the episode. */
  decision: Decision | null;
  /** Every model call made to reach this decision, retries included. Empty for ScriptedPolicy. */
  calls: ModelCall[];
}

export interface Policy {
  name: string;
  decide(observation: Observation, skills: Skill[]): Promise<PolicyOutput>;
}

/** One model provider. Ollama is OpenAI-compatible and shares that adapter. */
export interface Backend {
  name: string;
  complete(system: string, user: string): Promise<ModelCall>;
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
}
