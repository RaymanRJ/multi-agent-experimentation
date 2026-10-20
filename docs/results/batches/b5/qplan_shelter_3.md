# Run report: qplan_shelter_3

Qwen3 4B instruct (local · 8k context) · goal **shelter** · sandbox · memory plan · progress list off · stance legacy · chat off · 2026-10-17

**Goal met** after 1:55 of game time.

> Build a shelter. Once it is built, end the episode.

## Verdict

- Met its goal in 4 decisions and 1:55 of game time.
- 75% of its decisions worked (3 of 4).
- After a failure it usually changed course (1 of 1).
- Most of its game time went on `gather_wood` (62%).
- The world ran on for 10% of the run while it was thinking.

## Scorecard

| | |
|---|---|
| Decisions | 4 |
| Worked / failed / interrupted | 3 / 1 / 0 |
| Changed course after a failure | 1 of 1 (100%) |
| Failures repeating an earlier failure | 0 of 1 |
| Longest loop of one failing decision | none |
| Told it was repeating itself, and kept on | - |
| False "done" claims | 0 |
| Unusable answers (re-asked, or no such skill) | 0 re-asked, 0 no such skill |
| Deaths | 0 |
| Lowest food (of 20) | 20 |
| Hits on / from other agents | - |
| Game time used | 1:55 of a 20:00 day, in 2 min of real time |
| Thinking time per decision | 3.1 s median, 3.5 s slowest tenth |
| Tokens | 4,955 in (1,239 a decision), 326 out |
| Cost | $0.0000 |

## Progress

| Milestone | Reached at |
|---|---|
| Logs | step 2, 1:17 |
| Wooden pickaxe | not reached |
| Stone | not reached |
| Stone pickaxe | not reached |
| Shelter | step 4, 1:55 |
| Survived a night | not reached |

## Where the time went

| Skill | Share of game time | Times | Worked | Failed | Interrupted |
|---|---|---|---|---|---|
| gather_wood | 62% | 2 | 2 | 0 | 0 |
| build_shelter | 27% | 1 | 1 | 0 | 0 |
| craft | 0% | 1 | 0 | 1 | 0 |
| *(waiting on the model)* | 10% | | | | |

## What got in its way

- **1×** (craft): need 5 more oak_planks to craft 1 wooden_pickaxe (planks and sticks are crafted from logs — gather_wood first)

## In its own words

- **At the start**, choosing `craft`: "Need a pickaxe to mine stone for building shelter; craft one from logs and sticks available in inventory."
- **At the end**, choosing `build_shelter`: "I already have 13 dark_oak_logs, which is sufficient to make 44 planks (11 logs = 44 planks). I have enough materials to craft a wooden pickaxe and mine cobblestone for shelter. Building shelter is th…"

<details><summary>The run, step by step</summary>

Consecutive decisions of the same skill are folded into one line.

- Step 1: **craft** (1 failed)
- Steps 2–3: **gather_wood** ×2 (2 ok): +13 dark oak log
- Step 4: **build_shelter** (1 ok): +3 dark oak planks

</details>

<details><summary>Final inventory and run details</summary>

3 dark oak log, 3 dark oak planks

Started 2026-10-17 04:27 UTC · episode batch-b5-31 · log not published (see ../../README.md)

Milestones are the same six for every goal; for iron or diamond, see the inventory.

</details>
