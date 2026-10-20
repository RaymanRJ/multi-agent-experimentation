# Run report: base_outpost_2

Scripted baseline (no model) · goal **outpost** · survival · no model: the scripted baseline · 2026-10-17

**Goal met** after 20:35 of game time.

> Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. Then survive the night. The episode ends by itself at sunrise once you have all of that.

## Verdict

- Met its goal in 30 decisions and 20:35 of game time.
- 60% of its decisions worked (18 of 30).
- After a failure it usually changed course (7 of 8).
- 4 of its 8 failures repeated a decision that had already failed the same way.
- Most of its game time went on `descend` (56%).

## Scorecard

| | |
|---|---|
| Decisions | 30 |
| Worked / failed / interrupted | 18 / 8 / 4 |
| Changed course after a failure | 7 of 8 (88%) |
| Failures repeating an earlier failure | 4 of 8 |
| Longest loop of one failing decision | 2× from step 13 |
| Told it was repeating itself, and kept on | - |
| Deaths | 0 |
| Lowest food (of 20) | 17 |
| Hits on / from other agents | - |
| Game time used | 20:35 of a 20:00 day, in 20 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:41 |
| Wooden pickaxe | step 2, 0:46 |
| Stone | step 3, 0:55 |
| Stone pickaxe | step 4, 1:02 |
| Shelter | step 6, 2:02 |
| Survived a night | step 30, 20:35 |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| descend | 56% | 5 | 2 | 0 | 3 |
| mine_ore | 17% | 5 | 1 | 3 | 1 |
| flee | 7% | 5 | 0 | 5 | 0 |
| gather_wood | 6% | 2 | 2 | 0 | 0 |
| mine_stone | 4% | 2 | 2 | 0 | 0 |
| craft | 3% | 8 | 8 | 0 | 0 |
| smelt | 3% | 1 | 1 | 0 | 0 |
| build_shelter | 2% | 1 | 1 | 0 | 0 |
| tunnel | 2% | 1 | 1 | 0 | 0 |

## What got in its way

- **5×** (flee): could not find a path away from the hostiles; you may be cornered or boxed in
- **3×** (descend): stopped digging because zombie is 8 blocks away
- **1×** (mine_ore): no iron ore in reach within 48 blocks — explore, descend or dig a tunnel to uncover some
- **1×** (mine_ore): iron ore needs at least a stone_pickaxe — craft one first
- **1×** (mine_ore): interrupted: night is falling
- **1×** (mine_ore): gave up after 5 iron ore blocks could not be reached or broken

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +9 dark oak log
- Step 2: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Step 3: **mine_stone** (1 ok): +3 dirt, +3 cobblestone, +2 dark oak log
- Step 4: **craft** (1 ok): +1 stone pickaxe
- Step 5: **gather_wood** (1 ok): +5 dark oak log
- Step 6: **build_shelter** (1 ok)
- Step 7: **mine_stone** (1 ok): +6 cobblestone, +1 dirt
- Steps 8–10: **craft** ×3 (3 ok): +4 stick, +2 dark oak planks, +1 dirt, +1 stone axe
- Step 11: **mine_ore** (1 failed)
- Step 12: **descend** (1 interrupted): +100 cobblestone, +17 andesite, +15 diorite, +5 dirt
- Steps 13–14: **flee** ×2 (2 failed): +2 cobblestone, +1 granite
- Step 15: **mine_ore** (1 failed)
- Step 16: **craft** (1 ok): +1 stone pickaxe
- Step 17: **flee** (1 failed): +6 cobblestone, +4 granite, +1 crafting table
- Step 18: **craft** (1 ok): +2 dark oak planks, +2 stick, +1 stone pickaxe
- Step 19: **descend** (1 interrupted): +8 coal, +1 crafting table
- Step 20: **flee** (1 failed): +7 cobblestone
- Step 21: **mine_ore** (1 interrupted): +56 clay ball, +3 cobblestone, +1 dirt
- Step 22: **descend** (1 ok): +24 cobblestone, +11 raw copper, +8 clay ball
- Step 23: **mine_ore** (1 failed): +1 cobblestone
- Step 24: **tunnel** (1 ok): +24 clay ball, +18 cobblestone
- Step 25: **mine_ore** (1 ok): +3 raw iron
- Step 26: **smelt** (1 ok): +3 iron ingot
- Step 27: **craft** (1 ok): +1 iron pickaxe
- Steps 28–30: **descend ↔ flee** ×3 (1 ok, 1 failed, 1 interrupted): +133 cobbled deepslate, +60 clay ball, +20 cobblestone, +19 tuff

</details>

<details><summary>Final inventory and run details</summary>

168 cobblestone, 148 clay ball, 133 cobbled deepslate, 22 granite, 19 tuff, 17 andesite, 15 diorite, 11 raw copper, 7 coal, 3 dark oak log, 2 dark oak planks, 1 stone axe, 1 stone sword, 1 stone pickaxe, 1 dirt, 1 iron pickaxe, 1 stick, 1 wooden pickaxe, 1 stone shovel

Started 2026-10-17 16:15 UTC · episode batch-b10-2 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
