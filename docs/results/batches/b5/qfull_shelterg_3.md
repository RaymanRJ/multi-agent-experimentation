# Run report: qfull_shelterg_3

Qwen3 4B instruct (local · 8k context) · goal **shelter-guided** · sandbox · memory full · progress list off · stance legacy · chat off · 2026-10-17

**Goal met** after 1:44 of game time.

> Build a shelter. It needs 11 logs in your inventory (the shelter turns them into planks itself). If you have fewer than 11 logs, gather wood; once you have 11 or more, build the shelter. Once it is built, end the episode.

## Verdict

- Met its goal in 3 decisions and 1:44 of game time.
- 67% of its decisions worked (2 of 3).
- Most of its game time went on `gather_wood` (51%).
- The world ran on for 8% of the run while it was thinking.

## Scorecard

| | |
|---|---|
| Decisions | 3 |
| Worked / failed / interrupted | 2 / 0 / 1 |
| Changed course after a failure | - |
| Failures repeating an earlier failure | - |
| Longest loop of one failing decision | none |
| Told it was repeating itself, and kept on | - |
| False "done" claims | 0 |
| Unusable answers (re-asked, or no such skill) | 0 re-asked, 0 no such skill |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 1:44 of a 20:00 day, in 2 min of real time |
| Thinking time per decision | 2.8 s median, 2.9 s slowest tenth |
| Tokens | 4,605 in (1,535 a decision), 207 out |
| Cost | $0.0000 |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 2, 0:58 |
| Wooden pickaxe | not reached |
| Stone | not reached |
| Stone pickaxe | not reached |
| Shelter | step 3, 1:44 |
| Survived a night | not reached |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| gather_wood | 51% | 2 | 1 | 0 | 1 |
| build_shelter | 41% | 1 | 1 | 0 | 0 |
| *(waiting on the model)* | 8% | | | | |

## What got in its way

- **1×** (gather_wood): interrupted: you took damage (health 19)

## In its own words

- **At the start**, choosing `gather_wood`: "I need at least 11 logs to build a shelter, but my inventory is empty. I must gather wood first to meet the requirement."
- **At the end**, choosing `build_shelter`: "I now have 15 dark_oak_logs, which exceeds the required 11 logs. I can build a shelter using these logs, as the shelter automatically converts logs into planks."

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Steps 1–2: **gather_wood** ×2 (1 ok, 1 interrupted): +15 dark oak log
- Step 3: **build_shelter** (1 ok): +3 dark oak planks

</details>

<details><summary>Final inventory and run details</summary>

10 dark oak log, 3 dark oak planks

Started 2026-10-17 04:46 UTC · episode batch-b5-36 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
