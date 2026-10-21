/**
 * How a team's decisions bore on its goal, judged by code from the logs alone: which moved a part of
 * the goal forward, which set one back, how an agent got back to the goal after something broke its
 * work off, and how teammates helped or got in each other's way. The subject is the team and the
 * goal; models appear only as who acted. Used by the comparison report (compare.ts).
 *
 * A goal's parts, and the items on the way to each, are listed here per preset goal. "Toward" means a
 * decision gained something on a part's way or did the part itself (built the base, slept, stored
 * meat); what a decision aimed at is read from its skill and arguments, before knowing how it went.
 */
import type { LoggedStep } from "./types.js";
import { COOKED_MEAT } from "./scenario.js";
import { gameTime } from "./summary.js";

export interface Member {
  name: string;
  steps: LoggedStep[];
  /** Ticks to add to this agent's clock to put it on the team's: agents join seconds apart. */
  offset: number;
}

export interface GoalPart {
  name: string;
  /** Items on the way to this part: gaining one is progress toward it. */
  items: (item: string) => boolean;
  /** Whether a decision aims at this part, from its skill and arguments alone. */
  aims: (skill: string, args: Record<string, unknown>) => boolean;
  /** The part itself done by a step, beyond gaining items: built, slept, stored. */
  did?: (step: LoggedStep) => boolean;
}

const RAW_MEAT = ["beef", "porkchop", "mutton", "chicken", "rabbit", "cod", "salmon"];
const ANIMALS = ["cow", "pig", "sheep", "chicken", "rabbit"];
const MEAT = (item: string) => RAW_MEAT.includes(item) || COOKED_MEAT.includes(item);
const arg = (args: Record<string, unknown>, key: string) => String(args[key] ?? "");
const entered = (step: LoggedStep) => /^you are inside/.test(step.result?.reason ?? "");
/**
 * A shelter built (not walked into), or holes filled in one that stood. Walking out digs through the
 * doorway, two blocks tall, and going back in fills it: up to 2 filled is the doorway, not a repair.
 */
const builtOrMended = (step: LoggedStep) =>
  step.decision?.skill === "build_shelter" && step.result?.status === "success" && (!entered(step) || Number(/(\d+) missing blocks? filled/.exec(step.result.reason ?? "")?.[1] ?? 0) > 2);
const storeys = (step: LoggedStep) => Number(step.result?.detail?.["storeys"] ?? 1);
const large = (step: LoggedStep) => Number(step.result?.detail?.["size"] ?? 3) === 5;
export const slept = (step: LoggedStep) => step.decision?.skill === "sleep" && step.result?.detail?.["slept"] === true;
const storedMeat = (step: LoggedStep) =>
  step.decision?.skill === "store" && step.result?.status === "success" && Object.keys((step.result.detail?.["stored"] ?? {}) as object).some((item) => COOKED_MEAT.includes(item));

const homeParts = (base: (step: LoggedStep) => boolean, baseName: string): GoalPart[] => [
  { name: baseName, items: () => false, aims: (skill) => skill === "build_shelter", did: (step) => builtOrMended(step) && base(step) },
  {
    name: "beds",
    items: (item) => /_wool$|_bed$|^shears$|^string$/.test(item),
    aims: (skill, args) => (skill === "hunt" && arg(args, "target") === "sheep") || (skill === "craft" && /_bed$|^shears$/.test(arg(args, "item"))) || skill === "sleep",
    did: slept,
  },
  {
    name: "iron pickaxes",
    items: (item) => /^(raw_iron|iron_ore|deepslate_iron_ore|iron_ingot|iron_pickaxe)$/.test(item),
    aims: (skill, args) =>
      (skill === "mine_ore" && arg(args, "ore") === "iron") || (skill === "smelt" && /iron/.test(arg(args, "item"))) || (["craft", "give", "take"].includes(skill) && arg(args, "item") === "iron_pickaxe"),
  },
  {
    name: "cooked meat in a chest",
    items: MEAT,
    aims: (skill, args) => (skill === "hunt" && ANIMALS.includes(arg(args, "target"))) || (["smelt", "store"].includes(skill) && COOKED_MEAT.includes(arg(args, "item"))),
    did: storedMeat,
  },
];

/** The parts of each preset team goal. A goal not listed here gets no goal-work section. */
export const GOAL_PARTS: Record<string, GoalPart[]> = {
  "team-base": homeParts((step) => storeys(step) >= 2 && large(step), "the large two-storey base"),
  "team-homestead": homeParts((step) => storeys(step) >= 2, "a two-storey shelter"),
  "team-camp": [
    { name: "a two-storey shelter", items: () => false, aims: (skill) => skill === "build_shelter", did: (step) => builtOrMended(step) && storeys(step) >= 2 },
    { name: "stone tools", items: (item) => /^stone_(pickaxe|axe|sword|shovel)$/.test(item), aims: (skill, args) => skill === "craft" && /^stone_/.test(arg(args, "item")) },
  ],
};

/** Materials and tools every part needs: progress, but toward no one part. */
const GROUNDWORK = (item: string) =>
  /_log$|_planks$|^stick$|^cobblestone$|^crafting_table$|^chest$|^furnace$|^coal$|^charcoal$|^torch$|^(wooden|stone)_(pickaxe|axe|sword|shovel)$/.test(item);
const TOOL = /^(wooden|stone|iron|golden|diamond)_(pickaxe|axe|sword|shovel|hoe)$|^shears$/;
const TEAM_SKILLS = new Set(["give", "tell_agent", "ask_agent", "take", "store", "look_in_chest"]);
const SAFETY_SKILLS = new Set(["flee", "wait", "eat", "sleep", "build_shelter", "hunt", "fight"]);
const MOVING_SKILLS = new Set(["explore", "go_to", "descend", "tunnel", "climb_out", "follow"]);
/** Skills that are work on the goal even when they aim at no one part of it. */
const GROUNDWORK_SKILLS = new Set(["gather_wood", "mine_stone", "mine_ore", "craft", "smelt", "hunt"]);
export const GROUNDWORK_AIM = "preparing";
const HOSTILE = /zombie|skeleton|creeper|spider|witch|drowned|husk|stray|enderman|slime|phantom|pillager/;

export type Kind = "toward" | "groundwork" | "safety" | "team" | "moving" | "nothing";
export const KIND_LABELS: Record<Kind, string> = {
  toward: "Directly toward a part of the goal",
  groundwork: "Preparing for it (materials, tools)",
  safety: "Keeping safe",
  team: "Dealing with teammates",
  moving: "Travelling and searching",
  nothing: "Came to nothing (failed or cut short)",
};

/** What an agent did, in plain words, for reports read by people who don't know the skill names. */
export const SKILL_WORDS: Record<string, string> = {
  build_shelter: "took shelter", flee: "ran", hunt: "fought or hunted", wait: "waited", eat: "ate", sleep: "slept",
  pick_up: "picked things up", go_to: "went somewhere", explore: "explored", descend: "went down", tunnel: "tunnelled",
  climb_out: "climbed out", mine_ore: "mined ore", mine_stone: "mined stone", gather_wood: "gathered wood",
  craft: "crafted", smelt: "smelted", give: "gave something", take: "took from a chest", store: "stored in a chest", look_in_chest: "looked in a chest",
  tell_agent: "told a teammate what to do", ask_agent: "asked a teammate", shear: "sheared",
};
export const doing = (skill: string) => SKILL_WORDS[skill] ?? skill.replace(/_/g, " ");

export interface Setback {
  part: string;
  how: "died" | "wore out" | "ate" | "took from the chest";
  items: Record<string, number>;
}

export interface Classified {
  kind: Kind;
  /** The parts it moved forward. */
  parts: string[];
  /** The parts it aimed at. */
  aimed: string[];
  setbacks: Setback[];
}

const gains = (step: LoggedStep): Record<string, number> => {
  const before = step.observation.inventory;
  const after = step.inventoryAfter ?? before;
  const out: Record<string, number> = {};
  for (const [item, n] of Object.entries(after)) if (n > (before[item] ?? 0)) out[item] = n - (before[item] ?? 0);
  return out;
};
const losses = (step: LoggedStep): Record<string, number> => {
  const before = step.observation.inventory;
  const after = step.inventoryAfter ?? before;
  const out: Record<string, number> = {};
  for (const [item, n] of Object.entries(before)) if (n > (after[item] ?? 0)) out[item] = n - (after[item] ?? 0);
  return out;
};

/** `sleptBefore`: the agent has slept in a bed already, so sleeping again is getting through the night, not the goal. */
export function classify(step: LoggedStep, parts: GoalPart[], sleptBefore = false): Classified {
  const d = step.decision;
  const out: Classified = { kind: "nothing", parts: [], aimed: [], setbacks: [] };
  if (!d) return out;
  out.aimed = parts.filter((p) => p.aims(d.skill, d.args)).map((p) => p.name);
  const died = (step.deaths?.length ?? 0) > 0;
  const lost = losses(step);
  const partOf = (item: string) => parts.find((p) => p.items(item))?.name;
  const pick = (items: Record<string, number>, test: (item: string) => boolean) => Object.fromEntries(Object.entries(items).filter(([item]) => test(item)));
  if (died) {
    // Everything held was dropped; some of it may be picked up again, and that shows as a gain later.
    for (const p of parts) {
      const items = pick(step.observation.inventory, p.items);
      if (Object.keys(items).length) out.setbacks.push({ part: p.name, how: "died", items });
    }
  } else if (!["craft", "smelt", "give", "store", "build_shelter"].includes(d.skill)) {
    for (const [item, n] of Object.entries(lost)) {
      const part = partOf(item);
      if (!part) continue;
      const how = d.skill === "eat" ? "ate" : TOOL.test(item) ? "wore out" : null;
      if (how) out.setbacks.push({ part, how, items: { [item]: n } });
    }
  }
  if (d.skill === "take" && step.result?.status === "success") {
    const taken = pick((step.result.detail?.["taken"] ?? {}) as Record<string, number>, (item) => COOKED_MEAT.includes(item));
    const meat = parts.find((p) => p.did === storedMeat);
    if (meat && Object.keys(taken).length) out.setbacks.push({ part: meat.name, how: "took from the chest", items: taken });
  }

  const gained = died ? {} : gains(step);
  if (d.skill !== "take") {
    const did = (p: GoalPart) => !!p.did?.(step) && !(p.did === slept && sleptBefore);
    out.parts = parts.filter((p) => did(p) || Object.keys(gained).some((item) => p.items(item))).map((p) => p.name);
  }
  const hostileHunt = d.skill === "hunt" && HOSTILE.test(arg(d.args, "target"));
  if (TEAM_SKILLS.has(d.skill) && !(d.skill === "store" && out.parts.length)) out.kind = "team";
  else if (out.parts.length) out.kind = "toward";
  else if (Object.keys(gained).some(GROUNDWORK)) out.kind = "groundwork";
  else if (SAFETY_SKILLS.has(d.skill) && (d.skill !== "hunt" || hostileHunt) && (step.result?.status === "success" || slept(step))) out.kind = "safety";
  else if (MOVING_SKILLS.has(d.skill) && step.result?.status === "success") out.kind = "moving";
  return out;
}

/** The game time a step took, thinking included: ticks are stamped when its skill ends. */
const span = (steps: LoggedStep[], i: number) => Math.max(0, (steps[i]!.ticks ?? 0) - (steps[i - 1]?.ticks ?? 0));

export type DisruptionKind = "died" | "mob" | "dusk" | "message" | "failed";
export const DISRUPTION_LABELS: Record<DisruptionKind, string> = {
  died: "Died",
  mob: "A threat came near or struck",
  dusk: "Night was falling",
  message: "A teammate's message cut in",
  failed: "What it tried failed",
};

export interface Disruption {
  agent: string;
  /** Team clock, ticks. */
  at: number;
  kind: DisruptionKind;
  what: string;
  /** The parts the cut-off decision aimed at. */
  aimed: string[];
  /** The next decision. */
  next?: { skill: string; args: Record<string, unknown>; rationale?: string };
  /** Decisions until one aimed at a part of the goal again, and the game time that took; absent if none did. */
  back?: { decisions: number; ticks: number; parts: string[] };
}

export function disruptionOf(step: LoggedStep): { kind: DisruptionKind; what: string } | null {
  const reason = step.result?.reason ?? "";
  if (step.deaths?.length) return { kind: "died", what: step.deaths[0]!.cause ?? "died" };
  if (step.result?.status === "failed") return { kind: "failed", what: reason };
  if (step.result?.status !== "aborted" || /run is ending|time budget ran out/.test(reason)) return null;
  if (/said to you/.test(reason)) return { kind: "message", what: reason };
  if (/sun is setting|night falls|nightfall/.test(reason)) return { kind: "dusk", what: reason };
  return { kind: "mob", what: reason };
}

/**
 * What each of an agent's decisions aimed at. Once the shelter part stands, `build_shelter` is going
 * inside, not working on the goal; once the agent has slept in a bed, sleeping again is getting
 * through the night.
 */
export function aimsOf(member: Member, parts: GoalPart[], shelterDoneAt = Infinity): string[][] {
  let slep = false;
  return member.steps.map((step) => {
    const d = step.decision;
    if (!d) return [];
    const at = (step.ticks ?? 0) + member.offset;
    const aimed = parts
      .filter((p) => p.aims(d.skill, d.args))
      .filter((p) => !(d.skill === "build_shelter" && p.did && at > shelterDoneAt))
      .filter((p) => !(d.skill === "sleep" && p.did === slept && slep))
      .map((p) => p.name);
    if (slept(step)) slep = true;
    // Wood, stone, ore, crafting and food are the way to every part: work, though toward none in particular.
    if (!aimed.length && GROUNDWORK_SKILLS.has(d.skill) && !(d.skill === "hunt" && HOSTILE.test(arg(d.args, "target")))) return [GROUNDWORK_AIM];
    return aimed;
  });
}

export function disruptions(member: Member, parts: GoalPart[], shelterDoneAt = Infinity): Disruption[] {
  const out: Disruption[] = [];
  const { steps } = member;
  const aims = aimsOf(member, parts, shelterDoneAt);
  steps.forEach((step, i) => {
    const hit = disruptionOf(step);
    if (!hit || !step.decision) return;
    const next = steps[i + 1]?.decision;
    const d: Disruption = { agent: member.name, at: (step.ticks ?? 0) + member.offset, kind: hit.kind, what: hit.what, aimed: aims[i]! };
    if (next) d.next = { skill: next.skill, args: next.args, ...(next.rationale ? { rationale: next.rationale } : {}) };
    for (let j = i + 1; j < steps.length; j++) {
      if (aims[j]!.length) {
        // Back once the decision at j was made: the game time from the cut until step j began.
        d.back = { decisions: j - i, ticks: Math.max(0, (steps[j - 1]!.ticks ?? 0) - (step.ticks ?? 0)), parts: aims[j]! };
        break;
      }
    }
    out.push(d);
  });
  return out;
}

export interface PartEvent {
  at: number;
  agent: string;
  text: string;
  setback?: boolean;
}

export interface GoalWork {
  parts: string[];
  /** Game ticks by kind, team and each member. */
  time: Record<string, Record<Kind, number>>;
  /** Decisions that moved each part forward, by member. */
  toward: Record<string, Record<string, number>>;
  events: Record<string, PartEvent[]>;
  setbacks: Array<Setback & { agent: string; at: number }>;
  disruptions: Disruption[];
  help: string[];
  hindrance: string[];
}

const words = (name: string) => name.replace(/_/g, " ");
const itemList = (items: Record<string, number>) => Object.entries(items).map(([item, n]) => `${n > 1 ? `${n} ` : ""}${words(item)}`).join(", ");
export const dayClock = (ticks: number) => `day ${Math.floor(ticks / 24000) + 1} ${gameTime(ticks % 24000)}`;

/** One team episode's goal work. */
export function goalWork(members: Member[], goalName: string): GoalWork | null {
  const parts = GOAL_PARTS[goalName];
  if (!parts) return null;
  const kinds = Object.keys(KIND_LABELS) as Kind[];
  const zero = () => Object.fromEntries(kinds.map((k) => [k, 0])) as Record<Kind, number>;
  const out: GoalWork = {
    parts: parts.map((p) => p.name),
    time: { team: zero() },
    toward: Object.fromEntries(parts.map((p) => [p.name, {}])),
    events: Object.fromEntries(parts.map((p) => [p.name, []])),
    setbacks: [],
    disruptions: [],
    help: [],
    hindrance: [],
  };
  // Chest contents by who put them there, for "took what a teammate stored".
  const stored: Array<{ at: number; agent: string; item: string; n: number }> = [];
  const takes: Array<{ at: number; agent: string; item: string; n: number }> = [];
  const gives: Record<string, number> = {};
  const usedShelter: Record<string, number> = {};
  const interruptedBy: Record<string, number> = {};
  const hits: Record<string, number> = {};
  const firstSleep = new Set<string>();

  for (const member of members) {
    out.time[member.name] = zero();
    member.steps.forEach((step, i) => {
      const c = classify(step, parts, firstSleep.has(member.name));
      const ticks = span(member.steps, i);
      out.time[member.name]![c.kind] += ticks;
      out.time["team"]![c.kind] += ticks;
      const at = (step.ticks ?? 0) + member.offset;
      const d = step.decision;
      for (const part of c.parts) {
        out.toward[part]![member.name] = (out.toward[part]![member.name] ?? 0) + 1;
        const ev = partEvent(step, part, parts, member.name, firstSleep);
        if (ev) out.events[part]!.push({ at, agent: member.name, text: ev });
      }
      for (const s of c.setbacks) {
        out.setbacks.push({ ...s, agent: member.name, at });
        out.events[s.part]!.push({ at, agent: member.name, text: `${member.name} ${setbackText(s)}`, setback: true });
      }
      if (!d || !step.result) return;
      if (d.skill === "give" && step.result.status === "success") {
        const key = `${member.name} gave ${words(arg(d.args, "item"))} to ${arg(d.args, "to")}`;
        gives[key] = (gives[key] ?? 0) + Number(step.result.detail?.["gave"] ?? 1);
      }
      if (d.skill === "build_shelter" && entered(step)) {
        const by = String(step.result.detail?.["by"] ?? "");
        if (by && by !== member.name) usedShelter[`${member.name} used ${by}'s shelter`] = (usedShelter[`${member.name} used ${by}'s shelter`] ?? 0) + 1;
      }
      if (d.skill === "store" && step.result.status === "success") {
        for (const [item, n] of Object.entries((step.result.detail?.["stored"] ?? {}) as Record<string, number>)) stored.push({ at, agent: member.name, item, n });
      }
      if (d.skill === "take" && step.result.status === "success") {
        for (const [item, n] of Object.entries((step.result.detail?.["taken"] ?? {}) as Record<string, number>)) takes.push({ at, agent: member.name, item, n });
      }
      const from = /said to you/.test(step.result.reason ?? "") ? /^interrupted: (\S+) said to you/.exec(step.result.reason ?? "")?.[1] : undefined;
      if (step.result.status === "aborted" && from) interruptedBy[`${from} → ${member.name}`] = (interruptedBy[`${from} → ${member.name}`] ?? 0) + 1;
      for (const h of step.hits ?? []) if (h.by === member.name) hits[`${h.by} hit ${h.on}`] = (hits[`${h.by} hit ${h.on}`] ?? 0) + 1;
    });
  }
  // The shelter part done: from then on build_shelter is going inside it.
  const shelterPart = parts.find((p) => p.aims("build_shelter", {}));
  const shelterDoneAt = shelterPart ? (out.events[shelterPart.name]!.filter((e) => / built it$/.test(e.text)).map((e) => e.at).sort((a, b) => a - b)[0] ?? Infinity) : Infinity;
  for (const member of members) out.disruptions.push(...disruptions(member, parts, shelterDoneAt));

  for (const [text, n] of Object.entries(gives)) out.help.push(`${text}${n > 1 ? ` (${n})` : ""}`);
  for (const [text, n] of Object.entries(usedShelter)) out.help.push(`${text} ${n} ${n === 1 ? "time" : "times"}`);
  // A take of an item a teammate stored, and nobody stored more of it since: the taker had it from them.
  for (const t of takes) {
    const by = stored.filter((s) => s.item === t.item && s.at <= t.at).at(-1);
    if (!by || by.agent === t.agent) continue;
    // Putting the rest back soon after (a take that moved a whole stack) undoes most of it.
    const back = stored.find((s) => s.agent === t.agent && s.item === t.item && s.at >= t.at && s.at - t.at <= 1200)?.n ?? 0;
    const line = `${t.agent} took ${t.n} ${words(t.item)} that ${by.agent} had stored${back ? `, and put ${back} back` : ""} (${dayClock(t.at)})`;
    if (COOKED_MEAT.includes(t.item) && t.n > back) out.hindrance.push(line);
    else out.help.push(line.replace(" took ", " used the chest: took "));
  }
  const cutIns = Object.entries(interruptedBy);
  if (cutIns.length) {
    const bySender: Record<string, number> = {};
    for (const [pair, n] of cutIns) bySender[pair.split(" → ")[0]!] = (bySender[pair.split(" → ")[0]!] ?? 0) + n;
    const total = cutIns.reduce((a, [, n]) => a + n, 0);
    out.hindrance.push(`a message cut off a teammate's skill ${total} ${total === 1 ? "time" : "times"} (sent by ${Object.entries(bySender).map(([who, n]) => `${who} ${n}`).join(", ")})`);
  }
  for (const [pair, n] of Object.entries(hits)) out.hindrance.push(`${pair} ${n} ${n === 1 ? "time" : "times"}`);
  for (const part of out.parts) out.events[part]!.sort((a, b) => a.at - b.at);
  out.disruptions.sort((a, b) => a.at - b.at);
  return out;
}

function setbackText(s: Setback): string {
  if (s.how === "died") return `died, dropping ${itemList(s.items)}`;
  if (s.how === "wore out") return `wore out ${itemList(s.items)}`;
  if (s.how === "ate") return `ate ${itemList(s.items)}`;
  return `took ${itemList(s.items)} from the chest`;
}

/** What moved a part forward, in a few words; null for routine gains after the first. */
function partEvent(step: LoggedStep, part: string, parts: GoalPart[], agent: string, firstSleep: Set<string>): string | null {
  const p = parts.find((x) => x.name === part)!;
  const d = step.decision!;
  if (d.skill === "build_shelter" && p.aims("build_shelter", {})) {
    return entered(step) ? `${agent} repaired it (${/(\d+) missing blocks? filled/.exec(step.result?.reason ?? "")?.[1]} blocks)` : `${agent} built it`;
  }
  if (slept(step) && p.did === slept) {
    if (firstSleep.has(agent)) return null;
    firstSleep.add(agent);
    return `${agent} slept in a bed for the first time`;
  }
  if (storedMeat(step) && p.did === storedMeat) return `${agent} stored ${itemList(step.result?.detail?.["stored"] as Record<string, number>)}`;
  const gained = Object.fromEntries(Object.entries(gains(step)).filter(([item]) => p.items(item)));
  if (!Object.keys(gained).length) return null;
  return `${agent} ${d.skill === "craft" ? "made" : d.skill === "smelt" ? "smelted" : "got"} ${itemList(gained)}`;
}

/** Median of a list, or null. */
export const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]! : null);

export interface PartAtEnd {
  part: string;
  met: boolean;
  how: string;
}

/**
 * Where each part of a home goal (team-base, team-homestead) stood when the episode ended, from the
 * logs: the goal check's own state is not logged. Null for goals without a check written here.
 */
export function goalAtEnd(members: Member[], goalName: string): PartAtEnd[] | null {
  const parts = GOAL_PARTS[goalName];
  if (!parts || !goalName.startsWith("team-") || goalName === "team-camp") return null;
  const base = parts[0]!;
  const builds = members.flatMap((m) => m.steps.filter((step) => builtOrMended(step) && !entered(step) && base.did!(step)).map((step) => ({ m, step })));
  const first = builds.sort((a, b) => (a.step.ticks ?? 0) + a.m.offset - ((b.step.ticks ?? 0) + b.m.offset))[0];
  // Where the base stands: every spot a base was built or walked into.
  const needsBase = goalName === "team-base";
  const spots = members.flatMap((m) => m.steps.filter((step) => step.decision?.skill === "build_shelter" && step.result?.status === "success" && storeys(step) >= 2 && (!needsBase || large(step))))
    .map((step) => step.result?.detail?.["position"] as { x: number; y: number; z: number } | undefined).filter((p): p is { x: number; y: number; z: number } => !!p);
  const inside = (p: { x: number; y: number; z: number }) => spots.some((s) => Math.max(Math.abs(s.x - p.x), Math.abs(s.z - p.z)) <= 3 && Math.abs(s.y - p.y) <= 5);
  const sleepers = members.filter((m) => m.steps.some((step) => slept(step) && (!needsBase || inside(step.observation.position)))).map((m) => m.name);
  const lastInv = (m: Member) => { const last = m.steps.at(-1); return last?.inventoryAfter ?? last?.observation.inventory ?? {}; };
  const iron = members.filter((m) => (lastInv(m)["iron_pickaxe"] ?? 0) > 0).map((m) => m.name);
  // The chests as last seen by anyone: each store and take reports the whole chest afterwards.
  const views = new Map<string, { at: number; holds: Record<string, number> }>();
  for (const m of members) for (const step of m.steps) {
    for (const chest of (step.result?.detail?.["chests"] ?? []) as Array<{ at: string; holds: Record<string, number> }>) {
      const at = (step.ticks ?? 0) + m.offset;
      if ((views.get(chest.at)?.at ?? -1) <= at) views.set(chest.at, { at, holds: chest.holds });
    }
  }
  const meat = [...views.values()].reduce((n, v) => n + COOKED_MEAT.reduce((k, item) => k + (v.holds[item] ?? 0), 0), 0);
  const names = members.map((m) => m.name);
  const not = (who: string[]) => names.filter((n) => !who.includes(n));
  return [
    { part: base.name, met: !!first, how: first ? `built by ${first.m.name}, ${dayClock((first.step.ticks ?? 0) + first.m.offset)}` : "never built" },
    { part: needsBase ? "everyone slept in a bed inside it" : "everyone slept in a bed", met: not(sleepers).length === 0, how: `${sleepers.length} of ${names.length}${not(sleepers).length ? ` (not ${not(sleepers).join(", ")})` : ""}` },
    { part: "everyone carries an iron pickaxe at the end", met: iron.length === names.length, how: `${iron.length} of ${names.length}${iron.length ? ` (${iron.join(", ")})` : ""}` },
    { part: "10 cooked meat in a chest", met: meat >= 10, how: `${meat} at the end` },
  ];
}
