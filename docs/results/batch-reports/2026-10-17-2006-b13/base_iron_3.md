# Run report: base_iron_3

Scripted baseline (no model) · goal **iron** · sandbox · no model: the scripted baseline · 2026-10-17

**Goal not met:** the time budget ran out.

> Craft an iron pickaxe. Once you have it, end the episode.

## Verdict

- Did not meet its goal. Still outstanding at the end: you have no iron_pickaxe.
- 70% of its decisions worked (31 of 44).
- After a failure it usually changed course (9 of 9).
- 3 of its 9 failures repeated a decision that had already failed the same way.
- Most of its game time went on `wait` (50%).

## Scorecard

| | |
|---|---|
| Decisions | 44 |
| Worked / failed / interrupted | 31 / 9 / 3 |
| Changed course after a failure | 9 of 9 (100%) |
| Failures repeating an earlier failure | 3 of 9 |
| Longest loop of one failing decision | none |
| Told it was repeating itself, and kept on | - |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 20:01 of a 20:00 day, in 19 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:34 |
| Wooden pickaxe | step 2, 0:39 |
| Stone | step 3, 0:47 |
| Stone pickaxe | step 4, 0:53 |
| Shelter | step 6, 1:58 |
| Survived a night | step 43, 19:09 |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| wait | 50% | 20 | 20 | 0 | 0 |
| descend | 20% | 5 | 0 | 3 | 2 |
| explore | 13% | 3 | 0 | 1 | 2 |
| gather_wood | 6% | 2 | 2 | 0 | 0 |
| craft | 4% | 6 | 6 | 0 | 0 |
| mine_stone | 3% | 2 | 2 | 0 | 0 |
| build_shelter | 3% | 1 | 1 | 0 | 0 |
| mine_ore | 2% | 5 | 0 | 5 | 0 |

## What got in its way

- **4×** (mine_ore): no iron ore in reach within 48 blocks (there is some 29 blocks below you — descend closer first)
- **2×** (descend): stopped at y=58: every way down is unsafe (east: water behind the stone; south: water behind the stone; west: water behind the stone; north: water behind the stone) — explore or tunnel somewhere else and try again.
- **1×** (explore): interrupted: you took damage (health 18)
- **1×** (descend): stopped at y=69: every way down is unsafe (south: a drop into a cave; west: a drop into a cave; north: a drop into a cave; east: a drop into a cave) — explore or tunnel somewhere else and try again.
- **1×** (explore): gave up after 3 attempts to walk onward were blocked (water, cliffs or walls); try a different place or another goal
- **1×** (explore): interrupted: the sun is setting — night falls in about 60 seconds

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +9 dark oak log
- Step 2: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Step 3: **mine_stone** (1 ok): +3 cobblestone, +2 dirt
- Step 4: **craft** (1 ok): +1 dirt, +1 stone pickaxe
- Step 5: **gather_wood** (1 ok): +6 dark oak log
- Step 6: **build_shelter** (1 ok)
- Step 7: **mine_stone** (1 ok): +6 cobblestone, +2 dirt
- Steps 8–10: **craft** ×3 (3 ok): +4 stick, +2 dark oak planks, +1 stone axe, +1 stone sword
- Step 11: **mine_ore** (1 failed)
- Step 12: **descend** (1 failed): +29 cobblestone, +5 coal, +2 dirt
- Step 13: **explore** (1 interrupted): +1 cobblestone
- Step 14: **mine_ore** (1 failed)
- Step 15: **craft** (1 ok): +9 cobblestone, +2 dirt, +1 stone pickaxe
- Step 16: **descend** (1 failed): +6 dirt, +5 cobblestone
- Step 17: **explore** (1 failed): +1 cobblestone
- Step 18: **mine_ore** (1 failed)
- Step 19: **descend** (1 failed): +37 cobblestone, +5 dirt
- Step 20: **explore** (1 interrupted): +4 cobblestone
- Step 21: **mine_ore** (1 failed): +1 raw iron
- Step 22: **descend** (1 interrupted): +21 cobblestone, +5 raw copper
- Steps 23–42: **wait** ×20 (20 ok): +3 raw copper
- Step 43: **mine_ore** (1 failed)
- Step 44: **descend** (1 interrupted): +31 cobblestone

</details>

<details><summary>Final inventory and run details</summary>

138 cobblestone, 8 raw copper, 7 dark oak log, 6 dirt, 5 coal, 2 dark oak planks, 1 raw iron, 1 stone pickaxe, 1 stone shovel, 1 stone sword, 1 stone axe, 1 wooden pickaxe, 1 stick

Started 2026-10-17 22:07 UTC · episode batch-b13-7 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
