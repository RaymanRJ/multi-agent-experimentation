/**
 * A short Markdown report on how an agent behaved in one run: a verdict in plain sentences, a
 * scorecard (decisions that worked, response to failure, loops, false "done" claims, think time,
 * tokens, cost), progress, where the time went, what got in its way and, for a model, its own
 * reasons. Built from the run's log alone, so any past run can be reported without replaying it.
 * Every run writes one when it ends (src/agent.ts); this command rewrites them.
 *
 *   npm run summary                      # the newest run
 *   npm run summary -- runs/<file>.jsonl  # these runs
 *   npm run summary -- --batch b13       # every run in a batch
 *
 * Each summary is written beside its log as <log>.summary.md (runs/ is not committed).
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import minimist from "minimist";
import type { LoggedStep } from "./types.js";
import { hitList, hitPair, isDeath, newEventsPerStep, summarizeRun, type RunSummary } from "./report.js";
import { brainLabel, MILESTONES, parseSteps } from "./minds.js";
import { GOAL_GAPS, TEAM_GOALS, goalTask } from "./scenario.js";

const MILESTONE_LABELS: Record<string, string> = {
  logs: "Logs",
  wooden_pickaxe: "Wooden pickaxe",
  stone: "Stone",
  stone_pickaxe: "Stone pickaxe",
  shelter: "Shelter",
  survived_night: "Survived a night",
};
const MAX_PHASES = 30;
const TOP_PROBLEMS = 6;

/** In-game time as m:ss, where a whole day is 20:00 (20 ticks a second). */
export function gameTime(ticks: number): string {
  const s = Math.round(ticks / 20);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function wallTime(ms: number): string {
  const m = Math.round(ms / 60_000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

const words = (name: string) => name.replace(/_/g, " ");

/** Reasons that differ only in their numbers ("14 blocks below", "15 blocks below") are one problem. */
export function problemKey(reason: string): string {
  return reason.replace(/\d+/g, "N").replace(/\s+/g, " ").trim();
}

export interface Phase {
  from: number;
  to: number;
  skill: string;
  count: number;
  success: number;
  failed: number;
  aborted: number;
  gained: Record<string, number>;
}

/** Two phases into one; an alternation's skill reads "tunnel ↔ mine_ore". */
function merge(into: Phase, other: Phase): void {
  into.to = other.to;
  into.count += other.count;
  into.success += other.success;
  into.failed += other.failed;
  into.aborted += other.aborted;
  for (const [item, n] of Object.entries(other.gained)) into.gained[item] = (into.gained[item] ?? 0) + n;
}

/**
 * Consecutive decisions of the same skill, folded into one line of the story. A back-and-forth
 * between two skills (tunnel, look, tunnel, look) folds into one line too.
 */
export function phases(steps: LoggedStep[]): Phase[] {
  const runs = sameSkillRuns(steps);
  const out: Phase[] = [];
  for (let i = 0; i < runs.length; i++) {
    const a = runs[i]!;
    const b = runs[i + 1];
    let j = i + 2;
    while (b && runs[j]?.skill === a.skill && (runs[j + 1] === undefined || runs[j + 1]!.skill === b.skill)) j += 2;
    if (b && j - i >= 4) {
      const folded: Phase = { ...a, gained: { ...a.gained }, skill: `${a.skill} ↔ ${b.skill}` };
      for (const next of runs.slice(i + 1, j)) merge(folded, next);
      out.push(folded);
      i = j - 1;
    } else {
      out.push(a);
    }
  }
  return out;
}

function sameSkillRuns(steps: LoggedStep[]): Phase[] {
  const out: Phase[] = [];
  for (const step of steps) {
    const skill = step.decision?.skill ?? (step.result?.status === "failed" ? "done (refused)" : null);
    if (!skill) continue;
    let phase = out[out.length - 1];
    if (!phase || phase.skill !== skill) {
      phase = { from: step.step, to: step.step, skill, count: 0, success: 0, failed: 0, aborted: 0, gained: {} };
      out.push(phase);
    }
    phase.to = step.step;
    phase.count++;
    const status = step.result?.status;
    if (status === "success") phase.success++;
    else if (status === "failed") phase.failed++;
    else if (status === "aborted") phase.aborted++;
    for (const [item, after] of Object.entries(step.inventoryAfter ?? {})) {
      const gain = after - (step.observation.inventory[item] ?? 0);
      if (gain > 0) phase.gained[item] = (phase.gained[item] ?? 0) + gain;
    }
  }
  return out;
}

function outcomeLine(s: RunSummary): string {
  if (s.goalMet === true) return `**Goal met** after ${gameTime(s.ticksToGoal ?? 0)} of game time.`;
  if (s.goalMet === "n/a") return `**No preset goal to check.** The run ended: ${s.howEnded}.`;
  const why: Record<string, string> = {
    "time budget": "the time budget ran out",
    "model ended": 'the model said "done" twice in a row',
    "model gave up": "the model gave up",
    disconnected: "the connection to the game server dropped, so this run says nothing about the model and is left out of comparisons",
    "step limit": "it hit the safety cap on decisions",
    "cost budget": "it reached its spending cap",
    "brain failed": "the model failed to answer three times in a row",
    "brain unavailable": "the model provider refused (key or credits): not the model's fault",
  };
  return `**Goal not met:** ${why[s.howEnded] ?? `the run stopped (${s.howEnded})`}.`;
}

/** A decision as one comparable string: craft {"item":"stone_pickaxe"}. */
const said = (step: LoggedStep) => (step.decision ? `${step.decision.skill} ${JSON.stringify(step.decision.args ?? {})}` : "done");
const pct = (n: number, of: number) => (of === 0 ? "-" : `${Math.round((100 * n) / of)}%`);
const clip = (text: string, n = 200) => (text.length > n ? text.slice(0, n).trimEnd() + "…" : text);
/** Stopped by the world (a mob, damage, dusk), not by the run ending. */
const interrupted = (step: LoggedStep) => step.result?.status === "aborted" && step.result.reason !== "the run is ending" && step.result.reason !== "the time budget ran out";

export interface Behaviour {
  decisions: number;
  succeeded: number;
  failed: number;
  interrupted: number;
  /** Failures followed by another decision, and how many of those changed course. */
  failuresWithNext: number;
  changedCourse: number;
  /** The longest run of one decision failing the same way, back to back. */
  longestLoop: { count: number; decision: string; reason: string; from: number } | null;
  /** Failures that repeat an earlier failure exactly: the same decision, failing the same way. */
  repeatedFailures: number;
  /** Decisions that named no skill. */
  invalid: number;
  /** Times the agent was told its last decisions were all the same, and how often it chose the same again. */
  repeatNotes: { shown: number; keptOn: number };
  /** Game ticks spent in each skill, and waiting on the brain ("thinking"): the world runs on meanwhile. */
  ticksBySkill: Record<string, number>;
}

/** The world runs at 20 ticks a second while the brain thinks. */
const TICKS_PER_MS = 20 / 1000;

/** The note the agent adds to recentEvents every third identical decision (agent.ts); group 1 is the decision. */
const REPEAT_NOTE = /^your last \d+ decisions were the same (\w+\(.*\)) and (?:each succeeded|all got the same result)$/;

/** How the agent acted, as opposed to what it got: success rate, response to failure, loops. */
export function behaviour(steps: LoggedStep[]): Behaviour {
  const out: Behaviour = { decisions: 0, succeeded: 0, failed: 0, interrupted: 0, failuresWithNext: 0, changedCourse: 0, longestLoop: null, repeatedFailures: 0, invalid: 0, repeatNotes: { shown: 0, keptOn: 0 }, ticksBySkill: {} };
  let loop: Behaviour["longestLoop"] = null;
  const failedBefore = new Set<string>();
  const spend = (what: string, ticks: number) => {
    if (ticks > 0) out.ticksBySkill[what] = (out.ticksBySkill[what] ?? 0) + ticks;
  };
  steps.forEach((step, i) => {
    const next = steps[i + 1];
    const status = step.result?.status;
    // A step's ticks are stamped once its skill ends, so the span since the last step is the
    // brain's thinking followed by the skill itself.
    const span = Math.max(0, (step.ticks ?? 0) - (steps[i - 1]?.ticks ?? 0));
    const thinking = Math.min(span, Math.round((step.decisionMs ?? 0) * TICKS_PER_MS));
    spend("thinking", thinking);
    spend(step.decision?.skill ?? "done", span - thinking);
    if (step.decision) out.decisions++;
    if (status === "failed") {
      const key = `${said(step)} ${problemKey(step.result?.reason ?? "")}`;
      if (failedBefore.has(key)) out.repeatedFailures++;
      failedBefore.add(key);
    }
    if (status === "success") out.succeeded++;
    if (status === "failed") out.failed++;
    if (interrupted(step)) out.interrupted++;
    if (step.result?.reason?.startsWith("no such skill")) out.invalid++;
    if (status === "failed" && step.decision && next && (next.decision || next.result)) {
      out.failuresWithNext++;
      if (said(next) !== said(step)) out.changedCourse++;
    }
    // The note stays among recentEvents for a few steps; count it on the step it first appears.
    const seen = new Set(steps[i - 1]?.observation?.recentEvents ?? []);
    for (const event of step.observation?.recentEvents ?? []) {
      const note = event.match(REPEAT_NOTE);
      if (!note || seen.has(event)) continue;
      out.repeatNotes.shown++;
      if (step.decision && `${step.decision.skill}(${JSON.stringify(step.decision.args)})` === note[1]) out.repeatNotes.keptOn++;
    }
    const reason = problemKey(step.result?.reason ?? "");
    const prev = steps[i - 1];
    const continues = loop && prev && status === "failed" && said(prev) === said(step) && problemKey(prev.result?.reason ?? "") === reason;
    if (continues) loop!.count++;
    else loop = status === "failed" ? { count: 1, decision: said(step), reason: step.result?.reason ?? "", from: step.step } : null;
    if (loop && loop.count > (out.longestLoop?.count ?? 1)) out.longestLoop = { ...loop };
  });
  return out;
}

/** The model's own reason for a step: its rationale, or for a "done" the rationale in its reply. */
function rationale(step: LoggedStep): string | null {
  if (step.decision?.rationale) return step.decision.rationale;
  const text = step.calls?.[step.calls.length - 1]?.text;
  if (!text) return null;
  const match = text.match(/"rationale"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  return match ? match[1]!.replace(/\\"/g, '"').replace(/\\n/g, " ") : null;
}

/** What the preset goal still lacked at the end, as the run's own goal check words it. */
function stillLacking(s: RunSummary, steps: LoggedStep[]): string[] {
  // A team goal's gaps depend on what the teammates held, which this agent's log doesn't record.
  if (s.goalMet !== false || TEAM_GOALS.has(goalTask(s.goalName))) return [];
  const gaps = GOAL_GAPS[goalTask(s.goalName)];
  const last = steps[steps.length - 1];
  if (!gaps || !last) return [];
  const inventory = last.inventoryAfter ?? last.observation.inventory;
  return gaps({ skill: "done", status: "success", inventory, shelterBuilt: !!s.milestones["shelter"], nightSurvivedSinceShelter: false });
}

export interface Requests {
  /** tell_agent and ask_agent decisions this agent made. */
  sent: Array<{ step: number; kind: "tell" | "ask"; to: string; what: string; status: string; reply?: string }>;
  /** Requests it was shown, and what its next decision did about each. */
  received: Array<{ step: number; from: string; kind: "tell" | "ask"; what: string; response: string }>;
}

/** Who asked whom for what, and whether it was done: the agent's side of it, from its own log. */
export function requests(steps: LoggedStep[]): Requests {
  const out: Requests = { sent: [], received: [] };
  for (const step of steps) {
    const d = step.decision;
    if (d && (d.skill === "tell_agent" || d.skill === "ask_agent")) {
      const tell = d.skill === "tell_agent";
      const reply = step.result?.detail?.["reply"];
      out.sent.push({
        step: step.step,
        kind: tell ? "tell" : "ask",
        to: String(d.args["to"] ?? ""),
        what: tell ? `${String(d.args["skill"] ?? "")} ${String(d.args["args"] ?? "")}` : String(d.args["question"] ?? ""),
        status: step.result?.status ?? "-",
        ...(typeof reply === "string" ? { reply } : {}),
      });
    }
    for (const r of step.responses ?? []) {
      const what = r.kind === "tell" ? `${r.skill ?? ""} ${JSON.stringify(r.args ?? {})}` : r.question ?? "";
      out.received.push({ step: step.step, from: r.from, kind: r.kind, what, response: r.response });
    }
  }
  return out;
}

/** Three to six plain sentences on how the run went, built from the numbers below them. */
function verdict(s: RunSummary, b: Behaviour, steps: LoggedStep[], lacking: string[]): string[] {
  const lines: string[] = [];
  const reached = MILESTONES.filter((m) => s.milestones[m]);
  const furthest = reached[reached.length - 1];
  if (s.goalMet === true) lines.push(`Met its goal in ${b.decisions} decisions and ${gameTime(s.ticksToGoal ?? 0)} of game time.`);
  else if (lacking.length) lines.push(`Did not meet its goal. Still outstanding at the end: ${lacking.join("; ")}.`);
  else lines.push(`Did not meet its goal${furthest ? `; it got as far as: ${MILESTONE_LABELS[furthest]!.toLowerCase()}` : ""}.`);
  const last = steps[steps.length - 1];
  if (last?.ended === "model gave up") {
    lines.push(`It gave up after ${b.decisions} decision${b.decisions === 1 ? "" : "s"} and ${gameTime(last.ticks ?? 0)} of game time, saying: "${clip(String(last.decision?.args["reason"] ?? ""), 200)}"`);
  }
  lines.push(`${pct(b.succeeded, b.decisions)} of its decisions worked (${b.succeeded} of ${b.decisions}).`);
  if (b.failuresWithNext > 0) {
    const rate = b.changedCourse / b.failuresWithNext;
    const tone = rate >= 0.7 ? "usually changed course" : rate >= 0.4 ? "changed course about half the time" : "mostly repeated itself";
    lines.push(`After a failure it ${tone} (${b.changedCourse} of ${b.failuresWithNext}).`);
  }
  if (b.repeatedFailures >= 3) {
    lines.push(`${b.repeatedFailures} of its ${b.failed} failures repeated a decision that had already failed the same way.`);
  }
  if (b.longestLoop && b.longestLoop.count >= 3) {
    lines.push(`Its longest loop: \`${b.longestLoop.decision}\` failed ${b.longestLoop.count} times in a row from step ${b.longestLoop.from} with "${clip(b.longestLoop.reason, 90)}".`);
  }
  if (b.repeatNotes.keptOn > 0) {
    lines.push(`It was told ${b.repeatNotes.shown} time${b.repeatNotes.shown > 1 ? "s" : ""} that its last decisions were all the same, and chose the same again ${b.repeatNotes.keptOn === b.repeatNotes.shown ? "every time" : `${b.repeatNotes.keptOn} times`}.`);
  }
  const shares = Object.entries(b.ticksBySkill).filter(([what]) => what !== "thinking").sort((x, y) => y[1] - x[1]);
  const total = Object.values(b.ticksBySkill).reduce((n, t) => n + t, 0);
  if (shares[0] && total > 0) lines.push(`Most of its game time went on \`${shares[0][0]}\` (${pct(shares[0][1], total)}).`);
  const thinking = b.ticksBySkill["thinking"] ?? 0;
  if (thinking > 0 && total > 0) lines.push(`The world ran on for ${pct(thinking, total)} of the run while it was thinking.`);
  if (s.doneRefused > 0) lines.push(`It claimed to be done ${s.doneRefused} time${s.doneRefused > 1 ? "s" : ""} before the goal was met.`);
  if (s.deaths > 0) lines.push(`It died ${s.deaths} time${s.deaths > 1 ? "s" : ""}, losing what it carried each time.`);
  if (hitPair(s) !== "-") {
    const parts = [hitList(s.hitsGiven, "on"), hitList(s.hitsTaken, "from")].filter(Boolean);
    lines.push(`It fought other agents: hits ${parts.join("; ")}.`);
  }
  if (b.invalid > 0) lines.push(`${b.invalid} decision${b.invalid > 1 ? "s" : ""} named a skill that does not exist.`);
  const r = requests(steps);
  const tells = r.received.filter((x) => x.kind === "tell");
  const asks = r.received.filter((x) => x.kind === "ask");
  if (tells.length) lines.push(`Of ${tells.length} request${tells.length > 1 ? "s" : ""} to act, it did ${tells.filter((x) => x.response === "complied").length} as asked.`);
  if (asks.length) lines.push(`Of ${asks.length} question${asks.length > 1 ? "s" : ""} put to it, it answered ${asks.filter((x) => x.response === "answered").length}.`);
  if (r.sent.length) lines.push(`It made ${r.sent.length} request${r.sent.length > 1 ? "s" : ""} of other agents.`);
  return lines;
}

/** The run's verdict sentences on their own, for reports that cover many runs (src/compare.ts). */
export function verdictLines(steps: LoggedStep[], file: string): string[] {
  const s = summarizeRun(steps, file);
  return verdict(s, behaviour(steps), steps, stillLacking(s, steps));
}

export function renderSummary(steps: LoggedStep[], file: string): string {
  const s = summarizeRun(steps, file);
  const b = behaviour(steps);
  const first = steps[0];
  const last = steps[steps.length - 1];
  const ticks = last?.ticks ?? 0;
  const brain = brainLabel(steps);
  const config = first?.config;
  const scripted = s.brain === "scripted";
  const lacking = stillLacking(s, steps);
  const lines: string[] = [];
  const add = (...more: string[]) => lines.push(...more);

  const settings = scripted
    ? ["no model: the scripted baseline"]
    : [`memory ${s.memory ?? "-"}`, `progress list ${s.progress ? "on" : "off"}`, `stance ${s.stance ?? "-"}`, `chat ${s.comms ? "on" : "off"}`];
  add(`# Run report: ${s.agentName}`, "");
  add(`${brain.label} (${brain.detail}) · goal **${s.goalName}** · ${s.scenario} · ${settings.join(" · ")} · ${first?.at.slice(0, 10) ?? ""}`, "");
  add(outcomeLine(s), "", `> ${s.goal}`, "");

  add("## Verdict", "", ...verdict(s, b, steps, lacking).map((l) => `- ${l}`), "");

  add("## Scorecard", "", "| | |", "|---|---|");
  add(`| Decisions | ${b.decisions} |`);
  add(`| Worked / failed / interrupted | ${b.succeeded} / ${b.failed} / ${b.interrupted} |`);
  add(`| Changed course after a failure | ${b.failuresWithNext ? `${b.changedCourse} of ${b.failuresWithNext} (${pct(b.changedCourse, b.failuresWithNext)})` : "-"} |`);
  add(`| Failures repeating an earlier failure | ${b.failed ? `${b.repeatedFailures} of ${b.failed}` : "-"} |`);
  add(`| Longest loop of one failing decision | ${b.longestLoop ? `${b.longestLoop.count}× from step ${b.longestLoop.from}` : "none"} |`);
  add(`| Told it was repeating itself, and kept on | ${b.repeatNotes.shown ? `${b.repeatNotes.keptOn} of ${b.repeatNotes.shown}` : "-"} |`);
  if (!scripted) {
    add(`| False "done" claims | ${s.doneRefused} |`);
    add(`| Unusable answers (re-asked, or no such skill) | ${s.retries} re-asked, ${b.invalid} no such skill |`);
  }
  add(`| Deaths | ${s.deaths} |`);
  add(`| Lowest food (of 20) | ${s.lowestFood} |`);
  add(`| Hits on / from other agents | ${hitPair(s) === "-" ? "-" : `${hitList(s.hitsGiven, "on") || "none"} / ${hitList(s.hitsTaken, "from") || "none"}`} |`);
  add(`| Game time used | ${gameTime(ticks)} of a 20:00 day${first && last ? `, in ${wallTime(new Date(last.at).getTime() - new Date(first.at).getTime())} of real time` : ""} |`);
  if (!scripted) {
    add(`| Thinking time per decision | ${(s.decisionMsMedian / 1000).toFixed(1)} s median, ${(s.decisionMsP90 / 1000).toFixed(1)} s slowest tenth |`);
    const perDecision = b.decisions ? Math.round(s.tokensIn / b.decisions) : 0;
    add(`| Tokens | ${s.tokensIn.toLocaleString("en-US")} in (${perDecision.toLocaleString("en-US")} a decision), ${s.tokensOut.toLocaleString("en-US")} out${s.tokensCached ? `, ${pct(s.tokensCached, s.tokensIn)} of input from cache` : ""} |`);
    add(`| Cost | ${s.costUSD === "unknown" ? "unknown" : `$${s.costUSD.toFixed(4)}`} |`);
  }
  add("");

  add("## Progress", "", "| Milestone | Reached at |", "|---|---|");
  for (const name of MILESTONES) {
    const m = s.milestones[name];
    add(`| ${MILESTONE_LABELS[name]} | ${m ? `step ${m.step}, ${gameTime(m.gameTicks)}` : "not reached"} |`);
  }
  add("");

  const totalTicks = Object.values(b.ticksBySkill).reduce((n, t) => n + t, 0);
  const skills = Object.entries(s.skillCounts).sort((x, y) => (b.ticksBySkill[y[0]] ?? 0) - (b.ticksBySkill[x[0]] ?? 0));
  add("## Where the time went", "", "| Skill | Share of game time | Times | Worked | Failed | Interrupted |", "|---|---|---|---|---|---|");
  for (const [skill, c] of skills) {
    if (skill === "unknown") continue;
    add(`| ${skill} | ${pct(b.ticksBySkill[skill] ?? 0, totalTicks)} | ${c.success + c.failed + c.aborted} | ${c.success} | ${c.failed} | ${c.aborted} |`);
  }
  if (b.ticksBySkill["thinking"]) add(`| *(waiting on the ${scripted ? "policy" : "model"})* | ${pct(b.ticksBySkill["thinking"], totalTicks)} | | | | |`);
  add("");

  const problems = new Map<string, { example: string; count: number; skills: Set<string> }>();
  for (const step of steps) {
    const reason = step.result?.reason;
    if (!reason || step.result?.status === "success" || reason === "the run is ending") continue;
    const key = problemKey(reason);
    const p = problems.get(key) ?? { example: reason, count: 0, skills: new Set<string>() };
    p.count++;
    p.skills.add(step.decision?.skill ?? "done");
    problems.set(key, p);
  }
  const top = [...problems.values()].sort((x, y) => y.count - x.count).slice(0, TOP_PROBLEMS);
  add("## What got in its way", "");
  if (top.length === 0) add("Nothing failed.");
  for (const p of top) add(`- **${p.count}×** (${[...p.skills].join(", ")}): ${clip(p.example, 220)}`);
  add("");

  if (!scripted) {
    const quotes: Array<[string, LoggedStep | undefined]> = [
      ["At the start", steps.find((st) => st.decision)],
      ...(b.longestLoop && b.longestLoop.count >= 3 ? [[`In its longest loop (step ${b.longestLoop.from})`, steps.find((st) => st.step === b.longestLoop!.from)] as [string, LoggedStep | undefined]] : []),
      ["At the end", [...steps].reverse().find((st) => rationale(st))],
    ];
    const seen = new Set<number>();
    const quoted = quotes.flatMap(([when, st]) => {
      const why = st && !seen.has(st.step) ? rationale(st) : null;
      if (!st || !why) return [];
      seen.add(st.step);
      return [`- **${when}**, choosing \`${st.decision?.skill ?? "done"}\`: "${clip(why)}"`];
    });
    if (quoted.length) add("## In its own words", "", ...quoted, "");
  }

  const notable: string[] = [];
  newEventsPerStep(steps).forEach((events, i) => {
    for (const event of events) {
      if (isDeath(event)) notable.push(`- Step ${steps[i]!.step}: ${event}`);
    }
  });
  for (const step of steps) {
    if (step.events?.includes("done refused")) notable.push(`- Step ${step.step}: said "done" too early and was told: ${step.result?.reason ?? ""}`);
    if (step.decision?.say) notable.push(`- Step ${step.step}: said to ${step.decision.say.to}: "${step.decision.say.text}"`);
  }
  if (notable.length) add("## Notable moments", "", ...notable.slice(0, 12), ...(notable.length > 12 ? [`- …and ${notable.length - 12} more`] : []), "");

  const asked = requests(steps);
  if (asked.sent.length || asked.received.length) {
    add("## Requests between agents", "");
    if (asked.sent.length) {
      add("Made:", "");
      for (const x of asked.sent.slice(0, 12)) {
        add(`- Step ${x.step}: ${x.kind} ${x.to}: ${clip(x.what, 120)} (${x.status}${x.reply ? `; answer: "${clip(x.reply, 120)}"` : ""})`);
      }
      add("");
    }
    if (asked.received.length) {
      add("Received:", "");
      for (const x of asked.received.slice(0, 12)) add(`- Step ${x.step}: ${x.from} ${x.kind === "tell" ? "told it to" : "asked"}: ${clip(x.what, 120)} → **${x.response}**`);
      add("");
    }
  }

  const story = phases(steps);
  add("<details><summary>The run, step by step</summary>", "", "Consecutive decisions of the same skill are folded into one line.", "");
  for (const p of story.slice(0, MAX_PHASES)) {
    const range = p.from === p.to ? `Step ${p.from}` : `Steps ${p.from}–${p.to}`;
    const tally = [p.success && `${p.success} ok`, p.failed && `${p.failed} failed`, p.aborted && `${p.aborted} interrupted`].filter(Boolean).join(", ");
    const gained = Object.entries(p.gained).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([item, n]) => `+${n} ${words(item)}`).join(", ");
    add(`- ${range}: **${p.skill}**${p.count > 1 ? ` ×${p.count}` : ""}${tally ? ` (${tally})` : ""}${gained ? `: ${gained}` : ""}`);
  }
  if (story.length > MAX_PHASES) add(`- …${story.length - MAX_PHASES} more stretches, to step ${last?.step}`);
  add("", "</details>", "");

  const inventory = Object.entries(last?.inventoryAfter ?? last?.observation.inventory ?? {}).sort((x, y) => y[1] - x[1]);
  add("<details><summary>Final inventory and run details</summary>", "");
  add(inventory.length ? inventory.map(([item, n]) => `${n} ${words(item)}`).join(", ") : "Empty inventory.", "");
  add(`Started ${first?.at.replace("T", " ").slice(0, 16) ?? "-"} UTC${config?.episode ? ` · episode ${config.episode}` : ""} · log \`${file}\``, "");
  add("Milestones are the same six for every goal; for iron or diamond, see the inventory.", "", "</details>");
  return lines.join("\n");
}

/** Writes the report beside its log; returns the path written. */
export function writeSummary(steps: LoggedStep[], file: string): string {
  const out = file.replace(/\.jsonl$/, ".summary.md");
  writeFileSync(out, renderSummary(steps, file) + "\n");
  return out;
}

function batchFiles(name: string): string[] {
  const list = readFileSync(join("runs", `batch-${name}.txt`), "utf8");
  return list.split("\n").map((l) => l.trim()).filter(Boolean);
}

function newestRun(): string | null {
  const names = readdirSync("runs").filter((n) => n.endsWith(".jsonl")).sort();
  return names.length ? join("runs", names[names.length - 1]!) : null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = minimist(process.argv.slice(2), { string: ["batch"] });
  let files = argv._ as string[];
  if (argv.batch) files = batchFiles(argv.batch);
  if (files.length === 0) {
    const newest = newestRun();
    if (!newest) {
      console.error("No runs found in runs/.");
      process.exit(1);
    }
    files = [newest];
  }
  for (const file of files) {
    const steps = parseSteps(readFileSync(file, "utf8"));
    if (steps.length === 0) {
      console.error(`${file}: no steps logged, skipped`);
      continue;
    }
    console.log(writeSummary(steps, file));
  }
}
