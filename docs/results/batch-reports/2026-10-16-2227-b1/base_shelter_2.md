# Run report: base_shelter_2

Scripted baseline (no model) · goal **shelter-guided** · sandbox · no model: the scripted baseline · 2026-10-16

**Goal met** after 3:34 of game time.

> Build a shelter. It needs 11 logs in your inventory (the shelter turns them into planks itself). If you have fewer than 11 logs, gather wood; once you have 11 or more, build the shelter. Once it is built, end the episode.

## Verdict

- Met its goal in 15 decisions and 3:34 of game time.
- 53% of its decisions worked (8 of 15).
- After a failure it usually changed course (5 of 5).
- 4 of its 5 failures repeated a decision that had already failed the same way.
- Most of its game time went on `explore` (48%).

## Scorecard

| | |
|---|---|
| Decisions | 15 |
| Worked / failed / interrupted | 8 / 5 / 2 |
| Changed course after a failure | 5 of 5 (100%) |
| Failures repeating an earlier failure | 4 of 5 |
| Longest loop of one failing decision | none |
| Told it was repeating itself, and kept on | - |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 3:34 of a 20:00 day, in 4 min of real time |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 3, 0:53 |
| Wooden pickaxe | step 4, 0:58 |
| Stone | not reached |
| Stone pickaxe | not reached |
| Shelter | step 15, 3:34 |
| Survived a night | not reached |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| explore | 48% | 5 | 4 | 0 | 1 |
| gather_wood | 31% | 3 | 2 | 0 | 1 |
| build_shelter | 18% | 1 | 1 | 0 | 0 |
| craft | 2% | 1 | 1 | 0 | 0 |
| mine_stone | 0% | 5 | 0 | 5 | 0 |

## What got in its way

- **5×** (mine_stone): no exposed stone within 64 blocks — look for a hillside or cave, or move to a rocky area
- **2×** (gather_wood, explore): interrupted: you took damage (health 19)

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 interrupted)
- Step 2: **explore** (1 ok)
- Step 3: **gather_wood** (1 ok): +3 dark oak log
- Step 4: **craft** (1 ok): +3 dark oak planks, +2 stick, +1 wooden pickaxe
- Steps 5–12: **mine_stone ↔ explore** ×8 (3 ok, 4 failed, 1 interrupted)
- Step 13: **mine_stone** (1 failed)
- Step 14: **gather_wood** (1 ok): +13 dark oak log
- Step 15: **build_shelter** (1 ok)

</details>

<details><summary>Final inventory and run details</summary>

7 dark oak log, 3 dark oak planks, 2 stick, 1 wooden pickaxe

Started 2026-10-16 23:07 UTC · episode batch-b1-9 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
