// Reads run logs for triage-batch. No project imports, so it runs anywhere: node runs.mjs <command> ...
//
//   node .claude/skills/triage-batch/runs.mjs table <batch>          one line per run: craft timeouts, shelter, night (deaths: the run reports)
//   node .claude/skills/triage-batch/runs.mjs steps <log> [from] [to] each decision: time, place, health, hostiles, result
//   node .claude/skills/triage-batch/runs.mjs skills <batch>         how often each skill was chosen, per run
//
// <batch> reads runs/batch-<batch>.txt; <log> is a runs/*.jsonl path.
import { readFileSync } from "node:fs";

const [command, arg, from = "0", to = "9999"] = process.argv.slice(2);
const load = (file) => readFileSync(file, "utf8").trim().split("\n").map((line) => JSON.parse(line));
const listOf = (batch) => readFileSync(`runs/batch-${batch}.txt`, "utf8").trim().split("\n");
const nameOf = (file) => file.replace(/^.*Z-/, "").replace(/\.jsonl$/, "");
const NIGHT = (t) => t >= 13000 && t < 23000;

function table(batch) {
  for (const file of listOf(batch)) {
    const steps = load(file);
    let shelter = null, firstHurt = null, leftAtNight = null, craftTimeouts = 0;
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i], o = s.observation ?? {}, r = s.result ?? {}, next = steps[i + 1]?.observation;
      if (s.decision?.skill === "craft" && /timed out|did not open/.test(r.reason ?? "")) craftTimeouts++;
      if (s.decision?.skill === "build_shelter" && r.status === "success" && !shelter) shelter = { ...r.detail.position, step: s.step };
      if (!shelter || !next) continue;
      const away = (p) => Math.hypot(p.x - shelter.x, p.z - shelter.z);
      if (!firstHurt && next.health < o.health) firstHurt = `step ${s.step} t${o.timeOfDay} ${s.decision?.skill} ${away(o.position).toFixed(1)} from shelter, hp ${o.health}->${next.health}`;
      if (!leftAtNight && NIGHT(o.timeOfDay) && away(next.position) > 3) leftAtNight = `step ${s.step} ${s.decision?.skill}`;
    }
    console.log(`${nameOf(file).padEnd(16)} steps ${String(steps.length).padStart(3)}  craftTimeouts ${craftTimeouts}  shelter ${shelter ? `step ${shelter.step}` : "none"}  | firstHurt after shelter: ${firstHurt ?? "-"}  | left at night: ${leftAtNight ?? "-"}`);
  }
}

function steps(file) {
  for (const s of load(file)) {
    if (s.step < +from || s.step > +to) continue;
    const o = s.observation ?? {};
    const hostiles = (o.hostiles ?? []).map((h) => `${h.name}@${h.distance}`).join(",");
    console.log(`${s.step} t${o.timeOfDay} ${JSON.stringify(o.position)} hp${o.health} food${o.food}${o.underground ? ` ug${o.underground}` : ""} [${hostiles}] | ${s.decision?.skill ?? "-"} ${JSON.stringify(s.decision?.args ?? {}).slice(0, 50)} -> ${s.result?.status} ${(s.result?.reason ?? "").slice(0, 100)}`);
  }
}

function skills(batch) {
  for (const file of listOf(batch)) {
    const counts = {};
    for (const s of load(file)) if (s.decision?.skill) counts[s.decision.skill] = (counts[s.decision.skill] ?? 0) + 1;
    console.log(nameOf(file).padEnd(16), Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}:${n}`).join(" "));
  }
}

const commands = { table, steps, skills };
if (commands[command] && arg) commands[command](arg);
else console.error("usage: runs.mjs table <batch> | steps <log> [from] [to] | skills <batch>");
