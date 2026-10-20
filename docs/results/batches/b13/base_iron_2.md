# Run report: base_iron_2

Scripted baseline (no model) · goal **iron** · sandbox · no model: the scripted baseline · 2026-10-17

**Goal not met:** the time budget ran out.

> Craft an iron pickaxe. Once you have it, end the episode.

## Verdict

- Did not meet its goal. Still outstanding at the end: you have no iron_pickaxe.
- 62% of its decisions worked (18 of 29).
- After a failure it usually changed course (7 of 7).
- Most of its game time went on `mine_ore` (38%).

## Scorecard

| | |
|---|---|
| Decisions | 29 |
| Worked / failed / interrupted | 18 / 7 / 4 |
| Changed course after a failure | 7 of 7 (100%) |
| Failures repeating an earlier failure | 1 of 7 |
| Longest loop of one failing decision | none |
| Told it was repeating itself, and kept on | - |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 20:00 of a 20:00 day, in 20 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:25 |
| Wooden pickaxe | step 2, 0:30 |
| Stone | step 3, 0:38 |
| Stone pickaxe | step 4, 0:44 |
| Shelter | step 6, 2:06 |
| Survived a night | step 28, 19:38 |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| mine_ore | 38% | 8 | 1 | 6 | 1 |
| descend | 27% | 6 | 3 | 1 | 2 |
| mine_stone | 18% | 2 | 2 | 0 | 0 |
| gather_wood | 6% | 2 | 2 | 0 | 0 |
| explore | 3% | 1 | 1 | 0 | 0 |
| craft | 3% | 7 | 7 | 0 | 0 |
| build_shelter | 3% | 1 | 1 | 0 | 0 |
| smelt | 2% | 1 | 0 | 0 | 1 |
| tunnel | 0% | 1 | 1 | 0 | 0 |

## What got in its way

- **3×** (mine_ore): no iron ore in reach within 48 blocks (there is some 28 blocks below you — descend closer first)
- **1×** (descend): stopped at y=69: every way down is unsafe (north: a drop into a cave; east: a drop into a cave; south: a drop into a cave; west: a drop into a cave) — explore or tunnel somewhere else and try again.
- **1×** (descend): interrupted: the sun is setting — night falls in about 59 seconds
- **1×** (mine_ore): no iron ore in reach within 48 blocks — explore, descend or dig a tunnel to uncover some
- **1×** (descend): interrupted: night is falling
- **1×** (mine_ore): ran out of time after gaining 0 of 1 raw_iron

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +6 dark oak log
- Step 2: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Step 3: **mine_stone** (1 ok): +3 cobblestone, +2 dirt
- Step 4: **craft** (1 ok): +1 dirt, +1 stone pickaxe
- Step 5: **gather_wood** (1 ok): +11 dark oak log
- Step 6: **build_shelter** (1 ok)
- Step 7: **mine_stone** (1 ok): +7 cobblestone, +7 dirt
- Steps 8–10: **craft** ×3 (3 ok): +4 stick, +2 dark oak planks, +1 stone axe, +1 stone sword
- Step 11: **mine_ore** (1 failed)
- Step 12: **descend** (1 failed): +5 cobblestone, +1 dirt
- Step 13: **explore** (1 ok): +3 cobblestone
- Step 14: **mine_ore** (1 failed)
- Step 15: **craft** (1 ok): +1 stone pickaxe
- Steps 16–21: **descend ↔ mine_ore** ×6 (1 ok, 3 failed, 2 interrupted): +184 cobblestone, +32 clay ball, +9 diorite, +8 gravel
- Step 22: **craft** (1 ok): +2 stick, +2 dark oak planks, +1 stone pickaxe
- Step 23: **descend** (1 ok): +5 cobblestone, +3 moss block, +1 moss carpet
- Step 24: **mine_ore** (1 interrupted): +1 moss block
- Step 25: **tunnel** (1 ok): +1 wheat seeds, +1 moss block, +1 moss carpet
- Step 26: **mine_ore** (1 failed): +14 cobblestone, +10 moss block, +4 clay ball, +2 moss carpet
- Step 27: **descend** (1 ok): +16 cobblestone
- Step 28: **mine_ore** (1 ok): +1 raw iron, +1 moss block
- Step 29: **smelt** (1 interrupted): +1 iron ingot

</details>

<details><summary>Final inventory and run details</summary>

214 cobblestone, 36 clay ball, 16 moss block, 9 diorite, 8 gravel, 4 moss carpet, 4 dark oak log, 3 dark oak planks, 3 stick, 2 wheat seeds, 2 stone pickaxe, 1 iron ingot, 1 big dripleaf, 1 stone shovel, 1 stone sword, 1 stone axe, 1 wooden pickaxe

Started 2026-10-17 21:09 UTC · episode batch-b13-4 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
