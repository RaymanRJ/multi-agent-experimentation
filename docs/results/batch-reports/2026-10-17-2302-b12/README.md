# Batch b12

*Built from the run logs on 2026-10-20 by the report code at 90710b0 (`scripts/publish-reports.sh b12`). Where this differs from the write-up in `docs/results/`, the write-up was made at the time, and the report code has been fixed since.*

21 runs · 2026-10-17 to 2026-10-18 · 3308k / 157k tokens in / out · total cost free

## Goal: outpost

> Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. Then survive the night. The episode ends by itself at sunrise once you have all of that.

scenario **survival** · stance neutral · chat off · memory plan

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| base_outpost_1 | Scripted baseline | not met (time budget) | 47 | 70% | 11 of 11 | - | - | - | - | - | free |
| qnone_outpost_1 | Qwen3 4B Instruct, local | not met (time budget) | 95 | 13% | 38 of 81 | 5× `craft` | 2 of 3 | - | - | 199k / 19.4k | free |
| qnonep_outpost_1 | Qwen3 4B Instruct, local | met, 18:18 | 70 | 50% | 19 of 32 | 4× `craft` | 2 of 5 | - | - | 150k / 10.2k | free |
| qplan_outpost_1 | Qwen3 4B Instruct, local | not met (time budget) | 148 | 41% | 7 of 16 | 6× `mine_stone` | 16 of 18 | - | 14 | 315k / 14.4k | free |
| qplanp_outpost_1 | Qwen3 4B Instruct, local | not met (time budget) | 130 | 11% | 6 of 44 | 10× `mine_stone` | 13 of 18 | - | 7 | 285k / 12.3k | free |
| qfull_outpost_1 | Qwen3 4B Instruct, local | not met (time budget) | 40 | 55% | 10 of 14 | 3× `sleep` | 1 of 1 | - | 2 | 251k / 3.1k | free |
| qfullp_outpost_1 | Qwen3 4B Instruct, local | not met (model ended) | 20 | 40% | 7 of 7 | - | - | - | 5 | 126k / 2.2k | free |
| base_outpost_2 | Scripted baseline | not met (time budget) | 50 | 80% | 4 of 5 | - | - | - | 1 | - | free |
| qnone_outpost_2 | Qwen3 4B Instruct, local | not met (time budget) | 101 | 23% | 34 of 54 | 5× `craft` | 2 of 8 | - | - | 211k / 16.9k | free |
| qnonep_outpost_2 | Qwen3 4B Instruct, local | not met (time budget) | 119 | 15% | 35 of 57 | 4× `craft` | 5 of 7 | - | 7 | 252k / 16.9k | free |
| qplan_outpost_2 | Qwen3 4B Instruct, local | met, 18:33 | 66 | 65% | 5 of 21 | 10× `craft` | 11 of 11 | - | - | 142k / 6.2k | free |
| qplanp_outpost_2 | Qwen3 4B Instruct, local | not met (time budget) | 162 | 17% | 5 of 45 | 28× `mine_stone` | 20 of 22 | - | 4 | 357k / 14.5k | free |
| qfull_outpost_2 | Qwen3 4B Instruct, local | not met (model ended) | 27 | 52% | 12 of 12 | - | - | - | 1 | 180k / 2.8k | free |
| qfullp_outpost_2 | Qwen3 4B Instruct, local | not met (model ended) | 16 | 50% | 6 of 6 | - | - | - | 1 | 96.4k / 1.6k | free |
| base_outpost_3 | Scripted baseline | met, 18:40 | 83 | 63% | 3 of 3 | - | - | - | - | - | free |
| qnone_outpost_3 | Qwen3 4B Instruct, local | not met (time budget) | 112 | 22% | 49 of 84 | 5× `craft` | 5 of 11 | - | - | 233k / 19.5k | free |
| qnonep_outpost_3 | Qwen3 4B Instruct, local | not met (model ended) | 28 | 43% | 8 of 16 | 7× `craft` | 2 of 3 | - | - | 65.4k / 3.4k | free |
| qplan_outpost_3 | Qwen3 4B Instruct, local | not met (time budget) | 54 | 44% | 3 of 27 | 16× `craft` | 7 of 11 | - | - | 115k / 5.0k | free |
| qplanp_outpost_3 | Qwen3 4B Instruct, local | met, 18:33 | 52 | 33% | 6 of 31 | 11× `craft` | 5 of 9 | 1 of 53 calls | - | 116k / 4.8k | free |
| qfull_outpost_3 | Qwen3 4B Instruct, local | not met (model ended) | 22 | 55% | 9 of 9 | - | - | - | - | 148k / 3.0k | free |
| qfullp_outpost_3 | Qwen3 4B Instruct, local | not met (model ended) | 12 | 50% | 4 of 4 | - | - | - | - | 67.4k / 1.2k | free |

By model:

| Model and condition | Runs | Goal met | 95% range | Median time to goal | Median decisions | Tokens in / out per run | Cost per run |
|---|---|---|---|---|---|---|---|
| Scripted baseline · memory plan · progress off | 3 | 1 of 3 | 6–79% | 18:40 | 50 | - | free |
| Qwen3 4B Instruct, local · memory none · progress off | 3 | 0 of 3 | 0–56% | - | 101 | 214k / 18.6k | free |
| Qwen3 4B Instruct, local · memory none · progress on | 3 | 1 of 3 | 6–79% | 18:18 | 70 | 156k / 10.1k | free |
| Qwen3 4B Instruct, local · memory plan · progress off | 3 | 1 of 3 | 6–79% | 18:33 | 66 | 191k / 8.5k | free |
| Qwen3 4B Instruct, local · memory plan · progress on | 3 | 1 of 3 | 6–79% | 18:33 | 130 | 253k / 10.5k | free |
| Qwen3 4B Instruct, local · memory full · progress off | 3 | 0 of 3 | 0–56% | - | 27 | 193k / 2.9k | free |
| Qwen3 4B Instruct, local · memory full · progress on | 3 | 0 of 3 | 0–56% | - | 16 | 96.6k / 1.7k | free |

## Skills used

Across 21 runs (4 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `craft` | 21 of 21 | 578 | 30% | 69% | 1% | 7% | 100% / 100% |
| `gather_wood` | 21 of 21 | 361 | 29% | 1% | 70% | 10% | 100% / 100% |
| `mine_stone` | 21 of 21 | 226 | 27% | 51% | 22% | 24% | 100% / 100% |
| `wait` | 16 of 21 | 135 | 89% | 0% | 11% | 16% | 75% / 76% |
| `build_shelter` | 12 of 21 | 23 | 57% | 30% | 13% | 2% | 100% / 47% |
| `explore` | 7 of 21 | 35 | 46% | 26% | 29% | 4% | 50% / 29% |
| `mine_ore` | 7 of 21 | 30 | 10% | 43% | 47% | 1% | 50% / 29% |
| `flee` | 6 of 21 | 18 | 89% | 11% | 0% | 1% | 25% / 29% |
| `descend` | 4 of 21 | 12 | 8% | 33% | 58% | 3% | 25% / 18% |
| `sleep` | 3 of 21 | 18 | 0% | 100% | 0% | 0% | 25% / 12% |
| `smelt` | 3 of 21 | 6 | 0% | 100% | 0% | 0% | 0% / 18% |
| `tunnel` | 1 of 21 | 12 | 0% | 0% | 100% | 0% | 25% / 0% |

**Never chosen:** `eat`, `climb_out`, `give`, `pick_up`, `go_to`, `store`, `take`, `hunt`, `shear`, `tell_agent`, `ask_agent`.

<details><summary>Times chosen, by model</summary>

| Skill | Scripted baseline | Qwen3 4B Instruct, local |
|---|---|---|
| `craft` | 19 | 559 |
| `gather_wood` | 11 | 350 |
| `mine_stone` | 10 | 216 |
| `wait` | 72 | 63 |
| `build_shelter` | 3 | 20 |
| `explore` | 6 | 29 |
| `mine_ore` | 22 | 8 |
| `flee` | 11 | 7 |
| `descend` | 11 | 1 |
| `sleep` | 0 | 18 |
| `smelt` | 3 | 3 |
| `tunnel` | 12 | 0 |

</details>

## In a sentence or two each

- **base_outpost_1** (Scripted baseline): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have not yet survived a night since building the shelter. 70% of its decisions worked (33 of 47). After a failure it usually changed course (11 of 11).
- **qnone_outpost_1** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: no shelter has been built yet; you have not yet survived a night since building the shelter. 13% of its decisions worked (12 of 95). After a failure it changed course about half the time (38 of 81).
- **qnonep_outpost_1** (Qwen3 4B Instruct, local): Met its goal in 70 decisions and 18:18 of game time. 50% of its decisions worked (35 of 70). After a failure it changed course about half the time (19 of 32).
- **qplan_outpost_1** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; no shelter has been built yet; you have not yet survived a night since building the shelter. 41% of its decisions worked (61 of 148). After a failure it changed course about half the time (7 of 16).
- **qplanp_outpost_1** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; no shelter has been built yet; you have not yet survived a night since building the shelter. 11% of its decisions worked (14 of 130). After a failure it mostly repeated itself (6 of 44).
- **qfull_outpost_1** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; you have not yet survived a night since building the shelter. 55% of its decisions worked (22 of 40). After a failure it usually changed course (10 of 14).
- **qfullp_outpost_1** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; no shelter has been built yet; you have not yet survived a night since building the shelter. 40% of its decisions worked (8 of 20). After a failure it usually changed course (7 of 7).
- **base_outpost_2** (Scripted baseline): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; you have not yet survived a night since building the shelter. 80% of its decisions worked (40 of 50). After a failure it usually changed course (4 of 5).
- **qnone_outpost_2** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: no shelter has been built yet; you have not yet survived a night since building the shelter. 23% of its decisions worked (23 of 101). After a failure it changed course about half the time (34 of 54).
- **qnonep_outpost_2** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; no shelter has been built yet; you have not yet survived a night since building the shelter. 15% of its decisions worked (18 of 119). After a failure it changed course about half the time (35 of 57).
- **qplan_outpost_2** (Qwen3 4B Instruct, local): Met its goal in 66 decisions and 18:33 of game time. 65% of its decisions worked (43 of 66). After a failure it mostly repeated itself (5 of 21).
- **qplanp_outpost_2** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; no shelter has been built yet; you have not yet survived a night since building the shelter. 17% of its decisions worked (27 of 162). After a failure it mostly repeated itself (5 of 45).
- **qfull_outpost_2** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; no shelter has been built yet; you have not yet survived a night since building the shelter. 52% of its decisions worked (14 of 27). After a failure it usually changed course (12 of 12).
- **qfullp_outpost_2** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; no shelter has been built yet; you have not yet survived a night since building the shelter. 50% of its decisions worked (8 of 16). After a failure it usually changed course (6 of 6).
- **base_outpost_3** (Scripted baseline): Met its goal in 83 decisions and 18:40 of game time. 63% of its decisions worked (52 of 83). After a failure it usually changed course (3 of 3).
- **qnone_outpost_3** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: no shelter has been built yet; you have not yet survived a night since building the shelter. 22% of its decisions worked (25 of 112). After a failure it changed course about half the time (49 of 84).
- **qnonep_outpost_3** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have not yet survived a night since building the shelter. 43% of its decisions worked (12 of 28). After a failure it changed course about half the time (8 of 16).
- **qplan_outpost_3** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: no shelter has been built yet; you have not yet survived a night since building the shelter. 44% of its decisions worked (24 of 54). After a failure it mostly repeated itself (3 of 27).
- **qplanp_outpost_3** (Qwen3 4B Instruct, local): Met its goal in 52 decisions and 18:33 of game time. 33% of its decisions worked (17 of 52). After a failure it mostly repeated itself (6 of 31).
- **qfull_outpost_3** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_axe; you have no stone_sword; you have no stone_shovel; no shelter has been built yet; you have not yet survived a night since building the shelter. 55% of its decisions worked (12 of 22). After a failure it usually changed course (9 of 9).
- **qfullp_outpost_3** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_axe; you have no stone_sword; you have no stone_shovel; no shelter has been built yet; you have not yet survived a night since building the shelter. 50% of its decisions worked (6 of 12). After a failure it usually changed course (4 of 4).

<details><summary>How to read this</summary>

- **Worked**: decisions whose skill succeeded. **Changed course**: after a failure, the next decision was different.
- **Longest loop**: the same decision failing the same way, back to back. **Unusable answers**: replies that had to be asked again.
- **Tokens in / out**: everything sent to the model (prompts, cached or not, and re-asks) and everything it wrote. The local model's tokens are counted too, though it costs nothing.
- Game time: a whole day is 20:00. Costs are from token counts and list prices (`src/backends/pricing.ts`).
- Each agent's full report is in this folder, linked below.

Runs:

- [base_outpost_1](base_outpost_1.md)
- [qnone_outpost_1](qnone_outpost_1.md)
- [qnonep_outpost_1](qnonep_outpost_1.md)
- [qplan_outpost_1](qplan_outpost_1.md)
- [qplanp_outpost_1](qplanp_outpost_1.md)
- [qfull_outpost_1](qfull_outpost_1.md)
- [qfullp_outpost_1](qfullp_outpost_1.md)
- [base_outpost_2](base_outpost_2.md)
- [qnone_outpost_2](qnone_outpost_2.md)
- [qnonep_outpost_2](qnonep_outpost_2.md)
- [qplan_outpost_2](qplan_outpost_2.md)
- [qplanp_outpost_2](qplanp_outpost_2.md)
- [qfull_outpost_2](qfull_outpost_2.md)
- [qfullp_outpost_2](qfullp_outpost_2.md)
- [base_outpost_3](base_outpost_3.md)
- [qnone_outpost_3](qnone_outpost_3.md)
- [qnonep_outpost_3](qnonep_outpost_3.md)
- [qplan_outpost_3](qplan_outpost_3.md)
- [qplanp_outpost_3](qplanp_outpost_3.md)
- [qfull_outpost_3](qfull_outpost_3.md)
- [qfullp_outpost_3](qfullp_outpost_3.md)

</details>
