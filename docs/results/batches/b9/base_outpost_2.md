# Run report: base_outpost_2

Scripted baseline (no model) · goal **outpost** · survival · no model: the scripted baseline · 2026-10-17

**Goal not met:** the run stopped (step limit / stopped).

> Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. Then survive the night. The episode ends by itself at sunrise once you have all of that.

## Verdict

- Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; you have not yet survived a night since building the shelter.
- 43% of its decisions worked (10 of 23).
- After a failure it changed course about half the time (7 of 11).
- 7 of its 12 failures repeated a decision that had already failed the same way.
- Its longest loop: `mine_stone {"count":6}` failed 5 times in a row from step 14 with "need a wooden_pickaxe — craft one first".
- It was told 1 time that its last decisions were all the same, and chose the same again every time.
- Most of its game time went on `descend` (35%).
- It died 1 time, losing what it carried each time.

## Scorecard

| | |
|---|---|
| Decisions | 23 |
| Worked / failed / interrupted | 10 / 12 / 1 |
| Changed course after a failure | 7 of 11 (64%) |
| Failures repeating an earlier failure | 7 of 12 |
| Longest loop of one failing decision | 5× from step 14 |
| Told it was repeating itself, and kept on | 1 of 1 |
| Deaths | 1 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 7:38 of a 20:00 day, in 7 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:27 |
| Wooden pickaxe | step 2, 0:33 |
| Stone | step 3, 0:42 |
| Stone pickaxe | step 4, 0:53 |
| Shelter | step 6, 2:07 |
| Survived a night | not reached |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| descend | 35% | 3 | 0 | 2 | 1 |
| mine_stone | 32% | 7 | 2 | 5 | 0 |
| gather_wood | 15% | 2 | 2 | 0 | 0 |
| build_shelter | 7% | 1 | 1 | 0 | 0 |
| craft | 6% | 5 | 5 | 0 | 0 |
| flee | 5% | 1 | 0 | 1 | 0 |
| mine_ore | 0% | 4 | 0 | 4 | 0 |

## What got in its way

- **5×** (mine_stone): need a wooden_pickaxe — craft one first
- **3×** (mine_ore): iron ore needs at least a stone_pickaxe — craft one first
- **2×** (descend): need a pickaxe to dig — craft one first
- **1×** (mine_ore): no iron ore in reach within 48 blocks (there is some 29 blocks below you — descend closer first)
- **1×** (descend): stopped digging because zombie is 8 blocks away
- **1×** (flee): could not find a path away from the hostiles; you may be cornered or boxed in

## Notable moments

- Step 14: you died and respawned

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +6 dark oak log, +1 brown mushroom
- Step 2: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Step 3: **mine_stone** (1 ok): +3 cobblestone, +2 dirt
- Step 4: **craft** (1 ok): +1 dirt, +1 cobblestone, +1 stone pickaxe
- Step 5: **gather_wood** (1 ok): +12 dark oak log
- Step 6: **build_shelter** (1 ok): +1 crafting table
- Step 7: **mine_stone** (1 ok): +6 cobblestone, +3 dirt
- Steps 8–10: **craft** ×3 (3 ok): +4 stick, +2 dark oak planks, +1 stone axe, +1 stone sword
- Step 11: **mine_ore** (1 failed)
- Step 12: **descend** (1 interrupted): +57 cobblestone, +32 andesite, +5 diorite, +1 tropical fish
- Step 13: **flee** (1 failed)
- Steps 14–18: **mine_stone** ×5 (5 failed)
- Steps 19–23: **mine_ore ↔ descend** ×5 (5 failed)

</details>

<details><summary>Final inventory and run details</summary>

Empty inventory.

Started 2026-10-17 13:18 UTC · episode batch-b9-5 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
