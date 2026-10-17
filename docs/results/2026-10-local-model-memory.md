# Does a small local model need memory, or step-by-step instructions?

*Results from batches b1–b7, October 2026. Model: Qwen3 4B Instruct, running locally (free).
Every number here comes from logged runs (`npm run report -- --by condition --batch bN`).*

## In one paragraph

A small free model can play the basic Minecraft tasks reliably, but only once the code around
it does the fiddly work. Early on, the model reached the "stone pickaxe" goal in 3 of 9 runs. After
fixing the skill code, without changing the model, it reached it in 8 of 9. Giving the model a
written plan to carry between decisions made it **worse**, not better. Its own stale plans led
it into loops. Spelling out the steps in the goal turned out to be unnecessary.

## The setup

- **The task.** Two goals in a peaceful world: *craft a stone pickaxe* (gather wood, make a
  wooden pickaxe, mine stone, craft the stone pickaxe) and *build a shelter*.
- **How the model plays.** It never controls the character directly. It picks a high-level skill
  ("gather 10 logs", "craft a stone pickaxe"); our code carries it out and reports back. See
  [skills](../skills.md).
- **What we compared:**
  - **Scripted baseline:** fixed rules, no model. It shows what the task needs, and whether the
    model adds anything.
  - **Qwen, no memory:** the model sees only the current situation.
  - **Qwen, plan memory:** the model also sees a short plan it wrote last time.
  - **Qwen, full memory:** the model sees the whole conversation so far.
- **Two ways to state the goal.** "Craft a stone pickaxe" (bare), or the same with the steps
  spelled out (guided).
- **Fair comparison.** Every run gets a freshly generated copy of the same world, starting
  within a 20-block area. Runs are limited by in-game time (half a day), not by number of
  decisions. The game keeps running while the model thinks, so slow thinking costs time.
- **One agent per world.** These batches test one model on its own, not teamwork.

## Results

### Fixing the code mattered more than anything about the model

The same model on the same guided "stone pickaxe" goal, before and after fixes to the skill code:

| | No memory | Plan memory | Full memory |
|---|---|---|---|
| **Before** (b1) | 1 of 3 | 0 of 3 | 2 of 3 |
| **After** (b4) | 3 of 3 | 2 of 3 | 3 of 3 |

What changed in between was all deterministic code:
- Mining now digs down when no stone is in view.
- The pathfinder no longer spends the stone the agent just mined on climbing.
- The model is told which tools it can craft right now.
- The model is told when it repeats itself.
- The model was given a larger memory window.

### The current picture (b4 + b5, same code)

| Goal | Scripted baseline | Qwen, no memory | Qwen, plan memory | Qwen, full memory |
|---|---|---|---|---|
| Stone pickaxe, guided | 3/3 | 3/3 | 2/3 | 3/3 |
| Stone pickaxe, bare | 3/3 | 3/3 | **1/3** | 3/3 |
| Shelter, guided | 3/3 | 3/3 | 3/3 | 3/3 |
| Shelter, bare | 3/3 | 3/3 | 3/3 | **1/3** |
| **All** | **12/12** | **12/12** | **9/12** | **10/12** |

**How sure can we be?** With 3 runs per cell, a 3/3 is consistent with a true success rate as low
as 44%. That's the 95% interval, and these are small samples. Pooled over a whole column it's
firmer: no memory 12/12 (76–100%), plan memory 9/12 (47–91%).

### What went wrong in the failures

Every failure was read from its log.
- **Plan memory talked itself into loops.** In one run the model held 12 logs and kept
  asking to "gather one more log" 134 times. Its plan said so, and it trusted the plan over the
  game telling it, each time, "you already have 12 logs". In another, it had enough stone for a
  stone pickaxe for 30 decisions in a row, and was told so, but its plan still said "mine
  cobblestone, then craft".
- **A wood-naming mix-up** caused two full-memory shelter failures and fed the first loop.
  The model asked for "oak planks" while holding dark oak logs. The game's answer, "need more oak
  logs", sent it the wrong way, and it gave up. This was a flaw in our skill code, fixed after b5.
  b6 tests the fix (see below).
- **One drowning.** An agent walked down into a flooded cave chasing stone, drowned, and lost its
  tools. Mining now skips stone far below the agent, and the damage message says "you are out of
  air".

### Spelled-out steps weren't needed

Bare and guided goals did equally well for the model with no memory (6/6 each) and with full
memory on the pickaxe (3/3 each). The two weak cells, plan memory on the pickaxe and full memory on
the shelter, failed for the reasons above, not for lack of instructions.

### After the wood fix (b6)

| Goal | Qwen, plan memory | Qwen, full memory |
|---|---|---|
| Stone pickaxe, bare | 0/3 | 3/3 |
| Shelter, bare | 1/3 | 2/3 |

**The wood fix worked.** In 13 cases the model asked for "oak planks" while holding dark oak, and
it was given dark oak planks instead of an error. No run failed on wood names.

**Plan memory got worse, and the fix wasn't the cause.**
- Two plan-memory runs fell into a flooded cave and drowned, slowly, over 20+ decisions. They
  kept choosing "mine stone", which was interrupted at once each time by drowning damage. The
  cave-depth change made this more likely, because the agent dug straight down more often; a cave
  sits under the spawn area.
- After b6 we added two more fixes: digging down now stops when a cave opens below, and an agent
  under water is moved to dry ground before any skill starts.
- The other plan-memory failures were loops again. One agent held 52 planks, more than the
  shelter needs, and asked for "one more log" 120 times without ever trying to build. The game
  said "you already have 4 logs" every time.

**Full memory stayed strong** (5 of 6), the same as in b5.

### After the drowning fixes (b7)

| Goal | Qwen, plan memory | Qwen, full memory |
|---|---|---|
| Stone pickaxe, bare | **0/3** | 3/3 |
| Shelter, bare | 3/3 | 3/3 |

**No drownings.** No agent died in b7.

**Plan memory still failed every stone-pickaxe run, and all three were loops:**
- One agent asked for "4 oak planks" 20 times in a row and made 68 planks. Then it asked for
  "one more log" over and over, each time told "you already have 9 logs".
- Two agents mined stone over and over, up to 73 cobblestone, with a plan reading "mine 4
  cobblestone, then craft a stone pickaxe". They never went back to the craft step.

In each case the model copied its last plan forward almost word for word and followed it,
whatever the game reported.

b7 also gave the model four new skills (mining ore, smelting, digging down, tunnelling), so
its menu was longer than in b6. It used one of them twice, so this is unlikely to explain the
results.

**So far, across b4–b7 on comparable code:**
- full memory: 21 of 24 (69–96%)
- plan memory: 13 of 24 (35–72%)
- no memory: 12 of 12 (76–100%)

A written plan is the one memory setting that keeps hurting this model.

## What it costs

All of these runs were free: the model runs on the laptop. A typical successful run used 2–12
decisions and about 3,000–21,000 input tokens. At published cloud prices, the same runs would cost about 2 cents or
less each on the cheap tiers, and up to roughly 20 cents on the most expensive frontier models. Runs
that loop cost far more: the 134-step loop used about 198,000 input tokens.

## Caveats

- **Small samples.** 3 runs per condition. Treat single-cell differences as hints, not findings.
- **One model.** These results are about one 4B model. Bigger models may use plans well. That's
  what the paid runs are for.
- **Starting point varies a little.** All agents start within 20 blocks of each other, but some
  start next to oak trees and others next to dark oak, which mattered here.
- **The code kept changing between early batches.** Only b4 and b5 ran the same code, so the
  "current picture" uses those two.
