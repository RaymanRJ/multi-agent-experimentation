/**
 * One readable Markdown report comparing runs: by goal, by model, and for team runs, the team's work
 * on its goal (src/goalWork.ts) — what moved it forward or set it back, what broke the work off and
 * how the agents got back to it, and how they helped or got in each other's way — then who did what.
 * Built from the run logs alone. team.sh and batch.sh write one at the end of every run; this
 * command rebuilds it, or makes one for any set of logs.
 *
 *   npm run compare -- --team trio3            # a team run (runs/team-trio3.txt)
 *   npm run compare -- --batch b13             # a batch (runs/batch-b13.txt)
 *   npm run compare -- runs/a.jsonl runs/b.jsonl --title "Haiku vs Sonnet"
 *
 * Written to runs/compare-<name>.md (runs/ is not committed: copy what matters to docs/results/).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import minimist from "minimist";
import type { LoggedStep } from "./types.js";
import { isDeath, newEventsPerStep, summarizeRun, wilson, type RunSummary } from "./report.js";
import { parseSteps } from "./minds.js";
import { behaviour, gameTime, requests, verdictLines, type Behaviour, type Requests } from "./summary.js";
import { renderSkillUsage, skillUsage } from "./skillUsage.js";
import { DISRUPTION_LABELS, GROUNDWORK_AIM, KIND_LABELS, dayClock, doing, goalAtEnd, goalWork, median, needs, type Needs, type Disruption, type DisruptionKind, type GoalWork, type Kind, type Member, type PartAtEnd } from "./goalWork.js";

export interface Run {
  file: string;
  steps: LoggedStep[];
  s: RunSummary;
  b: Behaviour;
  r: Requests;
  /** "Claude Haiku 4.5", "Qwen3 4B (local)". */
  model: string;
}

/** A model id as people say it: claude-sonnet-5-5 -> Claude Sonnet 5.5, qwen3-4b-instruct:ctx8192 -> Qwen3 4B Instruct, local. */
export function modelName(steps: LoggedStep[]): string {
  const call = steps.flatMap((step) => step.calls ?? []).at(-1);
  if (!call) return "Scripted baseline";
  const claude = /^claude-([a-z]+)-(\d+)-(\d+)/.exec(call.model);
  if (claude) return `Claude ${claude[1]![0]!.toUpperCase()}${claude[1]!.slice(1)} ${claude[2]}.${claude[3]}`;
  if (/^gpt-/i.test(call.model)) {
    return call.model.replace(/^gpt-/i, "GPT-").split("-").map((part, i) => (i > 1 ? part[0]!.toUpperCase() + part.slice(1) : part)).join(" ").replace(/^GPT /, "GPT-");
  }
  if (call.backend === "ollama") {
    const base = call.model.replace(/:ctx\d+$/, "").replace(/[-:]/g, " ");
    return `${base.replace(/^qwen3/i, "Qwen3").replace(/\b(\d+)b\b/i, "$1B").replace(/\binstruct\b/i, "Instruct")}, local`;
  }
  return call.model;
}

export function loadRun(file: string): Run | null {
  const steps = parseSteps(readFileSync(file, "utf8"));
  if (steps.length === 0) return null;
  return { file, steps, s: summarizeRun(steps, file), b: behaviour(steps), r: requests(steps), model: modelName(steps) };
}

const pct = (n: number, of: number) => (of === 0 ? "-" : `${Math.round((100 * n) / of)}%`);
/** Under a cent shows to four places: GPT-6 Luna's whole run cost $0.0045, not "$0.00". */
const money = (usd: number | "unknown") => (usd === "unknown" ? "?" : usd === 0 ? "free" : usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`);
const words = (name: string) => name.replace(/_/g, " ");
/** 182,070 -> "182k", 2,954 -> "3.0k", 640 -> "640". */
export const tokens = (n: number) => (n >= 100_000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
const inOut = (tokensIn: number, tokensOut: number) => (tokensIn + tokensOut === 0 ? "-" : `${tokens(tokensIn)} / ${tokens(tokensOut)}`);
const clip = (text: string, n: number) => (text.length > n ? `${text.slice(0, n).trimEnd()}…` : text);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const TOOL = /^(wooden|stone|iron|golden|diamond)_(pickaxe|axe|sword|shovel|hoe)$/;

/** What an agent made, built and handed over, from its own steps. */
export interface Deeds {
  crafted: Record<string, number>;
  /** Shelters it finished building, by kind ("large two-storey"). */
  shelters: string[];
  /** Times build_shelter took it into a shelter that already stood, its own or a teammate's. */
  entered: number;
  gave: Array<{ item: string; count: number; to: string; at: string }>;
  failedGives: number;
  pickedUp: Record<string, number>;
  said: { all: number; directed: number };
  toolsAtEnd: string[];
}

const shelterKind = (detail: Record<string, unknown> | undefined) =>
  `${Number(detail?.["size"] ?? 3) === 5 ? "large " : ""}${Number(detail?.["storeys"] ?? 1) >= 2 ? "two-storey" : "one-storey"}`;

export function deeds(steps: LoggedStep[]): Deeds {
  const out: Deeds = { crafted: {}, shelters: [], entered: 0, gave: [], failedGives: 0, pickedUp: {}, said: { all: 0, directed: 0 }, toolsAtEnd: [] };
  for (const step of steps) {
    const d = step.decision;
    if (d?.say) d.say.to === "all" ? out.said.all++ : out.said.directed++;
    if (!d || !step.result) continue;
    const before = step.observation.inventory;
    const after = step.inventoryAfter ?? {};
    if (d.skill === "craft" && step.result.status === "success") {
      const item = String(d.args["item"] ?? "");
      const made = (after[item] ?? 0) - (before[item] ?? 0);
      if (made > 0) out.crafted[item] = (out.crafted[item] ?? 0) + made;
    }
    if (d.skill === "build_shelter" && step.result.status === "success") {
      // Going into one that stood already is a success too, but not a build (tbase1's report said Luna built 37).
      if (/^you are inside/.test(step.result.reason ?? "")) out.entered++;
      else out.shelters.push(shelterKind(step.result.detail));
    }
    if (d.skill === "give") {
      const gave = Number(step.result.detail?.["gave"] ?? 0);
      if (step.result.status === "success" && gave > 0) out.gave.push({ item: String(d.args["item"]), count: gave, to: String(d.args["to"]), at: step.at });
      else out.failedGives++;
    }
    if (d.skill === "pick_up" && step.result.status === "success") {
      for (const [item, n] of Object.entries(after)) {
        const gain = n - (before[item] ?? 0);
        if (gain > 0) out.pickedUp[item] = (out.pickedUp[item] ?? 0) + gain;
      }
    }
  }
  const last = steps[steps.length - 1];
  out.toolsAtEnd = Object.keys(last?.inventoryAfter ?? last?.observation.inventory ?? {}).filter((item) => TOOL.test(item)).sort();
  return out;
}

const list = (counts: Record<string, number>) =>
  Object.entries(counts).map(([item, n]) => `${words(item)}${n > 1 ? ` ×${n}` : ""}`).join(", ");

function outcome(run: Run): string {
  if (run.s.goalMet === true) return `met, ${gameTime(run.s.ticksToGoal ?? 0)}`;
  if (run.s.goalMet === "n/a") return "no goal";
  return `not met (${run.s.howEnded})`;
}

/** The at-a-glance table: one row per run. */
function glance(runs: Run[]): string[] {
  const rows = [
    "| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const run of runs) {
    const { b, s } = run;
    rows.push(
      `| ${s.agentName} | ${run.model} | ${outcome(run)} | ${b.decisions} | ${pct(b.succeeded, b.decisions)} | ` +
        `${b.failuresWithNext ? `${b.changedCourse} of ${b.failuresWithNext}` : "-"} | ${b.longestLoop && b.longestLoop.count >= 3 ? `${b.longestLoop.count}× \`${b.longestLoop.decision.split(" ")[0]}\`` : "-"} | ` +
        `${b.repeatNotes.shown ? `${b.repeatNotes.keptOn} of ${b.repeatNotes.shown}` : "-"} | ` +
        `${s.retries ? `${s.retries} of ${s.totalModelCalls} calls` : "-"} | ${s.deaths || "-"} | ${inOut(s.tokensIn, s.tokensOut)} | ${money(s.costUSD)} |`,
    );
  }
  return rows;
}

/** Repeated runs of one goal, one row per model: how often, how fast, how dear. */
function byModel(runs: Run[]): string[] {
  // One row per model and condition: settings that differ between these runs split the rows.
  const setting = (run: Run) => {
    const c = run.steps[0]!.config;
    return { memory: `memory ${c?.memory ?? "-"}`, progress: `progress ${c?.progress ? "on" : "off"}`, stance: `stance ${c?.stance ?? "-"}`, comms: `chat ${c?.comms ? "on" : "off"}` };
  };
  const varying = (["memory", "progress", "stance", "comms"] as const).filter((key) => new Set(runs.map((run) => setting(run)[key])).size > 1);
  const models = new Map<string, Run[]>();
  for (const run of runs) {
    const label = [run.model, ...varying.map((key) => setting(run)[key])].join(" · ");
    models.set(label, [...(models.get(label) ?? []), run]);
  }
  if ([...models.values()].every((group) => group.length < 2)) return [];
  const rows = [`| Model${varying.length ? " and condition" : ""} | Runs | Goal met | 95% range | Median time to goal | Median decisions | Tokens in / out per run | Cost per run |`, "|---|---|---|---|---|---|---|---|"];
  for (const [model, group] of models) {
    const met = group.filter((run) => run.s.goalMet === true);
    const [lo, hi] = wilson(met.length, group.length);
    const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]! : null);
    const ticks = median(met.map((run) => run.s.ticksToGoal ?? 0));
    const costs = group.map((run) => run.s.costUSD).filter((c): c is number => c !== "unknown");
    const cost = costs.length ? costs.reduce((a, c) => a + c, 0) / costs.length : "unknown";
    const mean = (xs: number[]) => Math.round(xs.reduce((a, x) => a + x, 0) / xs.length);
    const perRun = inOut(mean(group.map((run) => run.s.tokensIn)), mean(group.map((run) => run.s.tokensOut)));
    rows.push(`| ${model} | ${group.length} | ${met.length} of ${group.length} | ${Math.round(lo * 100)}–${Math.round(hi * 100)}% | ${ticks === null ? "-" : gameTime(ticks)} | ${median(group.map((run) => run.b.decisions))} | ${perRun} | ${money(cost as number | "unknown")} |`);
  }
  return ["", "By model:", "", ...rows];
}

/** A team episode: who did what, what they asked of each other, and the moments that mattered, in order. */
function teamSection(runs: Run[]): string[] {
  const lines: string[] = [];
  const all = runs.map((run) => ({ run, d: deeds(run.steps) }));
  // Handed over, by receiver: "stone shovel from sonnet" counted, not repeated.
  const received = new Map<string, Record<string, number>>();
  for (const { run, d } of all) {
    for (const g of d.gave) {
      const key = g.to.toLowerCase();
      const from = received.get(key) ?? {};
      const label = `${g.item} from ${run.s.agentName}`;
      from[label] = (from[label] ?? 0) + g.count;
      received.set(key, from);
    }
  }
  const gaveList = (gave: Deeds["gave"]) => {
    const counts: Record<string, number> = {};
    for (const g of gave) counts[`${g.item} to ${g.to}`] = (counts[`${g.item} to ${g.to}`] ?? 0) + g.count;
    return list(counts);
  };
  lines.push("**Who did what**", "");
  for (const { run, d } of all) {
    const parts: string[] = [];
    const tools = Object.fromEntries(Object.entries(d.crafted).filter(([item]) => TOOL.test(item)));
    if (Object.keys(tools).length) parts.push(`made ${list(tools)}`);
    const kinds: Record<string, number> = {};
    for (const kind of d.shelters) kinds[kind] = (kinds[kind] ?? 0) + 1;
    for (const [kind, n] of Object.entries(kinds)) parts.push(`built ${n === 1 ? `a ${kind} shelter` : `${n} ${kind} shelters`}`);
    if (d.entered) parts.push(`went into a standing shelter ${plural(d.entered, "time")}`);
    if (d.gave.length) parts.push(`gave ${gaveList(d.gave)}`);
    if (d.failedGives) parts.push(`${plural(d.failedGives, "give")} failed`);
    const times = (counts: Record<string, number>) => Object.entries(counts).map(([name, n]) => `${name} ${plural(n, "time")}`).join(", ");
    if (Object.keys(run.s.hitsGiven).length) parts.push(`hit ${times(run.s.hitsGiven)}`);
    if (Object.keys(run.s.hitsTaken).length) parts.push(`was hit by ${times(run.s.hitsTaken)}`);
    const got = received.get(run.s.agentName.toLowerCase());
    if (got && Object.keys(got).length) parts.push(`received ${list(got)}`);
    parts.push(`said ${plural(d.said.all + d.said.directed, "thing")} (${d.said.directed} to someone by name)`);
    parts.push(d.toolsAtEnd.length ? `ended holding ${d.toolsAtEnd.map(words).join(", ")}` : "ended holding no tools");
    lines.push(`- **${run.s.agentName}** (${run.model}): ${parts.join("; ")}.`);
  }

  const sent = all.flatMap(({ run }) => run.r.sent.map((x) => ({ from: run.s.agentName, ...x })));
  const got = all.flatMap(({ run }) => run.r.received.map((x) => ({ to: run.s.agentName, ...x })));
  if (sent.length || got.length) {
    lines.push("", "**Requests between agents**", "");
    const tells = got.filter((x) => x.kind === "tell");
    const asks = got.filter((x) => x.kind === "ask");
    if (tells.length) lines.push(`- Told to do something ${plural(tells.length, "time")}: complied ${tells.filter((x) => x.response === "complied").length}, partly ${tells.filter((x) => x.response === "partly").length}, did something else ${tells.filter((x) => x.response === "other").length}.`);
    if (asks.length) lines.push(`- Asked ${plural(asks.length, "question")}: answered ${asks.filter((x) => x.response === "answered").length}.`);
    for (const x of sent.slice(0, 10)) {
      lines.push(`- ${x.from} ${x.kind === "tell" ? "told" : "asked"} ${x.to}: ${clip(x.what, 100)}${x.reply ? ` → "${clip(x.reply, 100)}"` : x.status !== "success" ? ` (${x.status})` : ""}`);
    }
    if (sent.length > 10) lines.push(`- …and ${sent.length - 10} more`);
  }

  // Key moments from every agent, in real-time order: the agents' clocks start seconds apart.
  const start = Math.min(...runs.map((run) => new Date(run.steps[0]!.at).getTime()));
  const moments: Array<{ at: number; text: string }> = [];
  for (const { run } of all) {
    const fresh = newEventsPerStep(run.steps);
    for (const [i, step] of run.steps.entries()) {
      const at = new Date(step.at).getTime();
      const d = step.decision;
      const who = run.s.agentName;
      if (d && step.result?.status === "success") {
        if (d.skill === "craft" && TOOL.test(String(d.args["item"]))) moments.push({ at, text: `${who} made a ${words(String(d.args["item"]))}` });
        if (d.skill === "build_shelter" && !/^you are inside/.test(step.result.reason ?? "")) moments.push({ at, text: `${who} built a ${shelterKind(step.result.detail)} shelter` });
        if (d.skill === "give") moments.push({ at, text: `${who} gave ${words(String(d.args["item"]))} to ${d.args["to"]}` });
      }
      for (const event of fresh[i] ?? []) if (isDeath(event)) moments.push({ at, text: `${who} died` });
      if (step.ended) moments.push({ at, text: `${who}'s run ended: ${step.ended}` });
    }
  }
  moments.sort((a, b) => a.at - b.at);
  if (moments.length) {
    lines.push("", "<details><summary>Key moments, in order</summary>", "");
    for (const m of moments.slice(0, 40)) {
      const s = Math.round((m.at - start) / 1000);
      lines.push(`- ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} — ${m.text}`);
    }
    lines.push("", "Times are real minutes from the first agent's first decision.", "", "</details>");
  }
  return lines;
}

/** A team's members on one clock: each agent's ticks count from its own first step, seconds apart. */
export function membersOf(runs: Run[]): Member[] {
  // A step's time is when its skill ended, and its ticks count from the run's start: subtract to find the start.
  const began = (run: Run) => new Date(run.steps[0]!.at).getTime() - (run.steps[0]!.ticks ?? 0) * 50;
  const start = Math.min(...runs.map(began));
  return runs.map((run) => ({ name: run.s.agentName, steps: run.steps, offset: Math.round((began(run) - start) / 50) }));
}

const share = (n: number, of: number) => (of === 0 ? "-" : `${Math.round((100 * n) / of)}%`);
const KINDS = Object.keys(KIND_LABELS) as Kind[];

/** Where game time went, by kind of decision: one column per member, or per rep. */
function timeTable(columns: Array<{ label: string; time: Record<Kind, number> }>): string[] {
  const total = (t: Record<Kind, number>) => KINDS.reduce((a, k) => a + t[k], 0);
  return [
    `| Share of game time | ${columns.map((c) => c.label).join(" | ")} |`,
    `|---|${columns.map(() => "---").join("|")}|`,
    ...KINDS.map((k) => `| ${KIND_LABELS[k]} | ${columns.map((c) => share(c.time[k], total(c.time))).join(" | ")} |`),
  ];
}

/** Each kind of disruption: how often, what came next, and how soon the agent was back on the goal. */
function disruptionTable(ds: Disruption[]): string[] {
  const kinds = (Object.keys(DISRUPTION_LABELS) as DisruptionKind[]).filter((k) => ds.some((d) => d.kind === k));
  if (!kinds.length) return [];
  const rows = [
    "| What broke the work off | Times | What it did next, most often | Back at work on the goal | Decisions to get back (median) | Game time to get back (median) | Back to what it was on |",
    "|---|---|---|---|---|---|---|",
  ];
  for (const k of kinds) {
    const group = ds.filter((d) => d.kind === k);
    const next: Record<string, number> = {};
    for (const d of group) if (d.next) next[d.next.skill] = (next[d.next.skill] ?? 0) + 1;
    const top = Object.entries(next).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([skill, n]) => `${doing(skill)} ${n}`).join(", ");
    const back = group.filter((d) => d.back);
    const onPart = back.filter((d) => d.aimed.length);
    const same = onPart.filter((d) => d.back!.parts.some((p) => d.aimed.includes(p)));
    const dec = median(back.map((d) => d.back!.decisions));
    const ticks = median(back.map((d) => d.back!.ticks));
    rows.push(`| ${DISRUPTION_LABELS[k]} | ${group.length} | ${top || "-"} | ${back.length} of ${group.length} | ${dec ?? "-"} | ${ticks === null ? "-" : gameTime(ticks)} | ${onPart.length ? `${same.length} of ${onPart.length}` : "-"} |`);
  }
  return rows;
}

/** A few disruptions worth reading in full: never back on the goal, then the longest ways back. */
function disruptionExamples(ds: Disruption[], n: number): string[] {
  const onGoal = ds.filter((d) => d.aimed.some((p) => p !== GROUNDWORK_AIM) && d.kind !== "failed");
  const never = onGoal.filter((d) => !d.back).slice(0, 2);
  const longest = onGoal.filter((d) => d.back).sort((a, b) => b.back!.ticks - a.back!.ticks).slice(0, n - never.length);
  return [...never, ...longest].sort((a, b) => a.at - b.at).map((d) => {
    const cut = `${d.kind === "died" ? "died" : "cut off"}: "${clip(d.what.replace(/^interrupted: /, ""), 110)}"`;
    const next = d.next ? ` Next it ${doing(d.next.skill)}${d.next.rationale ? `: "${clip(d.next.rationale, 160)}"` : "."}` : "";
    const back = d.back
      ? ` Back at work (${d.back.parts.join(", ")}) after ${plural(d.back.decisions, "decision")} and ${gameTime(d.back.ticks)} of game time.`
      : " Never went back to work on the goal before the run ended.";
    return `- **${dayClock(d.at)}, ${d.agent}**, working on ${d.aimed.join(" and ")}, ${cut}.${next}${back}`;
  });
}

/** One part's story: what moved it forward and what set it back, in order. Routine gains show once per agent. */
function partStory(w: GoalWork, part: string, limit = 10): string[] {
  const seen = new Set<string>();
  const events = w.events[part]!.filter((e) => {
    const routine = !e.setback && / got /.test(e.text);
    if (!routine) return true;
    const key = e.agent;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const by = Object.entries(w.toward[part]!).map(([agent, n]) => `${agent} ${n}`).join(", ");
  const setbacks = w.setbacks.filter((s) => s.part === part).length;
  // A shelter's losses are seen only when someone replaces the missing blocks (the logs don't say how they went).
  const repairs = w.events[part]!.filter((e) => / repaired it \(\d+ blocks\)$/.test(e.text)).length;
  const back = repairs && !setbacks ? `damaged and repaired ${plural(repairs, "time")}` : `set back ${plural(setbacks, "time")}`;
  const lines = [`- **${part[0]!.toUpperCase()}${part.slice(1)}**: moved forward by ${plural(Object.values(w.toward[part]!).reduce((a, n) => a + n, 0), "decision")}${by ? ` (${by})` : ""}; ${back}.`];
  for (const e of events.slice(0, limit)) lines.push(`  - ${dayClock(e.at)}: ${e.setback ? "*set back:* " : ""}${e.text}`);
  if (events.length > limit) lines.push(`  - …and ${events.length - limit} more`);
  return lines;
}

function atEndTable(columns: Array<{ label: string; parts: PartAtEnd[] }>): string[] {
  const parts = columns[0]!.parts.map((p) => p.part);
  return [
    `| Part of the goal | ${columns.map((c) => c.label).join(" | ")} |`,
    `|---|${columns.map(() => "---").join("|")}|`,
    ...parts.map((part, i) => `| ${part} | ${columns.map((c) => `${c.parts[i]!.met ? "**yes**" : "no"}: ${c.parts[i]!.how}`).join(" | ")} |`),
  ];
}

/** A team episode told through its goal: what moved it, what got in the way, and how the agents worked together. */
function goalWorkSection(w: GoalWork, end: PartAtEnd[] | null, runs: Run[]): string[] {
  const lines: string[] = [];
  if (end) lines.push("**The goal at the end**", "", ...atEndTable([{ label: "Where it stood", parts: end }]), "");
  lines.push("**Toward the goal, and away from it**", "", ...w.parts.flatMap((part) => partStory(w, part)), "");
  lines.push(...timeTable([{ label: "Team", time: w.time["team"]! }, ...runs.map((run) => ({ label: run.s.agentName, time: w.time[run.s.agentName]! }))]), "");
  lines.push("**When something got in the way**", "", ...disruptionTable(w.disruptions), "", ...disruptionExamples(w.disruptions, 5), "");
  lines.push("**Working together, and in each other's way**", "");
  const names = runs.map((run) => run.s.agentName);
  lines.push(`| Decisions that moved each part forward | ${names.join(" | ")} |`, `|---|${names.map(() => "---").join("|")}|`);
  for (const part of w.parts) lines.push(`| ${part} | ${names.map((n) => w.toward[part]![n] ?? 0).join(" | ")} |`);
  lines.push("");
  const got = runs.flatMap((run) => run.r.received);
  const tells = got.filter((x) => x.kind === "tell");
  const asks = got.filter((x) => x.kind === "ask");
  const help = [...w.help];
  if (asks.length) help.push(`questions answered: ${asks.filter((x) => x.response === "answered").length} of ${asks.length}`);
  if (tells.length) help.push(`told to do something: did it at the next decision ${tells.filter((x) => x.response === "complied").length} of ${tells.length}, partly ${tells.filter((x) => x.response === "partly").length}`);
  lines.push(help.length ? `- **Helped:** ${help.join("; ")}.` : "- **Helped:** nothing logged.");
  lines.push(w.hindrance.length ? `- **Got in the way:** ${w.hindrance.join("; ")}.` : "- **Got in the way:** nothing logged.");
  lines.push("", ...needsLines(needs(membersOf(runs))));
  return lines;
}

/** Asked for, or only needed: whether handovers follow requests or needs. */
function needsLines(n: Needs): string[] {
  const lines = ["**Asked for, or only needed**", ""];
  lines.push(`- Handovers that came right after the receiver asked for that item: ${n.gives ? `${n.askedGives} of ${n.gives}` : "none"}.`);
  if (n.spareBeds.length) {
    const asked = n.spareBeds.filter((p) => p.asked);
    lines.push(
      `- An agent was told it had no bed while a teammate carried a spare: ${plural(n.spareBeds.length, "pair")}; handed over ${n.spareBeds.filter((p) => p.handed).length}` +
        ` (${asked.filter((p) => p.handed).length} of ${asked.length} where it asked for a bed, ${n.spareBeds.filter((p) => !p.asked && p.handed).length} of ${n.spareBeds.length - asked.length} where it didn't).`,
    );
  }
  if (n.sparePicks.length) lines.push(`- One agent held two or more iron pickaxes while a teammate held none: ${plural(n.sparePicks.length, "time")}; handed one over ${n.sparePicks.filter((p) => p.handed).length}.`);
  return lines;
}

/** The reps of one team goal side by side: where each ended, where time went, what got in the way. */
function acrossReps(episodes: Array<{ label: string; w: GoalWork; end: PartAtEnd[] | null }>): string[] {
  const lines = [`### Across the ${episodes.length} reps`, ""];
  if (episodes.every((e) => e.end)) lines.push(...atEndTable(episodes.map((e) => ({ label: e.label, parts: e.end! }))), "");
  lines.push(...timeTable(episodes.map((e) => ({ label: e.label, time: e.w.time["team"]! }))), "");
  const all = episodes.flatMap((e) => e.w.disruptions);
  lines.push("When something broke an agent's work off, in all reps:", "", ...disruptionTable(all), "");
  const setbacks = episodes.flatMap((e) => e.w.setbacks);
  if (setbacks.length) {
    const hows = [...new Set(setbacks.map((s) => s.how))];
    const parts = [...new Set(setbacks.map((s) => s.part))];
    lines.push("Setbacks, in all reps:", "", `| Part | ${hows.join(" | ")} |`, `|---|${hows.map(() => "---").join("|")}|`);
    for (const part of parts) lines.push(`| ${part} | ${hows.map((how) => setbacks.filter((s) => s.part === part && s.how === how).length).join(" | ")} |`);
    lines.push("");
  }
  return lines;
}

function settings(runs: Run[]): string {
  const first = runs[0]!.steps[0]!;
  const c = first.config;
  const parts = [
    `scenario **${runs[0]!.s.scenario}**`,
    c?.stance ? `stance ${c.stance}` : null,
    c ? `chat ${c.comms ? "on" : "off"}` : null,
    c?.memory ? `memory ${c.memory}` : null,
    c?.progress ? "progress list on" : null,
    c?.ticks ? `time budget ${gameTime(c.ticks)} of game time (${c.ticks.toLocaleString("en-US")} ticks)` : null,
    c?.budgetUSD ? `cost cap $${c.budgetUSD} per agent` : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

export function renderComparison(runs: Run[], title: string): string {
  const lines: string[] = [];
  const add = (...more: string[]) => lines.push(...more);
  const costs = runs.map((run) => run.s.costUSD);
  const total = costs.every((c) => c !== "unknown") ? (costs as number[]).reduce((a, c) => a + c, 0) : "unknown";
  const dates = runs.map((run) => run.steps[0]!.at.slice(0, 10)).sort();
  add(`# ${title}`, "");
  const tokensIn = runs.reduce((a, run) => a + run.s.tokensIn, 0);
  const tokensOut = runs.reduce((a, run) => a + run.s.tokensOut, 0);
  add(`${plural(runs.length, "run")} · ${dates[0] === dates.at(-1) ? dates[0] : `${dates[0]} to ${dates.at(-1)}`} · ${inOut(tokensIn, tokensOut)} tokens in / out · total cost ${money(total as number | "unknown")}`, "");

  const goals = new Map<string, Run[]>();
  for (const run of runs) goals.set(run.s.goal, [...(goals.get(run.s.goal) ?? []), run]);
  for (const [goal, group] of goals) {
    add(`## Goal: ${group[0]!.s.goalName}`, "", `> ${goal}`, "", settings(group), "");
    const episodes = new Map<string, Run[]>();
    for (const run of group) {
      const key = run.steps[0]!.config?.team?.length ? (run.steps[0]!.config?.episode ?? run.file) : run.file;
      episodes.set(key, [...(episodes.get(key) ?? []), run]);
    }
    const teams = [...episodes.entries()].filter(([, members]) => members.length > 1 || members[0]!.steps[0]!.config?.team?.length);
    if (teams.length) {
      const works = teams.map(([episode, members]) => {
        const m = membersOf(members);
        return { label: episode.replace(/^team-/, "").replace(/^.*-(\d+)$/, "Rep $1"), w: goalWork(m, group[0]!.s.goalName), end: goalAtEnd(m, group[0]!.s.goalName) };
      });
      const known = works.filter((x): x is { label: string; w: GoalWork; end: PartAtEnd[] | null } => x.w !== null);
      if (known.length > 1) add(...acrossReps(known));
      for (const [index, [episode, members]] of teams.entries()) {
        const met = members.every((run) => run.s.goalMet === true);
        const cost = members.reduce((a, run) => a + (run.s.costUSD === "unknown" ? 0 : run.s.costUSD), 0);
        const teamTokens = inOut(members.reduce((a, run) => a + run.s.tokensIn, 0), members.reduce((a, run) => a + run.s.tokensOut, 0));
        const longest = Math.max(...members.map((run) => run.s.ticksToGoal ?? run.steps.at(-1)?.ticks ?? 0));
        const teamLabel = episode.replace(/^team-/, "").replace(/-(\d+)$/, ", rep $1");
        add(`### Team ${teamLabel}: ${met ? `goal met in ${gameTime(longest)} of game time` : "goal not met"} · ${teamTokens} tokens in / out · ${money(cost)}`, "");
        const w = works[index]!.w;
        if (w) {
          add(...goalWorkSection(w, works[index]!.end, members), "");
          add("<details><summary>Each agent: numbers, who did what, key moments</summary>", "", ...glance(members), "", ...teamSection(members), "", "</details>", "");
        } else add(...glance(members), "", ...teamSection(members), "");
      }
    }
    const solo = group.filter((run) => !teams.some(([, members]) => members.includes(run)));
    if (solo.length) add(...(teams.length ? ["### Agents alone", ""] : []), ...glance(solo), ...byModel(solo), "");
  }

  add(...renderSkillUsage(skillUsage(runs.map((run) => ({ steps: run.steps, goalMet: run.s.goalMet, model: run.model })))), "");

  const anyTeam = runs.some((run) => run.steps[0]!.config?.team?.length);
  add(anyTeam ? "<details><summary>Each agent in a sentence or two</summary>" : "## In a sentence or two each", "");
  // Reps reuse agent names, so say which rep each line is from.
  const repOf = (run: Run) => run.steps[0]!.config?.team?.length ? /-(\d+)$/.exec(run.steps[0]!.config?.episode ?? "")?.[1] : undefined;
  const severalReps = new Set(runs.map(repOf)).size > 1;
  for (const run of runs) {
    const verdict = verdictLines(run.steps, run.file).slice(0, 3).join(" ");
    const rep = severalReps && repOf(run) ? `, rep ${repOf(run)}` : "";
    add(`- **${run.s.agentName}** (${run.model}${rep}): ${verdict}`);
  }
  if (anyTeam) add("", "</details>");
  add("", "<details><summary>How to read this</summary>", "");
  if (anyTeam) {
    add("- **Directly toward a part of the goal**: a decision that gained something on the way to a part (wool, iron, meat) or did the part itself (built the base, repaired it, slept in a bed for the first time, stored cooked meat). **Preparing**: it gained materials or tools every part needs. **Keeping safe**: sheltering, running, eating, waiting, and sleeping after the first time. Shares are of game time, thinking included. Judged by code from inventories and results (`src/goalWork.ts`).");
    add("- **Set back**: goal items lost: dropped at a death (some may be picked up again later), a tool worn out, meat eaten (even when the agent needed to eat), or cooked meat taken out of the chest.");
    add("- **What broke the work off**: an action cut short by a threat, nightfall or a teammate's message, a death, or an action that failed. **Back at work** is the next decision aimed at a part of the goal or at preparing for it, judged from what was chosen, not from how it went. Once the base stands, taking shelter in it is keeping safe, not work. A step with two deaths counts once.");
    add("- **The goal at the end** is read from the logs; the goal check in the run itself decides whether the goal was met.");
  }
  add("- **Worked**: decisions whose skill succeeded. **Changed course**: after a failure, the next decision was different.");
  add("- **Longest loop**: the same decision failing the same way, back to back. **Unusable answers**: replies that had to be asked again.");
  add("- **Tokens in / out**: everything sent to the model (prompts, cached or not, and re-asks) and everything it wrote. The local model's tokens are counted too, though it costs nothing.");
  add("- Game time: a whole day is 20:00. Costs are from token counts and list prices (`src/backends/pricing.ts`).");
  add("- Each agent's full report is beside its log: `<log>.summary.md`.", "");
  add("Logs:", "", ...runs.map((run) => `- \`${run.file}\``), "", "</details>");
  return lines.join("\n") + "\n";
}

function listFile(path: string): string[] {
  return readFileSync(path, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = minimist(process.argv.slice(2), { string: ["team", "batch", "title", "out"] });
  let files = argv._ as string[];
  let name = "selection";
  if (argv.team) [files, name] = [listFile(join("runs", `team-${argv.team}.txt`)), `team-${argv.team}`];
  if (argv.batch) [files, name] = [listFile(join("runs", `batch-${argv.batch}.txt`)), `batch-${argv.batch}`];
  const runs = files.map(loadRun).filter((run): run is Run => run !== null);
  if (runs.length === 0) {
    console.error("No runs to compare: pass --team NAME, --batch NAME or log files.");
    process.exit(1);
  }
  const title = argv.title ?? (argv.team ? `Team run ${argv.team}` : argv.batch ? `Batch ${argv.batch}` : "Run comparison");
  const out = argv.out ?? join("runs", `compare-${name}.md`);
  writeFileSync(out, renderComparison(runs, title));
  console.log(out);
}
