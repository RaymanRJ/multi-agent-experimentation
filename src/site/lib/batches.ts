// Batch reports, read as data. Every report in docs/results/batch-reports/ is written by
// src/agents/scripts/publish-reports.sh, so its layout is fixed: a title, a line of totals, a section per
// goal, and a "Success per condition" table. This file has no Vite or browser imports: vite.config.ts
// uses it to build the index of every batch, and a report's page uses it on the report it opens.

/** One row of a report's "Success per condition" table. */
export interface Condition {
  goal: string;
  /** As the report writes it, e.g. "claude:claude-opus-5-5". */
  brain: string;
  /** For people, e.g. "Claude Opus 5.5". */
  model: string;
  memory: string;
  progress: string;
  stance: string;
  scenario: string;
  met: number;
  runs: number;
  /** The 95% Wilson interval, as fractions. */
  ciLow: number;
  ciHigh: number;
  /** Medians over the runs that met the goal; null when none did. */
  ticks: number | null;
  decisions: number | null;
  tokensIn: number;
  medianMs: number;
  costUsd: number;
  excluded: number;
}

/** One team, one rep, in a team run. */
export interface Team {
  rep: number;
  met: boolean;
  /** How many parts of the goal stood at the end, out of how many; 0 of 0 in reports that don't say. */
  partsMet: number;
  parts: number;
}

export interface Batch {
  /** The doc path, e.g. "results/batch-reports/2026-10-21-1801-tluna1". */
  path: string;
  name: string;
  kind: 'batch' | 'team';
  /** When its first run started, in UTC, from the file name: "2026-10-21T18:01Z". */
  started: string;
  /** As the report gives them: "2026-10-16 to 2026-10-17". */
  dates: string;
  runs: number;
  /** Tokens in and out as the report writes them ("6873k"), or null when it has none. */
  tokensIn: string | null;
  tokensOut: string | null;
  /** In dollars; 0 when every run was free. */
  cost: number;
  goals: string[];
  models: string[];
  conditions: Condition[];
  /** Runs that met their goal, by the report's own count. */
  met: number;
  teams: Team[];
  /** The report's note on which code built it. */
  builtBy: string;
}

/** "claude:claude-haiku-4-5" -> "Claude Haiku 4.5", "ollama:qwen3-4b-instruct:ctx8192" -> "Qwen3 4B". */
export function modelName(brain: string): string {
  if (brain === 'scripted') return 'Scripted baseline';
  // The provider, then the model; a local model's tag may carry a size ("qwen3:4b-instruct") and a context.
  const id = brain.slice(brain.indexOf(':') + 1).replace(/:ctx\d+$/, '').replace(/:/g, '-');
  const parts = id.replace(/-instruct$/, '').split('-');
  const words: string[] = [];
  for (const part of parts) {
    const last = words.length - 1;
    if (/^\d+$/.test(part) && last >= 0 && /\d$/.test(words[last]!) && !/^GPT/.test(words[last]!)) words[last] += `.${part}`;
    else if (/^\d+$/.test(part) && last >= 0 && words[last] === 'GPT') words[last] += `-${part}`;
    else if (/^\d+b$/i.test(part)) words.push(part.toUpperCase());
    else if (part === 'gpt') words.push('GPT');
    else words.push(part.charAt(0).toUpperCase() + part.slice(1));
  }
  return words.join(' ');
}

const num = (s: string | undefined) => (s === undefined || s === '-' ? null : Number(s));

/** The fixed-width "Success per condition" block, as rows. */
export function parseConditions(markdown: string): Condition[] {
  const block = /## Success per condition\s+```\n([\s\S]*?)```/.exec(markdown)?.[1];
  if (!block) return [];
  const rows: Condition[] = [];
  for (const line of block.split('\n').slice(2)) {
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 14) continue;
    const [goal = '', brain = '', memory = '', progress = '', stance = '', scenario = '', success = '', ci = '', ticks, decisions, tokensIn, medianMs, cost, excluded] = cells;
    const [met = 0, runs = 0] = success.split('/').map(Number);
    const [low = 0, high = 0] = ci.split('-').map((p) => Number(p.replace('%', '')) / 100);
    rows.push({
      goal,
      brain,
      model: modelName(brain),
      memory,
      progress,
      stance,
      scenario,
      met,
      runs,
      ciLow: low,
      ciHigh: high,
      ticks: num(ticks),
      decisions: num(decisions),
      tokensIn: num(tokensIn) ?? 0,
      medianMs: num(medianMs) ?? 0,
      costUsd: num(cost) ?? 0,
      excluded: num(excluded) ?? 0,
    });
  }
  return rows;
}

/** Each team's outcome, from its "### Team <name>, rep N: goal met…" section. */
function parseTeams(markdown: string): Team[] {
  const teams: Team[] = [];
  const sections = markdown.split(/^### Team .+?, rep (\d+): (goal met|goal not met)/m);
  for (let i = 1; i + 2 < sections.length; i += 3) {
    const body = sections[i + 2] ?? '';
    const table = /\*\*The goal at the end\*\*\s+\|[^\n]*\n\|[-| ]+\n((?:\|[^\n]*\n?)*)/.exec(body)?.[1] ?? '';
    const rows = table.split('\n').filter((r) => r.startsWith('|'));
    teams.push({
      rep: Number(sections[i]),
      met: sections[i + 1] === 'goal met',
      partsMet: rows.filter((r) => r.includes('**yes**')).length,
      parts: rows.length,
    });
  }
  return teams;
}

/** "docs/results/batch-reports/2026-10-21-1801-tluna1.md" (or the doc path) -> the batch's summary. */
export function parseBatch(path: string, markdown: string): Batch {
  const file = path.replace(/^.*\//, '').replace(/\.md$/, '');
  const [, y, mo, d, hh, mm, name = file] = /^(\d{4})-(\d\d)-(\d\d)-(\d\d)(\d\d)-(.+)$/.exec(file) ?? [];
  const title = /^#\s+(.+)$/m.exec(markdown)?.[1] ?? '';
  const totals = /^(\d+) runs? · (.+?) · (.+?) tokens in \/ out · total cost (.+)$/m.exec(markdown);
  const [tokensIn = null, tokensOut = null] = totals?.[3] === '-' ? [] : (totals?.[3] ?? '').split(' / ');
  const conditions = parseConditions(markdown);
  return {
    path: `results/batch-reports/${file}`,
    name,
    kind: title.startsWith('Team run') ? 'team' : 'batch',
    started: y ? `${y}-${mo}-${d}T${hh}:${mm}Z` : '',
    dates: totals?.[2] ?? '',
    runs: Number(totals?.[1] ?? 0),
    tokensIn,
    tokensOut,
    cost: totals?.[4]?.startsWith('$') ? Number(totals[4].slice(1)) : 0,
    goals: [...markdown.matchAll(/^## Goal: (.+)$/gm)].map((m) => m[1]!.trim()),
    models: [...new Set(conditions.map((c) => c.model))],
    conditions,
    met: conditions.reduce((n, c) => n + c.met, 0),
    teams: parseTeams(markdown),
    builtBy: /^\*(Built from the run logs[^\n]*)\*$/m.exec(markdown)?.[1] ?? '',
  };
}

export interface WriteUpLink {
  path: string;
  title: string;
  /** What the write-up teaches about building agents, in a sentence (see lessonOf). */
  lesson: string;
}

/** The sentence that opens a write-up's "What this teaches about building agents" section, or "". */
export function lessonOf(markdown: string): string {
  const lead = /^## What this teaches about building agents\s*\n+([^\n#-][^\n]*)/m.exec(markdown)?.[1] ?? '';
  return lead.trim();
}

/**
 * Which write-up covers each batch, by name: a write-up that links to the batch's report, or failing
 * that the "Written up in" column of docs/results/README.md's table of batch reports.
 */
export function writeUpsByBatch(batches: Batch[], writeUps: Record<string, string>, resultsReadme: string): Record<string, WriteUpLink> {
  const out: Record<string, WriteUpLink> = {};
  const link = (path: string): WriteUpLink => {
    const text = writeUps[path] ?? '';
    return { path, title: /^#\s+(.+)$/m.exec(text)?.[1]?.trim() ?? path, lesson: lessonOf(text) };
  };
  for (const row of resultsReadme.split('\n')) {
    const name = /^\| \[([^\]]+)\]\(batch-reports\//.exec(row)?.[1];
    const target = /\]\((write-ups\/[^)#]+)\.md\)[^|]*\|\s*$/.exec(row)?.[1];
    const path = target && `results/${target}`;
    if (name && path && path in writeUps) out[name] = link(path);
  }
  for (const batch of batches) {
    const file = batch.path.replace(/^.*\//, '');
    for (const [path, text] of Object.entries(writeUps)) {
      if (text.includes(`batch-reports/${file}.md`)) out[batch.name] = link(path);
    }
  }
  return out;
}
