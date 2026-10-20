# p6: the paid models on the outpost goal, after the p5 fixes

*Batch p6, 20 October, on main at 011c8ef: Claude Haiku 4.5, Sonnet 5.5 and Opus 5.5 and GPT-6
Luna, plan memory, progress list off, survival, `outpost` (four stone tools and a shelter before
dark, then survive the night), 27,000 ticks, three runs each, capped at $1.50 a run. Total cost
$1.66. The same goal, models, settings and run order as p5, so the two are comparable. What differs
is the code (below) and the herds of animals now placed near spawn.*
Generated reports: [batch-reports/2026-10-20-0428-p6](../batch-reports/2026-10-20-0428-p6/).

**Each run is one agent alone.** `scripts/batch.sh` runs the 12 runs one after another, not
side by side. Before each one it regenerates the world from the same seed, then starts a single
agent in it. The models never shared a world or met each other. Each faced the same terrain from
the same starting point, so differences between runs come from the model and the game's
randomness (mob spawns, animal movement), not from another agent. The models played together only
in the team run ([05-team-homestead.md](05-team-homestead.md)).

## In one paragraph

Every run met the goal: 12 of 12, against 4 of 12 in p5. No agent died, none took any damage at
all, and none left its shelter at night. Each built its shelter at decision 8 or 9, by about a
quarter of the way through the first day, closed the doorway, and waited in it until sunrise. The
failures in p5 were mostly ours: an open doorway let mobs in, and a crafting table that ignored a
click turned into a run of 15-second timeouts. With those fixed, the goal no longer separates the
models. It now measures cost and how many decisions they take. The next test has to be harder: the
team goal.

## The numbers

| Model | Met (p5) | Met (p6) | p6 95% CI | Deaths | Decisions (median) | Cost, 3 runs (p5) | Cost, 3 runs (p6) |
|---|---|---|---|---|---|---|---|
| Opus 5.5 | 2 of 3 | **3 of 3** | 44%–100% | 0 | 23 | $1.00 | $0.68 |
| Sonnet 5.5 | 1 of 3 | **3 of 3** | 44%–100% | 0 | 33 | $0.72 | $0.43 |
| GPT-6 Luna | 1 of 3 | **3 of 3** | 44%–100% | 0 | 22 | $0.07 | $0.03 |
| Haiku 4.5 | 0 of 3 | **3 of 3** | 44%–100% | 0 | 28 | $0.96 | $0.52 |

- Every run is valid (no lost connections). Three runs per model is still a small sample. But 12 of
  12, after 4 of 12, is a real change, and the logs say why (next section).
- The game's goal check ended every run at sunrise, between 22,020 and 23,040 ticks.
- Lowest health in every run: 20 of 20. Lowest food: 20 of 20. A one-day goal with this much
  waiting does not use up the starting saturation, so `outpost` says nothing about hunger.
- Costs fell because runs were shorter: no night spent fleeing, fighting or rebuilding. Luna is
  about 1 cent a run. Sonnet and Opus are 13–22 cents. Haiku is 16–19 cents, because it still
  never caches.

## Why p5 failed and p6 didn't

What changed between the two batches, and what the p6 logs show for each:

| p5 failure | Cause | Fix (all checked live before p6) | In p6 |
|---|---|---|---|
| Mobs walked in through the shelter's open doorway (3 runs) | Our code | `build_shelter` fills the doorway behind the builder | Every shelter closed ("with the doorway closed behind you") |
| Crafting stalled for minutes after a table ignored one click (5 runs) | Our code | Opening a table has its own 4-second limit, then one step closer and one more try | 0 craft timeouts in 12 runs |
| Shelters built over holes (poc6) | Our code | The floor is filled under the interior and doorway first | No damage inside any shelter |
| A zombie outside a closed shelter interrupted the agent, which went out (poc6) | Our code | A hostile no longer interrupts an agent inside a closed shelter; damage still does. The observation says `inShelter` | `inShelter` in 11–25 observations per run; no one left |
| `build_shelter` reported an interrupted dig as an unclearable block (Haiku run 3) | Our code | It says it was interrupted | Not seen |
| Agents left a working shelter at night (4 runs) | The model | Nothing in code | 0 runs. Nothing interrupted them, and `inShelter` told them they were safe |

The last row is the one to be careful with. In p5, leaving at night was the model's choice. But
the agents that left had been interrupted or hurt first. With the doorway closed and no false
alarms, nothing pushed them out, so it is not clear that the models' judgement changed.

## What each model did

- **Opus** was the most direct: tools, shelter, then `wait` until sunrise, in 23–25 decisions. In
  run 2 it picked up a dropped item on the way.
- **Luna** was the fewest decisions (20–22) and the cheapest by far. In run 2 it went under water
  at decision 3. The drowning reflex brought it up, it went on, and it built at 9,500 ticks, its
  latest build in the batch.
- **Sonnet** built at 3,800–6,600 ticks (Opus 4,100–4,900), then waited in shorter pieces: 22–25 `wait`s per run.
- **Haiku** built two-storey shelters in two runs, more than the goal asks. Each run it also tried to
  `sleep` three times: twice before beds can be used ("too early to sleep… 270 seconds from now"),
  then without a bed ("a bed is crafted from 3 wool and 3 planks"). In two runs it claimed "done"
  before the night had passed. Each time it was refused and told why, and it went on waiting. Its
  rationale shows it believed sleeping was part of surviving the night. The failure messages were
  accurate, and it lost nothing by trying.
- Haiku's run 3 used `climb_out` once, at decision 8, and it worked.

## What p6 didn't test

- **Animals and food.** The herds were placed in every run. They show in the observations of 5 runs
  (when an agent walked within sight of one), but no one hunted, sheared or ate: the goal needs none
  of it.
- **Tool wear.** No tool reached its last quarter of life in a run this short, so neither the
  `wearingOut` list nor the "your stone_pickaxe broke" event appeared.
- **Anything between agents.** Single-agent runs.

## Since p5, in short

Everything that went into the code between the two batches, for the record:

- **The shelter:** closed doorway, filled floor, best tool for clearing, an honest message when a dig
  is interrupted, `inShelter` in the observation, no hostile interrupts inside a closed shelter.
- **Crafting:** a bounded table open with one walk-up retry; no stale waits closing later windows.
- **Tool wear:** `wearingOut` and a break event (`src/toolWear.ts`). The first version crashed every
  agent at start (a listener added before the bot spawned). A smoke test with the scripted brain
  is now a step in starting any batch.
- **Herds:** 6 sheep, 4 cows, 4 pigs and 4 chickens are placed 45–60 blocks from spawn at the start of
  every run, since the forest around spawn has almost none.
- **Docs:** results index, generated reports per batch, limitations brought up to date, Claude Code
  skills for running and triaging batches.

## What's next

Running alongside p6, on a branch, and merged after it: chests (`store`, `take`), every recipe
unlocked at join, agents told who hit whom, and the `team-homestead` goal. That goal is three days
long. The team needs a two-storey shelter, a bed slept in by every member, an iron pickaxe for every
member, and 10 cooked meat in a chest. Hunger, iron, beds and sharing all have to happen there. It
is written up in [05-team-homestead.md](05-team-homestead.md) once it has run.
