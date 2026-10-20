# Run report: base_outpost_3

Scripted baseline (no model) · goal **outpost** · survival · no model: the scripted baseline · 2026-10-18

**Goal met** after 18:40 of game time.

> Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. Then survive the night. The episode ends by itself at sunrise once you have all of that.

## Verdict

- Met its goal in 83 decisions and 18:40 of game time.
- 63% of its decisions worked (52 of 83).
- After a failure it usually changed course (3 of 3).
- Most of its game time went on `wait` (43%).

## Scorecard

| | |
|---|---|
| Decisions | 83 |
| Worked / failed / interrupted | 52 / 3 / 28 |
| Changed course after a failure | 3 of 3 (100%) |
| Failures repeating an earlier failure | 0 of 3 |
| Longest loop of one failing decision | none |
| Told it was repeating itself, and kept on | - |
| Deaths | 0 |
| Lowest food (of 20) | 15 |
| Hits on / from other agents | - |
| Game time used | 18:40 of a 20:00 day, in 18 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:25 |
| Wooden pickaxe | step 2, 0:30 |
| Stone | step 3, 0:38 |
| Stone pickaxe | step 4, 0:44 |
| Shelter | step 6, 1:59 |
| Survived a night | step 83, 18:40 |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| wait | 43% | 35 | 35 | 0 | 0 |
| mine_stone | 23% | 3 | 2 | 1 | 0 |
| descend | 9% | 4 | 0 | 1 | 3 |
| flee | 7% | 6 | 6 | 0 | 0 |
| gather_wood | 7% | 2 | 2 | 0 | 0 |
| explore | 4% | 1 | 0 | 0 | 1 |
| craft | 2% | 6 | 6 | 0 | 0 |
| build_shelter | 2% | 1 | 1 | 0 | 0 |
| mine_ore | 2% | 13 | 0 | 1 | 12 |
| tunnel | 1% | 12 | 0 | 0 | 12 |

## What got in its way

- **15×** (descend, tunnel): stopped digging because zombie is 8 blocks away
- **9×** (mine_ore): stopped mining because zombie is 6 blocks away
- **1×** (mine_stone): ran out of time after gaining 5 of 6 cobblestone
- **1×** (mine_ore): no iron ore in reach within 48 blocks (there is some 29 blocks below you — descend closer first)
- **1×** (descend): stopped at y=58: every way down is unsafe (east: water behind the stone; south: water behind the stone; west: water behind the stone; north: water behind the stone) — explore or tunnel somewhere else and try again.
- **1×** (explore): interrupted: the sun is setting — night falls in about 59 seconds

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +6 dark oak log
- Step 2: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Step 3: **mine_stone** (1 ok): +3 cobblestone, +2 dirt
- Step 4: **craft** (1 ok): +1 dirt, +1 stone pickaxe
- Step 5: **gather_wood** (1 ok): +10 dark oak log
- Step 6: **build_shelter** (1 ok)
- Steps 7–11: **mine_stone ↔ craft** ×5 (4 ok, 1 failed): +15 dirt, +7 cobblestone, +4 stick, +2 dark oak planks
- Step 12: **mine_ore** (1 failed)
- Step 13: **descend** (1 failed): +32 cobblestone, +8 dirt
- Step 14: **explore** (1 interrupted): +2 cobblestone, +1 oak sapling
- Step 15: **mine_ore** (1 interrupted)
- Step 16: **flee** (1 ok)
- Step 17: **craft** (1 ok): +1 stone pickaxe
- Step 18: **descend** (1 interrupted): +13 dirt, +12 cobblestone, +8 diorite
- Step 19: **flee** (1 ok)
- Step 20: **mine_ore** (1 interrupted)
- Step 21: **descend** (1 interrupted): +1 dirt
- Step 22: **flee** (1 ok)
- Step 23: **mine_ore** (1 interrupted): +1 cobblestone
- Steps 24–26: **flee** ×3 (3 ok)
- Step 27: **wait** (1 ok)
- Step 28: **descend** (1 interrupted)
- Step 29: **wait** (1 ok)
- Step 30: **mine_ore** (1 interrupted)
- Step 31: **wait** (1 ok)
- Step 32: **tunnel** (1 interrupted)
- Step 33: **wait** (1 ok)
- Step 34: **mine_ore** (1 interrupted)
- Step 35: **wait** (1 ok)
- Step 36: **tunnel** (1 interrupted)
- …27 more stretches, to step 83

</details>

<details><summary>Final inventory and run details</summary>

44 cobblestone, 31 dirt, 3 dark oak log, 2 stone pickaxe, 1 oak sapling, 1 stone sword, 1 stone axe, 1 stone shovel, 1 stick, 1 wooden pickaxe, 1 dark oak planks

Started 2026-10-18 03:51 UTC · episode batch-b12-15 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
