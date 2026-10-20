# Run report: base_shelter_1

Scripted baseline (no model) · goal **shelter** · sandbox · no model: the scripted baseline · 2026-10-17

**Goal met** after 5:30 of game time.

> Build a shelter. Once it is built, end the episode.

## Verdict

- Met its goal in 11 decisions and 5:30 of game time.
- 73% of its decisions worked (8 of 11).
- After a failure it usually changed course (2 of 2).
- Most of its game time went on `gather_wood` (66%).

## Scorecard

| | |
|---|---|
| Decisions | 11 |
| Worked / failed / interrupted | 8 / 2 / 1 |
| Changed course after a failure | 2 of 2 (100%) |
| Failures repeating an earlier failure | 0 of 2 |
| Longest loop of one failing decision | none |
| Told it was repeating itself, and kept on | - |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 5:30 of a 20:00 day, in 3 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 2:26 |
| Wooden pickaxe | step 2, 2:31 |
| Stone | step 3, 2:41 |
| Stone pickaxe | step 5, 2:45 |
| Shelter | step 11, 5:30 |
| Survived a night | not reached |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| gather_wood | 66% | 2 | 2 | 0 | 0 |
| build_shelter | 18% | 3 | 1 | 2 | 0 |
| explore | 11% | 2 | 2 | 0 | 0 |
| mine_stone | 3% | 1 | 1 | 0 | 0 |
| craft | 3% | 3 | 2 | 0 | 1 |

## What got in its way

- **1×** (craft): interrupted: you took damage (health 18)
- **1×** (build_shelter): gave up after 4 blocks could not be placed — the ground here may be too uneven or water-logged
- **1×** (build_shelter): need 4 more building blocks: shelter needs 40, I have 36 after turning my logs into planks — gather about 1 more logs

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +6 dark oak log
- Step 2: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Step 3: **mine_stone** (1 ok): +3 cobblestone, +2 dirt
- Steps 4–5: **craft** ×2 (1 ok, 1 interrupted): +1 cobblestone, +1 crafting table, +1 stone pickaxe
- Step 6: **gather_wood** (1 ok): +14 cobblestone, +9 dark oak log, +2 dirt
- Steps 7–11: **build_shelter ↔ explore** ×5 (3 ok, 2 failed): +32 dark oak planks, +4 cobblestone, +4 dirt, +1 oak sapling

</details>

<details><summary>Final inventory and run details</summary>

22 dark oak planks, 5 dark oak log, 1 oak sapling, 1 wooden pickaxe, 1 stone pickaxe

Started 2026-10-17 03:11 UTC · episode batch-b5-5 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
