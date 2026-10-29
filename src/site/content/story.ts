/**
 * The Results page as a story: the batches in the order they ran, grouped into chapters, each asking
 * one question. Hand-written from the write-ups (docs/results/write-ups/) and docs/next-steps.md;
 * every number comes from there. The outcome, cost and models of each batch are read from its report
 * (virtual:batches), so only the narrative lives here. A published batch not named below is shown at
 * the end as "not yet written up" until it is added to a chapter.
 */
export interface StoryRun {
  /** The batch's name, as in its report's file name. */
  name: string;
  /** What this run showed, in a line. */
  showed: string;
  /** What was changed after it, before the next run. */
  then?: string;
}

export interface Chapter {
  title: string;
  /** What the chapter set out to find. */
  question: string;
  runs: StoryRun[];
  /** What it taught about building agents, and where in docs/lessons.md. */
  lesson: { text: string; anchor: string };
}

export const chapters: Chapter[] = [
  {
    title: 'Can a small free model do anything at all?',
    question:
      'One local 4B model, alone, on two short goals: a stone pickaxe and a shelter. Does it need memory, or the steps spelled out?',
    runs: [
      {
        name: 'b1',
        showed: 'The model met the guided stone pickaxe in 3 of 9 runs; the bar above counts the baseline and the shelter too.',
        then: 'Mining digs down when no stone is in view; the pathfinder stops spending mined stone on climbing; the model is told what it can craft now, and when it repeats itself. The model was not changed.',
      },
      { name: 'b4', showed: 'The model met the same goal in 8 of 9 runs, with nothing about the model changed. Fixing the tools mattered more than anything about the model.' },
      {
        name: 'b5',
        showed: 'Across b4 and b5: with no memory, 12 of 12; carrying its own plan forward, 9 of 12. Spelling the steps out made no difference.',
        then: 'Asking for "oak planks" while holding dark oak now gets dark oak planks, not an error.',
      },
      {
        name: 'b6',
        showed: 'No run failed on wood names. Two plan-memory runs drowned in a flooded cave.',
        then: 'Digging down stops when a cave opens below; an agent under water is moved to dry ground first.',
      },
      { name: 'b7', showed: 'No drownings. Plan memory still failed every pickaxe run, each a loop on a stale plan. Across b4–b7: plan memory 13 of 24, full memory 21 of 24.' },
    ],
    lesson: { text: 'Fix the tools before judging the model, and be wary of feeding an agent its own stale plan.', anchor: 'tools' },
  },
  {
    title: 'A goal that takes planning: hold an outpost through the night',
    question: 'Four stone tools and a shelter before dark, then survive the night with monsters about. Can the small model plan that far?',
    runs: [
      {
        name: 'b8',
        showed: 'The scripted baseline met it once in 3; the model never.',
        then: 'A premature "done" is told what is missing; shelter walls no longer open a crafting table and silently stop every later craft.',
      },
      {
        name: 'b9',
        showed: 'Baseline 2 of 3, the model 1 of 9. The model made the tools, then never built the shelter, or looped on wood it held.',
        then: 'Chat is rate-limited: a burst of failures had got the baseline kicked from the server.',
      },
      { name: 'b10', showed: 'The baseline alone, 3 of 3. The tools can do this goal; the open question is the model.' },
    ],
    lesson: { text: 'Keep a baseline with no model in it: it tells you whether a failure is the harness or the model.', anchor: 'evaluation' },
  },
  {
    title: 'A longer chain: an iron pickaxe',
    question: 'Wood, stone, ore found underground, fuel, a furnace, smelting, then the craft. Can the small model follow the chain?',
    runs: [
      {
        name: 'b11',
        showed: 'Smelting failed five times in a row when the model named the raw item.',
        then: 'smelt takes the raw item\'s name.',
      },
      {
        name: 'b13',
        showed: 'Met twice, both with the goal\'s open parts listed each step; never without. "Smelted from raw_iron, not crafted" was followed; "need 3 more cobblestone", naming no tool, was retried 4–16 times.',
      },
    ],
    lesson: { text: 'An error that names the next tool gets followed; one that doesn\'t gets retried.', anchor: 'tools' },
  },
  {
    title: 'Telling the agent what is left',
    question: 'Back to the outpost, with the time until night, a dusk interrupt and, as its own condition, the goal\'s open parts listed each step.',
    runs: [
      {
        name: 'b12',
        showed: 'With the list, the model tried the shelter in 6 runs of 9, against 3 without. The baseline fell to 1 of 3: one run wore out its last pickaxe digging for iron.',
        then: 'The baseline makes a spare pickaxe before digging; the cobblestone message names mine_stone.',
      },
      { name: 'b14', showed: 'The baseline, 3 of 3 again.' },
    ],
    lesson: { text: 'Telling an agent what is still open helps it close what it can act on.', anchor: 'observations-and-context' },
  },
  {
    title: 'First teams',
    question: 'Several models in one world with one goal for the team: four stone tools between them, one each, and a two-storey shelter.',
    runs: [
      {
        name: 'trio1',
        showed: 'Haiku, Sonnet and the local model met it for $0.33. Sonnet proposed the split, made the tools and built the shelter, then handed tools over.',
        then: 'Agents can ask each other things and ask each other to act (ask_agent, tell_agent).',
      },
      {
        name: 'trio2',
        showed: 'Not met: only handing tools over was left, and it never happened. ask_agent took a teammate\'s chat to everyone as its answer.',
        then: 'Only a reply addressed to the asker counts; a note after every third request in a row to the same agent.',
      },
      {
        name: 'trio3',
        showed: 'Met, for $1.28. Agents were never told their own name, and tried to hand things to themselves.',
        then: 'The prompt names the agent; skill arguments can be optional; a skill\'s own chat lines are marked and ignored as answers.',
      },
      { name: 'quad1', showed: 'Four models, with every fix: met in under five minutes of game time for $0.28. Nobody died.' },
    ],
    lesson: { text: 'Tell an agent who it is, and make what agents say to each other unambiguous.', anchor: 'shared-state-between-agents' },
  },
  {
    title: 'A loop the model can\'t leave',
    question: 'Does the small model still loop on today\'s code, and do the team-run changes cause it?',
    runs: [
      { name: 'b15', showed: 'Met 0 of 6. It asked for logs it held up to 153 times in a row, and chose the same again after 290 of 293 notes that it was repeating itself.' },
      { name: 'b16', showed: 'The same loop on the older code (106 in a row), so the changes did not cause it. The loop is the model\'s, and is reported, not broken for it.' },
    ],
    lesson: { text: 'A notice is not a circuit-breaker.', anchor: 'the-control-loop' },
  },
  {
    title: 'Paid models on the outpost',
    question: 'Claude Haiku, Sonnet and Opus and GPT-6 Luna on the goal the small model rarely met.',
    runs: [
      {
        name: 'p2',
        showed: 'Three of four met it in under 55 decisions each. Haiku\'s "success" was a bug in our night check; its drowning alarm was a library bug.',
        then: 'A death at night forfeits that night; the agent\'s own air reading is restored after every update.',
      },
      {
        name: 'p3',
        showed: 'Sonnet lost two-thirds of a run in a flooded cave: mining walked 20 blocks down in one call, and no skill could get back up.',
        then: 'climb_out; mining measures depth from where it started; observations say when the agent is underground.',
      },
      {
        name: 'p5',
        showed: '4 of 12. Mobs walked into finished shelters through the open doorway; a crafting table that ignored one click became a run of timeouts.',
        then: 'Shelters close their doorway; opening a table has its own limit and one retry; a monster outside a closed shelter no longer interrupts.',
      },
      { name: 'p6', showed: '12 of 12, no deaths, no damage. The goal no longer separated the models, so the next test had to be harder.' },
    ],
    lesson: { text: 'Fix the harness first, then raise the bar when a test stops separating.', anchor: 'evaluation' },
  },
  {
    title: 'Three models, three days, one team goal',
    question: 'A shelter, a bed slept in by everyone, an iron pickaxe each and 10 cooked meat in a chest, over three in-game days.',
    runs: [
      {
        name: 'thome1',
        showed: '0 of 3 teams. Every part was met somewhere, none all at once. Iron came on day 3 and was lost when its holder died; agents were in a closed shelter for 8% of night-time decisions.',
        then: 'flee reports where it ran and who is left, not "cornered"; a death says where it happened; reports count only real deaths.',
      },
    ],
    lesson: { text: 'State held in one agent is lost with it.', anchor: 'shared-state-between-agents' },
  },
  {
    title: 'One shared home',
    question: 'The same team goal, with one large shelter for everyone and a bed inside it. What stops a capable team?',
    runs: [
      {
        name: 'tbase1',
        showed: 'Three reps, 1–2 parts of 4. Teams split the work at once and kept to it; 31 of 35 hand-overs followed a request. Mining refused reachable ore 44 times.',
        then: 'Mining digs to the ore; take takes exactly what is asked; health under half a point shows as 0.4; a home with a monster inside is not reported safe.',
      },
      {
        name: 'tbase2',
        showed: '1 part. Failed decisions fell from about 93 a rep to 58. One agent made all three pickaxes and died with them.',
        then: 'An agent stuck on treetops climbs down through the leaves.',
      },
      {
        name: 'tbase3',
        showed: '2 parts, failed decisions 52. A spare bed stayed in one pack: no tool put a bed down except sleeping in it.',
        then: 'place_bed; look_in_chest; beds shown with how many are in use; sleepers stay in bed until the night passes.',
      },
      { name: 'tbase4', showed: '3 parts of 4, the most complete team yet: an iron pickaxe for everyone, handed over as each was made.' },
    ],
    lesson: { text: 'Agents trust what they are told, and answer requests, not needs.', anchor: 'observations-and-context' },
  },
  {
    title: 'Three of one model, then told what\'s left',
    question: 'Three GPT-6 Luna agents on the shared-home goal; then the same with the goal\'s open parts listed each step.',
    runs: [
      {
        name: 'tluna1',
        showed: 'Worse than the mixed teams. Pickaxes were lost to two of our messages: one said they lay beside a teammate who had walked off.',
        then: 'Messages say where an item lies and how far the receiver is; only what left a chest counts as taken.',
      },
      {
        name: 'tlunap1',
        showed: 'With the list, food was stored and kept in every rep. But agents trusted the list over their own last action, and the list was stale and named different homes to different agents.',
        then: 'A death ends any skill; one rule names the shared home for everyone; each agent reports what it holds every 2 seconds. Then, from four proof runs: reflexes while the model decides (step back, take cover, swim out), flee running to a finished shelter, sightings of animals shared with the team, and bed spots that are really free.',
      },
    ],
    lesson: { text: 'What agents share is distributed state: one rule for everyone, published on a clock.', anchor: 'shared-state-between-agents' },
  },
  {
    title: 'The first full goal',
    question: 'The mixed team again, after the reflexes, safer flight, shared sightings and bed fixes. Can a team now finish?',
    runs: [
      {
        name: 'tbase5',
        showed: 'Yes, once: rep 1 met every part halfway through day 2 with no deaths, each agent owning a part. In reps 2 and 3 the iron in sight lay beside water, which mining refuses, and Opus spent its cost cap and left before the end.',
        then: 'Digging stops only for a monster that can reach the agent; ore seen is remembered and shared; digging steps out from under gravel; every dig uses the cheapest tool that does the job. And, after the latest chapter of the longest-running problem, agents dying, flee digs in at night when monsters are still after the agent.',
      },
    ],
    lesson: { text: 'Cover the seconds the model can\'t act, and share what each agent sees: a capable team then finishes.', anchor: 'the-control-loop' },
  },
  {
    title: 'Does it repeat?',
    question: 'The same mixed team, after digging in, remembered ore and a shared view of the team\'s chest. Does the full goal come again?',
    runs: [
      {
        name: 'tbase6',
        showed: 'Yes, in rep 1 again: every part by halfway through day 2, no deaths, $1.43. Rep 2 ended one pickaxe short, with Opus carrying Luna\'s. Rep 3 found no sheep, so no beds, so the dead came back at the world spawn among the monsters: one agent died there 18 times. The shared chest was read and acted on.',
        then: 'An agent waits for its respawn before it observes (some decisions had been made from "health 0" at the death spot), and a chest that won\'t open says why.',
      },
      {
        name: 'tbase7',
        showed: 'With the goal\'s open parts listed each step: rep 1 met the whole goal at the same point of day 2 as before; in rep 2 the agents knew exactly what was missing (one pickaxe, seven cooked meat) and still couldn\'t close it, with the animals gone and the ore beside water. Two reps only.',
      },
    ],
    lesson: { text: 'Share what changed, not only what was seen: agents act on their last belief until something tells them otherwise.', anchor: 'shared-state-between-agents' },
  },
  {
    title: 'The same goal, for less',
    question: 'Can a cheaper team meet the goal as often as the mixed team, which won 3 of 8 reps at $1.36-3.31 a rep?',
    runs: [
      {
        name: 'thaiku1',
        showed: 'Three Haiku 5.5 agents: no deaths and no parts. They mostly waited, talked status, built a one-storey "large" home, and one sat all game in water a tool couldn\'t get it out of.',
        then: 'A respawn skill (die on purpose, lose everything carried, come back at the bed or spawn), and climb_out swims up onto a bank.',
      },
      {
        name: 'thaiku2',
        showed: 'Two more Haiku reps: the home and the food in each, two of three asleep, no iron, about $0.22 a rep. Three drownings came from digging up through rock under water.',
        then: 'Under rock, climb_out swims to the nearest air first.',
      },
      {
        name: 'tluna2',
        showed: 'Three Lunas: rep 2 met the whole goal for $0.15, the first all-Luna win, one agent on each part; reps 1 and 3 met 2 and 3 parts.',
      },
      {
        name: 'tmix1',
        showed: 'Sonnet with two Haikus: home and food for $0.95. Sonnet made all three iron pickaxes and died with them two decisions later.',
      },
      {
        name: 'tluna3',
        showed: 'Three more Luna reps: 2, 3 and 1 parts, no whole goal. Over six reps three Lunas won once (3-56%), the mixed team 3 times in 8 (14-69%): not yet told apart, but a win cost about $1.78 against $6.40.',
        then: 'Ore with water only beside it is mined from dry footing; under water it is still left alone.',
      },
    ],
    lesson: { text: 'A cheaper model\'s ceiling rises with the harness: fix the tools first, then compare prices.', anchor: 'evaluation' },
  },
];
