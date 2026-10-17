import type {
  Backend,
  ChatTurn,
  Decision,
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

/** Longest plan and spoken message we keep; longer ones are cut, not rejected. */
export const MAX_PLAN_CHARS = 200;
export const MAX_SAY_CHARS = 200;
const MAX_SAY_TO_CHARS = 40;

export interface LLMPolicyOptions {
  memory: MemoryMode;
  comms: boolean;
  stance?: Stance;
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
    "The other agents in this world are your teammates. The team succeeds only when every member " +
    "reaches the goal, so share what you find and split the work.",
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

  constructor(private readonly backend: Backend, options: Partial<LLMPolicyOptions> = {}) {
    this.name = `llm:${backend.name}`;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.historyTokens =
      this.options.historyTokens ??
      (backend.contextTokens
        ? backend.contextTokens - OUTPUT_RESERVE_TOKENS
        : backend.name === "ollama" ? FULL_MEMORY_TOKEN_BUDGET : CLOUD_MEMORY_TOKEN_BUDGET);
  }

  async decide(observation: Observation, skills: Skill[]): Promise<PolicyOutput> {
    const { memory } = this.options;
    const system = buildSystemPrompt(skills, this.options);
    const user: ChatTurn = { role: "user", content: JSON.stringify(observation) };
    const base: ChatTurn[] =
      memory === "full" ? trimHistory(system, this.history, user, this.historyTokens) : [user];
    const calls: ModelCall[] = [];
    const retryTurns: ChatTurn[] = [];
    let lastError = "";

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // Without full memory a retry is the same single user turn plus the error.
      const turns = memory === "full" || retryTurns.length === 0 ? [...base, ...retryTurns] : retryTurns;
      const call = await this.backend.complete(system, turns);
      calls.push(call);

      const parsed = parseDecision(call.text, skills, this.options);
      if (parsed.ok) {
        if (memory === "full") {
          // Keep the trimmed history plus this exchange. The assistant turn is
          // the reply without its reasoning, which would only eat context.
          this.history = [...base.slice(0, -1), user, { role: "assistant", content: cleanText(call.text) }];
        }
        return { decision: parsed.decision, calls, system };
      }
      lastError = parsed.error;

      if (memory === "full") {
        // Real back-and-forth: the bad reply, then the error.
        retryTurns.push(
          { role: "assistant", content: cleanText(call.text) || "(empty reply)" },
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

function retryMessage(error: string): string {
  return `Your previous reply was invalid: ${error}\nReply again with ONLY the JSON object.`;
}

/**
 * History plus the new user turn, with the oldest user/assistant pairs dropped
 * until system + turns fit `budget`. Always keeps `latest`.
 */
function trimHistory(system: string, history: ChatTurn[], latest: ChatTurn, budget: number): ChatTurn[] {
  let kept = history;
  const size = (turns: ChatTurn[]) =>
    estimateTokens(system) + turns.reduce((n, t) => n + estimateTokens(t.content), 0);
  while (kept.length >= 2 && size([...kept, latest]) > budget) kept = kept.slice(2);
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
      "Other agents share this world. \"messages\" in the observation are what you recently heard and said. " +
        'Include "say" to talk: "to" is an agent name or "all". Speaking is free — it happens alongside your skill, ' +
        "with no extra step. Keep messages short. " +
        'Omit "say" when you have nothing worth saying. If someone addresses you by name, your current skill is paused so you can answer.',
    );
  }
  if (options.memory === "full") {
    extra.push("The conversation so far is your memory; older turns may be dropped.");
  }
  const stance = STANCE_TEXT[options.stance ?? "neutral"];
  return [
    "You control a Minecraft agent by choosing its next high-level goal. You are given its observation as JSON.",
    '"otherAgents" lists other agents you can see, nearest first, with what they are doing when close enough to tell.',
    ...(stance ? [stance] : []),
    '"canCraft" lists tools you do not have yet that craft can make right now from your inventory.',
    "Skills (args spec: name -> type):",
    ...lines,
    `Reply with ONLY a JSON object: {${fields.join(", ")}}.`,
    ...extra,
    'To end the episode reply {"skill": "done"}.',
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

  const skill = skills.find((s) => s.name === name);
  if (!skill) {
    return { ok: false, error: `unknown skill "${name}"; valid: ${skills.map((s) => s.name).join(", ")}, done` };
  }

  const rawArgs = obj["args"] ?? {};
  if (typeof rawArgs !== "object" || rawArgs === null || Array.isArray(rawArgs)) {
    return { ok: false, error: '"args" must be an object' };
  }
  const given = rawArgs as Record<string, unknown>;
  const args: Record<string, unknown> = {};
  for (const [key, type] of Object.entries(skill.args)) {
    const value = given[key];
    if (value === undefined || value === null) {
      return { ok: false, error: `skill "${name}" is missing arg "${key}" (${type})` };
    }
    if (type === "number") {
      const n = typeof value === "string" && value.trim() === "" ? NaN : Number(value);
      if (!Number.isFinite(n)) return { ok: false, error: `arg "${key}" must be a number, got ${JSON.stringify(value)}` };
      args[key] = n;
    } else {
      args[key] = String(value);
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
