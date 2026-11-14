import { HASH } from '../lib/route';

/**
 * The landing page's headline figures: the claims a non-technical reader sees first. Hand-set, not computed, because
 * which runs make the headline is a judgement and the published reports' costs predate the 12 November pricing fix.
 *
 * Update when a write-up changes the headline result (a new frozen set, a new cost per success, a new goal); the
 * triage-batch skill's checklist and CLAUDE.md say so. Every number must trace to the source below. The landing page's
 * prose repeats some of them ("2 in 6 to 8 in 10", "under 1 in 3 to 8 in 10" in pages/Home.tsx): check those too.
 *
 * Source as of 14 November: write-up 08, "Reaching 80%". Three GPT-6.1 Sol agents on frozen 077e0f4: 10 of 10 with the
 * progress list on (US$10.83) and 10 of 10 with it off (US$10.02), so 20 of 20 and US$20.85 for 20 successes (the reports'
 * estimates, which matched the bill those days). Three GPT-6 Luna agents on nearly the same harness, sets H-J (tluna36-38):
 * 15 of 30, US$4.15, about 28 cents a success. Before the tool fixes of write-up 07, 4 of 14 (tluna17-25).
 */
export const HEADLINE = {
  successRate: '20 of 20',
  costPerSuccess: '$1',
  asOf: 'November 2026',
};

const SOURCE = HASH.doc('results/write-ups/08-reaching-80');

export const FIGURES: Array<{ value: string; label: string; detail: string; href: string }> = [
  {
    value: '20 of 20',
    label: 'runs met the whole goal, on unchanged code',
    detail:
      'Twenty runs on the same, unchanged code, each in a fresh world: every one met every part of the goal. In ten of them the agents weren’t even told what was still missing. With 20 of 20, the true rate is at least about 84%, at 95% confidence.',
    href: SOURCE,
  },
  {
    value: '≈ $1',
    label: 'per goal achieved, failed runs included',
    detail:
      'The model costs of those 20 runs, about $20.85 at the provider’s rates, divided by 20 successes. The cheapest model costs about 28¢ a success on the same tools, but succeeds only about half the time. The computer running the simulation, a single laptop, is not included.',
    href: SOURCE,
  },
  {
    value: '2×',
    label: 'the success rate, from 15 of 30 runs to 20 of 20: a stronger model on the same tools',
    detail:
      'Fixing the agents’ tools took a team of the cheapest model from 4 in 14 to about half. Six more fixes, each checked, didn’t move it further: what was left was its own judgement. A stronger model on the same tools, with nothing else changed but four last fixes, met the goal every time.',
    href: HASH.doc('results/write-ups/08-reaching-80', 'why-we-moved-from-luna-to-sol'),
  },
  {
    value: '0',
    label: 'human interventions during a run',
    detail:
      'Once a run starts, no one steps in: no hints, no corrections, no hand-picked restarts. When the agents got stuck, the fix went into their tools for the next run, never into the run itself. Runs stopped for a bug in our own code are set aside and listed, never counted.',
    href: HASH.method,
  },
];
