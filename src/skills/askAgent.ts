import type { Skill, SkillContext, SkillResult } from "../types.js";
import { AUTO_MARK, formatSpeech, isNarration, MAX_CHAT, parseRequest, parseSpeech, requestText } from "../comms.js";
import { agentNamed } from "./tellAgent.js";

/** Long enough for a busy agent to finish deciding; a local model takes 5-10 s. */
export const ANSWER_WAIT_MS = 30_000;

export const askAgent: Skill = {
  name: "ask_agent",
  description:
    "Ask another agent a question, by name, and wait up to 30 seconds for their answer to you, which comes back as " +
    "this skill's result. It reaches them wherever they are. They decide whether and how to answer. " +
    "Args: `to` (an agent's name), `question`.",
  args: { to: "string", question: "string" },

  async run(ctx: SkillContext, args: Record<string, unknown>): Promise<SkillResult> {
    const bot = ctx.bot;
    if (String(args["to"] ?? "").trim().toLowerCase() === bot.username.toLowerCase()) {
      return { status: "failed", reason: `${bot.username} is you; ask another agent` };
    }
    const to = agentNamed(bot, String(args["to"] ?? ""));
    if (!to) return { status: "failed", reason: `there is no other agent called "${String(args["to"] ?? "")}" in this world` };
    const question = String(args["question"] ?? "").trim();
    if (!question) return { status: "failed", reason: "say what to ask: `question` is empty" };
    const line = formatSpeech(to, requestText({ kind: "ask", question }));
    if (line.length > MAX_CHAT) return { status: "failed", reason: "that question is too long for chat; shorten it" };

    const self = bot.username.toLowerCase();
    let reply: string | null = null;
    const onChat = (username: string, message: string) => {
      if (username !== to || isNarration(message)) return;
      const { to: addressee, text } = parseSpeech(message);
      // Only speech addressed to the asker is an answer. Their usual line to everyone is not: in team
      // trio2 every "answer" taken from those was a status update that ignored the question.
      // Nor is a line a skill of theirs sent by itself (give's "bringing you…", trio3).
      if (addressee.toLowerCase() === self && !parseRequest(text) && !text.startsWith(AUTO_MARK)) reply = text;
    };
    bot.on("chat", onChat);
    try {
      bot.chat(line);
      ctx.log(`asked ${to}: ${question}`);
      const deadline = Date.now() + ANSWER_WAIT_MS;
      while (reply === null && Date.now() < deadline && !ctx.shouldStop()) await bot.waitForTicks(5);
    } finally {
      bot.removeListener("chat", onChat);
    }
    if (reply !== null) return { status: "success", reason: `${to} answered: "${reply}"`, detail: { to, question, reply } };
    if (ctx.shouldStop()) return { status: "aborted", reason: `stopped waiting for ${to}'s answer` };
    return {
      status: "failed",
      reason: `${to} did not answer within ${ANSWER_WAIT_MS / 1000} s; an answer may still come later in messages`,
      detail: { to, question },
    };
  },
};
