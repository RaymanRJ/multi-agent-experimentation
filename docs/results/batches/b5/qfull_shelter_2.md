# Run report: qfull_shelter_2

Qwen3 4B instruct (local · 8k context) · goal **shelter** · sandbox · memory full · progress list off · stance legacy · chat off · 2026-10-17

**Goal not met:** the model said "done" twice in a row.

> Build a shelter. Once it is built, end the episode.

## Verdict

- Did not meet its goal. Still outstanding at the end: no shelter has been built yet.
- 50% of its decisions worked (3 of 6).
- After a failure it changed course about half the time (2 of 3).
- Most of its game time went on `gather_wood` (72%).
- The world ran on for 28% of the run while it was thinking.

## Scorecard

| | |
|---|---|
| Decisions | 6 |
| Worked / failed / interrupted | 3 / 3 / 0 |
| Changed course after a failure | 2 of 3 (67%) |
| Failures repeating an earlier failure | 2 of 3 |
| Longest loop of one failing decision | 2× from step 4 |
| Told it was repeating itself, and kept on | - |
| False "done" claims | 0 |
| Unusable answers (re-asked, or no such skill) | 0 re-asked, 0 no such skill |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 1:09 of a 20:00 day, in 0 min of real time |
| Thinking time per decision | 2.8 s median, 3.1 s slowest tenth |
| Tokens | 13,785 in (2,298 a decision), 494 out |
| Cost | $0.0000 |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:52 |
| Wooden pickaxe | not reached |
| Stone | not reached |
| Stone pickaxe | not reached |
| Shelter | not reached |
| Survived a night | not reached |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| gather_wood | 72% | 3 | 3 | 0 | 0 |
| craft | 1% | 3 | 0 | 3 | 0 |
| *(waiting on the model)* | 28% | | | | |

## What got in its way

- **3×** (craft): need 4 more oak_log to craft 16 oak_planks

## In its own words

- **At the start**, choosing `gather_wood`: "Need wood to build a shelter; gather 11 logs to produce enough planks for construction."
- **At the end**, choosing `done`: "I have insufficient oak logs to craft 16 oak planks, and no progress has been made on gathering more. The goal of building a shelter cannot be achieved with current resources."

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Steps 1–6: **gather_wood ↔ craft** ×6 (3 ok, 3 failed): +13 dark oak log

</details>

<details><summary>Final inventory and run details</summary>

13 dark oak log

Started 2026-10-17 03:53 UTC · episode batch-b5-20 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
