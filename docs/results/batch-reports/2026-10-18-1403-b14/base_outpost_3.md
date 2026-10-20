# Run report: base_outpost_3

Scripted baseline (no model) · goal **outpost** · survival · no model: the scripted baseline · 2026-10-18

**Goal met** after 19:27 of game time.

> Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. Then survive the night. The episode ends by itself at sunrise once you have all of that.

## Verdict

- Met its goal in 48 decisions and 19:27 of game time.
- 88% of its decisions worked (42 of 48).
- After a failure it usually changed course (3 of 3).
- Most of its game time went on `wait` (51%).
- It died 1 time, losing what it carried each time.

## Scorecard

| | |
|---|---|
| Decisions | 48 |
| Worked / failed / interrupted | 42 / 3 / 3 |
| Changed course after a failure | 3 of 3 (100%) |
| Failures repeating an earlier failure | 0 of 3 |
| Longest loop of one failing decision | none |
| Told it was repeating itself, and kept on | - |
| Deaths | 1 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 19:27 of a 20:00 day, in 19 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:25 |
| Wooden pickaxe | step 2, 0:31 |
| Stone | step 3, 0:38 |
| Stone pickaxe | step 4, 0:46 |
| Shelter | step 6, 2:03 |
| Survived a night | step 45, 19:15 |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| wait | 51% | 20 | 20 | 0 | 0 |
| mine_stone | 18% | 7 | 5 | 0 | 2 |
| gather_wood | 14% | 4 | 4 | 0 | 0 |
| craft | 5% | 11 | 11 | 0 | 0 |
| build_shelter | 4% | 2 | 2 | 0 | 0 |
| explore | 3% | 1 | 0 | 0 | 1 |
| descend | 3% | 1 | 0 | 1 | 0 |
| mine_ore | 1% | 2 | 0 | 2 | 0 |

## What got in its way

- **1×** (mine_ore): no iron ore in reach within 48 blocks (there is some 25 blocks below you — descend closer first)
- **1×** (descend): stopped at y=61: every way down is unsafe (east: water behind the stone; south: water behind the stone; west: water behind the stone; north: water behind the stone) — explore or tunnel somewhere else and try again.
- **1×** (explore): interrupted: you took damage (health 18)
- **1×** (mine_ore): iron ore needs at least a stone_pickaxe — craft one first
- **1×** (mine_stone): interrupted: the sun is setting — night falls in about 60 seconds
- **1×** (mine_stone): interrupted: night is falling

## Notable moments

- Step 17: you died and respawned

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +5 dark oak log
- Step 2: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Step 3: **mine_stone** (1 ok): +3 cobblestone, +2 dirt
- Step 4: **craft** (1 ok): +1 dark oak log, +1 stone pickaxe
- Step 5: **gather_wood** (1 ok): +11 dark oak log
- Step 6: **build_shelter** (1 ok)
- Steps 7–12: **mine_stone ↔ craft** ×6 (6 ok): +9 cobblestone, +4 stick, +3 dirt, +2 dark oak planks
- Step 13: **mine_ore** (1 failed)
- Step 14: **descend** (1 failed): +20 cobblestone, +1 dirt
- Step 15: **explore** (1 interrupted): +3 cobblestone
- Step 16: **mine_ore** (1 failed)
- Step 17: **gather_wood** (1 ok): +6 dark oak log
- Step 18: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Step 19: **mine_stone** (1 ok): +3 cobblestone, +3 dirt
- Step 20: **craft** (1 ok): +1 stone pickaxe
- Step 21: **gather_wood** (1 ok): +7 dark oak log, +1 dark oak planks
- Step 22: **build_shelter** (1 ok)
- Steps 23–24: **mine_stone** ×2 (2 interrupted): +8 dirt, +3 cobblestone
- Steps 25–44: **wait** ×20 (20 ok)
- Steps 45–48: **craft ↔ mine_stone** ×4 (4 ok): +4 stick, +2 dark oak planks, +2 cobblestone, +1 stone axe

</details>

<details><summary>Final inventory and run details</summary>

6 dark oak log, 6 dirt, 3 stick, 1 stone sword, 1 stone axe, 1 wooden pickaxe, 1 stone pickaxe, 1 stone shovel

Started 2026-10-18 14:44 UTC · episode batch-b14-3 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
