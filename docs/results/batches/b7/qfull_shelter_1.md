# Run report: qfull_shelter_1

Qwen3 4B instruct (local · 8k context) · goal **shelter** · sandbox · memory full · progress list off · stance neutral · chat off · 2026-10-17

**Goal met** after 1:37 of game time.

> Build a shelter. Once it is built, end the episode.

## Verdict

- Met its goal in 3 decisions and 1:37 of game time.
- 100% of its decisions worked (3 of 3).
- Most of its game time went on `gather_wood` (51%).
- The world ran on for 9% of the run while it was thinking.

## Scorecard

| | |
|---|---|
| Decisions | 3 |
| Worked / failed / interrupted | 3 / 0 / 0 |
| Changed course after a failure | - |
| Failures repeating an earlier failure | - |
| Longest loop of one failing decision | none |
| Told it was repeating itself, and kept on | - |
| False "done" claims | 0 |
| Unusable answers (re-asked, or no such skill) | 0 re-asked, 0 no such skill |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 1:37 of a 20:00 day, in 1 min of real time |
| Thinking time per decision | 2.8 s median, 3.4 s slowest tenth |
| Tokens | 6,231 in (2,077 a decision), 221 out |
| Cost | $0.0000 |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:52 |
| Wooden pickaxe | not reached |
| Stone | not reached |
| Stone pickaxe | not reached |
| Shelter | step 3, 1:37 |
| Survived a night | not reached |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| gather_wood | 51% | 1 | 1 | 0 | 0 |
| build_shelter | 35% | 1 | 1 | 0 | 0 |
| craft | 5% | 1 | 1 | 0 | 0 |
| *(waiting on the model)* | 9% | | | | |

## What got in its way

Nothing failed.

## In its own words

- **At the start**, choosing `gather_wood`: "Need wood to build a shelter, so gather 11 logs to convert into planks for construction."
- **At the end**, choosing `build_shelter`: "Have sufficient wood and stone to build a shelter; construct a 3x3 hut with a roof and doorway using available materials."

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **gather_wood** (1 ok): +14 dark oak log
- Step 2: **craft** (1 ok): +44 dark oak planks
- Step 3: **build_shelter** (1 ok): +3 dark oak log

</details>

<details><summary>Final inventory and run details</summary>

6 dark oak log, 4 dark oak planks

Started 2026-10-17 07:15 UTC · episode batch-b7-4 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
