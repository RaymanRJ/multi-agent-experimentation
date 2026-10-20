# Run report: base_iron_1

Scripted baseline (no model) · goal **iron** · sandbox · no model: the scripted baseline · 2026-10-17

**Goal not met:** the time budget ran out.

> Craft an iron pickaxe. Once you have it, end the episode.

## Verdict

- Did not meet its goal. Still outstanding at the end: you have no iron_pickaxe.
- 62% of its decisions worked (40 of 65).
- After a failure it usually changed course (19 of 23).
- 15 of its 23 failures repeated a decision that had already failed the same way.
- Its longest loop: `craft {"item":"stone_pickaxe","count":1}` failed 3 times in a row from step 14 with "crafting stone_pickaxe failed: crafting stone_pickaxe timed out after 15000ms".
- It was told 1 time that its last decisions were all the same, and chose the same again every time.
- Most of its game time went on `wait` (59%).

## Scorecard

| | |
|---|---|
| Decisions | 65 |
| Worked / failed / interrupted | 40 / 23 / 1 |
| Changed course after a failure | 19 of 23 (83%) |
| Failures repeating an earlier failure | 15 of 23 |
| Longest loop of one failing decision | 3× from step 14 |
| Told it was repeating itself, and kept on | 1 of 1 |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 20:00 of a 20:00 day, in 20 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:22 |
| Wooden pickaxe | step 2, 0:28 |
| Stone | step 3, 1:28 |
| Stone pickaxe | step 4, 1:33 |
| Shelter | step 6, 2:36 |
| Survived a night | step 64, 19:39 |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| wait | 59% | 24 | 22 | 0 | 2 |
| mine_stone | 13% | 2 | 2 | 0 | 0 |
| craft | 9% | 9 | 6 | 3 | 0 |
| tunnel | 6% | 12 | 7 | 5 | 0 |
| descend | 6% | 3 | 0 | 3 | 0 |
| gather_wood | 5% | 2 | 2 | 0 | 0 |
| build_shelter | 2% | 1 | 1 | 0 | 0 |
| mine_ore | 1% | 12 | 0 | 12 | 0 |

## What got in its way

- **11×** (mine_ore): no iron ore in reach within 48 blocks (there is some 14 blocks below you — descend closer first)
- **3×** (craft): crafting stone_pickaxe failed: crafting stone_pickaxe timed out after 15000ms
- **2×** (descend): stopped at y=58: every way down is unsafe (east: water behind the diorite; south: water behind the diorite; west: water behind the diorite; north: water behind the stone) — explore or tunnel somewhere else and try again.
- **2×** (tunnel): cannot tunnel north: water behind the stone — try another direction
- **2×** (tunnel): cannot tunnel south: water behind the stone — try another direction
- **1×** (mine_ore): no iron ore in reach within 48 blocks — explore, descend or dig a tunnel to uncover some

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +6 dark oak log
- Step 2: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Step 3: **mine_stone** (1 ok): +4 dirt, +4 cobblestone
- Step 4: **craft** (1 ok): +1 stone pickaxe
- Step 5: **gather_wood** (1 ok): +12 dark oak log
- Step 6: **build_shelter** (1 ok): +1 dark oak planks
- Step 7: **mine_stone** (1 ok): +6 cobblestone, +6 dirt
- Steps 8–10: **craft** ×3 (3 ok): +4 stick, +2 dark oak planks, +1 stone axe, +1 stone sword
- Step 11: **mine_ore** (1 failed)
- Step 12: **descend** (1 failed): +28 cobblestone, +9 dirt, +4 diorite, +1 dark oak log
- Step 13: **mine_ore** (1 failed): +1 diorite
- Steps 14–17: **craft** ×4 (1 ok, 3 failed): +1 stone pickaxe
- Steps 18–21: **descend ↔ mine_ore** ×4 (4 failed): +1 diorite
- Steps 22–37: **tunnel ↔ mine_ore** ×16 (5 ok, 11 failed): +40 cobblestone, +13 diorite
- Steps 38–41: **tunnel** ×4 (2 ok, 2 failed)
- Steps 42–65: **wait** ×24 (22 ok, 2 interrupted)

</details>

<details><summary>Final inventory and run details</summary>

65 cobblestone, 19 diorite, 11 dirt, 7 dark oak log, 3 dark oak planks, 2 stone pickaxe, 1 stone shovel, 1 stone sword, 1 stone axe, 1 stick, 1 wooden pickaxe

Started 2026-10-17 16:55 UTC · episode batch-b11-1 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
