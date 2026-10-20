# Run report: base_shelter_1

Scripted baseline (no model) · goal **shelter-guided** · sandbox · no model: the scripted baseline · 2026-10-16

**Goal met** after 4:27 of game time.

> Build a shelter. It needs 11 logs in your inventory (the shelter turns them into planks itself). If you have fewer than 11 logs, gather wood; once you have 11 or more, build the shelter. Once it is built, end the episode.

## Verdict

- Met its goal in 8 decisions and 4:27 of game time.
- 88% of its decisions worked (7 of 8).
- After a failure it usually changed course (1 of 1).
- Most of its game time went on `mine_stone` (45%).

## Scorecard

| | |
|---|---|
| Decisions | 8 |
| Worked / failed / interrupted | 7 / 1 / 0 |
| Changed course after a failure | 1 of 1 (100%) |
| Failures repeating an earlier failure | 0 of 1 |
| Longest loop of one failing decision | none |
| Told it was repeating itself, and kept on | - |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 4:27 of a 20:00 day, in 4 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:14 |
| Wooden pickaxe | step 2, 0:19 |
| Stone | step 5, 2:25 |
| Stone pickaxe | step 6, 2:59 |
| Shelter | step 8, 4:27 |
| Survived a night | not reached |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| mine_stone | 45% | 2 | 1 | 1 | 0 |
| gather_wood | 27% | 2 | 2 | 0 | 0 |
| craft | 15% | 2 | 2 | 0 | 0 |
| build_shelter | 12% | 1 | 1 | 0 | 0 |
| explore | 3% | 1 | 1 | 0 | 0 |

## What got in its way

- **1×** (mine_stone): no exposed stone within 64 blocks — look for a hillside or cave, or move to a rocky area

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +4 oak log
- Step 2: **craft** (1 ok): +3 oak planks, +2 stick, +1 wooden pickaxe
- Step 3: **mine_stone** (1 failed)
- Step 4: **explore** (1 ok)
- Step 5: **mine_stone** (1 ok): +7 dirt, +3 cobblestone
- Step 6: **craft** (1 ok): +1 stone pickaxe
- Step 7: **gather_wood** (1 ok): +13 dark oak log
- Step 8: **build_shelter** (1 ok)

</details>

<details><summary>Final inventory and run details</summary>

11 dark oak log, 3 oak planks, 1 wooden pickaxe, 1 stone pickaxe

Started 2026-10-16 22:27 UTC · episode batch-b1-1 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
