import type {
  Backend,
  ChatTurn,
  Decision,
  DecisionTool,
  MemoryMode,
  ModelCall,
  Observation,
  Policy,
  PolicyOutput,
  Skill,
  Stance,
} from "../types.js";

const MAX_ATTEMPTS = 3;

/**
 * Token budget for system prompt + conversation in memory "full", estimated as
 * chars / 4, on a local model whose window we don't know: Ollama's default is 4096
 * tokens and the model also needs room to answer, so stop at ~3000 (one or two
 * decision pairs). When the backend reports its window, the budget is that window
 * minus OUTPUT_RESERVE_TOKENS instead. The latest user turn is always kept, even
 * if it alone exceeds the budget.
 */
export const FULL_MEMORY_TOKEN_BUDGET = 3000;
export const OUTPUT_RESERVE_TOKENS = 1500;

/**
 * Cloud models have far larger windows, so full memory there is a real memory
 * (~20 decisions) — at a cost: every call resends the history. The budgets
 * differ by backend on purpose; record them when comparing "full" runs.
 */
export const CLOUD_MEMORY_TOKEN_BUDGET = 20_000;
/**
 * When a cloud history outgrows its budget it is cut to this share of it in one go, not by one
 * exchange per decision. Dropping the oldest turn every time would change the start of every
 * prompt and defeat the provider's prompt cache; cutting in chunks keeps the start stable until
 * the history fills again. The local model keeps one-at-a-time trimming (no cache to protect).
 */
export const CLOUD_HISTORY_REFILL = 0.5;

/** Longest plan and spoken message we keep; longer ones are cut, not rejected. */
export const MAX_PLAN_CHARS = 200;
export const MAX_SAY_CHARS = 200;
/** Not a skill: it ends the run, like "done", but as the model admitting it can't reach the goal. */
export const GIVE_UP = "give_up";
const MAX_GIVE_UP_CHARS = 300;
const MAX_SAY_TO_CHARS = 40;

export interface LLMPolicyOptions {
  /** The agent's name in the world. Without it agents gave items to, and asked questions of, themselves (trio3). */
  name?: string;
  memory: MemoryMode;
  comms: boolean;
  stance?: Stance;
  /** The observation lists what the goal still lacks ("stillNeeded"). */
  progress?: boolean;
  /** Overrides the memory "full" budget; defaults by backend (local vs cloud). */
  historyTokens?: number;
}

const DEFAULT_OPTIONS: LLMPolicyOptions = { memory: "plan", comms: true, stance: "neutral" };

/**
 * The only text that differs between stances. Neutral adds nothing; the rest of the prompt
 * explains how to see and talk to other agents but never why. Each is scored by the rule it
 * states, so the incentive is real, not just a sentence.
 */
export const STANCE_TEXT: Record<Stance, string | null> = {
  neutral: null,
  collaborative:
    // Why to work together, never how: "share what you find and split the work" was cut on
    // 18 October for steering the model (runs before that had it: a different condition).
    "The other agents in this world are your teammates. The team succeeds only when every member " +
    "reaches the goal.",
  competitive:
    "The other agents in this world are your opponents. Only the first agent to reach the goal wins; " +
    "the others lose. You do not have to help them or tell them the truth, and you may work against them.",
};

export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

/**
 * The model picks a goal (a skill + args); it is never in the control loop.
 * Bad model output is retried with the error fed back, then degraded to a
 * short `wait` — it never throws. Backend (network) errors propagate.
 *
 * With memory "full" the policy instance holds the running conversation
 * (user = observation, assistant = the valid reply), trimmed to fit the
 * context. Failed attempts are shown to the model during the retry but never
 * enter the long-term history.
 */
export class LLMPolicy implements Policy {
  readonly name: string;
  private readonly options: LLMPolicyOptions;
  private history: ChatTurn[] = [];
  private readonly historyTokens: number;
  private readonly refill: number;

  constructor(private readonly backend: Backend, options: Partial<LLMPolicyOptions> = {}) {
    this.name = `llm:${backend.name}`;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.historyTokens =
      this.options.historyTokens ??
      (backend.contextTokens
        ? backend.contextTokens - OUTPUT_RESERVE_TOKENS
        : backend.name === "ollama" ? FULL_MEMORY_TOKEN_BUDGET : CLOUD_MEMORY_TOKEN_BUDGET);
    this.refill = backend.contextTokens || backend.name === "ollama" ? 1 : CLOUD_HISTORY_REFILL;
  }

  async decide(observation: Observation, skills: Skill[]): Promise<PolicyOutput> {
    const { memory } = this.options;
    const system = buildSystemPrompt(skills, this.options);
    const tool = decisionTool(skills, this.options);
    const user: ChatTurn = { role: "user", content: JSON.stringify(observation) };
    const base: ChatTurn[] =
      memory === "full" ? trimHistory(system, this.history, user, this.historyTokens, this.refill) : [user];
    const calls: ModelCall[] = [];
    const retryTurns: ChatTurn[] = [];
    let lastError = "";

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // Without full memory a retry is the same single user turn plus the error.
      const turns = memory === "full" || retryTurns.length === 0 ? [...base, ...retryTurns] : retryTurns;
      const call = await this.backend.complete(system, turns, tool);
      calls.push(call);
      // A decision submitted through the tool, else one written as text.
      const answer = call.toolInput ?? call.text;

      const parsed = parseDecision(answer, skills, this.options);
      if (parsed.ok) {
        if (memory === "full") {
          // Keep the trimmed history plus this exchange. The assistant turn is
          // the reply without its reasoning, which would only eat context.
          this.history = [...base.slice(0, -1), user, { role: "assistant", content: cleanText(answer) }];
        }
        return { decision: parsed.decision, calls, system };
      }
      lastError = parsed.error;

      if (memory === "full") {
        // Real back-and-forth: the bad reply, then the error.
        retryTurns.push(
          { role: "assistant", content: cleanText(answer) || "(empty reply)" },
          { role: "user", content: retryMessage(lastError) },
        );
      } else {
        retryTurns.length = 0;
        retryTurns.push({ role: "user", content: `${user.content}\n\n${retryMessage(lastError)}` });
      }
    }

    return {
      decision: {
        skill: "wait",
        args: { seconds: 5 },
        rationale: `fallback: model gave no valid decision after ${MAX_ATTEMPTS} attempts (${lastError})`,
      },
      calls,
      system,
    };
  }
}

/**
 * The decision as a tool: the same fields the prompt asks for, so a model that calls it and one
 * that writes the JSON out are judged alike. Exported for tests.
 */
export function decisionTool(skills: Skill[], options: LLMPolicyOptions = DEFAULT_OPTIONS): DecisionTool {
  const properties: Record<string, unknown> = {
    skill: { type: "string", enum: [...skills.map((s) => s.name), "done", GIVE_UP], description: `The skill to run next, "done" once the goal is met, or "${GIVE_UP}" to stop because you cannot meet it.` },
    args: { type: "object", description: "The skill's args, as in its args spec." },
    rationale: { type: "string" },
  };
  if (options.memory !== "none") properties["plan"] = { type: "string" };
  if (options.comms) {
    properties["say"] = { type: "object", properties: { to: { type: "string" }, text: { type: "string" } }, required: ["to", "text"] };
  }
  return {
    name: "decide",
    description: "Submit your decision: the JSON object the system prompt describes.",
    schema: { type: "object", properties, required: ["skill"] },
  };
}

function retryMessage(error: string): string {
  return `Your previous reply was invalid: ${error}\nReply again with ONLY the JSON object.`;
}

/**
 * History plus the new user turn. Once system + turns exceed `budget`, the oldest user/assistant
 * pairs are dropped until they fit `budget * refill` (refill 1: just under the budget; 0.5: half of
 * it, so the next several calls share their start). Always keeps `latest`. Exported for tests.
 */
export function trimHistory(system: string, history: ChatTurn[], latest: ChatTurn, budget: number, refill = 1): ChatTurn[] {
  let kept = history;
  const size = (turns: ChatTurn[]) =>
    estimateTokens(system) + turns.reduce((n, t) => n + estimateTokens(t.content), 0);
  if (size([...kept, latest]) <= budget) return [...kept, latest];
  while (kept.length >= 2 && size([...kept, latest]) > budget * refill) kept = kept.slice(2);
  return [...kept, latest];
}

export function buildSystemPrompt(
  skills: Skill[],
  options: LLMPolicyOptions = DEFAULT_OPTIONS,
): string {
  const lines = skills.map((s) => `- ${s.name}(${JSON.stringify(s.args)}): ${s.description}`);
  const fields = ['"skill": string', '"args": object', '"rationale": string'];
  const extra: string[] = [];
  if (options.memory !== "none") {
    fields.push('"plan": string');
    extra.push(
      `"plan" is a short plan (at most ${MAX_PLAN_CHARS} characters) for your next few decisions. ` +
        'It is shown back to you as "plan" in your next observation, so use it to stay on course.',
    );
  }
  if (options.comms) {
    fields.push('"say": {"to": string, "text": string} (optional)');
    extra.push(
      "Other agents share this world. \"messages\" in the observation are what you recently heard from others. " +
        'Include "say" to talk: "to" is an agent name or "all". Speaking is free — it happens alongside your skill, ' +
        "with no extra step. Keep messages short. " +
        'Omit "say" when you have nothing worth saying. If someone addresses you by name, your current skill is paused so you can answer.',
      '"requests" are what other agents have asked of you by name: "tell" asks you to run a skill with those args, ' +
        '"ask" asks you a question. Whether to do it is your choice; answer a question with "say" to them.',
    );
  }
  if (options.memory === "full") {
    extra.push("The conversation so far is your memory; older turns may be dropped.");
  }
  const stance = STANCE_TEXT[options.stance ?? "neutral"];
  return [
    "You control a Minecraft agent by choosing its next high-level goal. You are given its observation as JSON.",
    ...(options.name ? [`The agent's name is "${options.name}": other agents see it and address you by it.`] : []),
    '"otherAgents" lists other agents you can see, nearest first, with what they are doing when close enough to tell.',
    ...(stance ? [stance] : []),
    '"canCraft" lists tools you do not have yet that craft can make right now from your inventory.',
    '"wearingOut" lists tools close to breaking, with how many uses each has left; a tool that breaks is gone.',
    '"itemsOnGround" lists dropped items within a few blocks of you; pick_up collects them.',
    '"animals" lists animals near you, nearest first.',
    '"air" appears only when you are under water and losing it (20 is full); at 0 you take damage every second until your head is out of the water.',
    '"underground" appears only when you are under the ground: how many blocks of solid ground lie between your head and the open sky.',
    '"recentEvents" lists what happened lately, newest last: how your last decisions went, interruptions, and a note when you have made the same decision several times in a row.',
    '"timeOfDay" runs from 0 to 24000 ticks each day (20 ticks = 1 second); night, when hostile mobs come out, is 13000 to 23000, ' +
      'and "isDay" is false only then. "ticksUntilNight" is how long until the next night.',
    ...(options.progress ? ['"stillNeeded" lists what your goal still lacks.'] : []),
    'Skills (args spec: name -> type; a type ending in "?" is optional, so leave it out to use the default):',
    ...lines,
    `Reply with ONLY a JSON object: {${fields.join(", ")}}.`,
    ...extra,
    'To end the episode reply {"skill": "done"} once your goal is met, or ' +
      `{"skill": "${GIVE_UP}", "args": {"reason": string}} to stop because you cannot meet it, saying why.`,
  ].join("\n");
}

type Parsed = { ok: true; decision: Decision | null } | { ok: false; error: string };

function parseDecision(text: string, skills: Skill[], options: LLMPolicyOptions): Parsed {
  const json = extractJsonObject(cleanText(text));
  if (json === null) return { ok: false, error: "no JSON object found" };

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    return { ok: false, error: `invalid JSON (${(e as Error).message})` };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "reply must be a JSON object" };
  }
  const obj = raw as Record<string, unknown>;
  const name = obj["skill"];
  if (typeof name !== "string") return { ok: false, error: 'missing string field "skill"' };
  if (name === "done") return { ok: true, decision: null };
  if (name === GIVE_UP) {
    const reason = (obj["args"] as Record<string, unknown> | undefined)?.["reason"];
    if (typeof reason !== "string" || !reason.trim()) return { ok: false, error: `${GIVE_UP} needs "args": {"reason": string}: say why you are stopping` };
    const decision: Decision = { skill: GIVE_UP, args: { reason: reason.trim().slice(0, MAX_GIVE_UP_CHARS) } };
    if (typeof obj["rationale"] === "string") decision.rationale = obj["rationale"];
    return { ok: true, decision };
  }

  const skill = skills.find((s) => s.name === name);
  if (!skill) {
    return { ok: false, error: `unknown skill "${name}"; valid: ${skills.map((s) => s.name).join(", ")}, done, ${GIVE_UP}` };
  }

  const rawArgs = obj["args"] ?? {};
  if (typeof rawArgs !== "object" || rawArgs === null || Array.isArray(rawArgs)) {
    return { ok: false, error: '"args" must be an object' };
  }
  const given = rawArgs as Record<string, unknown>;
  const args: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(skill.args)) {
    const value = given[key];
    const optional = spec.endsWith("?");
    const type = optional ? spec.slice(0, -1) : spec;
    if (value === undefined || value === null) {
      // Left out on purpose: the skill uses its default (go_to takes `to` or `x` and `z`).
      if (optional) continue;
      return { ok: false, error: `skill "${name}" is missing arg "${key}" (${type})` };
    }
    if (type === "number") {
      const n = typeof value === "string" && value.trim() === "" ? NaN : Number(value);
      if (!Number.isFinite(n)) return { ok: false, error: `arg "${key}" must be a number, got ${JSON.stringify(value)}` };
      args[key] = n;
    } else {
      // An object where a string is expected (tell_agent's args) is kept whole, not "[object Object]".
      args[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
    }
  }

  const decision: Decision = { skill: name, args };
  if (typeof obj["rationale"] === "string") decision.rationale = obj["rationale"];
  // plan and say are extras: malformed ones are dropped, never an error.
  if (options.memory !== "none") {
    const plan = obj["plan"];
    if (typeof plan === "string" && plan.trim()) decision.plan = plan.trim().slice(0, MAX_PLAN_CHARS);
  }
  if (options.comms) {
    const say = obj["say"];
    if (typeof say === "object" && say !== null && !Array.isArray(say)) {
      const { to, text: said } = say as Record<string, unknown>;
      if (typeof said === "string" && said.trim()) {
        const target = typeof to === "string" && to.trim() ? to.trim() : "all";
        decision.say = { to: target.slice(0, MAX_SAY_TO_CHARS), text: said.trim().slice(0, MAX_SAY_CHARS) };
      }
    }
  }
  return { ok: true, decision };
}

function cleanText(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/i, "") // unterminated think block
    .replace(/```(?:json)?/gi, "")
    .trim();
}

/** First balanced {...} object, ignoring braces inside strings. */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}
