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
 * The parse/format/buffer logic here is pure; `attachComms` is the one bit
 * that touches a bot.
 */
import type { Bot } from "mineflayer";
import type { Message } from "./types.js";

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

interface Stored {
  from: string;
  to: string;
  text: string;
  at: number;
}

/** The last few messages heard and sent, oldest first. */
export class MessageBuffer {
  private readonly items: Stored[] = [];
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
    this.push({ from, to, text, at: now });
    if (to.toLowerCase() === this.self.toLowerCase()) {
      this.directed++;
      this.lastDirected = { from, text };
    }
    return true;
  }

  /** Record something this agent said, so it sees its own side of the conversation. */
  sent(to: string, text: string, now = Date.now()): void {
    this.push({ from: this.self, to: to || "all", text: text.trim(), at: now });
  }

  snapshot(now = Date.now()): Message[] {
    return this.items.map((m) => ({
      from: m.from,
      to: m.to,
      text: m.text,
      ageSeconds: Math.max(0, Math.round((now - m.at) / 1000)),
    }));
  }

  private push(m: Stored): void {
    this.items.push(m);
    while (this.items.length > this.limit) this.items.shift();
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

export function narrate(bot: Bot, text: string): void {
  bot.chat(formatNarration(text));
}

/** Says a decision's `say` in chat and notes it in the buffer. */
export function speak(bot: Bot, buffer: MessageBuffer, to: string, text: string): void {
  bot.chat(formatSpeech(to, text));
  buffer.sent(to, text);
}
