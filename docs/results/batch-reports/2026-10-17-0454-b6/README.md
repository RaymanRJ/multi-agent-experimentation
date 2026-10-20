# Batch b6

*Built from the run logs on 2026-10-20 by the report code at 90710b0 (`scripts/publish-reports.sh b6`). Where this differs from the write-up in `docs/results/`, the write-up was made at the time, and the report code has been fixed since.*

12 runs · 2026-10-17 · 562k / 32.6k tokens in / out · total cost free

## Goal: tools

> Craft a stone pickaxe. Once you have it, end the episode.

scenario **sandbox** · stance neutral · chat off · memory plan

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| qplan_tools_1 | Qwen3 4B Instruct, local | not met (model ended) | 4 | 75% | 1 of 1 | - | - | - | - | 6.3k / 428 | free |
| qfull_tools_1 | Qwen3 4B Instruct, local | met, 1:52 | 8 | 63% | 3 of 3 | - | - | - | - | 18.5k / 757 | free |
| qplan_tools_2 | Qwen3 4B Instruct, local | not met (time budget) | 70 | 46% | 7 of 14 | 3× `craft` | 10 of 13 | - | 1 | 93.3k / 5.8k | free |
| qfull_tools_2 | Qwen3 4B Instruct, local | met, 2:06 | 7 | 71% | 2 of 2 | - | - | - | - | 14.4k / 539 | free |
| qplan_tools_3 | Qwen3 4B Instruct, local | not met (time budget) | 67 | 49% | 5 of 10 | 4× `craft` | 10 of 12 | - | 1 | 89.1k / 5.5k | free |
| qfull_tools_3 | Qwen3 4B Instruct, local | met, 2:29 | 7 | 71% | 2 of 2 | - | - | - | - | 14.5k / 489 | free |

By model:

| Model and condition | Runs | Goal met | 95% range | Median time to goal | Median decisions | Tokens in / out per run | Cost per run |
|---|---|---|---|---|---|---|---|
| Qwen3 4B Instruct, local · memory plan | 3 | 0 of 3 | 0–56% | - | 67 | 62.9k / 3.9k | free |
| Qwen3 4B Instruct, local · memory full | 3 | 3 of 3 | 44–100% | 2:06 | 7 | 15.8k / 595 | free |

## Goal: shelter

> Build a shelter. Once it is built, end the episode.

scenario **sandbox** · stance neutral · chat off · memory plan

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| qplan_shelter_1 | Qwen3 4B Instruct, local | not met (time budget) | 42 | 26% | 3 of 5 | - | 3 of 3 | - | 1 | 56.6k / 3.2k | free |
| qfull_shelter_1 | Qwen3 4B Instruct, local | met, 1:51 | 4 | 100% | - | - | - | - | - | 6.0k / 255 | free |
| qplan_shelter_2 | Qwen3 4B Instruct, local | not met (time budget) | 143 | 97% | 1 of 3 | 3× `craft` | 45 of 46 | - | - | 196k / 12.6k | free |
| qfull_shelter_2 | Qwen3 4B Instruct, local | not met (model ended) | 8 | 50% | 2 of 2 | - | - | - | - | 21.8k / 586 | free |
| qplan_shelter_3 | Qwen3 4B Instruct, local | met, 3:03 | 21 | 67% | 1 of 7 | 7× `craft` | 3 of 5 | - | - | 27.9k / 1.9k | free |
| qfull_shelter_3 | Qwen3 4B Instruct, local | met, 4:42 | 8 | 63% | 3 of 3 | - | - | - | - | 17.9k / 480 | free |

By model:

| Model and condition | Runs | Goal met | 95% range | Median time to goal | Median decisions | Tokens in / out per run | Cost per run |
|---|---|---|---|---|---|---|---|
| Qwen3 4B Instruct, local · memory plan | 3 | 1 of 3 | 6–79% | 3:03 | 42 | 93.5k / 5.9k | free |
| Qwen3 4B Instruct, local · memory full | 3 | 2 of 3 | 21–94% | 4:42 | 8 | 15.2k / 440 | free |

## Skills used

Across 12 runs (6 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `gather_wood` | 12 of 12 | 164 | 99% | 0% | 1% | 24% | 100% / 100% |
| `craft` | 12 of 12 | 78 | 53% | 46% | 1% | 4% | 100% / 100% |
| `mine_stone` | 8 of 12 | 139 | 36% | 11% | 53% | 33% | 67% / 67% |
| `build_shelter` | 3 of 12 | 3 | 100% | 0% | 0% | 2% | 50% / 0% |
| `explore` | 2 of 12 | 4 | 50% | 25% | 25% | 5% | 17% / 17% |
| `wait` | 1 of 12 | 1 | 100% | 0% | 0% | 0% | 17% / 0% |

**Never chosen:** `eat`, `flee`, `sleep`, `mine_ore`, `smelt`, `descend`, `tunnel`, `climb_out`, `give`, `pick_up`, `go_to`, `store`, `take`, `hunt`, `shear`, `tell_agent`, `ask_agent`.

## In a sentence or two each

- **qplan_tools_1** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe. 75% of its decisions worked (3 of 4). After a failure it usually changed course (1 of 1).
- **qfull_tools_1** (Qwen3 4B Instruct, local): Met its goal in 8 decisions and 1:52 of game time. 63% of its decisions worked (5 of 8). After a failure it usually changed course (3 of 3).
- **qplan_shelter_1** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: no shelter has been built yet. 26% of its decisions worked (11 of 42). After a failure it changed course about half the time (3 of 5).
- **qfull_shelter_1** (Qwen3 4B Instruct, local): Met its goal in 4 decisions and 1:51 of game time. 100% of its decisions worked (4 of 4). Most of its game time went on `gather_wood` (46%).
- **qplan_tools_2** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe. 46% of its decisions worked (32 of 70). After a failure it changed course about half the time (7 of 14).
- **qfull_tools_2** (Qwen3 4B Instruct, local): Met its goal in 7 decisions and 2:06 of game time. 71% of its decisions worked (5 of 7). After a failure it usually changed course (2 of 2).
- **qplan_shelter_2** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: no shelter has been built yet. 97% of its decisions worked (139 of 143). After a failure it mostly repeated itself (1 of 3).
- **qfull_shelter_2** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: no shelter has been built yet. 50% of its decisions worked (4 of 8). After a failure it usually changed course (2 of 2).
- **qplan_tools_3** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe. 49% of its decisions worked (33 of 67). After a failure it changed course about half the time (5 of 10).
- **qfull_tools_3** (Qwen3 4B Instruct, local): Met its goal in 7 decisions and 2:29 of game time. 71% of its decisions worked (5 of 7). After a failure it usually changed course (2 of 2).
- **qplan_shelter_3** (Qwen3 4B Instruct, local): Met its goal in 21 decisions and 3:03 of game time. 67% of its decisions worked (14 of 21). After a failure it mostly repeated itself (1 of 7).
- **qfull_shelter_3** (Qwen3 4B Instruct, local): Met its goal in 8 decisions and 4:42 of game time. 63% of its decisions worked (5 of 8). After a failure it usually changed course (3 of 3).

<details><summary>How to read this</summary>

- **Worked**: decisions whose skill succeeded. **Changed course**: after a failure, the next decision was different.
- **Longest loop**: the same decision failing the same way, back to back. **Unusable answers**: replies that had to be asked again.
- **Tokens in / out**: everything sent to the model (prompts, cached or not, and re-asks) and everything it wrote. The local model's tokens are counted too, though it costs nothing.
- Game time: a whole day is 20:00. Costs are from token counts and list prices (`src/backends/pricing.ts`).
- Each agent's full report is in this folder, linked below.

Runs:

- [qplan_tools_1](qplan_tools_1.md)
- [qfull_tools_1](qfull_tools_1.md)
- [qplan_shelter_1](qplan_shelter_1.md)
- [qfull_shelter_1](qfull_shelter_1.md)
- [qplan_tools_2](qplan_tools_2.md)
- [qfull_tools_2](qfull_tools_2.md)
- [qplan_shelter_2](qplan_shelter_2.md)
- [qfull_shelter_2](qfull_shelter_2.md)
- [qplan_tools_3](qplan_tools_3.md)
- [qfull_tools_3](qfull_tools_3.md)
- [qplan_shelter_3](qplan_shelter_3.md)
- [qfull_shelter_3](qfull_shelter_3.md)

</details>
