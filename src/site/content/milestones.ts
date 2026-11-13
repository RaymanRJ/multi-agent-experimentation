/**
 * The Results page's headline chart: the shared team goal (build a home for all, a bed each, an iron pickaxe each,
 * 10 cooked meat stored) on the first world, milestone by milestone. Hand-set from the write-ups, because the setup
 * changed between them (models, home design, code); each figure is from runs on one setup and traces to `source`.
 *
 * Costs: the mixed team's is the estimate of the time (mostly Claude, priced with its cache rates); the latest is at
 * billed rates (12 November pricing fix). Luna costs from before 10 November priced cached input in full, about 2.7
 * times the bill, so they are left out rather than shown wrong.
 */
export interface Milestone {
  when: string;
  team: string;
  met: number;
  runs: number;
  note: string;
  costPerSuccess?: string;
  source: { doc: string; anchor?: string };
}

export const milestones: Milestone[] = [
  {
    when: 'Oct 27–28',
    team: 'Mixed team: Claude Opus, Claude Sonnet, GPT-6 Luna',
    met: 3,
    runs: 8,
    costPerSuccess: '≈ $6.40',
    note: 'The first wins, after fixes to tools, reflexes and shared sightings (its first run, on Oct 20, met 0 of 3).',
    source: { doc: 'results/write-ups/06-team-base' },
  },
  {
    when: 'Oct 28–29',
    team: 'Three GPT-6 Luna',
    met: 1,
    runs: 6,
    note: 'The cheapest model alone: possible, but rare.',
    source: { doc: 'results/write-ups/06-team-base', anchor: 'cheaper-teams-three-lunas-and-sonnet-with-two-haikus-tluna2-tmix1' },
  },
  {
    when: 'Oct 30–31',
    team: 'Three GPT-6 Luna, one-room home',
    met: 5,
    runs: 17,
    note: 'A simpler home design removed most of the traps agents built for themselves.',
    source: { doc: 'results/write-ups/06-team-base', anchor: 'one-room-and-a-clock-tluna8' },
  },
  {
    when: 'Nov 11',
    team: 'Three GPT-6 Luna, code frozen',
    met: 4,
    runs: 5,
    note: 'The first rate measured on unchanged code, after a reflex was found digging out the home’s door.',
    source: { doc: 'results/write-ups/07-luna-majority' },
  },
  {
    when: 'Nov 12',
    team: 'Three GPT-6 Luna, code frozen',
    met: 15,
    runs: 20,
    costPerSuccess: '≈ 15¢',
    note: 'Two sets of ten (7 and 8), after a hunting tool was found never leaving the home.',
    source: { doc: 'results/write-ups/07-luna-majority', anchor: 'the-second-night-80-on-one-commit' },
  },
];
