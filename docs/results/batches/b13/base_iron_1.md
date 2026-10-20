# Run report: base_iron_1

Scripted baseline (no model) · goal **iron** · sandbox · no model: the scripted baseline · 2026-10-17

**Goal not met:** the time budget ran out.

> Craft an iron pickaxe. Once you have it, end the episode.

## Verdict

- Did not meet its goal. Still outstanding at the end: you have no iron_pickaxe.
- 80% of its decisions worked (33 of 41).
- After a failure it usually changed course (6 of 6).
- Most of its game time went on `wait` (49%).

## Scorecard

| | |
|---|---|
| Decisions | 41 |
| Worked / failed / interrupted | 33 / 6 / 2 |
| Changed course after a failure | 6 of 6 (100%) |
| Failures repeating an earlier failure | 2 of 6 |
| Longest loop of one failing decision | none |
| Told it was repeating itself, and kept on | - |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 20:16 of a 20:00 day, in 20 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:23 |
| Wooden pickaxe | step 2, 0:28 |
| Stone | step 4, 5:02 |
| Stone pickaxe | step 5, 5:35 |
| Shelter | step 7, 6:24 |
| Survived a night | step 39, 19:13 |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| wait | 49% | 20 | 20 | 0 | 0 |
| mine_stone | 21% | 2 | 1 | 1 | 0 |
| explore | 12% | 3 | 3 | 0 | 0 |
| descend | 7% | 3 | 0 | 2 | 1 |
| craft | 4% | 7 | 6 | 0 | 1 |
| gather_wood | 4% | 2 | 2 | 0 | 0 |
| build_shelter | 2% | 1 | 1 | 0 | 0 |
| mine_ore | 0% | 3 | 0 | 3 | 0 |

## What got in its way

- **3×** (mine_ore): no iron ore in reach within 48 blocks (there is some 31 blocks below you — descend closer first)
- **1×** (mine_stone): ran out of time after gaining 0 of 3 cobblestone
- **1×** (descend): stopped at y=69: every way down is unsafe (west: a drop into a cave; north: a drop into a cave; east: a drop into a cave; south: a drop into a cave) — explore or tunnel somewhere else and try again.
- **1×** (craft): interrupted: the sun is setting — night falls in about 59 seconds
- **1×** (descend): interrupted: night is falling
- **1×** (descend): stopped at y=59: every way down is unsafe (south: water behind the stone; west: water behind the stone; north: water behind the stone; east: water behind the stone) — explore or tunnel somewhere else and try again.

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +7 oak log
- Step 2: **craft** (1 ok): +3 oak planks, +2 stick, +1 wooden pickaxe
- Step 3: **mine_stone** (1 failed): +8 dirt
- Step 4: **explore** (1 ok): +10 cobblestone
- Step 5: **craft** (1 ok): +6 cobblestone, +1 dirt, +1 stone pickaxe
- Step 6: **gather_wood** (1 ok): +5 dark oak log
- Step 7: **build_shelter** (1 ok): +1 dark oak log
- Step 8: **mine_stone** (1 ok): +7 cobblestone
- Steps 9–11: **craft** ×3 (3 ok): +4 dark oak planks, +4 stick, +1 stone axe, +1 stone sword
- Step 12: **mine_ore** (1 failed)
- Step 13: **descend** (1 failed): +6 dirt, +6 cobblestone, +1 dark oak log
- Step 14: **explore** (1 ok): +1 cobblestone
- Step 15: **mine_ore** (1 failed)
- Steps 16–17: **craft** ×2 (1 ok, 1 interrupted): +1 crafting table, +1 stone pickaxe
- Step 18: **descend** (1 interrupted): +17 cobblestone, +12 dirt, +1 oak sapling
- Steps 19–38: **wait** ×20 (20 ok): +1 cobblestone
- Step 39: **mine_ore** (1 failed)
- Step 40: **descend** (1 failed): +2 cobblestone
- Step 41: **explore** (1 ok): +2 cobblestone

</details>

<details><summary>Final inventory and run details</summary>

27 cobblestone, 13 dirt, 5 dark oak log, 2 stone pickaxe, 2 dark oak planks, 1 oak sapling, 1 stone sword, 1 stone shovel, 1 stone axe, 1 wooden pickaxe, 1 stick

Started 2026-10-17 20:07 UTC · episode batch-b13-1 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
