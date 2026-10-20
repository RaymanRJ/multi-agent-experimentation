/**
 * Agent-to-agent messaging over ordinary game chat.
 *
 * Everything is public chat, so a human watching (or joining) sees and can
 * join the conversation. Two kinds of chat line come from a bot:
 *   narration  "[act] gather_wood(...)"   announces a skill to watchers; never heard as a message
 *   speech     "@agent_b I'll take stone"  or  "I'll take stone" (= everyone)
 * The recipient is only a label: every agent hears every line, and the
 * observation shows `to` so the model can tell what was meant for it.
 *
 * Requests are speech with a mark, sent by the tell_agent and ask_agent skills:
 *   "@qwen [tell] give {"to":"sonnet","item":"oak_log","count":20}"   run this skill
 *   "@qwen [ask] how many logs do you have?"                          answer this
 * The agent named sees them as "requests", not as messages; everyone else hears the line as chat.
 *
 * The parse/format/buffer logic here is pure; `attachComms` is the one bit
 * that touches a bot.
 */
import type { Bot } from "mineflayer";
import type { Decision, Message, Request, RequestResponse } from "./types.js";

/** Marks narration so it is never mistaken for a message. */
export const NARRATION_PREFIX = "[act] ";
export const MAX_CHAT = 250;
export const MAX_MESSAGES = 8;

const ADDRESS = /^@([A-Za-z0-9_]{1,16})\s+([\s\S]+)$/;

function clip(text: string): string {
  return text.length > MAX_CHAT ? `${text.slice(0, MAX_CHAT - 3)}...` : text;
}

export function isNarration(line: string): boolean {
  return line.startsWith(NARRATION_PREFIX);
}

export function formatNarration(text: string): string {
  return clip(NARRATION_PREFIX + text);
}

/** `@name text` -> {to: name}; anything else (including `@all text`) is for everyone. */
export function parseSpeech(line: string): { to: string; text: string } {
  const match = ADDRESS.exec(line.trim());
  if (!match) return { to: "all", text: line.trim() };
  const to = match[1]!.toLowerCase() === "all" ? "all" : match[1]!;
  return { to, text: match[2]!.trim() };
}

/** The chat line for a spoken message. Inverse of parseSpeech. */
export function formatSpeech(to: string, text: string): string {
  const body = text.trim();
  if (to === "all" || to === "") {
    // A bare line is for everyone, unless it would itself look like an address.
    return clip(body.startsWith("@") ? `@all ${body}` : body);
  }
  return clip(`@${to} ${body}`);
}

/**
 * Marks speech a skill sends by itself (give's "bringing you…"), so it is never mistaken for
 * something the model said: ask_agent took one for an answer in team trio3.
 */
export const AUTO_MARK = "[auto] ";
export const autoText = (text: string) => AUTO_MARK + text;

const TELL_MARK = "[tell] ";
const ASK_MARK = "[ask] ";
export const MAX_REQUESTS = 4;

export type RequestBody = { kind: "tell"; skill: string; args: Record<string, unknown> } | { kind: "ask"; question: string };

/** The speech text for a request; formatSpeech adds the address. Inverse of parseRequest. */
export function requestText(body: RequestBody): string {
  return body.kind === "tell" ? `${TELL_MARK}${body.skill} ${JSON.stringify(body.args)}` : `${ASK_MARK}${body.question.trim()}`;
}

/** A request from speech text, or null for ordinary speech. A tell whose args don't parse has none. */
export function parseRequest(text: string): RequestBody | null {
  if (text.startsWith(ASK_MARK)) {
    const question = text.slice(ASK_MARK.length).trim();
    return question ? { kind: "ask", question } : null;
  }
  if (!text.startsWith(TELL_MARK)) return null;
  const match = /^([a-z_]+)\s*([\s\S]*)$/.exec(text.slice(TELL_MARK.length).trim());
  if (!match) return null;
  let args: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(match[2]!.trim() || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) args = parsed as Record<string, unknown>;
  } catch {
    // Cut off or mangled: the skill name alone still says what was asked.
  }
  return { kind: "tell", skill: match[1]!, args };
}

const same = (a: unknown, b: unknown) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

/**
 * How the decision an agent made after seeing a request answers it. Judged by the code, not the
 * model: a tell is complied with when the decision runs the skill asked for with every arg asked
 * for ("partly" with other args), and a question is answered when the decision says something to
 * the asker by name (a line to everyone is the agent's usual status update, not an answer).
 */
export function responseTo(request: Pick<Request, "from" | "kind" | "skill" | "args">, decision: Decision | null): RequestResponse {
  if (request.kind === "ask") {
    const to = decision?.say?.to;
    return to !== undefined && same(to, request.from) ? "answered" : "unanswered";
  }
  if (!decision || decision.skill !== request.skill) return "other";
  const asked = Object.entries(request.args ?? {});
  return asked.every(([key, value]) => key in decision.args && same(decision.args[key], value)) ? "complied" : "partly";
}

interface Stored {
  from: string;
  to: string;
  text: string;
  at: number;
}

/**
 * The last few messages heard, oldest first, and the requests addressed to this agent that it has
 * not yet decided on. Its own messages are left out: a small model shown its own last lines tends
 * to repeat them, and its plan already carries what it meant to do.
 */
export class MessageBuffer {
  /**
   * Kept apart, each to its own limit: messages to this agent by name, and everything else. In
   * thome1 one agent heard up to 114 messages to "all" in a game, which pushed messages addressed to
   * it out of a shared window of 8 before it decided again.
   */
  private readonly items: Stored[] = [];
  private readonly toSelf: Stored[] = [];
  private readonly requests: Array<Omit<Request, "ageSeconds"> & { at: number; text: string; seq: number }> = [];
  private seq = 0;
  /** Messages addressed to this agent by name, ever — the interrupt watches this grow. */
  directed = 0;
  lastDirected: { from: string; text: string } | null = null;

  constructor(
    private readonly self: string,
    private readonly limit = MAX_MESSAGES,
  ) {}

  /** Feed one chat line seen in the world. Returns false if it was ignored. */
  hear(from: string, line: string, now = Date.now()): boolean {
    if (from === this.self || isNarration(line)) return false;
    const { to, text } = parseSpeech(line);
    if (!text) return false;
    const toMe = to.toLowerCase() === this.self.toLowerCase();
    const request = toMe ? parseRequest(text) : null;
    if (request) {
      // The same request again replaces nothing and waits once.
      if (!this.requests.some((r) => r.from === from && r.text === text)) {
        this.requests.push({ from, ...request, at: now, text, seq: this.seq++ });
        while (this.requests.length > MAX_REQUESTS) this.requests.shift();
      }
    } else {
      this.push(toMe ? this.toSelf : this.items, { from, to, text, at: now });
    }
    if (toMe) {
      // The same words from the same sender again tell nothing new: heard, but no second interrupt.
      const repeat = this.lastDirected?.from === from && this.lastDirected.text === text;
      if (!repeat) this.directed++;
      this.lastDirected = { from, text };
    }
    return true;
  }

  snapshot(now = Date.now()): Message[] {
    // One list, oldest first, as before; only what is kept differs.
    return [...this.items, ...this.toSelf].sort((a, b) => a.at - b.at).map((m) => ({
      from: m.from,
      to: m.to,
      text: m.text,
      ageSeconds: Math.max(0, Math.round((now - m.at) / 1000)),
    }));
  }

  /** Requests not yet decided on, oldest first, and a mark to settle exactly these later. */
  pending(now = Date.now()): { requests: Request[]; mark: number } {
    const requests = this.requests.map(({ at, text: _text, seq: _seq, ...r }) => ({ ...r, ageSeconds: Math.max(0, Math.round((now - at) / 1000)) }));
    return { requests, mark: this.seq };
  }

  /** The agent has decided, having seen every request heard before `mark`: those are done. */
  settle(mark: number): void {
    for (let i = this.requests.length - 1; i >= 0; i--) if (this.requests[i]!.seq < mark) this.requests.splice(i, 1);
  }

  private push(list: Stored[], m: Stored): void {
    list.push(m);
    while (list.length > this.limit) list.shift();
  }
}

/**
 * Subscribes a buffer to the bot's chat. With comms off, returns null and
 * listens to nothing. Paper formats offline-mode chat as "<name> text", which
 * mineflayer's `chat` event already splits into (username, message).
 */
export function attachComms(bot: Bot, self: string, enabled: boolean): MessageBuffer | null {
  if (!enabled) return null;
  const buffer = new MessageBuffer(self);
  bot.on("chat", (username: string, message: string) => {
    buffer.hear(username, message);
  });
  return buffer;
}

/** "[act] gather_wood({"count":10}) — rationale" -> "gather_wood({"count":10})"; null if not a skill line. */
export function parseActivity(line: string): string | null {
  if (!isNarration(line)) return null;
  const match = /^([a-z_]+\([^)]*\))/.exec(line.slice(NARRATION_PREFIX.length));
  return match ? match[1]!.slice(0, 60) : null;
}

/**
 * What each other agent last announced it was doing. Always on: narration is
 * what a watcher sees, so it is a sighting, not a message — observe() shows it
 * only for agents within sight.
 */
export function trackActivity(bot: Bot, self: string): Map<string, string> {
  const doing = new Map<string, string>();
  bot.on("chat", (username: string, message: string) => {
    if (username === self) return;
    const activity = parseActivity(message);
    if (activity) doing.set(username, activity);
  });
  return doing;
}

/** Narration at most this often per bot: Paper kicks a player for more than ~10 chat lines in quick succession. */
export const NARRATION_GAP_MS = 1500;
const lastNarration = new WeakMap<Bot, number>();

export function narrate(bot: Bot, text: string): void {
  const now = Date.now();
  if (now - (lastNarration.get(bot) ?? 0) < NARRATION_GAP_MS) return;
  lastNarration.set(bot, now);
  bot.chat(formatNarration(text));
}

/** Says a decision's `say` in chat. */
export function speak(bot: Bot, to: string, text: string): void {
  bot.chat(formatSpeech(to, text));
}
