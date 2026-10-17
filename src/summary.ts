/**
 * A one-page Markdown summary of a run: how it ended, what it achieved, what it spent, what it
 * did, and what went wrong. Built from the run's log alone, so any past run can be summarised
 * without replaying it.
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
import { newEventsPerStep, summarizeRun, type RunSummary } from "./report.js";
import { brainLabel, MILESTONES, parseSteps } from "./minds.js";

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
    "step limit": "it hit the safety cap on decisions",
    "cost budget": "it reached its spending cap",
    "brain failed": "the model failed to answer three times in a row",
    "brain unavailable": "the model provider refused (key or credits): not the model's fault",
  };
  return `**Goal not met:** ${why[s.howEnded] ?? `the run stopped (${s.howEnded})`}.`;
}

export function renderSummary(steps: LoggedStep[], file: string): string {
  const s = summarizeRun(steps, file);
  const first = steps[0];
  const last = steps[steps.length - 1];
  const ticks = last?.ticks ?? 0;
  const brain = brainLabel(steps);
  const config = first?.config;
  const scripted = s.brain === "scripted";
  const lines: string[] = [];
  const add = (...more: string[]) => lines.push(...more);

  add(`# Run summary: ${s.agentName}`, "", outcomeLine(s), "", `> ${s.goal}`, "");

  add("## Setup", "", "| | |", "|---|---|");
  add(`| Brain | ${brain.label} (${brain.detail}) |`);
  add(`| Goal | ${s.goalName} |`, `| World | ${s.scenario} |`);
  if (!scripted) {
    add(`| Memory | ${s.memory ?? "-"} |`, `| Progress list | ${s.progress ? "on" : "off"} |`);
    add(`| Stance | ${s.stance ?? "-"} |`, `| Chat | ${s.comms ? "on" : "off"} |`);
  }
  add(`| Started | ${first?.at.replace("T", " ").slice(0, 16) ?? "-"} UTC |`);
  if (config?.episode) add(`| Episode | ${config.episode} |`);
  add(`| Log | \`${file}\` |`, "");

  add("## At a glance", "", "| | |", "|---|---|");
  add(`| Ended | ${s.howEnded} |`);
  add(`| Game time used | ${gameTime(ticks)} (a full day is 20:00) |`);
  if (first && last) add(`| Real time | ${wallTime(new Date(last.at).getTime() - new Date(first.at).getTime())} |`);
  add(`| Decisions | ${s.decisions} |`, `| Deaths | ${s.deaths} |`);
  const ys = steps.map((step) => step.observation.position.y);
  if (ys.length) add(`| Height range | y=${Math.min(...ys)} to y=${Math.max(...ys)} (sea level is 63) |`);
  if (!scripted) {
    add(`| Typical think time | ${(s.decisionMsMedian / 1000).toFixed(1)} s per decision |`);
    add(`| Tokens | ${s.tokensIn.toLocaleString("en-US")} in, ${s.tokensOut.toLocaleString("en-US")} out |`);
    add(`| Cost | ${s.costUSD === "unknown" ? "unknown" : `$${s.costUSD.toFixed(4)}`} |`);
    add(`| False "done" claims | ${s.doneRefused} |`, `| Answers re-asked | ${s.retries} |`);
  }
  add("");

  add("## Milestones", "", "| Milestone | Reached | Step | Game time |", "|---|---|---|---|");
  for (const name of MILESTONES) {
    const m = s.milestones[name];
    add(`| ${MILESTONE_LABELS[name]} | ${m ? "yes" : "no"} | ${m ? m.step : "-"} | ${m ? gameTime(m.gameTicks) : "-"} |`);
  }
  add("", "These are the same six for every goal; for iron or diamond, see the final inventory.", "");

  const skills = Object.entries(s.skillCounts).sort((a, b) => {
    const n = (c: typeof a[1]) => c.success + c.failed + c.aborted;
    return n(b[1]) - n(a[1]);
  });
  add("## What it did", "", "| Skill | Times | Succeeded | Failed | Stopped early |", "|---|---|---|---|---|");
  for (const [skill, c] of skills) add(`| ${skill} | ${c.success + c.failed + c.aborted} | ${c.success} | ${c.failed} | ${c.aborted} |`);
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
  const top = [...problems.values()].sort((a, b) => b.count - a.count).slice(0, TOP_PROBLEMS);
  add("## What went wrong", "");
  if (top.length === 0) add("Nothing failed.");
  for (const p of top) add(`- **${p.count}×** (${[...p.skills].join(", ")}): ${p.example.length > 220 ? p.example.slice(0, 220) + "…" : p.example}`);
  add("");

  const notable: string[] = [];
  newEventsPerStep(steps).forEach((events, i) => {
    for (const event of events) {
      if (/died|respawned/.test(event)) notable.push(`- Step ${steps[i]!.step}: ${event}`);
    }
  });
  for (const step of steps) {
    if (step.events?.includes("done refused")) notable.push(`- Step ${step.step}: said "done" too early and was told: ${step.result?.reason ?? ""}`);
    if (step.decision?.say) notable.push(`- Step ${step.step}: said to ${step.decision.say.to}: "${step.decision.say.text}"`);
  }
  if (notable.length) add("## Notable moments", "", ...notable.slice(0, 20), ...(notable.length > 20 ? [`- …and ${notable.length - 20} more`] : []), "");

  const story = phases(steps);
  add("## The run, step by step", "", "Consecutive decisions of the same skill are folded into one line.", "");
  for (const p of story.slice(0, MAX_PHASES)) {
    const range = p.from === p.to ? `Step ${p.from}` : `Steps ${p.from}–${p.to}`;
    const tally = [p.success && `${p.success} ok`, p.failed && `${p.failed} failed`, p.aborted && `${p.aborted} stopped early`].filter(Boolean).join(", ");
    const gained = Object.entries(p.gained).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([item, n]) => `+${n} ${words(item)}`).join(", ");
    add(`- ${range}: **${p.skill}**${p.count > 1 ? ` ×${p.count}` : ""}${tally ? ` (${tally})` : ""}${gained ? `: ${gained}` : ""}`);
  }
  if (story.length > MAX_PHASES) add(`- …${story.length - MAX_PHASES} more stretches, to step ${last?.step}`);
  add("");

  const inventory = Object.entries(last?.inventoryAfter ?? last?.observation.inventory ?? {}).sort((a, b) => b[1] - a[1]);
  add("## Final inventory", "", inventory.length ? inventory.map(([item, n]) => `${n} ${words(item)}`).join(", ") : "Empty.", "");
  return lines.join("\n");
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
    const out = file.replace(/\.jsonl$/, ".summary.md");
    writeFileSync(out, renderSummary(steps, file) + "\n");
    console.log(out);
  }
}
