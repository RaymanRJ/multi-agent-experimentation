# Batch b4

*Built from the run logs on 2026-10-20 by the report code at 90710b0 (`scripts/publish-reports.sh b4`). Where this differs from the write-up in `docs/results/`, the write-up was made at the time, and the report code has been fixed since.*

12 runs · 2026-10-17 · 288k / 18.5k tokens in / out · total cost free

## Goal: tools-guided

> Craft a stone pickaxe. Check your inventory and do the first step you have not done yet: gather a few logs, craft a wooden_pickaxe, mine 3 stone, craft a stone_pickaxe. Once you have it, end the episode.

scenario **sandbox** · chat off · memory plan

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| base_tools_1 | Scripted baseline | met, 1:08 | 4 | 100% | - | - | - | - | - | - | free |
| qnone_tools_1 | Qwen3 4B Instruct, local | met, 2:30 | 7 | 100% | - | - | - | - | - | 8.7k / 775 | free |
| qplan_tools_1 | Qwen3 4B Instruct, local | met, 1:21 | 10 | 100% | - | - | 0 of 2 | - | - | 13.1k / 804 | free |
| qfull_tools_1 | Qwen3 4B Instruct, local | met, 0:58 | 4 | 100% | - | - | - | - | - | 6.8k / 279 | free |
| base_tools_2 | Scripted baseline | met, 1:00 | 4 | 100% | - | - | - | - | - | - | free |
| qnone_tools_2 | Qwen3 4B Instruct, local | met, 1:59 | 7 | 100% | - | - | - | - | - | 8.6k / 808 | free |
| qplan_tools_2 | Qwen3 4B Instruct, local | not met (time budget) | 145 | 99% | - | - | 45 of 45 | 1 of 146 calls | - | 208k / 13.3k | free |
| qfull_tools_2 | Qwen3 4B Instruct, local | met, 0:58 | 4 | 100% | - | - | - | - | - | 6.7k / 265 | free |
| base_tools_3 | Scripted baseline | met, 4:41 | 9 | 78% | 1 of 1 | - | - | - | - | - | free |
| qnone_tools_3 | Qwen3 4B Instruct, local | met, 1:12 | 6 | 100% | - | - | - | - | - | 7.3k / 673 | free |
| qplan_tools_3 | Qwen3 4B Instruct, local | met, 2:48 | 16 | 100% | - | - | 2 of 3 | - | - | 21.4k / 1.4k | free |
| qfull_tools_3 | Qwen3 4B Instruct, local | met, 1:00 | 4 | 100% | - | - | - | - | - | 6.8k / 300 | free |

By model:

| Model and condition | Runs | Goal met | 95% range | Median time to goal | Median decisions | Tokens in / out per run | Cost per run |
|---|---|---|---|---|---|---|---|
| Scripted baseline · memory plan | 3 | 3 of 3 | 44–100% | 1:08 | 4 | - | free |
| Qwen3 4B Instruct, local · memory none | 3 | 3 of 3 | 44–100% | 1:59 | 7 | 8.2k / 752 | free |
| Qwen3 4B Instruct, local · memory plan | 3 | 2 of 3 | 21–94% | 2:48 | 16 | 81.0k / 5.1k | free |
| Qwen3 4B Instruct, local · memory full | 3 | 3 of 3 | 44–100% | 0:58 | 4 | 6.8k / 281 | free |

## Skills used

Across 12 runs (11 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `gather_wood` | 12 of 12 | 170 | 98% | 1% | 1% | 31% | 100% / 100% |
| `craft` | 12 of 12 | 26 | 100% | 0% | 0% | 11% | 100% / 100% |
| `mine_stone` | 11 of 12 | 21 | 100% | 0% | 0% | 13% | 100% / 0% |
| `explore` | 1 of 12 | 2 | 100% | 0% | 0% | 3% | 9% / 0% |
| `wait` | 1 of 12 | 1 | 100% | 0% | 0% | 0% | 9% / 0% |

**Never chosen:** `eat`, `flee`, `sleep`, `build_shelter`, `mine_ore`, `smelt`, `descend`, `tunnel`, `climb_out`, `give`, `pick_up`, `go_to`, `store`, `take`, `hunt`, `shear`, `tell_agent`, `ask_agent`.

<details><summary>Times chosen, by model</summary>

| Skill | Scripted baseline | Qwen3 4B Instruct, local |
|---|---|---|
| `gather_wood` | 6 | 164 |
| `craft` | 6 | 20 |
| `mine_stone` | 3 | 18 |
| `explore` | 2 | 0 |
| `wait` | 0 | 1 |

</details>

## In a sentence or two each

- **base_tools_1** (Scripted baseline): Met its goal in 4 decisions and 1:08 of game time. 100% of its decisions worked (4 of 4). Most of its game time went on `craft` (57%).
- **qnone_tools_1** (Qwen3 4B Instruct, local): Met its goal in 7 decisions and 2:30 of game time. 100% of its decisions worked (7 of 7). Most of its game time went on `mine_stone` (53%).
- **qplan_tools_1** (Qwen3 4B Instruct, local): Met its goal in 10 decisions and 1:21 of game time. 100% of its decisions worked (10 of 10). Most of its game time went on `mine_stone` (24%).
- **qfull_tools_1** (Qwen3 4B Instruct, local): Met its goal in 4 decisions and 0:58 of game time. 100% of its decisions worked (4 of 4). Most of its game time went on `gather_wood` (45%).
- **base_tools_2** (Scripted baseline): Met its goal in 4 decisions and 1:00 of game time. 100% of its decisions worked (4 of 4). Most of its game time went on `gather_wood` (58%).
- **qnone_tools_2** (Qwen3 4B Instruct, local): Met its goal in 7 decisions and 1:59 of game time. 100% of its decisions worked (7 of 7). Most of its game time went on `gather_wood` (46%).
- **qplan_tools_2** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe. 99% of its decisions worked (144 of 145). It was told 45 times that its last decisions were all the same, and chose the same again every time.
- **qfull_tools_2** (Qwen3 4B Instruct, local): Met its goal in 4 decisions and 0:58 of game time. 100% of its decisions worked (4 of 4). Most of its game time went on `gather_wood` (45%).
- **base_tools_3** (Scripted baseline): Met its goal in 9 decisions and 4:41 of game time. 78% of its decisions worked (7 of 9). After a failure it usually changed course (1 of 1).
- **qnone_tools_3** (Qwen3 4B Instruct, local): Met its goal in 6 decisions and 1:12 of game time. 100% of its decisions worked (6 of 6). Most of its game time went on `gather_wood` (27%).
- **qplan_tools_3** (Qwen3 4B Instruct, local): Met its goal in 16 decisions and 2:48 of game time. 100% of its decisions worked (16 of 16). It was told 3 times that its last decisions were all the same, and chose the same again 2 times.
- **qfull_tools_3** (Qwen3 4B Instruct, local): Met its goal in 4 decisions and 1:00 of game time. 100% of its decisions worked (4 of 4). Most of its game time went on `gather_wood` (37%).

<details><summary>How to read this</summary>

- **Worked**: decisions whose skill succeeded. **Changed course**: after a failure, the next decision was different.
- **Longest loop**: the same decision failing the same way, back to back. **Unusable answers**: replies that had to be asked again.
- **Tokens in / out**: everything sent to the model (prompts, cached or not, and re-asks) and everything it wrote. The local model's tokens are counted too, though it costs nothing.
- Game time: a whole day is 20:00. Costs are from token counts and list prices (`src/backends/pricing.ts`).
- Each agent's full report is in this folder, linked below.

Runs:

- [base_tools_1](base_tools_1.md)
- [qnone_tools_1](qnone_tools_1.md)
- [qplan_tools_1](qplan_tools_1.md)
- [qfull_tools_1](qfull_tools_1.md)
- [base_tools_2](base_tools_2.md)
- [qnone_tools_2](qnone_tools_2.md)
- [qplan_tools_2](qplan_tools_2.md)
- [qfull_tools_2](qfull_tools_2.md)
- [base_tools_3](base_tools_3.md)
- [qnone_tools_3](qnone_tools_3.md)
- [qplan_tools_3](qplan_tools_3.md)
- [qfull_tools_3](qfull_tools_3.md)

</details>
