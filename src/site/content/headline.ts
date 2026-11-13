import { HASH } from '../lib/route';

/**
 * The landing page's headline figures: the claims a non-technical reader sees first. Hand-set, not computed, because
 * which runs make the headline is a judgement and the published reports' costs predate the 12 November pricing fix.
 *
 * Update when a write-up changes the headline result (a new frozen set, a new cost per success, a new goal); the
 * triage-batch skill's checklist and CLAUDE.md say so. Every number must trace to the source below. The landing page's
 * prose repeats some of them ("2 in 6 to 8 in 10", "under 1 in 3 to 8 in 10" in pages/Home.tsx): check those too.
 *
 * Source as of 12 November: write-up 07, "The second night". Sets B and C (tluna30a-j, tluna31a-j) on 54c5f86:
 * 7 and 8 of 10; model cost US$2.22 at the corrected pricing for 15 successes; before the fixes, 4 of 14 on the latest code then (tluna17-25).
 */
export const HEADLINE = {
  successRate: '8 in 10',
  costPerSuccess: '15¢',
  asOf: '12 November 2026',
};

const SOURCE = HASH.doc('results/write-ups/07-luna-majority', 'the-second-night-80-on-one-commit');

export const FIGURES: Array<{ value: string; label: string; detail: string; href: string }> = [
  {
    value: '8 in 10',
    label: 'runs met the whole goal, on unchanged code',
    detail:
      'Ten runs on the same, unchanged code, each in a fresh world: 8 met every part of the goal. A second set of ten on that code scored 7, so 15 of 20 across both.',
    href: SOURCE,
  },
  {
    value: '≈ 15¢',
    label: 'per goal achieved, failed runs included',
    detail:
      'The model costs of those 20 runs, about $2.22 at the provider’s billed rates, divided by the 15 that succeeded. Failed attempts are included; the computer running the simulation, a single laptop, is not.',
    href: SOURCE,
  },
  {
    value: '≈ 3×',
    label: 'the success rate, from under 1 in 3 to 8 in 10, by fixing the agents’ tools, not the model',
    detail:
      'Before the latest fixes, the same team on the same task succeeded 4 times in 14. The fixes went into the tools the agents use and what they are told, not the model and not the goal, and it succeeded 8 times in 10.',
    href: HASH.doc('results/write-ups/07-luna-majority'),
  },
  {
    value: '0',
    label: 'human interventions during a run',
    detail:
      'Once a run starts, no one steps in: no hints, no corrections, no hand-picked restarts. When the agents got stuck, the fix went into their tools for the next run, never into the run itself.',
    href: HASH.doc('lessons', 'the-improvement-loop'),
  },
];
