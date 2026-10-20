# Run report: qfull_shelter_1

Qwen3 4B instruct (local · 8k context) · goal **shelter** · sandbox · memory full · progress list off · stance legacy · chat off · 2026-10-17

**Goal not met:** the model said "done" twice in a row.

> Build a shelter. Once it is built, end the episode.

## Verdict

- Did not meet its goal. Still outstanding at the end: no shelter has been built yet.
- 40% of its decisions worked (2 of 5).
- After a failure it changed course about half the time (1 of 2).
- Most of its game time went on `gather_wood` (69%).
- The world ran on for 30% of the run while it was thinking.

## Scorecard

| | |
|---|---|
| Decisions | 5 |
| Worked / failed / interrupted | 2 / 3 / 0 |
| Changed course after a failure | 1 of 2 (50%) |
| Failures repeating an earlier failure | 2 of 3 |
| Longest loop of one failing decision | 2× from step 4 |
| Told it was repeating itself, and kept on | - |
| False "done" claims | 0 |
| Unusable answers (re-asked, or no such skill) | 0 re-asked, 0 no such skill |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 1:00 of a 20:00 day, in 0 min of real time |
| Thinking time per decision | 3.0 s median, 3.7 s slowest tenth |
| Tokens | 11,299 in (2,260 a decision), 468 out |
| Cost | $0.0000 |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 0:44 |
| Wooden pickaxe | not reached |
| Stone | not reached |
| Stone pickaxe | not reached |
| Shelter | not reached |
| Survived a night | not reached |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| gather_wood | 69% | 2 | 2 | 0 | 0 |
| craft | 1% | 3 | 0 | 3 | 0 |
| *(waiting on the model)* | 30% | | | | |

## What got in its way

- **3×** (craft): need 11 more oak_log to craft 44 oak_planks

## In its own words

- **At the start**, choosing `gather_wood`: "Need wood to build a shelter; gather 11 logs to create planks for construction."
- **At the end**, choosing `done`: "Unable to craft oak planks due to insufficient oak logs; initial logs were insufficient for required planks. Cannot proceed with shelter construction as materials are missing. Episode ends here."

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Steps 1–5: **gather_wood ↔ craft** ×5 (2 ok, 3 failed): +11 dark oak log

</details>

<details><summary>Final inventory and run details</summary>

11 dark oak log

Started 2026-10-17 03:19 UTC · episode batch-b5-8 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
