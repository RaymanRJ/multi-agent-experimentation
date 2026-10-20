# Run report: base_shelterg_1

Scripted baseline (no model) · goal **shelter-guided** · sandbox · no model: the scripted baseline · 2026-10-17

**Goal met** after 2:33 of game time.

> Build a shelter. It needs 11 logs in your inventory (the shelter turns them into planks itself). If you have fewer than 11 logs, gather wood; once you have 11 or more, build the shelter. Once it is built, end the episode.

## Verdict

- Met its goal in 6 decisions and 2:33 of game time.
- 100% of its decisions worked (6 of 6).
- Most of its game time went on `gather_wood` (45%).

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
| Game time used | 2:33 of a 20:00 day, in 2 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:22 |
| Wooden pickaxe | step 2, 0:27 |
| Stone | step 3, 0:37 |
| Stone pickaxe | step 4, 1:10 |
| Shelter | step 6, 2:33 |
| Survived a night | not reached |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| gather_wood | 45% | 2 | 2 | 0 | 0 |
| craft | 25% | 2 | 2 | 0 | 0 |
| build_shelter | 24% | 1 | 1 | 0 | 0 |
| mine_stone | 7% | 1 | 1 | 0 | 0 |

## What got in its way

Nothing failed.

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +6 dark oak log
- Step 2: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Step 3: **mine_stone** (1 ok): +4 cobblestone, +2 dirt
- Step 4: **craft** (1 ok): +1 stone pickaxe
- Step 5: **gather_wood** (1 ok): +8 dark oak log, +1 dirt
- Step 6: **build_shelter** (1 ok): +1 crafting table

</details>

<details><summary>Final inventory and run details</summary>

4 dark oak log, 2 dark oak planks, 1 crafting table, 1 wooden pickaxe, 1 stone pickaxe

Started 2026-10-17 03:20 UTC · episode batch-b5-9 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
