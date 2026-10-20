# Batch b13

*Built from the run logs on 2026-10-20 by the report code at 90710b0 (`scripts/publish-reports.sh b13`). Where this differs from the write-up in `docs/results/`, the write-up was made at the time, and the report code has been fixed since.*

9 runs · 2026-10-17 · 678k / 57.5k tokens in / out · total cost free

## Goal: iron

> Craft an iron pickaxe. Once you have it, end the episode.

scenario **sandbox** · stance neutral · chat off · memory plan

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| base_iron_1 | Scripted baseline | not met (time budget) | 41 | 80% | 6 of 6 | - | - | - | - | - | free |
| qnone_iron_1 | Qwen3 4B Instruct, local | not met (time budget) | 57 | 23% | 28 of 41 | 5× `craft` | 2 of 2 | - | - | 116k / 9.3k | free |
| qnonep_iron_1 | Qwen3 4B Instruct, local | not met (time budget) | 80 | 24% | 41 of 61 | 5× `craft` | 2 of 5 | - | - | 165k / 13.8k | free |
| base_iron_2 | Scripted baseline | not met (time budget) | 29 | 62% | 7 of 7 | - | - | - | - | - | free |
| qnone_iron_2 | Qwen3 4B Instruct, local | not met (time budget) | 50 | 24% | 30 of 33 | - | - | - | - | 104k / 8.8k | free |
| qnonep_iron_2 | Qwen3 4B Instruct, local | met, 16:55 | 65 | 29% | 33 of 44 | 5× `craft` | 1 of 3 | - | - | 133k / 11.2k | free |
| base_iron_3 | Scripted baseline | not met (time budget) | 44 | 70% | 9 of 9 | - | - | - | - | - | free |
| qnone_iron_3 | Qwen3 4B Instruct, local | not met (time budget) | 43 | 28% | 24 of 28 | 4× `craft` | 2 of 2 | - | 1 | 87.2k / 7.4k | free |
| qnonep_iron_3 | Qwen3 4B Instruct, local | met, 14:35 | 35 | 26% | 16 of 24 | 4× `craft` | 1 of 2 | - | - | 72.0k / 7.1k | free |

By model:

| Model and condition | Runs | Goal met | 95% range | Median time to goal | Median decisions | Tokens in / out per run | Cost per run |
|---|---|---|---|---|---|---|---|
| Scripted baseline · memory plan · progress off | 3 | 0 of 3 | 0–56% | - | 41 | - | free |
| Qwen3 4B Instruct, local · memory none · progress off | 3 | 0 of 3 | 0–56% | - | 50 | 103k / 8.5k | free |
| Qwen3 4B Instruct, local · memory none · progress on | 3 | 2 of 3 | 21–94% | 16:55 | 65 | 123k / 10.7k | free |

## Skills used

Across 9 runs (2 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `craft` | 9 of 9 | 161 | 24% | 75% | 1% | 4% | 100% / 100% |
| `mine_ore` | 9 of 9 | 117 | 7% | 89% | 4% | 14% | 100% / 100% |
| `descend` | 9 of 9 | 45 | 36% | 38% | 27% | 24% | 100% / 100% |
| `gather_wood` | 9 of 9 | 20 | 100% | 0% | 0% | 7% | 100% / 100% |
| `explore` | 8 of 9 | 33 | 79% | 6% | 15% | 10% | 50% / 100% |
| `mine_stone` | 8 of 9 | 15 | 67% | 33% | 0% | 7% | 100% / 86% |
| `smelt` | 5 of 9 | 9 | 33% | 56% | 11% | 1% | 100% / 43% |
| `build_shelter` | 3 of 9 | 3 | 100% | 0% | 0% | 1% | 0% / 43% |
| `wait` | 2 of 9 | 40 | 100% | 0% | 0% | 12% | 0% / 29% |
| `tunnel` | 1 of 9 | 1 | 100% | 0% | 0% | 0% | 0% / 14% |

**Never chosen:** `eat`, `flee`, `sleep`, `climb_out`, `give`, `pick_up`, `go_to`, `store`, `take`, `hunt`, `shear`, `tell_agent`, `ask_agent`.

<details><summary>Times chosen, by model</summary>

| Skill | Scripted baseline | Qwen3 4B Instruct, local |
|---|---|---|
| `craft` | 20 | 141 |
| `mine_ore` | 16 | 101 |
| `descend` | 14 | 31 |
| `gather_wood` | 6 | 14 |
| `explore` | 7 | 26 |
| `mine_stone` | 6 | 9 |
| `smelt` | 1 | 8 |
| `build_shelter` | 3 | 0 |
| `wait` | 40 | 0 |
| `tunnel` | 1 | 0 |

</details>

## In a sentence or two each

- **base_iron_1** (Scripted baseline): Did not meet its goal. Still outstanding at the end: you have no iron_pickaxe. 80% of its decisions worked (33 of 41). After a failure it usually changed course (6 of 6).
- **qnone_iron_1** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no iron_pickaxe. 23% of its decisions worked (13 of 57). After a failure it changed course about half the time (28 of 41).
- **qnonep_iron_1** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no iron_pickaxe. 24% of its decisions worked (19 of 80). After a failure it changed course about half the time (41 of 61).
- **base_iron_2** (Scripted baseline): Did not meet its goal. Still outstanding at the end: you have no iron_pickaxe. 62% of its decisions worked (18 of 29). After a failure it usually changed course (7 of 7).
- **qnone_iron_2** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no iron_pickaxe. 24% of its decisions worked (12 of 50). After a failure it usually changed course (30 of 33).
- **qnonep_iron_2** (Qwen3 4B Instruct, local): Met its goal in 65 decisions and 16:55 of game time. 29% of its decisions worked (19 of 65). After a failure it usually changed course (33 of 44).
- **base_iron_3** (Scripted baseline): Did not meet its goal. Still outstanding at the end: you have no iron_pickaxe. 70% of its decisions worked (31 of 44). After a failure it usually changed course (9 of 9).
- **qnone_iron_3** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no iron_pickaxe. 28% of its decisions worked (12 of 43). After a failure it usually changed course (24 of 28).
- **qnonep_iron_3** (Qwen3 4B Instruct, local): Met its goal in 35 decisions and 14:35 of game time. 26% of its decisions worked (9 of 35). After a failure it changed course about half the time (16 of 24).

<details><summary>How to read this</summary>

- **Worked**: decisions whose skill succeeded. **Changed course**: after a failure, the next decision was different.
- **Longest loop**: the same decision failing the same way, back to back. **Unusable answers**: replies that had to be asked again.
- **Tokens in / out**: everything sent to the model (prompts, cached or not, and re-asks) and everything it wrote. The local model's tokens are counted too, though it costs nothing.
- Game time: a whole day is 20:00. Costs are from token counts and list prices (`src/backends/pricing.ts`).
- Each agent's full report is in this folder, linked below.

Runs:

- [base_iron_1](base_iron_1.md)
- [qnone_iron_1](qnone_iron_1.md)
- [qnonep_iron_1](qnonep_iron_1.md)
- [base_iron_2](base_iron_2.md)
- [qnone_iron_2](qnone_iron_2.md)
- [qnonep_iron_2](qnonep_iron_2.md)
- [base_iron_3](base_iron_3.md)
- [qnone_iron_3](qnone_iron_3.md)
- [qnonep_iron_3](qnonep_iron_3.md)

</details>
