/**
 * The "minds" panel: a small read-only web page for watching agents think. A list of recent
 * runs (live first), and for the selected run its progress, what it holds, and a timeline of
 * every decision — why it was made, what happened, and the exact model call behind it.
 * Source of truth is runs/*.jsonl. node:http only; never reads env vars or .env.
 */
import { createServer } from "node:http";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { LoggedStep, ModelCall } from "./types.js";
import { costUSD } from "./backends/pricing.js";
import { summarizeRun, type MilestoneName } from "./report.js";
import { SCENARIOS, presetName } from "./scenario.js";

/** Runs older than this are not listed. */
export const MAX_AGE_MS = 6 * 60 * 60 * 1000;
/** A run with no end recorded and no new line for this long has stopped (crashed, killed). */
export const STALLED_MS = 10 * 60 * 1000;
export const MILESTONES: MilestoneName[] = ["logs", "wooden_pickaxe", "stone", "stone_pickaxe", "shelter", "survived_night"];

const RUN_FILE = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-(.+)\.jsonl$/;

/** `<runId>-<agentName>.jsonl`; runId is an ISO timestamp with `:` and `.` replaced by `-`. */
export function agentNameFromFile(file: string): string | null {
  return RUN_FILE.exec(file)?.[1] ?? null;
}

/** Contents of <think>…</think> blocks, joined; an unterminated block runs to the end. */
export function extractThink(text: string | undefined): string | null {
  if (!text) return null;
  const parts: string[] = [];
  const re = /<think>([\s\S]*?)(?:<\/think>|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const t = (m[1] ?? "").trim();
    if (t) parts.push(t);
    if (m[0].length === 0) re.lastIndex++;
  }
  return parts.length ? parts.join("\n\n") : null;
}

/** Sum of costUSD over calls. Unknown pricing yields NaN; ollama is 0. */
export function sumCost(calls: ModelCall[]): number {
  let total = 0;
  for (const c of calls) total += costUSD(c);
  return total;
}

export function formatCost(total: number, calls: ModelCall[]): string {
  if (calls.length === 0) return "free";
  if (calls.every((c) => c.backend === "ollama")) return "free";
  if (Number.isNaN(total)) return "—";
  return total < 0.01 ? `$${total.toFixed(4)}` : `$${total.toFixed(2)}`;
}

export function parseSteps(content: string): LoggedStep[] {
  const steps: LoggedStep[] = [];
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    try {
      steps.push(JSON.parse(line) as LoggedStep);
    } catch {
      // A partially written trailing line is expected while an agent is running.
    }
  }
  return steps;
}

/** A readable name for the brain: "Qwen3 4B instruct · local" rather than "ollama:qwen3-4b-instruct:ctx8192". */
export function brainLabel(steps: LoggedStep[]): { label: string; detail: string } {
  const call = steps.flatMap((s) => s.calls ?? []).at(-1);
  if (!call) return { label: "Scripted baseline", detail: "no model" };
  if (call.backend === "ollama") {
    const base = call.model.replace(/:ctx\d+$/, "").replace(/[-:]/g, " ");
    const pretty = base.replace(/^qwen3/i, "Qwen3").replace(/\b(\d+)b\b/i, "$1B");
    const ctx = /:ctx(\d+)$/.exec(call.model)?.[1];
    return { label: pretty, detail: `local${ctx ? ` · ${Number(ctx) / 1024}k context` : ""}` };
  }
  return { label: call.model, detail: call.backend };
}

export type RunStatus = "running" | "ended" | "stopped";

export function runStatus(steps: LoggedStep[], mtimeMs: number, now: number): RunStatus {
  if (steps.at(-1)?.ended) return "ended";
  return now - mtimeMs > STALLED_MS ? "stopped" : "running";
}

export interface RunRow {
  file: string;
  agent: string;
  status: RunStatus;
  ended: string | null;
  brain: string;
  brainDetail: string;
  memory: string | null;
  comms: boolean | null;
  stance: string | null;
  episode: string | null;
  /** "b4" for a run from scripts/batch.sh b4 (episode "batch-b4-7"); null otherwise. */
  batch: string | null;
  goal: string;
  scenario: string;
  step: number;
  doing: string | null;
  milestones: Record<string, number | null>;
  goalMet: boolean | "n/a";
  ticks: number;
  tokens: number;
  cost: string;
  medianMs: number;
  startedAt: string;
  lastAt: number;
}

export function runRow(file: string, steps: LoggedStep[], mtimeMs: number, now: number): RunRow | null {
  const first = steps[0];
  const last = steps.at(-1);
  if (!first || !last) return null;
  const summary = summarizeRun(steps, file);
  const calls = steps.flatMap((s) => s.calls ?? []);
  const brain = brainLabel(steps);
  const status = runStatus(steps, mtimeMs, now);
  const milestones: Record<string, number | null> = {};
  for (const name of MILESTONES) milestones[name] = summary.milestones[name]?.step ?? null;
  const lastAt = Date.parse(last.at);
  return {
    file,
    agent: agentNameFromFile(file) ?? file,
    status,
    ended: last.ended ?? (status === "stopped" ? "stopped without an end reason" : null),
    brain: brain.label,
    brainDetail: brain.detail,
    memory: calls.length > 0 ? (last.config?.memory ?? null) : null, // the scripted baseline has no memory setting
    comms: last.config?.comms ?? null,
    stance: calls.length > 0 ? (last.config?.stance ?? null) : null,
    episode: last.config?.episode ?? null,
    batch: /^batch-(.+)-\d+$/.exec(last.config?.episode ?? "")?.[1] ?? null,
    goal: first.observation.goal,
    scenario: first.observation.scenario,
    step: last.step,
    doing: status === "running" && last.decision ? last.decision.skill : null,
    milestones,
    goalMet: summary.goalMet,
    ticks: last.ticks ?? 0,
    tokens: summary.tokensIn + summary.tokensOut,
    cost: formatCost(sumCost(calls), calls),
    medianMs: summary.decisionMsMedian,
    startedAt: first.at,
    lastAt: Number.isNaN(lastAt) ? mtimeMs : Math.max(lastAt, mtimeMs),
  };
}

/** What changed in the inventory over one step: {"cobblestone": 3, "stick": -2}. */
export function inventoryDelta(before: Record<string, number>, after: Record<string, number> | undefined): Record<string, number> {
  if (!after) return {};
  const delta: Record<string, number> = {};
  for (const name of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const change = (after[name] ?? 0) - (before[name] ?? 0);
    if (change !== 0) delta[name] = change;
  }
  return delta;
}

export interface TimelineItem {
  step: number;
  at: string;
  ticks: number | null;
  skill: string | null;
  args: Record<string, unknown>;
  rationale: string | null;
  plan: string | null;
  say: { to: string; text: string } | null;
  status: string | null;
  reason: string | null;
  events: string[];
  heard: Array<{ from: string; to: string; text: string }>;
  delta: Record<string, number>;
  decisionMs: number;
  tokensIn: number;
  tokensOut: number;
  attempts: number;
  health: number;
  food: number;
  isDay: boolean;
  hostiles: number;
  ended: string | null;
}

export function timeline(steps: LoggedStep[]): TimelineItem[] {
  return steps.map((s, i) => {
    const calls = s.calls ?? [];
    const prior = steps[i - 1]?.observation.messages ?? [];
    const seen = new Set(prior.map((m) => `${m.from}|${m.to}|${m.text}`));
    return {
      step: s.step,
      at: s.at,
      ticks: s.ticks ?? null,
      skill: s.decision?.skill ?? null,
      args: s.decision?.args ?? {},
      rationale: s.decision?.rationale ?? null,
      plan: s.decision?.plan ?? null,
      say: s.decision?.say ?? null,
      status: s.result?.status ?? null,
      reason: s.result?.reason ?? null,
      events: s.events ?? [],
      // Messages new since the previous observation: what reached this agent on this step.
      heard: (s.observation.messages ?? [])
        .filter((m) => !seen.has(`${m.from}|${m.to}|${m.text}`))
        .map(({ from, to, text }) => ({ from, to, text })),
      delta: inventoryDelta(s.observation.inventory, s.inventoryAfter),
      decisionMs: s.decisionMs,
      tokensIn: calls.reduce((n, c) => n + c.inputTokens, 0),
      tokensOut: calls.reduce((n, c) => n + c.outputTokens, 0),
      attempts: calls.length,
      health: s.observation.health,
      food: s.observation.food,
      isDay: s.observation.isDay,
      hostiles: s.observation.hostiles.length,
      ended: s.ended ?? null,
    };
  });
}

export interface RunSetup {
  scenario: string;
  /** Server commands that set up the world; null in logs from before they were recorded. */
  world: string[] | null;
  goal: string;
  /** "outpost" for a preset goal, "scenario default" with no --goal, null for a goal written in quotes. */
  preset: string | null;
  brain: string;
  memory: string | null;
  comms: boolean | null;
  progress: boolean | null;
  stance: string | null;
  episode: string | null;
  ticks: number | null;
  budgetUSD: number | null;
  maxSteps: number | null;
  spawn: { x: number; y: number; z: number };
  startedAt: string;
  /** The system prompt as first sent to the model; null for the scripted baseline. */
  system: string | null;
}

/** How a run was set up — the world, its limits, and the full prompt — for the panel's setup dialog. */
export function runSetup(steps: LoggedStep[]): RunSetup | null {
  const first = steps[0];
  if (!first) return null;
  const config = first.config;
  const model = steps.some((s) => (s.calls ?? []).length > 0);
  const brain = brainLabel(steps);
  return {
    scenario: first.observation.scenario,
    world: config?.world ?? null,
    goal: first.observation.goal,
    preset: presetName(first.observation.goal) ?? (first.observation.goal === SCENARIOS[first.observation.scenario]?.goal ? "scenario default" : null),
    brain: model ? `${brain.label} (${brain.detail})` : brain.label,
    memory: model ? (config?.memory ?? null) : null,
    comms: config?.comms ?? null,
    progress: model ? (config?.progress ?? null) : null,
    stance: model ? (config?.stance ?? null) : null,
    episode: config?.episode ?? null,
    ticks: config?.ticks ?? null,
    budgetUSD: model ? (config?.budgetUSD ?? null) : null,
    maxSteps: config?.maxSteps ?? null,
    spawn: first.observation.position,
    startedAt: first.at,
    system: steps.find((s) => s.system)?.system ?? null,
  };
}

/** The latest observation, trimmed to what the panel shows as "now". */
function current(steps: LoggedStep[]) {
  const last = steps.at(-1)!;
  const o = last.observation;
  return {
    inventory: last.inventoryAfter ?? o.inventory,
    canCraft: o.canCraft ?? [],
    plan: [...steps].reverse().find((s) => s.decision?.plan)?.decision?.plan ?? null,
    health: o.health,
    food: o.food,
    isDay: o.isDay,
    hostiles: o.hostiles,
    otherAgents: o.otherAgents,
    position: o.position,
  };
}

/** Parsed files, re-read only when they change: a batch leaves dozens of logs, polled every 2s. */
const cache = new Map<string, { mtimeMs: number; size: number; steps: LoggedStep[] }>();

function load(dir: string, file: string): { steps: LoggedStep[]; mtimeMs: number } | null {
  try {
    const stat = statSync(join(dir, file));
    const hit = cache.get(file);
    if (hit && hit.mtimeMs === stat.mtimeMs && hit.size === stat.size) return { steps: hit.steps, mtimeMs: stat.mtimeMs };
    const steps = parseSteps(readFileSync(join(dir, file), "utf8"));
    cache.set(file, { mtimeMs: stat.mtimeMs, size: stat.size, steps });
    return { steps, mtimeMs: stat.mtimeMs };
  } catch {
    return null;
  }
}

/** Only names straight from the directory listing are ever opened, so a query can't escape runs/. */
function runFiles(dir: string, now: number): string[] {
  let names: string[];
  try {
    names = readdirSync(dir).filter((n) => RUN_FILE.test(n));
  } catch {
    return [];
  }
  return names.filter((n) => {
    try {
      return now - statSync(join(dir, n)).mtimeMs <= MAX_AGE_MS;
    } catch {
      return false;
    }
  });
}

export function listRuns(dir: string, now: number = Date.now()): RunRow[] {
  const rows: RunRow[] = [];
  for (const file of runFiles(dir, now)) {
    const loaded = load(dir, file);
    const row = loaded && runRow(file, loaded.steps, loaded.mtimeMs, now);
    if (row) rows.push(row);
  }
  const rank = { running: 0, stopped: 1, ended: 1 } as const;
  return rows.sort((a, b) => rank[a.status] - rank[b.status] || b.lastAt - a.lastAt);
}

function findRun(dir: string, file: string | null) {
  if (!file || !runFiles(dir, Date.now()).includes(file)) return null;
  return load(dir, file);
}

export function startServer(port: number, dir = "runs") {
  const page = readFileSync(new URL("./minds.html", import.meta.url), "utf8");
  const json = (res: import("node:http").ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify(body));
  };
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const file = url.searchParams.get("file");
    if (req.method !== "GET") {
      res.writeHead(405).end();
    } else if (url.pathname === "/api/runs") {
      json(res, 200, { now: Date.now(), runs: listRuns(dir) });
    } else if (url.pathname === "/api/run") {
      const run = findRun(dir, file);
      const row = run && runRow(file!, run.steps, run.mtimeMs, Date.now());
      if (!run || !row) return json(res, 404, { error: "no such run" });
      json(res, 200, { run: row, now: current(run.steps), timeline: timeline(run.steps) });
    } else if (url.pathname === "/api/setup") {
      const setup = runSetup(findRun(dir, file)?.steps ?? []);
      if (!setup) return json(res, 404, { error: "no such run" });
      json(res, 200, setup);
    } else if (url.pathname === "/api/call") {
      const run = findRun(dir, file);
      const step = run?.steps.find((s) => s.step === Number(url.searchParams.get("step")));
      if (!step) return json(res, 404, { error: "no such step" });
      json(res, 200, {
        system: step.system ?? null,
        observation: step.observation,
        calls: (step.calls ?? []).map((c) => ({
          model: c.model,
          ms: c.ms,
          inputTokens: c.inputTokens,
          outputTokens: c.outputTokens,
          stopReason: c.stopReason ?? null,
          request: c.request ?? null,
          thinking: c.thinking ?? extractThink(c.text),
          text: c.text.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, "").trim(),
        })),
      });
    } else if (url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(page);
    } else {
      res.writeHead(404).end("not found");
    }
  });
  server.listen(port, () => console.log(`minds panel: http://localhost:${port}`));
  return server;
}

function parsePort(argv: string[]): number {
  const i = argv.indexOf("--port");
  const raw = i >= 0 ? argv[i + 1] : argv.find((a) => a.startsWith("--port="))?.slice(7);
  const n = Number(raw);
  return raw && Number.isInteger(n) && n > 0 && n < 65536 ? n : 3010;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(parsePort(process.argv.slice(2)));
}
