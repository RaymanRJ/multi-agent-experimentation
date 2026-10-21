import { HASH } from '../lib/route';

/**
 * The front page's findings, hand-written from the write-ups. Every number here comes from
 * docs/results/write-ups/06-team-base.md; update both together.
 */
export interface Finding {
  title: string;
  body: string;
  link: { label: string; href: string };
}

const WRITE_UP = 'results/write-ups/06-team-base';

export const findings: Finding[] = [
  {
    title: 'They answer requests, not needs',
    body:
      'Of 35 handovers between teammates, 31 followed a request or a plain "I still need an iron pick". ' +
      'A spare bed stayed in one agent\'s pack while the game told it, night after night, which teammate had none.',
    link: { label: 'The clearest finding', href: HASH.doc(WRITE_UP, 'the-clearest-finding-they-answer-requests-not-needs') },
  },
  {
    title: 'They organise at once, then the roles harden',
    body:
      'Every team split the goal over chat in its first few decisions, with no one telling it to. ' +
      'But when the agent that owned a part stalled, nobody took the part over.',
    link: { label: 'How they organised', href: HASH.doc(WRITE_UP, '1-how-they-organised') },
  },
  {
    title: 'They trust what they are told over what they see',
    body:
      'One agent waited beside a zombie because its home was reported "closed". Another reasoned for 26 decisions ' +
      'from a health reading of 0 that was really 0.4. Each decision was sound; the premise was ours, and wrong.',
    link: { label: 'Meeting the unexpected', href: HASH.doc(WRITE_UP, '3-meeting-the-unexpected') },
  },
  {
    title: 'They keep the goal in view',
    body:
      'After a threat, an agent was back at work on the goal about nine times in ten, usually within a few decisions. ' +
      'Some changed tactics when the same problem kept coming back.',
    link: { label: 'Keeping the goal in view', href: HASH.doc(WRITE_UP, '2-keeping-the-goal-in-view') },
  },
];

/**
 * Parts of the four-part team goal met, per rep of the mixed team (Claude Opus 5.5, Claude Sonnet 5.5
 * and GPT-6 Luna), in the order the reps ran, as our tools and information were fixed between them.
 */
export const reps: Array<{ label: string; met: number; note: string }> = [
  { label: 'tbase1 · 1', met: 2, note: 'before the fixes' },
  { label: 'tbase1 · 2', met: 2, note: 'before the fixes' },
  { label: 'tbase1 · 3', met: 1, note: 'before the fixes' },
  { label: 'tbase2', met: 1, note: 'mining, chests, health fixed' },
  { label: 'tbase3', met: 2, note: 'plus treetops' },
  { label: 'tbase4', met: 3, note: 'plus beds, chest views, sleep' },
];
