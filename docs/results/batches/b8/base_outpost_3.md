# Run report: base_outpost_3

Scripted baseline (no model) · goal **outpost** · survival · no model: the scripted baseline · 2026-10-17

**Goal not met:** the run stopped (step limit / stopped).

> Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. Then survive the night. The episode ends by itself at sunrise once you have all of that.

## Verdict

- Did not meet its goal. Still outstanding at the end: you have no stone_axe; you have no stone_sword; you have no stone_shovel; you have not yet survived a night since building the shelter.
- 12% of its decisions worked (7 of 58).
- After a failure it mostly repeated itself (5 of 25).
- 20 of its 25 failures repeated a decision that had already failed the same way.
- Its longest loop: `craft {"item":"stone_axe","count":1}` failed 6 times in a row from step 8 with "crafting stone_axe failed: the server did not fill the crafting grid for minecraft:stick".
- It was told 9 times that its last decisions were all the same, and chose the same again 5 times.
- Most of its game time went on `mine_stone` (42%).

## Scorecard

| | |
|---|---|
| Decisions | 58 |
| Worked / failed / interrupted | 7 / 25 / 26 |
| Changed course after a failure | 5 of 25 (20%) |
| Failures repeating an earlier failure | 20 of 25 |
| Longest loop of one failing decision | 6× from step 8 |
| Told it was repeating itself, and kept on | 5 of 9 |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 7:06 of a 20:00 day, in 7 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:24 |
| Wooden pickaxe | step 2, 0:29 |
| Stone | step 3, 1:27 |
| Stone pickaxe | step 4, 1:33 |
| Shelter | step 6, 2:49 |
| Survived a night | not reached |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| mine_stone | 42% | 2 | 2 | 0 | 0 |
| descend | 18% | 3 | 0 | 0 | 3 |
| craft | 17% | 26 | 2 | 24 | 0 |
| gather_wood | 14% | 2 | 2 | 0 | 0 |
| build_shelter | 9% | 1 | 1 | 0 | 0 |
| mine_ore | 0% | 12 | 0 | 1 | 11 |
| tunnel | 0% | 12 | 0 | 0 | 12 |

## What got in its way

- **15×** (descend, tunnel): stopped digging because skeleton is 7 blocks away
- **11×** (mine_ore): stopped mining because skeleton is 7 blocks away
- **6×** (craft): crafting stone_axe failed: the server did not fill the crafting grid for minecraft:stick
- **6×** (craft): crafting stone_sword failed: the server did not fill the crafting grid for minecraft:stick
- **6×** (craft): crafting stone_shovel failed: the server did not fill the crafting grid for minecraft:stick
- **6×** (craft): crafting stone_pickaxe failed: the server did not fill the crafting grid for minecraft:stick

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +6 dark oak log
- Step 2: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Step 3: **mine_stone** (1 ok): +3 dirt, +3 cobblestone
- Step 4: **craft** (1 ok): +1 stone pickaxe
- Step 5: **gather_wood** (1 ok): +11 dark oak log
- Step 6: **build_shelter** (1 ok): +28 dark oak planks
- Step 7: **mine_stone** (1 ok): +26 cobblestone
- Steps 8–25: **craft** ×18 (18 failed): +4 dirt, +3 cobblestone
- Step 26: **mine_ore** (1 failed)
- Steps 27–32: **craft** ×6 (6 failed)
- Steps 33–38: **descend ↔ mine_ore** ×6 (6 interrupted): +30 cobblestone, +8 dirt, +1 crafting table
- Steps 39–58: **tunnel ↔ mine_ore** ×20 (20 interrupted)

</details>

<details><summary>Final inventory and run details</summary>

59 cobblestone, 12 dirt, 9 dark oak log, 2 dark oak planks, 1 crafting table, 1 wooden pickaxe, 1 stone pickaxe

Started 2026-10-17 10:44 UTC · episode batch-b8-9 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
