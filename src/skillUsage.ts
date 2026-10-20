/**
 * Which skills agents choose, how often, and how often they work, across any set of runs: the
 * evidence for "this skill carries the runs" and "that one is never used". Usage is not value: a
 * skill can be chosen rarely and still be the one that met the goal, so the table also says how
 * many goal-met runs used each skill against how many of the rest did.
 *
 *   npm run skills -- --batch p6                       # one batch (src/skillsReport.ts)
 *   npm run skills -- --batch p5 --batch p6 --team thome1 --out docs/results/skills.md
 *   npm run skills -- runs/a.jsonl runs/b.jsonl
 *
 * The comparison report (`npm run compare`) has the same table for its own runs.
 */
import type { LoggedStep } from "./types.js";
import { SKILLS } from "./skills/index.js";

/** What the table needs from a run: its steps, whether it met its goal, and its model. */
export interface UsageRun {
  steps: LoggedStep[];
  goalMet: boolean | "n/a";
  model: string;
}

export interface SkillRow {
  skill: string;
  /** Runs that chose it at least once. */
  runs: number;
  chosen: number;
  worked: number;
  failed: number;
  interrupted: number;
  /** Game ticks spent running it. */
  ticks: number;
  /** Goal-met runs that chose it, and other runs that chose it. */
  inMet: number;
  inOther: number;
  byModel: Record<string, number>;
}

export interface SkillUsage {
  runs: number;
  metRuns: number;
  totalTicks: number;
  rows: SkillRow[];
  /** Skills in the library that no run chose. */
  never: string[];
  /** Names the model asked for that are not skills, with how often (re-asked, nothing ran). */
  invented: Record<string, number>;
  models: string[];
}

const TICKS_PER_MS = 20 / 1000;
const KNOWN = new Set(SKILLS.map((skill) => skill.name));

export function skillUsage(runs: UsageRun[]): SkillUsage {
  const rows = new Map<string, SkillRow>();
  const invented: Record<string, number> = {};
  let totalTicks = 0;
  for (const run of runs) {
    const used = new Set<string>();
    run.steps.forEach((step, i) => {
      const skill = step.decision?.skill;
      // A step's ticks are stamped when its skill ends: the span since the last step is the
      // model's thinking, then the skill (as in summary.ts's behaviour()).
      const span = Math.max(0, (step.ticks ?? 0) - (run.steps[i - 1]?.ticks ?? 0));
      const thinking = Math.min(span, Math.round((step.decisionMs ?? 0) * TICKS_PER_MS));
      totalTicks += span;
      if (!skill) return;
      if (!KNOWN.has(skill)) {
        if (step.result?.reason?.startsWith("no such skill")) invented[skill] = (invented[skill] ?? 0) + 1;
        return;
      }
      const row = rows.get(skill) ?? { skill, runs: 0, chosen: 0, worked: 0, failed: 0, interrupted: 0, ticks: 0, inMet: 0, inOther: 0, byModel: {} };
      row.chosen++;
      row.ticks += span - thinking;
      const status = step.result?.status;
      if (status === "success") row.worked++;
      else if (status === "failed") row.failed++;
      else if (status === "aborted") row.interrupted++;
      row.byModel[run.model] = (row.byModel[run.model] ?? 0) + 1;
      rows.set(skill, row);
      used.add(skill);
    });
    for (const skill of used) {
      const row = rows.get(skill)!;
      row.runs++;
      if (run.goalMet === true) row.inMet++;
      else row.inOther++;
    }
  }
  return {
    runs: runs.length,
    metRuns: runs.filter((run) => run.goalMet === true).length,
    totalTicks,
    rows: [...rows.values()].sort((a, b) => b.runs - a.runs || b.chosen - a.chosen),
    never: SKILLS.map((skill) => skill.name).filter((name) => !rows.has(name)),
    invented,
    models: [...new Set(runs.map((run) => run.model))],
  };
}

const pct = (n: number, of: number) => (of === 0 ? "-" : `${Math.round((100 * n) / of)}%`);

/** The table as Markdown lines, under a heading of the given level. */
export function renderSkillUsage(u: SkillUsage, heading = "##"): string[] {
  const other = u.runs - u.metRuns;
  const lines = [
    `${heading} Skills used`,
    "",
    `Across ${u.runs} run${u.runs === 1 ? "" : "s"} (${u.metRuns} met the goal). **Runs** is how many chose the skill at least once; ` +
      "**worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, " +
      "thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far " +
      "more common in met runs is one the successes leaned on. Usage alone is not value.",
    "",
    "| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |",
    "|---|---|---|---|---|---|---|---|",
    ...u.rows.map(
      (r) =>
        `| \`${r.skill}\` | ${r.runs} of ${u.runs} | ${r.chosen} | ${pct(r.worked, r.chosen)} | ${pct(r.failed, r.chosen)} | ${pct(r.interrupted, r.chosen)} | ${pct(r.ticks, u.totalTicks)} | ${pct(r.inMet, u.metRuns)} / ${pct(r.inOther, other)} |`,
    ),
    "",
    u.never.length ? `**Never chosen:** ${u.never.map((name) => `\`${name}\``).join(", ")}.` : "Every skill was chosen at least once.",
  ];
  const invented = Object.entries(u.invented).sort((a, b) => b[1] - a[1]);
  if (invented.length) lines.push("", `**Asked for but not a skill** (refused, re-asked): ${invented.map(([name, n]) => `\`${name}\` ×${n}`).join(", ")}.`);
  if (u.models.length > 1) {
    lines.push("", "<details><summary>Times chosen, by model</summary>", "", `| Skill | ${u.models.join(" | ")} |`, `|---|${u.models.map(() => "---").join("|")}|`);
    for (const r of u.rows) lines.push(`| \`${r.skill}\` | ${u.models.map((m) => r.byModel[m] ?? 0).join(" | ")} |`);
    lines.push("", "</details>");
  }
  return lines;
}
