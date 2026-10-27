/**
 * The front page's lessons, one per part of an agent system, hand-written from docs/lessons.md. Every
 * number here comes from that file and the write-ups it cites; update them together.
 */
export interface Lesson {
  /** The part of the system. */
  part: string;
  title: string;
  body: string;
  /** One line of evidence from a logged run. */
  evidence: string;
  anchor: string;
}

export const lessons: Lesson[] = [
  {
    part: 'Tools',
    title: 'A tool’s result has to be true',
    body:
      'The agent plans on what its tools report. A refusal that wasn’t real, a success that wasn’t, a side effect it ' +
      'wasn’t told of: each one sends every later decision the wrong way, however good the model.',
    evidence: 'Mining refused reachable ore as “out of reach” 44 times in one team run and starved the goal.',
    anchor: 'tools',
  },
  {
    part: 'Observations',
    title: 'Agents trust the summary over the evidence',
    body:
      'A computed status beats the raw signal beside it, even when they contradict each other. Check what you ' +
      'compute, never round away the edge case, and don’t let a fixed cap cut off the item that matters.',
    evidence: 'An agent waited beside a zombie because its home was reported “closed”.',
    anchor: 'observations-and-context',
  },
  {
    part: 'Shared state',
    title: 'What agents share is distributed state',
    body:
      'One rule for everyone, published on a clock, or they disagree and act twice. And they answer requests, ' +
      'not needs: a need nobody turns into a request goes unmet.',
    evidence: '31 of 35 hand-overs between teammates followed a request.',
    anchor: 'shared-state-between-agents',
  },
  {
    part: 'Control loop',
    title: 'Keep the model out of the fast loop',
    body:
      'The model chooses a goal; code carries it out, retries and reports. Replan on events, filter the ones ' +
      'that don’t matter, and put what can’t wait in a reflex.',
    evidence: 'Deaths while the model was still deciding fell from 9 a run to 1 once the body stepped back, took cover and swam out on its own.',
    anchor: 'the-control-loop',
  },
  {
    part: 'Evaluation',
    title: 'Keep a baseline, and read the logs',
    body:
      'A scripted agent with no model tells you whether a failure is the harness or the model. Seed runs, log every ' +
      'decision, and check your own checker before believing a result.',
    evidence: 'One “success” was a bug in our goal check; 45 of 49 drowning alarms were probably a library bug.',
    anchor: 'evaluation',
  },
  {
    part: 'Improvement',
    title: 'Fix the tools, not the prompt',
    body:
      'Read where agents got stuck, sort it into tool, information or judgement, and change only the first two. ' +
      'Coach judgement away in the prompt and you measure the coaching.',
    evidence: 'The same small model went from 3 of 9 runs to 8 of 9 on tool fixes alone.',
    anchor: 'the-improvement-loop',
  },
];

/**
 * Parts of the four-part team goal met, per rep of the mixed team (Claude Opus 5.5, Claude Sonnet 5.5
 * and GPT-6 Luna), in the order the reps ran, as our tools and information were fixed between them.
 * From docs/results/write-ups/06-team-base.md.
 */
export const reps: Array<{ label: string; met: number; note: string }> = [
  { label: 'tbase1 · 1', met: 2, note: 'before the fixes' },
  { label: 'tbase1 · 2', met: 2, note: 'before the fixes' },
  { label: 'tbase1 · 3', met: 1, note: 'before the fixes' },
  { label: 'tbase2', met: 1, note: 'mining, chests, health fixed' },
  { label: 'tbase3', met: 2, note: 'plus treetops' },
  { label: 'tbase4', met: 3, note: 'plus beds, chest views, sleep' },
  { label: 'tbase5 · 1', met: 4, note: 'plus reflexes, shared sightings, bed fixes' },
  { label: 'tbase5 · 2', met: 2, note: 'iron out of reach; Opus hit its cost cap' },
  { label: 'tbase5 · 3', met: 2, note: 'iron out of reach; Opus hit its cost cap' },
];
