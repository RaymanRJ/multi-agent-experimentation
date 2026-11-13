/**
 * The curated case studies (the Case studies pages): three cases, each in the same short form, linking to its full
 * write-up in docs/results/write-ups/ and its batch reports. Every figure traces to the write-up named in `writeUp`.
 */
export interface Case {
  id: string;
  title: string;
  short: string;
  question: string;
  setup: string;
  result: { value: string; label: string };
  happened: string[];
  changed: string[];
  leftAlone?: string;
  lessons: string[];
  writeUp: { title: string; doc: string; anchor?: string };
  batches: string[];
}

export const cases: Case[] = [
  {
    id: 'team',
    title: 'Three cheap agents, one shared goal',
    short: 'From under 1 in 3 to 8 in 10',
    question: 'Can three of the cheapest AI agents finish a three-day shared project on their own, most of the time?',
    setup:
      'Three GPT-6 Luna agents, one goal over three simulated days: a home for all, a bed each, an iron pickaxe each and 10 cooked meat stored. No one assigns the work, and nothing is coached.',
    result: { value: '8 in 10', label: 'runs met the whole goal on unchanged code (15 of 20 over two sets), at about 15¢ per success' },
    happened: [
      'They organised at once: in 19 of 20 runs someone was building the home by the third decision, and in 11 one agent made all three pickaxes and handed them out.',
      'They tracked the goal teammate by teammate: “La and lb still need iron pickaxes; I have 7 iron ingots, enough to craft two.”',
      'Death was the main way away from the goal: 64 deaths in 20 runs, 23 of them carrying iron, and the agents rarely went back for what they dropped.',
      'Asking worked and telling didn’t: 220 of 308 questions between them were answered; 36 of 201 instructions were acted on at once.',
    ],
    changed: [
      'A hunting tool that never got out of a closed home reported “the sheep got away”, 208 times in 223. It now walks out by the door first.',
      'A safety reflex dug out the home’s door whenever an agent stood in the doorway, about 4,500 times in two weeks. It now reacts only to a real block over the agent’s head.',
      'Mining digs down to ore it can see; creepers and lava get their own reflexes while the model decides.',
    ],
    leftAlone: 'Left alone, as the agents’ own choices: travelling hurt or at night, and carrying the team’s only pickaxes far from home.',
    lessons: ['true-tools', 'summary-over-evidence', 'requests-not-needs', 'fast-loop', 'frozen-code', 'cost-per-success'],
    writeUp: { title: 'Write-up 07: three Lunas, most of the time', doc: 'results/write-ups/07-luna-majority' },
    batches: ['tluna27a', 'tluna30a', 'tluna31a'],
  },
  {
    id: 'tools',
    title: 'Fixing the tools, not the models',
    short: 'Four models from 4 of 12 to 12 of 12',
    question: 'When four different models fail at the same task, is it the models or the tools?',
    setup:
      'Four models (Claude Opus, Sonnet and Haiku, and GPT-6 Luna), each alone: four stone tools and a shelter before dark, then survive the night. Three runs each, same world, same start.',
    result: { value: '12 of 12', label: 'runs met the goal after the tool fixes, up from 4 of 12, with no model changed' },
    happened: [
      'Monsters walked in through an open doorway the shelter tool left behind (3 runs).',
      'A crafting table that ignored one click turned into minutes of 15-second timeouts (5 runs).',
      'A monster outside a closed shelter interrupted the agents, and some went out to it at night.',
      'With those fixed, every run met the goal, no agent took damage, and none left its shelter at night.',
    ],
    changed: [
      'The shelter tool closes the doorway behind the builder.',
      'Opening a crafting table has its own short time limit and one retry.',
      'A monster outside a closed shelter no longer interrupts the agent; damage still does.',
      'Then the test stopped separating the models and measured only cost: about 1¢ a run for Luna, 13–22¢ for Sonnet and Opus.',
    ],
    leftAlone: 'Not claimed: that the models’ judgement improved. The fix removed what had pushed them out at night.',
    lessons: ['fix-tools-first', 'fast-loop', 'cost-per-success'],
    writeUp: { title: 'Write-up 04: the paid models after the fixes', doc: 'results/write-ups/04-p6-outpost-after-fixes' },
    batches: ['p5', 'p6'],
  },
  {
    id: 'local',
    title: 'A free local model',
    short: 'From 3 of 9 to 8 of 9, and why memory hurt',
    question: 'Can a small, free model running on a laptop do real tasks, and does giving it memory help?',
    setup:
      'Qwen3 4B, running locally for free, alone in a peaceful world: craft a stone pickaxe, or build a shelter. Compared with a scripted baseline and with three kinds of memory.',
    result: { value: '8 of 9', label: 'runs reached the stone pickaxe after fixing the tool code, up from 3 of 9, with the model unchanged' },
    happened: [
      'Before the fixes it reached the stone pickaxe 3 times in 9; after fixes to deterministic code alone, 8 times in 9.',
      'With no memory it met every goal it was given, 12 of 12; carrying its own written plan between decisions, 9 of 12.',
      'The plan misled it: it trusted its stale plan over what the world reported, and once asked for “one more log” 134 times while told it held 12.',
      'Spelling out the steps in the goal made no difference.',
    ],
    changed: [
      'Mining digs down when no stone is in view.',
      'The pathfinder no longer spends the stone just mined on climbing.',
      'The model is told what it can craft right now, and when it is repeating itself.',
    ],
    leftAlone: 'Three runs per condition: a 3 of 3 is consistent with a true rate as low as 44%. Hints, not proof.',
    lessons: ['fix-tools-first', 'frozen-code'],
    writeUp: { title: 'Write-up 01: does a small model need memory?', doc: 'results/write-ups/01-local-model-memory' },
    batches: ['b1', 'b4', 'b5'],
  },
];

export const caseById = (id: string) => cases.find((c) => c.id === id);
