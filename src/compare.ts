/**
 * One readable Markdown report comparing runs: by goal, by model, and for team runs, who did what.
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
  shelters: number[];
  gave: Array<{ item: string; count: number; to: string; at: string }>;
  failedGives: number;
  pickedUp: Record<string, number>;
  said: { all: number; directed: number };
  toolsAtEnd: string[];
}

export function deeds(steps: LoggedStep[]): Deeds {
  const out: Deeds = { crafted: {}, shelters: [], gave: [], failedGives: 0, pickedUp: {}, said: { all: 0, directed: 0 }, toolsAtEnd: [] };
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
    if (d.skill === "build_shelter" && step.result.status === "success") out.shelters.push(Number(step.result.detail?.["storeys"] ?? 1));
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
    const tall = d.shelters.filter((n) => n >= 2).length;
    const low = d.shelters.length - tall;
    if (tall) parts.push(`built ${tall === 1 ? "a two-storey shelter" : `${tall} two-storey shelters`}`);
    if (low) parts.push(`built ${low === 1 ? "a one-storey shelter" : `${low} one-storey shelters`}`);
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
        if (d.skill === "build_shelter") moments.push({ at, text: `${who} built a ${Number(step.result.detail?.["storeys"] ?? 1) >= 2 ? "two-storey " : ""}shelter` });
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
      for (const [episode, members] of teams) {
        const met = members.every((run) => run.s.goalMet === true);
        const cost = members.reduce((a, run) => a + (run.s.costUSD === "unknown" ? 0 : run.s.costUSD), 0);
        const teamTokens = inOut(members.reduce((a, run) => a + run.s.tokensIn, 0), members.reduce((a, run) => a + run.s.tokensOut, 0));
        const longest = Math.max(...members.map((run) => run.s.ticksToGoal ?? run.steps.at(-1)?.ticks ?? 0));
        const teamLabel = episode.replace(/^team-/, "").replace(/-(\d+)$/, ", rep $1");
        add(`### Team ${teamLabel}: ${met ? `goal met in ${gameTime(longest)} of game time` : "goal not met"} · ${teamTokens} tokens in / out · ${money(cost)}`, "");
        add(...glance(members), "", ...teamSection(members), "");
      }
    }
    const solo = group.filter((run) => !teams.some(([, members]) => members.includes(run)));
    if (solo.length) add(...(teams.length ? ["### Agents alone", ""] : []), ...glance(solo), ...byModel(solo), "");
  }

  add("## In a sentence or two each", "");
  for (const run of runs) {
    const verdict = verdictLines(run.steps, run.file).slice(0, 3).join(" ");
    add(`- **${run.s.agentName}** (${run.model}): ${verdict}`);
  }
  add("", "<details><summary>How to read this</summary>", "");
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
