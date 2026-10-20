# Run report: base_outpost_1

Scripted baseline (no model) · goal **outpost** · survival · no model: the scripted baseline · 2026-10-17

**Goal not met:** the time budget ran out.

> Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. Then survive the night. The episode ends by itself at sunrise once you have all of that.

## Verdict

- Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have not yet survived a night since building the shelter.
- 70% of its decisions worked (33 of 47).
- After a failure it usually changed course (11 of 11).
- 5 of its 11 failures repeated a decision that had already failed the same way.
- Most of its game time went on `wait` (36%).

## Scorecard

| | |
|---|---|
| Decisions | 47 |
| Worked / failed / interrupted | 33 / 11 / 2 |
| Changed course after a failure | 11 of 11 (100%) |
| Failures repeating an earlier failure | 5 of 11 |
| Longest loop of one failing decision | none |
| Told it was repeating itself, and kept on | - |
| Deaths | 0 |
| Lowest food (of 20) | 9 |
| Hits on / from other agents | - |
| Game time used | 22:30 of a 20:00 day, in 22 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:26 |
| Wooden pickaxe | step 2, 0:31 |
| Stone | step 3, 0:38 |
| Stone pickaxe | step 4, 0:47 |
| Shelter | step 6, 1:52 |
| Survived a night | step 41, 19:58 |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| wait | 36% | 17 | 16 | 0 | 1 |
| descend | 18% | 5 | 1 | 2 | 2 |
| mine_stone | 15% | 2 | 2 | 0 | 0 |
| gather_wood | 9% | 5 | 5 | 0 | 0 |
| explore | 8% | 2 | 1 | 1 | 0 |
| mine_ore | 7% | 6 | 1 | 5 | 0 |
| build_shelter | 3% | 1 | 1 | 0 | 0 |
| craft | 2% | 6 | 6 | 0 | 0 |
| smelt | 1% | 3 | 0 | 3 | 0 |

## What got in its way

- **3×** (mine_ore): no iron ore in reach within 48 blocks — explore, descend or dig a tunnel to uncover some
- **3×** (smelt): smelting failed: destination full
- **2×** (mine_ore): no iron ore in reach within 48 blocks (there is some 20 blocks below you — descend closer first)
- **1×** (descend): stopped at y=60: every way down is unsafe (east: water behind the stone; south: water behind the stone; west: water behind the stone; north: water behind the stone) — explore or tunnel somewhere else and try again.
- **1×** (explore): gave up after 3 attempts to walk onward were blocked (water, cliffs or walls); try a different place or another goal
- **1×** (descend): stopped at y=60: every way down is unsafe (south: water behind the stone; west: water behind the stone; north: water behind the stone; east: water behind the stone) — explore or tunnel somewhere else and try again.

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +6 dark oak log
- Step 2: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Step 3: **mine_stone** (1 ok): +3 cobblestone, +2 dirt
- Step 4: **craft** (1 ok): +1 dirt, +1 stone pickaxe
- Step 5: **gather_wood** (1 ok): +7 dark oak log
- Step 6: **build_shelter** (1 ok): +1 crafting table
- Step 7: **mine_stone** (1 ok): +6 dirt, +6 cobblestone
- Steps 8–10: **craft** ×3 (3 ok): +4 stick, +2 dark oak planks, +1 stone axe, +1 stone sword
- Step 11: **mine_ore** (1 failed): +1 crafting table, +1 cobblestone
- Step 12: **descend** (1 failed): +11 cobblestone
- Step 13: **explore** (1 failed): +3 cobblestone
- Step 14: **mine_ore** (1 failed)
- Step 15: **craft** (1 ok): +1 stone pickaxe
- Step 16: **descend** (1 failed): +2 cobblestone, +1 crafting table
- Step 17: **explore** (1 ok): +48 cobblestone, +17 diorite, +15 andesite, +5 dirt
- Steps 18–23: **mine_ore ↔ descend** ×6 (1 ok, 3 failed, 2 interrupted): +87 cobblestone, +13 diorite, +13 calcite, +8 raw copper
- Step 24: **mine_ore** (1 ok): +6 amethyst block, +5 moss block, +3 cobblestone, +3 smooth basalt
- Steps 25–30: **smelt ↔ gather_wood** ×6 (3 ok, 3 failed): +19 andesite, +18 dark oak log, +14 cobblestone, +6 calcite
- Steps 31–47: **wait** ×17 (16 ok, 1 interrupted): +21 cobblestone, +3 granite, +3 dirt, +2 andesite

</details>

<details><summary>Final inventory and run details</summary>

179 cobblestone, 36 andesite, 30 diorite, 22 calcite, 12 smooth basalt, 8 raw copper, 6 amethyst block, 6 dark oak log, 5 moss block, 3 raw iron, 3 granite, 1 stick, 1 stone sword, 1 stone axe, 1 stone shovel

Started 2026-10-17 23:03 UTC · episode batch-b12-1 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
