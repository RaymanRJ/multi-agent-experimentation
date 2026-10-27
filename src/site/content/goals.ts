// Why each goal exists, and how it differs from its neighbours, in a line: shown on each goal's card on
// the Results page, under the goal text the agents are given (which comes from the agents' own code).
// Hand-written; a goal with no line here shows none.
export const goalNotes: Record<string, string> = {
  shelter: 'Can an agent work out how to get under cover from the outcome alone? The guided version spells out the steps.',
  tools: 'The first rung: a stone pickaxe from nothing. The guided version lists the steps, to measure how much that help is worth.',
  outpost: 'A whole day’s plan under threat: four stone tools and a shelter before dark, then the night survived.',
  iron: 'A longer chain: stone tools first, then iron ore found, mined and smelted.',
  'team-camp': 'The first team goal: four tools spread across the team, every member holding one, and a shelter built by anyone.',
  'team-homestead':
    'Three days, parts that depend on each other (wool for beds, iron to smelt, meat to cook and store). Any two-storey shelter counts, and each member may sleep anywhere.',
  'team-base':
    'team-homestead with one shared home: everyone must sleep in a bed inside one large two-storey shelter. In thome1 three agents built 36 huts between them and the night never passed.',
};
