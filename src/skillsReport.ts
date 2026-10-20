/**
 * The skill-usage table for any set of runs, written as Markdown (see src/skillUsage.ts).
 *
 *   npm run skills -- --batch p6
 *   npm run skills -- --batch p5 --batch p6 --team thome1 --out docs/results/skills.md
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import minimist from "minimist";
import { loadRun } from "./compare.js";
import { renderSkillUsage, skillUsage } from "./skillUsage.js";

function listFile(path: string): string[] {
  return readFileSync(path, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = minimist(process.argv.slice(2), { string: ["team", "batch", "out", "title"] });
  const many = (v: unknown) => (v === undefined ? [] : Array.isArray(v) ? v.map(String) : [String(v)]);
  const batches = many(argv.batch), teams = many(argv.team);
  const files = [
    ...(argv._ as string[]),
    ...batches.flatMap((name) => listFile(join("runs", `batch-${name}.txt`))),
    ...teams.flatMap((name) => listFile(join("runs", `team-${name}.txt`))),
  ];
  const runs = files.map(loadRun).filter((run) => run !== null);
  if (runs.length === 0) {
    console.error("No runs: pass --batch NAME, --team NAME (each may repeat) or log files.");
    process.exit(1);
  }
  const asUsage = (some: typeof runs) => skillUsage(some.map((run) => ({ steps: run.steps, goalMet: run.s.goalMet, model: run.model })));
  const usage = asUsage(runs);
  // Goals need different skills (outpost needs no iron; a team goal needs give), so each gets its own table too.
  const goals = [...new Set(runs.map((run) => run.s.goalName))];
  const perGoal = goals.length > 1 ? goals.flatMap((goal) => ["", ...renderSkillUsage(asUsage(runs.filter((run) => run.s.goalName === goal)), "###").map((line, i) => (i === 0 ? `### Goal: ${goal}` : line))]) : [];
  const from = [...batches.map((b) => `batch ${b}`), ...teams.map((t) => `team run ${t}`)].join(", ") || `${runs.length} logs`;
  const title = argv.title ?? `Skill usage: ${from}`;
  const command = ["npm run skills --", ...batches.map((b) => `--batch ${b}`), ...teams.map((t) => `--team ${t}`), ...(argv.title ? [`--title "${argv.title}"`] : []), ...(argv.out ? [`--out ${argv.out}`] : [])].join(" ");
  const built = batches.length || teams.length ? [`*Built from the run logs by \`${command}\`. Logs stay in \`runs/\` (not committed).*`, ""] : [];
  const text = [`# ${title}`, "", ...built, ...renderSkillUsage(usage), ...(perGoal.length ? ["", "## By goal", ...perGoal] : []), ""].join("\n");
  const out = argv.out ?? join("runs", "skills.md");
  writeFileSync(out, text);
  console.log(out);
}
