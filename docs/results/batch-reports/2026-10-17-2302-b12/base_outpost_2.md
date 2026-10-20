# Run report: base_outpost_2

Scripted baseline (no model) · goal **outpost** · survival · no model: the scripted baseline · 2026-10-18

**Goal not met:** the time budget ran out.

> Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. Then survive the night. The episode ends by itself at sunrise once you have all of that.

## Verdict

- Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; you have not yet survived a night since building the shelter.
- 80% of its decisions worked (40 of 50).
- After a failure it usually changed course (4 of 5).
- Most of its game time went on `wait` (45%).
- It died 1 time, losing what it carried each time.

## Scorecard

| | |
|---|---|
| Decisions | 50 |
| Worked / failed / interrupted | 40 / 5 / 4 |
| Changed course after a failure | 4 of 5 (80%) |
| Failures repeating an earlier failure | 0 of 5 |
| Longest loop of one failing decision | none |
| Told it was repeating itself, and kept on | - |
| Deaths | 1 |
| Lowest food (of 20) | 16 |
| Hits on / from other agents | - |
| Game time used | 22:30 of a 20:00 day, in 22 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:17 |
| Wooden pickaxe | step 2, 0:22 |
| Stone | step 3, 0:33 |
| Stone pickaxe | step 4, 0:42 |
| Shelter | step 6, 3:33 |
| Survived a night | not reached |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| wait | 45% | 20 | 20 | 0 | 0 |
| descend | 15% | 2 | 0 | 1 | 1 |
| gather_wood | 13% | 4 | 3 | 0 | 1 |
| mine_stone | 11% | 5 | 2 | 1 | 2 |
| explore | 4% | 3 | 3 | 0 | 0 |
| flee | 4% | 5 | 4 | 1 | 0 |
| build_shelter | 3% | 1 | 1 | 0 | 0 |
| craft | 3% | 7 | 7 | 0 | 0 |
| mine_ore | 2% | 3 | 0 | 2 | 1 |

## What got in its way

- **1×** (mine_ore): no iron ore in reach within 48 blocks (there is some 31 blocks below you — descend closer first)
- **1×** (descend): stopped at y=58: every way down is unsafe (south: water behind the diorite; west: water behind the diorite; north: water behind the stone; east: water behind the diorite) — explore or tunnel somewhere else and try again.
- **1×** (mine_ore): no iron ore in reach within 48 blocks — explore, descend or dig a tunnel to uncover some
- **1×** (descend): stopped digging because creeper is 8 blocks away
- **1×** (mine_ore): stopped mining because creeper is 7 blocks away
- **1×** (flee): could not find a path away from the hostiles, and could not wall yourself in (2 gaps left)

## Notable moments

- Step 21: you died and respawned

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +5 dark oak log
- Step 2: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Step 3: **mine_stone** (1 ok): +4 cobblestone, +3 dirt
- Step 4: **craft** (1 ok): +1 stone pickaxe
- Step 5: **gather_wood** (1 ok): +11 dark oak log
- Step 6: **build_shelter** (1 ok): +1 dark oak planks
- Step 7: **mine_stone** (1 ok): +7 cobblestone
- Steps 8–10: **craft** ×3 (3 ok): +4 stick, +2 dirt, +2 dark oak planks, +1 stone axe
- Step 11: **mine_ore** (1 failed)
- Step 12: **descend** (1 failed): +35 cobblestone, +11 raw copper, +6 dirt, +1 diorite
- Step 13: **explore** (1 ok): +10 cobblestone, +4 dirt, +1 diorite
- Step 14: **mine_ore** (1 failed): +1 cobblestone
- Step 15: **craft** (1 ok): +1 stone pickaxe
- Step 16: **descend** (1 interrupted): +45 cobblestone, +31 diorite, +1 coal
- Step 17: **flee** (1 ok): +1 diorite
- Step 18: **mine_ore** (1 interrupted): +39 cobblestone
- Steps 19–20: **flee** ×2 (1 ok, 1 failed): +3 cobblestone, +1 moss block
- Steps 21–40: **wait** ×20 (20 ok)
- Step 41: **mine_stone** (1 failed)
- Step 42: **gather_wood** (1 interrupted)
- Step 43: **flee** (1 ok)
- Step 44: **explore** (1 ok)
- Step 45: **gather_wood** (1 ok): +6 dark oak log
- Step 46: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Step 47: **mine_stone** (1 interrupted): +3 dirt
- Step 48: **flee** (1 ok)
- Step 49: **explore** (1 ok)
- Step 50: **mine_stone** (1 interrupted): +4 dirt, +2 cobblestone

</details>

<details><summary>Final inventory and run details</summary>

4 dirt, 3 dark oak log, 3 dark oak planks, 2 cobblestone, 2 stick, 1 wooden pickaxe

Started 2026-10-18 01:32 UTC · episode batch-b12-8 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
