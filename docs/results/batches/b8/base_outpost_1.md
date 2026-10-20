# Run report: base_outpost_1

Scripted baseline (no model) · goal **outpost** · survival · no model: the scripted baseline · 2026-10-17

**Goal not met:** the time budget ran out.

> Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. Then survive the night. The episode ends by itself at sunrise once you have all of that.

## Verdict

- Did not meet its goal. Still outstanding at the end: you have no stone_axe; you have no stone_sword; you have no stone_shovel; you have not yet survived a night since building the shelter.
- 47% of its decisions worked (40 of 86).
- After a failure it changed course about half the time (22 of 44).
- 34 of its 44 failures repeated a decision that had already failed the same way.
- Its longest loop: `craft {"item":"stone_axe","count":1}` failed 6 times in a row from step 8 with "crafting stone_axe failed: the server did not fill the crafting grid for minecraft:stick".
- It was told 8 times that its last decisions were all the same, and chose the same again 4 times.
- Most of its game time went on `wait` (61%).

## Scorecard

| | |
|---|---|
| Decisions | 86 |
| Worked / failed / interrupted | 40 / 44 / 1 |
| Changed course after a failure | 22 of 44 (50%) |
| Failures repeating an earlier failure | 34 of 44 |
| Longest loop of one failing decision | 6× from step 8 |
| Told it was repeating itself, and kept on | 4 of 8 |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 22:30 of a 20:00 day, in 22 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:22 |
| Wooden pickaxe | step 2, 0:28 |
| Stone | step 3, 0:38 |
| Stone pickaxe | step 4, 0:47 |
| Shelter | step 6, 2:17 |
| Survived a night | step 80, 19:39 |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| wait | 61% | 28 | 26 | 0 | 2 |
| mine_stone | 17% | 2 | 2 | 0 | 0 |
| craft | 6% | 26 | 2 | 24 | 0 |
| gather_wood | 6% | 2 | 2 | 0 | 0 |
| descend | 4% | 3 | 0 | 3 | 0 |
| tunnel | 4% | 12 | 7 | 5 | 0 |
| build_shelter | 3% | 1 | 1 | 0 | 0 |
| mine_ore | 0% | 12 | 0 | 12 | 0 |

## What got in its way

- **12×** (mine_ore): no iron ore in reach within 48 blocks (there is some 30 blocks below you — descend closer first)
- **6×** (craft): crafting stone_axe failed: the server did not fill the crafting grid for minecraft:stick
- **6×** (craft): crafting stone_sword failed: the server did not fill the crafting grid for minecraft:stick
- **6×** (craft): crafting stone_shovel failed: the server did not fill the crafting grid for minecraft:stick
- **6×** (craft): crafting stone_pickaxe failed: the server did not fill the crafting grid for minecraft:stick
- **3×** (tunnel): cannot tunnel south: water behind the stone — try another direction

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +6 dark oak log
- Step 2: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Step 3: **mine_stone** (1 ok): +4 cobblestone, +2 dirt
- Step 4: **craft** (1 ok): +1 stone pickaxe
- Step 5: **gather_wood** (1 ok): +11 dark oak log, +1 dirt
- Step 6: **build_shelter** (1 ok): +25 dark oak planks
- Step 7: **mine_stone** (1 ok): +10 cobblestone
- Steps 8–25: **craft** ×18 (18 failed): +4 cobblestone, +4 dirt
- Step 26: **mine_ore** (1 failed)
- Steps 27–32: **craft** ×6 (6 failed)
- Steps 33–38: **descend ↔ mine_ore** ×6 (6 failed): +27 cobblestone, +4 gravel, +2 dirt
- Steps 39–54: **tunnel ↔ mine_ore** ×16 (5 ok, 11 failed): +29 cobblestone
- Steps 55–58: **tunnel** ×4 (2 ok, 2 failed)
- Steps 59–86: **wait** ×28 (26 ok, 2 interrupted)

</details>

<details><summary>Final inventory and run details</summary>

70 cobblestone, 28 dark oak planks, 7 dark oak log, 6 dirt, 4 gravel, 1 wooden pickaxe, 1 stone pickaxe

Started 2026-10-17 08:10 UTC · episode batch-b8-1 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
