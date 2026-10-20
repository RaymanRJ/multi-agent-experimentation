# Run report: base_outpost_3

Scripted baseline (no model) · goal **outpost** · survival · no model: the scripted baseline · 2026-10-17

**Goal met** after 18:39 of game time.

> Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. Then survive the night. The episode ends by itself at sunrise once you have all of that.

## Verdict

- Met its goal in 43 decisions and 18:39 of game time.
- 77% of its decisions worked (33 of 43).
- After a failure it usually changed course (9 of 10).
- 5 of its 10 failures repeated a decision that had already failed the same way.
- Most of its game time went on `wait` (51%).

## Scorecard

| | |
|---|---|
| Decisions | 43 |
| Worked / failed / interrupted | 33 / 10 / 0 |
| Changed course after a failure | 9 of 10 (90%) |
| Failures repeating an earlier failure | 5 of 10 |
| Longest loop of one failing decision | none |
| Told it was repeating itself, and kept on | - |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 18:39 of a 20:00 day, in 18 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:17 |
| Wooden pickaxe | step 2, 0:23 |
| Stone | step 3, 0:31 |
| Stone pickaxe | step 4, 0:37 |
| Shelter | step 6, 1:59 |
| Survived a night | step 43, 18:39 |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| wait | 51% | 19 | 19 | 0 | 0 |
| mine_stone | 23% | 3 | 2 | 1 | 0 |
| tunnel | 7% | 3 | 3 | 0 | 0 |
| gather_wood | 6% | 2 | 2 | 0 | 0 |
| descend | 6% | 3 | 0 | 3 | 0 |
| craft | 4% | 6 | 6 | 0 | 0 |
| build_shelter | 3% | 1 | 1 | 0 | 0 |
| mine_ore | 1% | 6 | 0 | 6 | 0 |

## What got in its way

- **6×** (mine_ore): no iron ore in reach within 48 blocks (there is some 29 blocks below you — descend closer first)
- **1×** (mine_stone): ran out of time after gaining 0 of 6 cobblestone
- **1×** (descend): stopped at y=60: every way down is unsafe (east: water behind the stone; south: water behind the stone; west: water behind the stone; north: water behind the stone) — explore or tunnel somewhere else and try again.
- **1×** (descend): stopped at y=68: every way down is unsafe (south: a drop into a cave; west: a drop into a cave; north: a drop into a cave; east: a drop into a cave) — explore or tunnel somewhere else and try again.
- **1×** (descend): stopped at y=68: every way down is unsafe (west: a drop into a cave; north: a drop into a cave; east: a drop into a cave; south: a drop into a cave) — explore or tunnel somewhere else and try again.

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +5 oak log
- Step 2: **craft** (1 ok): +3 oak planks, +2 stick, +1 wooden pickaxe
- Step 3: **mine_stone** (1 ok): +3 cobblestone, +2 dirt, +1 oak sapling
- Step 4: **craft** (1 ok): +1 dirt, +1 oak sapling, +1 stone pickaxe
- Step 5: **gather_wood** (1 ok): +12 dark oak log, +2 dirt
- Step 6: **build_shelter** (1 ok): +1 oak planks
- Steps 7–8: **mine_stone** ×2 (1 ok, 1 failed): +6 cobblestone, +3 dirt, +1 dark oak log
- Steps 9–11: **craft** ×3 (3 ok): +4 stick, +4 dark oak planks, +1 stone axe, +1 stone sword
- Step 12: **mine_ore** (1 failed)
- Step 13: **descend** (1 failed): +27 cobblestone, +5 dirt, +2 stick
- Step 14: **mine_ore** (1 failed): +1 cobblestone
- Step 15: **craft** (1 ok): +1 stone pickaxe
- Steps 16–19: **descend ↔ mine_ore** ×4 (4 failed): +6 cobblestone, +3 dirt
- Steps 20–23: **tunnel ↔ mine_ore** ×4 (2 ok, 2 failed): +27 cobblestone, +15 dirt, +4 coal
- Step 24: **tunnel** (1 ok): +7 dirt, +2 dark oak log, +1 oak log, +1 stick
- Steps 25–43: **wait** ×19 (19 ok)

</details>

<details><summary>Final inventory and run details</summary>

58 cobblestone, 32 dirt, 12 dark oak log, 4 coal, 4 stick, 3 dark oak planks, 2 stone pickaxe, 2 oak sapling, 1 oak log, 1 stone sword, 1 stone axe, 1 wooden pickaxe, 1 stone shovel

Started 2026-10-17 16:36 UTC · episode batch-b10-3 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
