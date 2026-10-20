# Run report: base_outpost_2

Scripted baseline (no model) · goal **outpost** · survival · no model: the scripted baseline · 2026-10-18

**Goal met** after 18:42 of game time.

> Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. Then survive the night. The episode ends by itself at sunrise once you have all of that.

## Verdict

- Met its goal in 36 decisions and 18:42 of game time.
- 89% of its decisions worked (32 of 36).
- After a failure it usually changed course (3 of 3).
- Most of its game time went on `wait` (51%).

## Scorecard

| | |
|---|---|
| Decisions | 36 |
| Worked / failed / interrupted | 32 / 3 / 1 |
| Changed course after a failure | 3 of 3 (100%) |
| Failures repeating an earlier failure | 1 of 3 |
| Longest loop of one failing decision | none |
| Told it was repeating itself, and kept on | - |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 18:42 of a 20:00 day, in 16 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 2:26 |
| Wooden pickaxe | step 2, 2:31 |
| Stone | step 3, 2:39 |
| Stone pickaxe | step 4, 2:46 |
| Shelter | step 6, 4:08 |
| Survived a night | step 36, 18:42 |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| wait | 51% | 19 | 19 | 0 | 0 |
| mine_stone | 21% | 3 | 3 | 0 | 0 |
| gather_wood | 18% | 2 | 2 | 0 | 0 |
| descend | 4% | 2 | 0 | 1 | 1 |
| build_shelter | 3% | 1 | 1 | 0 | 0 |
| craft | 2% | 6 | 6 | 0 | 0 |
| explore | 2% | 1 | 1 | 0 | 0 |
| mine_ore | 0% | 2 | 0 | 2 | 0 |

## What got in its way

- **2×** (mine_ore): no iron ore in reach within 48 blocks (there is some 29 blocks below you — descend closer first)
- **1×** (descend): stopped at y=69: every way down is unsafe (east: a drop into a cave; south: a drop into a cave; west: a drop into a cave; north: a drop into a cave) — explore or tunnel somewhere else and try again.
- **1×** (descend): interrupted: night is falling

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +6 dark oak log
- Step 2: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Step 3: **mine_stone** (1 ok): +3 cobblestone, +2 dirt
- Step 4: **craft** (1 ok): +1 dirt, +1 stone pickaxe
- Step 5: **gather_wood** (1 ok): +11 dark oak log
- Step 6: **build_shelter** (1 ok)
- Steps 7–12: **mine_stone ↔ craft** ×6 (6 ok): +9 cobblestone, +8 dirt, +4 stick, +2 dark oak planks
- Step 13: **mine_ore** (1 failed)
- Step 14: **descend** (1 failed): +2 cobblestone, +1 dirt
- Step 15: **explore** (1 ok): +5 dirt, +3 cobblestone
- Step 16: **mine_ore** (1 failed): +1 cobblestone
- Step 17: **descend** (1 interrupted): +17 cobblestone, +2 coal
- Steps 18–36: **wait** ×19 (19 ok)

</details>

<details><summary>Final inventory and run details</summary>

23 cobblestone, 13 dirt, 6 dark oak log, 2 coal, 2 stone pickaxe, 1 stone shovel, 1 stone sword, 1 stone axe, 1 stick, 1 wooden pickaxe, 1 dark oak planks

Started 2026-10-18 14:27 UTC · episode batch-b14-2 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
