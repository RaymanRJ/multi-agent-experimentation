# Run report: qplan_shelter_1

Qwen3 4B instruct (local · 8k context) · goal **shelter** · sandbox · memory plan · progress list off · stance neutral · chat off · 2026-10-17

**Goal met** after 8:43 of game time.

> Build a shelter. Once it is built, end the episode.

## Verdict

- Met its goal in 67 decisions and 8:43 of game time.
- 97% of its decisions worked (65 of 67).
- After a failure it changed course about half the time (1 of 2).
- It was told 20 times that its last decisions were all the same, and chose the same again 19 times.
- Most of its game time went on `gather_wood` (46%).
- The world ran on for 43% of the run while it was thinking.

## Scorecard

| | |
|---|---|
| Decisions | 67 |
| Worked / failed / interrupted | 65 / 2 / 0 |
| Changed course after a failure | 1 of 2 (50%) |
| Failures repeating an earlier failure | 1 of 2 |
| Longest loop of one failing decision | 2× from step 13 |
| Told it was repeating itself, and kept on | 19 of 20 |
| False "done" claims | 0 |
| Unusable answers (re-asked, or no such skill) | 0 re-asked, 0 no such skill |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 8:43 of a 20:00 day, in 5 min of real time |
| Thinking time per decision | 3.4 s median, 4.0 s slowest tenth |
| Tokens | 129,377 in (1,931 a decision), 5,857 out |
| Cost | $0.0000 |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 1, 4:02 |
| Wooden pickaxe | not reached |
| Stone | not reached |
| Stone pickaxe | not reached |
| Shelter | step 67, 8:43 |
| Survived a night | not reached |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| gather_wood | 46% | 10 | 10 | 0 | 0 |
| build_shelter | 6% | 1 | 1 | 0 | 0 |
| craft | 5% | 56 | 54 | 2 | 0 |
| *(waiting on the model)* | 43% | | | | |

## What got in its way

- **2×** (craft): "dark_oak_plank" is not a known item name — use names like wooden_pickaxe or oak_planks

## In its own words

- **At the start**, choosing `gather_wood`: "I need wood to build a shelter, so I gather 119 logs from nearby trees to produce planks for construction."
- **At the end**, choosing `build_shelter`: "I have sufficient dark_oak_planks (216) from crafting logs, and building a shelter is the goal. No further preparation is needed."

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Steps 1–10: **gather_wood** ×10 (10 ok): +66 dark oak log
- Steps 11–66: **craft** ×56 (54 ok, 2 failed): +216 dark oak planks
- Step 67: **build_shelter** (1 ok): +2 dark oak log

</details>

<details><summary>Final inventory and run details</summary>

181 dark oak planks, 14 dark oak log

Started 2026-10-17 07:09 UTC · episode batch-b7-3 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
