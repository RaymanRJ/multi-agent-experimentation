# Can a small local model hold an outpost through the night?

*Results from batches b8, b9 and b10, October 2026. Model: Qwen3 4B Instruct, running locally (free).
Every number here comes from logged runs (`npm run report -- --by condition --batch bN`), and
every failure was read from its log.*

## In one paragraph

The outpost goal is much harder than the earlier ones, and the small model mostly fails it. The
scripted baseline met it in 3 of 6 runs in b8 and b9, and 3 of 3 once the last bug was fixed
(b10); the model met it in 1 of 18. The model is good at the
first half: it usually makes all four stone tools. Then it either never builds the shelter or
loses its tools to mobs. Fixes to our code between b8 and b9 helped the baseline (1/3 to 2/3)
and gave the model its first success, but 3 runs per condition is too few to call any memory
setting better than another.

## The setup

- **The goal (`outpost`).** In a survival world with mobs at night: *before nightfall, make a
  stone pickaxe, axe, sword and shovel, and build a shelter. Then survive the night.* The run
  ends by itself at sunrise once all of that is done.
- **Time.** 27,000 ticks: one day and the following night.
- **Conditions.** The scripted baseline, and the model with no memory, plan memory and full
  memory. Three runs each, each in a fresh copy of the same seeded world.
- **What changed between b8 and b9** (all in our code, none in the model or the prompt):
  - a model that says "done" too early is told exactly what it is still missing;
  - a night slept through in a bed counts as a night survived;
  - shelter walls are never placed against a crafting table (doing so opened the table, and the
    server then silently ignored every later craft);
  - the agent loop no longer spins without a game tick when a skill refuses at once;
  - the baseline flees or waits out a mob once its shelter is built, instead of carrying on mining.

## Results

| Condition | b8 | b9 | Both |
|---|---|---|---|
| Scripted baseline | 1/3 | 2/3 | 3/6 |
| Model, no memory | 0/3 | 1/3 | 1/6 |
| Model, plan memory | 0/3 | 0/3 | 0/6 |
| Model, full memory | 0/3 | 0/3 | 0/6 |

With 3 runs, 1/3 is consistent with a true rate anywhere from 6% to 79%. None of the model
differences here are meaningful; only "the model fails this goal much more often than the
baseline" is.

## Why the runs failed (b9)

- **Tools made, shelter never attempted (3 runs: no memory ×2, plan memory ×1).** The agent had
  all four stone tools and then spent the rest of the day crafting, mining or waiting, without
  once choosing `build_shelter`. One no-memory run spent its last stretch pinned by a spider,
  retrying `mine_stone`, which kept stopping because the spider was close.
- **Stuck in a loop (plan memory ×1).** The agent chose `gather_wood(1)` about 180 times. Each
  time it was told it already had enough logs. The repetition warning did not break the loop,
  and the run hit the 200-decision safety cap.
- **Killed by mobs (plan memory and full memory, one or two runs each).** Agents that were still
  outside after dark died, between 2 and 9 times, and lost their tools each time.
- **Gave up (full memory ×1).** Cornered in a pit by a mob, the agent said "done", was told
  what it was missing, and said "done" again. `flee` cannot climb out of a pit.
- **Kicked for spam (baseline ×1).** A burst of instant failures sent about ten chat lines in a
  second, and the server kicked the bot. Narration is now rate-limited (merged after b9).
- **Full memory is slow.** Each decision took about 21 seconds, against 4–5 seconds for the
  other settings, because the whole conversation is resent. In a game that keeps running, that
  is a day of only about 40 decisions.

## After the spam fix (b10)

The baseline alone, re-run three times on the final code: **3/3**, with no kicks. Pooled over
b9 and b10, which differ only in the spam fix, the baseline is 5/6. The skills can do this goal;
the open question is the model.

## What this suggests (not acted on)

- The model knows how to make tools but not when to stop and build. A goal this long may need a
  stronger model, or a skill that does "build the shelter before dark" by itself. That would be
  the code doing more, as the project's rule says it should.
- The repetition warning is not enough for a 4B model with plan memory. Its own plan tells it to
  repeat.
- The `flee` skill needs a way out of pits. See [limitations](../limitations.md).
