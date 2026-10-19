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

## With the time until night, the dusk interrupt and the progress list (b12)

*Batch b12, 17–18 October, on main at `1d049ee`: the smelt, flooded-cave, flee, dusk and
`--progress` changes. Survival, 27,000 ticks. The baseline, and the model with each memory
setting, with `--progress` off and on: 7 conditions, 3 runs each.*

| Condition | Progress off | Progress on |
|---|---|---|
| Scripted baseline | 1/3 | – |
| Model, no memory | 0/3 | 1/3 |
| Model, plan memory | 1/3 | 1/3 |
| Model, full memory | 0/3 | 0/3 |

- **The model did better than in b8 and b9, but not by enough to call.** It met the goal in
  3 of 18 runs (1 of 18 before). With the progress list it was 2 of 9 runs, and 1 of 9 without.
- **The progress list got the model to build shelters.** With it, the model tried
  `build_shelter` in 6 of 9 runs; without it, in 3 of 9. The no-memory model never tried
  without it, and tried in all three runs with it.
- **The baseline fell from 3/3 (b10) to 1/3, and the likely cause is the flooded-cave fix.**
  After its shelter and tools, the baseline goes on to dig for iron. In b10 the flooded cave
  stopped it near its shelter. In b12 the new move-elsewhere rule took it away to dig. One run
  wore out its last stone pickaxe and did not make another. That left it with 3 of the 4 tools
  at the end. It also failed `smelt` three times with "destination full". The other run was
  cornered by a creeper underground at night and died, losing everything. The baseline's
  outpost should probably stop at the outpost. Not fixed.
- **"need N more cobblestone" loops dominate the model's runs.** All three no-memory,
  progress-off runs had all four tools before night (by tick 5,400, 6,200 and 10,900). They
  then spent the rest of the run crafting stone tools they already had: 49–91 crafts per run,
  most of them failing for want of cobblestone. None of them
  ever tried the shelter. This is the same missing hint as in the iron batch: the message
  doesn't name `mine_stone`, nor say the tool is already held.
- **One success was given up.** A no-memory, progress-on run had all four tools and a shelter
  at dusk. It then said "done" twice, before surviving the night. The second "done" ends a run
  by design, so the run ended without the goal.
- **Full memory gave up.** Five of its six runs ended with the model saying "done" twice, after
  only 13–40 decisions. The local model's window is set to 8,192 tokens, so full memory fills
  it: each call sent about 7,100–7,400 tokens. The model's reasons ("all paths have been
  blocked", "cannot be completed within the time") read like a model that has seen many of its
  own failures.
- **`build_shelter` failed to clear its own floor** in four runs, on dirt, grass, stone and
  coal ore: "blocked by grass_block that I cannot clear". Dirt and grass can be dug by hand, so
  the dig itself probably failed or timed out. Not investigated.
- **`craft` timed out on stone tools,** 8 and 16 times in two runs ("crafting stone_axe timed
  out after 15000ms"), as in b11. Not investigated.
- **Deaths were concentrated in a few runs:** 14 and 7 (plan memory, progress off and on),
  7 (no memory, progress on), 5 (full memory, progress on) and 4 (plan memory, progress on).
  Each death loses the tools.

## After the spare-pickaxe fix (b14)

*Batch b14, 18 October: the baseline alone, three runs, on main with the spare-pickaxe rule and the
cobblestone message fix.* **3/3**, against 1/3 in b12. In every run the baseline made a spare
stone pickaxe before digging, and in two it then held, keeping its tools. One run died once
underground and still met the goal. Three runs can't show the fix is complete; being caught
underground at night is still possible.

## The model on today's code, and the loop it can't leave (b15, b16)

*Batch b15, 18–19 October: the model with plan memory, `--progress` off and on, three runs each,
on main after the team-run changes (requests between agents, the drowning fixes, the agent's own
name, optional skill arguments, and `gather_wood` reporting a request for logs already held as a
failure). Batch b16, 19 October: three runs with plan memory and progress off, on the code b12 ran
(`4bfbe1d`: b12's `1d049ee` plus three commits that touch only paid models and batch options), to
check whether those changes were to blame. Both survival, 27,000 ticks.*

| Batch | Code | Met | Longest run of `gather_wood` in a row, per run |
|---|---|---|---|
| b12, plan memory | b12's | 2/6 | 88, 68, 3, 78, 4, 4 |
| b16 | b12's | 0/3 | 72, 5, 106 |
| b15 | today's | 0/6 | 72, 145, 153, 35, 98, 125 |

- **The model asks for logs it already holds, over and over, on both versions of the code.** In
  a b16 run it chose `gather_wood(4)` 106 times in a row while holding 10 logs. Each time it was
  told "you already have 10 logs, at least the 4 asked for — no need to gather more". What it
  lacked was cobblestone, and it never chose `mine_stone`. b9 had the same loop (about 180 times).
- **The repetition note doesn't change its mind.** Every third identical decision, the agent is
  told so ("your last 48 decisions were the same gather_wood({"count":4}) and all got the same
  result"). In b15 it chose the same decision again after 290 of 293 such notes; in that b16 run,
  after 42 of 43. **We don't break the loop for it:** the model is told plainly what it is doing,
  and not acting on that is the model's failure, so it is measured, not worked around. The run
  report now says how often the agent was told and kept on, and the comparison has a column for it.
- **There are two loops, and only one is new to look at.** At night, mobs interrupt `gather_wood`
  and the model chooses it again: b12's long runs were all this kind, as were two of b15's. In the
  morning, it asks for logs it holds: that started within the first six decisions in four of six
  b15 runs, and in one of nine runs on b12's code.
- **Whether today's code makes the morning loop more likely can't be told from this.** 4 of 6
  against 1 of 9 is suggestive, but the samples are small. Replaying the stuck moment to the model
  six to eight times, with today's prompt and messages and with b12's, gave `gather_wood` every
  time, so neither the prompt changes nor the new failure message explains it at that moment.
- **Pooled, the model met the outpost goal in 2 of 9 runs on b12's code and 0 of 6 on today's.**
  b12's 2 of 6 did not repeat in b16. Losing the morning to the loop means facing the night with
  logs and no tools: b15's runs died 1–13 times, mostly to zombies.

## What this suggests (not acted on)

- The model knows how to make tools but not when to stop and build. A goal this long may need a
  stronger model, or a skill that does "build the shelter before dark" by itself. That would be
  the code doing more, as the project's rule says it should.
- The repetition warning is not enough for a 4B model with plan memory. Its own plan tells it to
  repeat. b15 and b16 confirm it on both versions of the code. By the owner's decision the code
  will not stop the loop for the model: it is reported as the model's failure.
- The `flee` skill needs a way out of pits. See [limitations](../limitations.md).
