import type { Bot } from "mineflayer";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { formatSpeech, MAX_CHAT, requestText } from "../comms.js";

/** Skills that pass words between agents: they mean nothing with comms off. */
export const COMMS_SKILLS = new Set(["tell_agent", "ask_agent"]);

/** Another player in the world by name, in sight or not: chat reaches everyone. */
export function agentNamed(bot: Bot, name: string): string | undefined {
  const wanted = name.trim().toLowerCase();
  return Object.keys(bot.players ?? {}).find((n) => n.toLowerCase() === wanted && n !== bot.username);
}

/** `args` arrives as a JSON string (the policy turns an object into one) or as an object. */
function parseArgs(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  const text = String(raw ?? "").trim();
  if (!text) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const tellAgent: Skill = {
  name: "tell_agent",
  description:
    "Tell another agent, by name, to run one of the skills in this list with the args you choose, e.g. to: \"bob\", " +
    "skill: \"give\", args: {\"to\": \"<your name>\", \"item\": \"oak_log\", \"count\": 10}. They see it as a request " +
    "from you and decide for themselves whether to do it. It reaches them wherever they are and you don't wait: " +
    "see what they do in otherAgents and messages. Args: `to`, `skill`, `args` (an object, {} if the skill has none).",
  args: { to: "string", skill: "string", args: "string" },

  async run(ctx: SkillContext, args: Record<string, unknown>): Promise<SkillResult> {
    const bot = ctx.bot;
    if (String(args["to"] ?? "").trim().toLowerCase() === bot.username.toLowerCase()) {
      return { status: "failed", reason: `${bot.username} is you; tell another agent` };
    }
    const to = agentNamed(bot, String(args["to"] ?? ""));
    if (!to) return { status: "failed", reason: `no other agent called "${String(args["to"] ?? "")}" is in the world right now (it may have left, or never joined)` };
    const name = String(args["skill"] ?? "").trim();
    // Imported here, not at the top: the skill list imports this file.
    const { findSkill } = await import("./index.js");
    const skill = findSkill(name);
    if (!skill) return { status: "failed", reason: `there is no skill called "${name}"` };
    if (COMMS_SKILLS.has(skill.name)) return { status: "failed", reason: `say what you want them to do, not to ${skill.name} on your behalf` };
    const given = parseArgs(args["args"]);
    if (!given) return { status: "failed", reason: '`args` must be an object of that skill\'s args, e.g. {"count": 10}' };
    const missing = Object.entries(skill.args)
      .filter(([key, type]) => !type.endsWith("?") && (given[key] === undefined || given[key] === null || given[key] === ""))
      .map(([key]) => key);
    if (missing.length) {
      return { status: "failed", reason: `${skill.name} needs ${missing.join(", ")} in args (it takes ${JSON.stringify(skill.args)})` };
    }
    const kept = Object.fromEntries(Object.keys(skill.args).filter((key) => given[key] !== undefined && given[key] !== null).map((key) => [key, given[key]]));
    const line = formatSpeech(to, requestText({ kind: "tell", skill: skill.name, args: kept }));
    if (line.length > MAX_CHAT) return { status: "failed", reason: "that request is too long for chat; shorten the args" };
    bot.chat(line);
    ctx.log(`told ${to} to ${skill.name} ${JSON.stringify(kept)}`);
    return {
      status: "success",
      reason: `told ${to} to ${skill.name} ${JSON.stringify(kept)}; whether they do it is up to them`,
      detail: { to, skill: skill.name, args: kept },
    };
  },
};
