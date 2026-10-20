# Run report: base_outpost_1

Scripted baseline (no model) · goal **outpost** · survival · no model: the scripted baseline · 2026-10-17

**Goal met** after 18:39 of game time.

> Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. Then survive the night. The episode ends by itself at sunrise once you have all of that.

## Verdict

- Met its goal in 59 decisions and 18:39 of game time.
- 66% of its decisions worked (39 of 59).
- After a failure it usually changed course (18 of 19).
- 12 of its 19 failures repeated a decision that had already failed the same way.
- Most of its game time went on `wait` (54%).

## Scorecard

| | |
|---|---|
| Decisions | 59 |
| Worked / failed / interrupted | 39 / 19 / 1 |
| Changed course after a failure | 18 of 19 (95%) |
| Failures repeating an earlier failure | 12 of 19 |
| Longest loop of one failing decision | none |
| Told it was repeating itself, and kept on | - |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 18:39 of a 20:00 day, in 18 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:22 |
| Wooden pickaxe | step 2, 0:27 |
| Stone | step 3, 0:37 |
| Stone pickaxe | step 4, 1:11 |
| Shelter | step 6, 2:29 |
| Survived a night | step 59, 18:39 |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| wait | 54% | 21 | 20 | 0 | 1 |
| mine_stone | 13% | 2 | 2 | 0 | 0 |
| descend | 10% | 3 | 0 | 3 | 0 |
| tunnel | 7% | 12 | 8 | 4 | 0 |
| gather_wood | 6% | 2 | 2 | 0 | 0 |
| craft | 6% | 6 | 6 | 0 | 0 |
| build_shelter | 3% | 1 | 1 | 0 | 0 |
| mine_ore | 1% | 12 | 0 | 12 | 0 |

## What got in its way

- **7×** (mine_ore): no iron ore in reach within 48 blocks (there is some 28 blocks below you — descend closer first)
- **5×** (mine_ore): no iron ore in reach within 48 blocks — explore, descend or dig a tunnel to uncover some
- **2×** (tunnel): cannot tunnel south: water behind the stone — try another direction
- **2×** (tunnel): cannot tunnel north: water behind the stone — try another direction
- **1×** (descend): stopped at y=58: every way down is unsafe (south: water behind the diorite; west: water behind the diorite; north: water behind the stone; east: water behind the diorite) — explore or tunnel somewhere else and try again.
- **1×** (descend): stopped at y=59: every way down is unsafe (west: water behind the stone; north: water behind the diorite; east: water behind the diorite; south: water behind the stone) — explore or tunnel somewhere else and try again.

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +6 dark oak log
- Step 2: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Step 3: **mine_stone** (1 ok): +4 cobblestone, +2 dirt
- Step 4: **craft** (1 ok): +1 stone pickaxe
- Step 5: **gather_wood** (1 ok): +9 dark oak log
- Step 6: **build_shelter** (1 ok): +1 crafting table
- Step 7: **mine_stone** (1 ok): +9 dirt, +6 cobblestone, +1 dark oak log
- Steps 8–10: **craft** ×3 (3 ok): +4 stick, +2 dark oak planks, +1 stone axe, +1 stone sword
- Step 11: **mine_ore** (1 failed)
- Step 12: **descend** (1 failed): +35 cobblestone, +1 diorite, +1 dirt
- Step 13: **mine_ore** (1 failed): +1 diorite
- Step 14: **craft** (1 ok): +1 stone pickaxe
- Steps 15–18: **descend ↔ mine_ore** ×4 (4 failed): +33 cobblestone
- Steps 19–34: **tunnel ↔ mine_ore** ×16 (6 ok, 10 failed): +31 cobblestone, +10 diorite, +8 raw copper
- Steps 35–38: **tunnel** ×4 (2 ok, 2 failed)
- Steps 39–59: **wait** ×21 (20 ok, 1 interrupted)

</details>

<details><summary>Final inventory and run details</summary>

96 cobblestone, 12 diorite, 8 raw copper, 7 dirt, 5 dark oak log, 2 stone pickaxe, 1 stone sword, 1 crafting table, 1 stone axe, 1 stick, 1 wooden pickaxe, 1 stone shovel

Started 2026-10-17 15:56 UTC · episode batch-b10-1 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
