/**
 * The curated case studies (the Case studies pages): three cases, each in the same short form, linking to its full
 * write-up in docs/results/write-ups/. Every figure traces to that write-up.
 */
export interface Case {
  id: string;
  title: string;
  short: string;
}

export const cases: Case[] = [
  { id: 'team', title: 'Three cheap agents, one shared goal', short: 'From under 1 in 3 to 8 in 10' },
  { id: 'tools', title: 'Fixing the tools, not the models', short: 'Four models from 4 of 12 to 12 of 12' },
  { id: 'local', title: 'A free local model', short: 'From 3 of 9 to 8 of 9, and why memory hurt' },
];

export const caseById = (id: string) => cases.find((c) => c.id === id);
