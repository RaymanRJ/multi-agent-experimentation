/**
 * The Lessons page: eight principles distilled from docs/lessons.md (the full notebook, linked as an appendix).
 * Each: one sentence, why it matters, one piece of evidence with its source, what to do in practice, and the case
 * studies (content/cases.ts ids) that show it. Every figure traces to the write-up named in `source`.
 */
export interface Lesson {
  id: string;
  theme: string;
  title: string;
  why: string;
  evidence: string;
  source: { label: string; doc: string; anchor?: string };
  practice: string;
  cases: string[];
}

export const lessons: Lesson[] = [
  {
    id: 'true-tools',
    theme: 'Tools',
    title: 'A tool’s report has to be true',
    why: 'A tool is the agent’s only account of what happened. It plans on that account, so a report that is wrong sends every decision after it the wrong way, however good the model.',
    evidence:
      'A hunting tool that never got out of the agents’ home reported “the sheep got away”: 208 times in 223 over two nights. The agents planned around animals that were never the problem. Fixed, with three smaller tool fixes, the team went from 2 in 6 to 7 and 8 in 10.',
    source: { label: 'Write-up 07', doc: 'results/write-ups/07-luna-majority', anchor: 'the-second-night-80-on-one-commit' },
    practice: 'Test what each tool reports against what really happened, not just whether it ran.',
    cases: ['team'],
  },
  {
    id: 'fix-tools-first',
    theme: 'Tools',
    title: 'Fix the tools first; when fixes stop moving the rate, change the model',
    why: 'Most early failures were in the structure around the model: tools that refused possible actions, misreported, or were missing. Fixing those moved results further than any model change, until they stopped: past that point, what was left was the model’s own judgement.',
    evidence:
      'The same small local model went from 3 of 9 runs to 8 of 9 on tool fixes alone; four paid models from 4 of 12 to 12 of 12. Then six more fixes left three of the cheapest model at 15 of 30, and a stronger model on the same tools met the goal 20 of 20.',
    source: { label: 'Write-ups 01, 04 and 08', doc: 'results/write-ups/08-reaching-80', anchor: 'why-we-moved-from-luna-to-sol' },
    practice: 'When an agent fails, look at what its tools did and what it was told first; when fixes stop moving the rate, run a short trial of a stronger model before tuning further.',
    cases: ['model', 'tools', 'local'],
  },
  {
    id: 'summary-over-evidence',
    theme: 'Context',
    title: 'Agents believe the summary over the evidence',
    why: 'A computed status (“safe”, “done”, “0”) wins over the raw signal beside it, even when the two contradict each other in the same view.',
    evidence:
      'An agent waited beside a zombie because its home was reported “closed”; another reasoned for 26 decisions from a health of “0” that was really 0.4.',
    source: { label: 'Write-up 06', doc: 'results/write-ups/06-team-base', anchor: '3-meeting-the-unexpected' },
    practice: 'Check every status you compute against the signals it summarises, and never round away the edge case.',
    cases: ['team'],
  },
  {
    id: 'neutral-fact',
    theme: 'Context',
    title: 'A true, neutral fact can still steer agents off the goal',
    why: 'What an agent is shown, it acts on. A fact about a side issue becomes a side quest, however neutrally it is worded.',
    evidence:
      'Told where they had dropped things on dying, agents went back for them ten times as often at night (1.3 to 15 trips a run); most trips failed, deaths rose, and the team’s success fell from 21 of 30 to 4 of 12.',
    source: { label: 'Write-up 08', doc: 'results/write-ups/08-reaching-80', anchor: 'a-true-fact-that-made-them-worse' },
    practice: 'When you add something to what an agent sees, measure how its behaviour changes, not only whether it succeeds.',
    cases: ['model'],
  },
  {
    id: 'requests-not-needs',
    theme: 'Teams of agents',
    title: 'Between agents, needs must become requests',
    why: 'Agents organise themselves quickly and help when asked, but almost never act on a need they can see. Orders from a peer are treated as suggestions.',
    evidence:
      '31 of 35 hand-overs between teammates followed a request. Questions between agents were answered 220 times in 308; instructions were acted on at once 36 times in 201.',
    source: { label: 'Write-ups 06 and 07', doc: 'results/write-ups/06-team-base', anchor: 'the-clearest-finding-they-answer-requests-not-needs' },
    practice: 'Route work between agents, or between agents and people, as explicit requests with an owner, as tickets do.',
    cases: ['team'],
  },
  {
    id: 'fast-loop',
    theme: 'Control loop',
    title: 'Keep the model out of the fast loop, and audit what stands in for it',
    why: 'The world moves on while the model thinks. Code carries out each decision and covers the seconds a decision takes, but code acting without the model also acts without its judgement.',
    evidence:
      '9 of 17 deaths in one run came while the model was still deciding; a reflex that steps back while it decides kept health at 20. Another reflex quietly dug out the home’s door about 4,500 times in two weeks before anyone noticed.',
    source: { label: 'Write-ups 06 and 07', doc: 'results/write-ups/07-luna-majority' },
    practice: 'Let the model choose goals and deterministic code execute them; count how often every automatic action fires against what it guards.',
    cases: ['team', 'tools'],
  },
  {
    id: 'frozen-code',
    theme: 'Measurement',
    title: 'Measure the rate on frozen code',
    why: 'Fixing after every run finds the next failure, not how often the system succeeds. Only a set of runs on unchanged code gives a rate, and even ten runs is a wide estimate.',
    evidence:
      'Nine runs with a fix after each met the whole goal once, in the last. Five on one unchanged version met it 4 times; sets of ten on later versions scored 7, 8, 6, 7, 4 and 4.',
    source: { label: 'Write-ups 07 and 08', doc: 'results/write-ups/08-reaching-80', anchor: 'the-cheapest-model-stops-improving' },
    practice: 'Freeze the code, run a set, and report the success rate with its sample size before calling anything done.',
    cases: ['team', 'local', 'model'],
  },
  {
    id: 'cost-per-success',
    theme: 'Measurement',
    title: 'Count cost per success, not per call',
    why: 'A cheap model that fails often can cost more per result than an expensive one, and a better harness raises a cheap model’s ceiling, up to a point. Compare cost per success and the success rate together, after fixing the tools.',
    evidence:
      'Three of the cheapest model met the team goal at about 28¢ a success, half the time; three of a stronger one at about $1 a success, every time. The mixed team’s early wins cost $1.36 to $1.43 each.',
    source: { label: 'Write-up 08', doc: 'results/write-ups/08-reaching-80' },
    practice: 'Track cost per successful outcome at the provider’s billed rates, and check the estimate against the bill.',
    cases: ['model', 'team', 'tools'],
  },
];
