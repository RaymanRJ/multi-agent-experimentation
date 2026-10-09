/**
 * The "minds" panel: a tiny read-only web page that shows, per agent, how it is
 * thinking, how long it takes, and what it costs. Source of truth is runs/*.jsonl.
 * node:http only; never reads env vars or .env.
 */
import { createServer } from "node:http";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { LoggedStep, ModelCall } from "./types.js";
import { costUSD } from "./backends/pricing.js";

export const MAX_AGE_MS = 30 * 60 * 1000;

export interface RunFile {
  name: string;
  mtimeMs: number;
}

export interface Mind {
  name: string;
  backend: string;
  model: string;
  step: number;
  decision: { skill: string; args: Record<string, unknown>; rationale?: string } | null;
  result: { status: string; reason?: string } | null;
  decisionMs: number;
  tokensIn: number;
  tokensOut: number;
  /** Display string: "$0.0123", "free", or "—". */
  cost: string;
  costUSD: number | null;
  secondsSinceLast: number;
  reasoning: string | null;
}

/** `<runId>-<agentName>.jsonl`; runId is an ISO timestamp with `:` and `.` replaced by `-`. */
export function agentNameFromFile(file: string): string | null {
  const m = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-(.+)\.jsonl$/.exec(file);
  if (m?.[1]) return m[1];
  const m2 = /^.+?Z-(.+)\.jsonl$/.exec(file);
  return m2?.[1] ?? null;
}

/** Most recently modified file per agent, ignoring files older than maxAgeMs. */
export function pickLatestFiles(
  files: RunFile[],
  now: number,
  maxAgeMs: number = MAX_AGE_MS,
): Map<string, RunFile> {
  const best = new Map<string, RunFile>();
  for (const f of files) {
    const agent = agentNameFromFile(f.name);
    if (!agent || now - f.mtimeMs > maxAgeMs) continue;
    const cur = best.get(agent);
    if (!cur || f.mtimeMs > cur.mtimeMs) best.set(agent, f);
  }
  return best;
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

export function buildMind(name: string, steps: LoggedStep[], mtimeMs: number, now: number): Mind | null {
  const last = steps[steps.length - 1];
  if (!last) return null;
  const allCalls = steps.flatMap((s) => s.calls ?? []);
  // Identity comes from any call in the run: a step that timed out or failed
  // has no calls, and must not make a model-driven agent look scripted.
  const anyCall = allCalls[allCalls.length - 1];
  // Reasoning comes from the step's final attempt — the one that decided.
  const latestCall = last.calls?.[last.calls.length - 1];
  const total = sumCost(allCalls);
  const lastAt = Date.parse(last.at);
  // Last log line time; the file's mtime is the fallback and a floor.
  const lastMs = Number.isNaN(lastAt) ? mtimeMs : Math.max(lastAt, mtimeMs);
  return {
    name,
    backend: anyCall?.backend ?? "scripted",
    model: anyCall?.model ?? "scripted",
    step: last.step,
    decision: last.decision
      ? { skill: last.decision.skill, args: last.decision.args ?? {}, rationale: last.decision.rationale }
      : null,
    result: last.result ? { status: last.result.status, reason: last.result.reason } : null,
    decisionMs: last.decisionMs,
    tokensIn: allCalls.reduce((a, c) => a + c.inputTokens, 0),
    tokensOut: allCalls.reduce((a, c) => a + c.outputTokens, 0),
    cost: formatCost(total, allCalls),
    costUSD: Number.isNaN(total) ? null : total,
    secondsSinceLast: Math.max(0, Math.round((now - lastMs) / 1000)),
    reasoning: extractThink(latestCall?.text),
  };
}

export function collectMinds(dir: string, now: number = Date.now()): Mind[] {
  let names: string[];
  try {
    names = readdirSync(dir).filter((n) => n.endsWith(".jsonl"));
  } catch {
    return [];
  }
  const files: RunFile[] = [];
  for (const n of names) {
    try {
      files.push({ name: n, mtimeMs: statSync(join(dir, n)).mtimeMs });
    } catch {
      /* file vanished */
    }
  }
  const minds: Mind[] = [];
  for (const [agent, f] of pickLatestFiles(files, now)) {
    try {
      const m = buildMind(agent, parseSteps(readFileSync(join(dir, f.name), "utf8")), f.mtimeMs, now);
      if (m) minds.push(m);
    } catch {
      /* unreadable; skip */
    }
  }
  return minds.sort((a, b) => a.name.localeCompare(b.name));
}

const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Agent minds</title>
<style>
:root{--bg:#f5f6f8;--card:#fff;--fg:#111;--mute:#4a5160;--line:#c9ced8;--ok:#0a7a2f;--bad:#c4161c;--accent:#1a4fd6;--code:#eef0f4}
@media (prefers-color-scheme:dark){:root{--bg:#0d0f14;--card:#171a22;--fg:#f4f5f7;--mute:#a9b0bf;--line:#363c4a;--ok:#4be07a;--bad:#ff6b6f;--accent:#7fa6ff;--code:#0d0f14}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:20px/1.4 system-ui,-apple-system,sans-serif}
header{padding:14px 24px;font-size:22px;color:var(--mute)}
#grid{display:flex;gap:16px;padding:0 16px 16px;align-items:flex-start}
.card{flex:1 1 0;min-width:0;background:var(--card);border:2px solid var(--line);border-radius:16px;padding:20px}
.name{font-size:44px;font-weight:800;line-height:1.1;overflow-wrap:anywhere}
.brain{font-size:24px;color:var(--accent);font-weight:700;margin-bottom:14px;overflow-wrap:anywhere}
.label{font-size:15px;text-transform:uppercase;letter-spacing:.08em;color:var(--mute);margin-top:16px}
.goal{font-size:32px;font-weight:700;overflow-wrap:anywhere}
.quote{font-size:24px;font-style:italic;border-left:6px solid var(--accent);padding-left:14px;overflow-wrap:anywhere}
.outcome{font-size:26px;font-weight:700;overflow-wrap:anywhere}
.ok{color:var(--ok)}.bad{color:var(--bad)}
.stat{font-size:28px;font-weight:700}
.row{display:flex;gap:8px 24px;flex-wrap:wrap}
details{margin-top:18px}
summary{cursor:pointer;font-size:20px;color:var(--mute)}
pre{font:15px/1.4 ui-monospace,Menlo,monospace;background:var(--code);border:1px solid var(--line);border-radius:8px;padding:10px;max-height:320px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}
#empty{padding:80px 24px;text-align:center;font-size:34px;color:var(--mute)}
@media (max-width:900px){#grid{flex-direction:column}.card{width:100%}}
</style></head><body>
<header>Agent minds</header>
<div id="grid"></div>
<div id="empty" hidden>No agents running — start one with npm run agent</div>
<script>
"use strict";
var grid=document.getElementById("grid"),empty=document.getElementById("empty");
var cards={},openState={},data=[],fetchedAt=Date.now();
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
function goalText(d){
  if(!d)return "finished";
  var skill=String(d.skill).replace(/_/g," ");
  var parts=[];for(var k in d.args){parts.push(k+" "+String(d.args[k]))}
  return parts.length?skill+" ("+parts.join(", ")+")":skill;
}
function fmtSecs(s){s=Math.round(s);if(s<60)return s+"s";return Math.floor(s/60)+"m "+(s%60)+"s"}
function fmtNum(n){return Number(n).toLocaleString()}
function build(m){
  var c=el("div","card"),r={};
  r.name=el("div","name");r.brain=el("div","brain");
  r.goal=el("div","goal");r.quote=el("div","quote");r.out=el("div","outcome");
  var row=el("div","row");r.think=el("div","stat");r.tok=el("div","stat");r.cost=el("div","stat");
  row.append(r.think,r.tok,r.cost);
  r.since=el("div","label");
  r.det=el("details");var s=el("summary","","full reasoning");r.pre=el("pre");r.det.append(s,r.pre);
  r.det.addEventListener("toggle",function(){openState[m.name]=r.det.open});
  c.append(r.name,r.brain,el("div","label","Current goal"),r.goal,el("div","label","Why"),r.quote,el("div","label","Last outcome"),r.out,el("div","label","Time and cost"),row,r.since,r.det);
  c._r=r;return c;
}
function fill(c,m){
  var r=c._r;
  r.name.textContent=m.name;
  r.brain.textContent=m.backend==="scripted"?"scripted (no AI model)":m.backend+" \\u00B7 "+m.model;
  r.goal.textContent=goalText(m.decision);
  r.quote.textContent=(m.decision&&m.decision.rationale)?"\\u201C"+m.decision.rationale+"\\u201D":"(no explanation given)";
  var res=m.result;
  if(res){
    r.out.className="outcome "+(res.status==="success"?"ok":"bad");
    r.out.textContent="\\u25CF "+(res.status==="success"?"worked":res.status)+(res.reason?": "+res.reason:"");
  }else{r.out.className="outcome";r.out.textContent="\\u25CB waiting for result"}
  r.think.textContent=m.backend==="scripted"?"instant (no model)":"thought for "+fmtSecs(m.decisionMs/1000);
  r.tok.textContent=fmtNum(m.tokensIn)+" in / "+fmtNum(m.tokensOut)+" out";
  r.cost.textContent="cost: "+m.cost;
  r.since._base=m.secondsSinceLast;
  if(r.det.open!==!!openState[m.name])r.det.open=!!openState[m.name];
  var txt=m.reasoning||"this model does not show its reasoning";
  if(r.pre.textContent!==txt)r.pre.textContent=txt;
}
function tick(){
  var extra=(Date.now()-fetchedAt)/1000;
  for(var n in cards){var r=cards[n]._r;if(r.since._base!==undefined)r.since.textContent="since last decision: "+fmtSecs(r.since._base+extra)}
}
function render(){
  empty.hidden=data.length>0;
  var seen={};
  data.forEach(function(m){
    seen[m.name]=1;
    if(!cards[m.name]){cards[m.name]=build(m);grid.appendChild(cards[m.name])}
    fill(cards[m.name],m);
  });
  for(var n in cards){if(!seen[n]){cards[n].remove();delete cards[n]}}
  tick();
}
function poll(){
  fetch("/api/minds").then(function(r){return r.json()}).then(function(j){data=j.minds||[];fetchedAt=Date.now();render()}).catch(function(){});
}
poll();setInterval(poll,2000);setInterval(tick,1000);
</script></body></html>`;

export function startServer(port: number, dir = "runs") {
  const server = createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0];
    if (req.method !== "GET") {
      res.writeHead(405).end();
    } else if (path === "/api/minds") {
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify({ minds: collectMinds(dir) }));
    } else if (path === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(PAGE);
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
