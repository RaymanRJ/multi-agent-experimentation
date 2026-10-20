# Run report: base_shelter_3

Scripted baseline (no model) · goal **shelter-guided** · sandbox · no model: the scripted baseline · 2026-10-16

**Goal met** after 4:18 of game time.

> Build a shelter. It needs 11 logs in your inventory (the shelter turns them into planks itself). If you have fewer than 11 logs, gather wood; once you have 11 or more, build the shelter. Once it is built, end the episode.

## Verdict

- Met its goal in 16 decisions and 4:18 of game time.
- 63% of its decisions worked (10 of 16).
- After a failure it usually changed course (6 of 6).
- 4 of its 6 failures repeated a decision that had already failed the same way.
- Most of its game time went on `explore` (54%).

## Scorecard

| | |
|---|---|
| Decisions | 16 |
| Worked / failed / interrupted | 10 / 6 / 0 |
| Changed course after a failure | 6 of 6 (100%) |
| Failures repeating an earlier failure | 4 of 6 |
| Longest loop of one failing decision | none |
| Told it was repeating itself, and kept on | - |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 4:18 of a 20:00 day, in 4 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:24 |
| Wooden pickaxe | step 2, 0:30 |
| Stone | not reached |
| Stone pickaxe | not reached |
| Shelter | step 16, 4:18 |
| Survived a night | not reached |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| explore | 54% | 5 | 5 | 0 | 0 |
| gather_wood | 29% | 3 | 3 | 0 | 0 |
| build_shelter | 14% | 2 | 1 | 1 | 0 |
| craft | 2% | 1 | 1 | 0 | 0 |
| mine_stone | 0% | 5 | 0 | 5 | 0 |

## What got in its way

- **5×** (mine_stone): no exposed stone within 64 blocks — look for a hillside or cave, or move to a rocky area
- **1×** (build_shelter): shelter incomplete: 2 blocks could not be placed (no solid surface to build against) — try flat ground with a solid floor

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +6 dark oak log
- Step 2: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Steps 3–10: **mine_stone ↔ explore** ×8 (4 ok, 4 failed)
- Step 11: **mine_stone** (1 failed)
- Step 12: **gather_wood** (1 ok): +5 birch log, +5 oak log
- Step 13: **build_shelter** (1 failed): +1 dark oak planks
- Step 14: **explore** (1 ok): +1 dark oak log
- Step 15: **gather_wood** (1 ok): +4 dark oak log
- Step 16: **build_shelter** (1 ok)

</details>

<details><summary>Final inventory and run details</summary>

5 oak log, 3 dark oak planks, 2 stick, 1 dark oak log, 1 wooden pickaxe

Started 2026-10-16 23:42 UTC · episode batch-b1-17 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
