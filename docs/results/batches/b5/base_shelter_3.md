# Run report: base_shelter_3

Scripted baseline (no model) · goal **shelter** · sandbox · no model: the scripted baseline · 2026-10-17

**Goal met** after 2:31 of game time.

> Build a shelter. Once it is built, end the episode.

## Verdict

- Met its goal in 6 decisions and 2:31 of game time.
- 100% of its decisions worked (6 of 6).
- Most of its game time went on `gather_wood` (58%).

## Scorecard

| | |
|---|---|
| Decisions | 6 |
| Worked / failed / interrupted | 6 / 0 / 0 |
| Changed course after a failure | - |
| Failures repeating an earlier failure | - |
| Longest loop of one failing decision | none |
| Told it was repeating itself, and kept on | - |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 2:31 of a 20:00 day, in 2 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:34 |
| Wooden pickaxe | step 2, 0:39 |
| Stone | step 3, 0:49 |
| Stone pickaxe | step 4, 1:03 |
| Shelter | step 6, 2:31 |
| Survived a night | not reached |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| gather_wood | 58% | 2 | 2 | 0 | 0 |
| build_shelter | 23% | 1 | 1 | 0 | 0 |
| craft | 13% | 2 | 2 | 0 | 0 |
| mine_stone | 7% | 1 | 1 | 0 | 0 |

## What got in its way

Nothing failed.

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +6 dark oak log
- Step 2: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Step 3: **mine_stone** (1 ok): +3 cobblestone, +2 dirt
- Step 4: **craft** (1 ok): +2 dirt, +1 cobblestone, +1 stone pickaxe
- Step 5: **gather_wood** (1 ok): +12 dark oak log
- Step 6: **build_shelter** (1 ok): +1 crafting table

</details>

<details><summary>Final inventory and run details</summary>

9 dark oak log, 3 dark oak planks, 1 crafting table, 1 wooden pickaxe, 1 stone pickaxe

Started 2026-10-17 04:22 UTC · episode batch-b5-29 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
