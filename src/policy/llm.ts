import type { Backend, Decision, ModelCall, Observation, Policy, PolicyOutput, Skill } from "../types.js";

const MAX_ATTEMPTS = 3;

/**
 * The model picks a goal (a skill + args); it is never in the control loop.
 * Bad model output is retried with the error fed back, then degraded to a
 * short `wait` — it never throws. Backend (network) errors propagate.
 */
export class LLMPolicy implements Policy {
  readonly name: string;

  constructor(private readonly backend: Backend) {
    this.name = `llm:${backend.name}`;
  }

  async decide(observation: Observation, skills: Skill[]): Promise<PolicyOutput> {
    const system = buildSystemPrompt(skills);
    const baseUser = JSON.stringify(observation);
    const calls: ModelCall[] = [];
    let lastError = "";

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const user = lastError
        ? `${baseUser}\n\nYour previous reply was invalid: ${lastError}\nReply again with ONLY the JSON object.`
        : baseUser;
      const call = await this.backend.complete(system, [{ role: "user", content: user }]);
      calls.push(call);

      const parsed = parseDecision(call.text, skills);
      if (parsed.ok) return { decision: parsed.decision, calls };
      lastError = parsed.error;
    }

    return {
      decision: {
        skill: "wait",
        args: { seconds: 5 },
        rationale: `fallback: model gave no valid decision after ${MAX_ATTEMPTS} attempts (${lastError})`,
      },
      calls,
    };
  }
}

export function buildSystemPrompt(skills: Skill[]): string {
  const lines = skills.map((s) => `- ${s.name}(${JSON.stringify(s.args)}): ${s.description}`);
  return [
    "You control a Minecraft agent by choosing its next high-level goal. You are given its observation as JSON.",
    "Skills (args spec: name -> type):",
    ...lines,
    'Reply with ONLY a JSON object: {"skill": string, "args": object, "rationale": string}.',
    'To end the episode reply {"skill": "done"}.',
  ].join("\n");
}

type Parsed = { ok: true; decision: Decision | null } | { ok: false; error: string };

function parseDecision(text: string, skills: Skill[]): Parsed {
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
