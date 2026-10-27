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

/**
 * How an agent is told to regard the other agents in its world. An experiment setting.
 *   neutral       — nothing: the prompt describes other agents but gives no motive
 *   collaborative — they are teammates; the team succeeds only if everyone reaches the goal
 *   competitive   — they are opponents; only the first to reach the goal wins
 * Each is scored by its own rule (see report.ts). It only matters when agents share a world.
 */
export type Stance = "neutral" | "collaborative" | "competitive";
export const STANCES: Stance[] = ["neutral", "collaborative", "competitive"];

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
 * Something another agent asked of this one by name, through tell_agent or ask_agent. The agent
 * decides whether to do it; the code only records what it did (RequestResponse).
 */
export interface Request {
  from: string;
  /** "tell": run `skill` with `args`. "ask": answer `question`. */
  kind: "tell" | "ask";
  skill?: string;
  args?: Record<string, unknown>;
  question?: string;
  ageSeconds: number;
}

/**
 * What the decision made after seeing a request did about it: a tell is "complied" (that skill
 * with every arg asked for), "partly" (that skill, other args) or "other"; a question is
 * "answered" (something said to the asker or to everyone) or "unanswered".
 */
export type RequestResponse = "complied" | "partly" | "other" | "answered" | "unanswered";

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
  /** Air left, 0-20, when under water and losing it; at 0 the agent loses 2 health a second. Omitted otherwise. */
  air?: number;
  /** True when inside a shelter whose walls, roof and doorway are all closed. Omitted otherwise. */
  inShelter?: boolean;
  /** Shelters within sight: "a large two-storey shelter (luna's) at 4,70,-12, 9 blocks away". Omitted when there are none. */
  shelters?: string[];
  /** Blocks of solid ground between the agent's head and the open sky, when it is under the ground. Omitted otherwise. */
  underground?: number;
  timeOfDay: number;
  isDay: boolean;
  /** By day, ticks until night (20 ticks = 1 second). Omitted at night. */
  ticksUntilNight?: number;
  inventory: Record<string, number>;
  /** Uses left on tools with a quarter of their life or less left. Omitted when none. */
  wearingOut?: Record<string, number>;
  /** Useful items (tools, furnace) not yet held that craft could make from the inventory now. Omitted when none. */
  canCraft?: string[];
  nearbyBlocks: Record<string, number>;
  /** Beds put down nearby, and how many have someone in them. Omitted when none. */
  beds?: { total: number; inUse: number };
  hostiles: Array<{ name: string; distance: number }>;
  /** Animals nearby (cows, sheep, fish…), nearest first, at most five. Omitted when none. */
  animals?: Array<{ name: string; distance: number }>;
  /** Animals seen earlier and out of view now, by the agent or a teammate, with where and when. Omitted when none. */
  animalsSeen?: string[];
  /**
   * Other players the bot can see. `doing` is their current skill, read from their
   * narration — only within sight (SIGHT_RADIUS), since it is something you see, not
   * a message. Present with comms on or off.
   */
  otherAgents: Array<{ name: string; distance: number; doing?: string }>;
  /**
   * Dropped items within a few blocks, by name. Omitted when none. Without it an agent can't tell
   * that items handed to it (give) fell short, so it would never think to pick_up.
   */
  itemsOnGround?: Record<string, number>;
  recentEvents: string[];
  /** Recent messages heard from others, oldest first. Absent when comms are off. */
  messages?: Message[];
  /** Requests addressed to this agent that it has not yet decided on. Omitted when none. */
  requests?: Request[];
  /** The plan this agent wrote on its previous decision. Only with memory "plan" or "full". */
  plan?: string;
  /** What a preset goal still lacks, as facts ("no shelter has been built yet"). Only with progress on. */
  stillNeeded?: string[];
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
  /**
   * Shelters this agent knows of: its own, and its teammates' (as they would be seen, by looking).
   * Skills check each one against the world before using it. Absent in tests and tools.
   */
  shelters?: () => import("./skills/buildShelter.js").ShelterSpot[];
}

/** An arg's type; a trailing "?" marks it optional (the skill has a default, or takes one arg or another). */
export type SkillArgSpec = Record<string, "number" | "string" | "number?" | "string?">;

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
  /** All input tokens, cached or not, so token counts compare across providers. */
  inputTokens: number;
  outputTokens: number;
  /** Of inputTokens: read from the provider's prompt cache (billed at a discount). */
  cacheReadTokens?: number;
  /** Of inputTokens: written to the prompt cache this call (Anthropic bills these at a premium). */
  cacheWriteTokens?: number;
  ms: number;
  /** Raw model output, kept so an episode can be replayed without re-calling. */
  text: string;
  /**
   * The decision as the model submitted it through the decision tool, as JSON, when it used the
   * tool; `text` then holds only what it wrote before the call. Absent when it answered in text.
   */
  toolInput?: string;
  /** Exactly what was sent. The system prompt is logged once per step in LoggedStep.system. */
  request?: ChatTurn[];
  /** Reasoning the provider returned separately from the answer (Claude thinking, Ollama reasoning). */
  thinking?: string;
  /** Why generation stopped, as the provider reports it (e.g. "end_turn", "max_tokens", "length"). */
  stopReason?: string;
  requestId?: string;
  /** Failed attempts before this one (rate limits, overload, network) and the time spent waiting on them. */
  providerRetries?: number;
  retryWaitMs?: number;
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
  /** The context window in tokens, when we set it (Ollama); absent for cloud models. */
  contextTokens?: number;
  /** Offers `tool` to the model when given and the backend supports tools; the model may use it or answer in text. */
  complete(system: string, turns: ChatTurn[], tool?: DecisionTool): Promise<ModelCall>;
}

/**
 * The decision as a tool the model can call: its input is the same JSON object the system prompt
 * asks for. Offered, never forced, so a model can still write its reasoning before calling it, and
 * one that answers in text is still understood. Sonnet 5.5 answered in tool-call syntax as text on
 * about half its calls until it had a real tool to call.
 */
export interface DecisionTool {
  name: string;
  description: string;
  /** JSON Schema for the tool's input. */
  schema: Record<string, unknown>;
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
  /** Hits between this agent and other agents during the step, either way, by username. */
  hits?: Array<{ by: string; on: string }>;
  /**
   * The agent's deaths during the step: where, what the game said killed it ("was slain by Zombie";
   * null if no death message came), and when (ticks since the run began, and the time of day).
   */
  deaths?: Array<{ x: number; y: number; z: number; cause: string | null; ticks: number; timeOfDay: number }>;
  /** Inventory once the step's skill finished — observations are taken before, so the last result is otherwise lost. */
  inventoryAfter?: Record<string, number>;
  /** The requests shown in this step's observation, and what this decision did about each. */
  responses?: Array<Omit<Request, "ageSeconds"> & { response: RequestResponse }>;
  /** Set on the last line of a run: why it stopped. */
  ended?: EndReason;
}

export type EndReason =
  | "goal met"        // a deterministic check on a preset goal passed
  | "model ended"     // the policy returned no decision ("done")
  | "model gave up"   // the model chose give_up; its reason is the last step's result
  | "time budget"     // the in-game time budget ran out
  | "cost budget"     // paid model calls reached the dollar cap
  | "brain failed"    // three failed decisions in a row
  | "brain unavailable" // the provider refused for good: no credits, quota, bad key — not the model's fault
  | "step limit"      // the safety cap on decisions
  | "disconnected";   // the connection to the game server dropped: not the model's doing, so not a valid run

export interface RunConfig {
  /** Shared by every agent launched together, so their logs can be merged into one episode. */
  episode: string;
  memory: MemoryMode;
  comms: boolean;
  /** Whether the observation lists what a preset goal still lacks. Absent (off) in older logs. */
  progress?: boolean;
  /** Absent in logs written before stances existed; their prompt leaned collaborative. */
  stance?: Stance;
  /** The run's limits: in-game time budget, dollar cap, and the safety cap on decisions. Absent in older logs. */
  ticks?: number;
  budgetUSD?: number;
  maxSteps?: number;
  /** The server commands that set up the world for this run's scenario. Absent in older logs. */
  world?: string[];
  /** Every agent launched as one team (`--team`), this one included. Absent for an agent alone. */
  team?: string[];
  /** The port its viewer (`--view`) is served on, for as long as it runs. Absent when nobody is watching. */
  view?: number;
}
