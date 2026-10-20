# Batch b7

*Built from the run logs on 2026-10-20 by the report code at 90710b0 (`scripts/publish-reports.sh b7`). Where this differs from the write-up in `docs/results/`, the write-up was made at the time, and the report code has been fixed since.*

12 runs · 2026-10-17 · 652k / 27.8k tokens in / out · total cost free

## Goal: tools

> Craft a stone pickaxe. Once you have it, end the episode.

scenario **sandbox** · stance neutral · chat off · memory plan

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| qplan_tools_1 | Qwen3 4B Instruct, local | not met (time budget) | 126 | 96% | 2 of 4 | 3× `craft` | 38 of 39 | 1 of 127 calls | - | 255k / 11.6k | free |
| qfull_tools_1 | Qwen3 4B Instruct, local | met, 1:30 | 7 | 71% | 2 of 2 | - | - | - | - | 19.0k / 477 | free |
| qplan_tools_2 | Qwen3 4B Instruct, local | not met (time budget) | 33 | 67% | 3 of 9 | 4× `mine_stone` | 5 of 6 | - | - | 63.8k / 2.8k | free |
| qfull_tools_2 | Qwen3 4B Instruct, local | met, 2:30 | 7 | 71% | 2 of 2 | - | - | - | - | 19.4k / 536 | free |
| qplan_tools_3 | Qwen3 4B Instruct, local | not met (time budget) | 42 | 40% | 5 of 18 | 7× `mine_stone` | 7 of 8 | 1 of 43 calls | - | 84.6k / 3.9k | free |
| qfull_tools_3 | Qwen3 4B Instruct, local | met, 1:46 | 8 | 63% | 3 of 3 | - | - | - | - | 23.3k / 631 | free |

By model:

| Model and condition | Runs | Goal met | 95% range | Median time to goal | Median decisions | Tokens in / out per run | Cost per run |
|---|---|---|---|---|---|---|---|
| Qwen3 4B Instruct, local · memory plan | 3 | 0 of 3 | 0–56% | - | 42 | 134k / 6.1k | free |
| Qwen3 4B Instruct, local · memory full | 3 | 3 of 3 | 44–100% | 1:46 | 7 | 20.6k / 548 | free |

## Goal: shelter

> Build a shelter. Once it is built, end the episode.

scenario **sandbox** · stance neutral · chat off · memory plan

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| qplan_shelter_1 | Qwen3 4B Instruct, local | met, 8:43 | 67 | 97% | 1 of 2 | - | 19 of 20 | - | - | 129k / 5.9k | free |
| qfull_shelter_1 | Qwen3 4B Instruct, local | met, 1:37 | 3 | 100% | - | - | - | - | - | 6.2k / 221 | free |
| qplan_shelter_2 | Qwen3 4B Instruct, local | met, 1:38 | 7 | 100% | - | - | 0 of 1 | - | - | 13.4k / 601 | free |
| qfull_shelter_2 | Qwen3 4B Instruct, local | met, 1:48 | 3 | 100% | - | - | - | - | - | 6.2k / 232 | free |
| qplan_shelter_3 | Qwen3 4B Instruct, local | met, 1:44 | 5 | 80% | 1 of 1 | - | - | - | - | 9.4k / 402 | free |
| qfull_shelter_3 | Qwen3 4B Instruct, local | met, 2:58 | 8 | 63% | 3 of 3 | - | - | - | - | 23.0k / 554 | free |

By model:

| Model and condition | Runs | Goal met | 95% range | Median time to goal | Median decisions | Tokens in / out per run | Cost per run |
|---|---|---|---|---|---|---|---|
| Qwen3 4B Instruct, local · memory plan | 3 | 3 of 3 | 44–100% | 1:44 | 7 | 50.7k / 2.3k | free |
| Qwen3 4B Instruct, local · memory full | 3 | 3 of 3 | 44–100% | 1:48 | 3 | 11.8k / 336 | free |

## Skills used

Across 12 runs (9 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `gather_wood` | 12 of 12 | 132 | 99% | 0% | 1% | 26% | 100% / 100% |
| `craft` | 12 of 12 | 114 | 80% | 18% | 2% | 6% | 100% / 100% |
| `mine_stone` | 6 of 12 | 61 | 54% | 34% | 11% | 27% | 44% / 67% |
| `build_shelter` | 6 of 12 | 6 | 100% | 0% | 0% | 6% | 67% / 0% |
| `mine_ore` | 1 of 12 | 2 | 0% | 100% | 0% | 1% | 11% / 0% |
| `wait` | 1 of 12 | 1 | 100% | 0% | 0% | 0% | 0% / 33% |

**Never chosen:** `explore`, `eat`, `flee`, `sleep`, `smelt`, `descend`, `tunnel`, `climb_out`, `give`, `pick_up`, `go_to`, `store`, `take`, `hunt`, `shear`, `tell_agent`, `ask_agent`.

## In a sentence or two each

- **qplan_tools_1** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe. 96% of its decisions worked (121 of 126). After a failure it changed course about half the time (2 of 4).
- **qfull_tools_1** (Qwen3 4B Instruct, local): Met its goal in 7 decisions and 1:30 of game time. 71% of its decisions worked (5 of 7). After a failure it usually changed course (2 of 2).
- **qplan_shelter_1** (Qwen3 4B Instruct, local): Met its goal in 67 decisions and 8:43 of game time. 97% of its decisions worked (65 of 67). After a failure it changed course about half the time (1 of 2).
- **qfull_shelter_1** (Qwen3 4B Instruct, local): Met its goal in 3 decisions and 1:37 of game time. 100% of its decisions worked (3 of 3). Most of its game time went on `gather_wood` (51%).
- **qplan_tools_2** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe. 67% of its decisions worked (22 of 33). After a failure it mostly repeated itself (3 of 9).
- **qfull_tools_2** (Qwen3 4B Instruct, local): Met its goal in 7 decisions and 2:30 of game time. 71% of its decisions worked (5 of 7). After a failure it usually changed course (2 of 2).
- **qplan_shelter_2** (Qwen3 4B Instruct, local): Met its goal in 7 decisions and 1:38 of game time. 100% of its decisions worked (7 of 7). Most of its game time went on `gather_wood` (41%).
- **qfull_shelter_2** (Qwen3 4B Instruct, local): Met its goal in 3 decisions and 1:48 of game time. 100% of its decisions worked (3 of 3). Most of its game time went on `gather_wood` (55%).
- **qplan_tools_3** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe. 40% of its decisions worked (17 of 42). After a failure it mostly repeated itself (5 of 18).
- **qfull_tools_3** (Qwen3 4B Instruct, local): Met its goal in 8 decisions and 1:46 of game time. 63% of its decisions worked (5 of 8). After a failure it usually changed course (3 of 3).
- **qplan_shelter_3** (Qwen3 4B Instruct, local): Met its goal in 5 decisions and 1:44 of game time. 80% of its decisions worked (4 of 5). After a failure it usually changed course (1 of 1).
- **qfull_shelter_3** (Qwen3 4B Instruct, local): Met its goal in 8 decisions and 2:58 of game time. 63% of its decisions worked (5 of 8). After a failure it usually changed course (3 of 3).

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
