# Batch b9

*Built from the run logs on 2026-10-20 by the report code at 90710b0 (`scripts/publish-reports.sh b9`). Where this differs from the write-up in `docs/results/`, the write-up was made at the time, and the report code has been fixed since.*

12 runs · 2026-10-17 · 2037k / 89.4k tokens in / out · total cost free

## Goal: outpost

> Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. Then survive the night. The episode ends by itself at sunrise once you have all of that.

scenario **survival** · stance neutral · chat off · memory plan

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| base_outpost_1 | Scripted baseline | met, 18:39 | 33 | 91% | 1 of 1 | - | - | - | - | - | free |
| qnone_outpost_1 | Qwen3 4B Instruct, local | not met (time budget) | 84 | 25% | 28 of 54 | 6× `craft` | 4 of 6 | - | - | 166k / 12.7k | free |
| qplan_outpost_1 | Qwen3 4B Instruct, local | not met (time budget) | 144 | 38% | 3 of 87 | 65× `craft` | 39 of 39 | - | - | 299k / 12.7k | free |
| qfull_outpost_1 | Qwen3 4B Instruct, local | not met (model ended) | 6 | 33% | 3 of 3 | - | - | - | - | 25.4k / 620 | free |
| base_outpost_2 | Scripted baseline | not met (step limit / stopped) | 23 | 43% | 7 of 11 | 5× `mine_stone` | 1 of 1 | - | 1 | - | free |
| qnone_outpost_2 | Qwen3 4B Instruct, local | not met (time budget) | 102 | 14% | 34 of 77 | 15× `craft` | 8 of 10 | - | - | 204k / 15.6k | free |
| qplan_outpost_2 | Qwen3 4B Instruct, local | not met (time budget) | 141 | 52% | 7 of 21 | 7× `craft` | 18 of 21 | - | 9 | 286k / 13.1k | free |
| qfull_outpost_2 | Qwen3 4B Instruct, local | not met (time budget) | 40 | 50% | 13 of 13 | - | - | - | 3 | 263k / 3.6k | free |
| base_outpost_3 | Scripted baseline | met, 18:39 | 72 | 42% | 27 of 27 | - | - | - | - | - | free |
| qnone_outpost_3 | Qwen3 4B Instruct, local | met, 21:51 | 62 | 31% | 22 of 40 | 6× `craft` | 3 of 4 | - | - | 125k / 9.6k | free |
| qplan_outpost_3 | Qwen3 4B Instruct, local | not met (step limit) | 200 | 82% | 2 of 3 | - | 57 of 57 | 1 of 201 calls | 4 | 411k / 18.5k | free |
| qfull_outpost_3 | Qwen3 4B Instruct, local | not met (time budget) | 40 | 45% | 9 of 13 | - | - | - | 2 | 258k / 3.0k | free |

By model:

| Model and condition | Runs | Goal met | 95% range | Median time to goal | Median decisions | Tokens in / out per run | Cost per run |
|---|---|---|---|---|---|---|---|
| Scripted baseline · memory plan | 3 | 2 of 3 | 21–94% | 18:39 | 33 | - | free |
| Qwen3 4B Instruct, local · memory none | 3 | 1 of 3 | 6–79% | 21:51 | 84 | 165k / 12.6k | free |
| Qwen3 4B Instruct, local · memory plan | 3 | 0 of 3 | 0–56% | - | 144 | 332k / 14.8k | free |
| Qwen3 4B Instruct, local · memory full | 3 | 0 of 3 | 0–56% | - | 40 | 182k / 2.4k | free |

## Skills used

Across 12 runs (3 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `craft` | 12 of 12 | 384 | 30% | 69% | 1% | 10% | 100% / 100% |
| `gather_wood` | 12 of 12 | 289 | 77% | 0% | 23% | 7% | 100% / 100% |
| `mine_stone` | 11 of 12 | 76 | 51% | 20% | 29% | 21% | 100% / 89% |
| `wait` | 10 of 12 | 78 | 79% | 0% | 21% | 18% | 100% / 78% |
| `flee` | 7 of 12 | 22 | 18% | 82% | 0% | 2% | 67% / 56% |
| `mine_ore` | 6 of 12 | 26 | 0% | 81% | 19% | 1% | 100% / 33% |
| `explore` | 6 of 12 | 18 | 44% | 6% | 50% | 3% | 0% / 67% |
| `build_shelter` | 6 of 12 | 9 | 67% | 33% | 0% | 1% | 100% / 33% |
| `smelt` | 3 of 12 | 18 | 0% | 100% | 0% | 0% | 33% / 22% |
| `descend` | 3 of 12 | 7 | 0% | 43% | 57% | 2% | 67% / 11% |
| `tunnel` | 1 of 12 | 12 | 0% | 0% | 100% | 0% | 33% / 0% |
| `sleep` | 1 of 12 | 8 | 0% | 100% | 0% | 0% | 0% / 11% |

**Never chosen:** `eat`, `climb_out`, `give`, `pick_up`, `go_to`, `store`, `take`, `hunt`, `shear`, `tell_agent`, `ask_agent`.

<details><summary>Times chosen, by model</summary>

| Skill | Scripted baseline | Qwen3 4B Instruct, local |
|---|---|---|
| `craft` | 16 | 368 |
| `gather_wood` | 6 | 283 |
| `mine_stone` | 11 | 65 |
| `wait` | 39 | 39 |
| `flee` | 16 | 6 |
| `mine_ore` | 18 | 8 |
| `explore` | 0 | 18 |
| `build_shelter` | 3 | 6 |
| `smelt` | 0 | 18 |
| `descend` | 7 | 0 |
| `tunnel` | 12 | 0 |
| `sleep` | 0 | 8 |

</details>

## In a sentence or two each

- **base_outpost_1** (Scripted baseline): Met its goal in 33 decisions and 18:39 of game time. 91% of its decisions worked (30 of 33). After a failure it usually changed course (1 of 1).
- **qnone_outpost_1** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: no shelter has been built yet; you have not yet survived a night since building the shelter. 25% of its decisions worked (21 of 84). After a failure it changed course about half the time (28 of 54).
- **qplan_outpost_1** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: no shelter has been built yet; you have not yet survived a night since building the shelter. 38% of its decisions worked (55 of 144). After a failure it mostly repeated itself (3 of 87).
- **qfull_outpost_1** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; no shelter has been built yet; you have not yet survived a night since building the shelter. 33% of its decisions worked (2 of 6). After a failure it usually changed course (3 of 3).
- **base_outpost_2** (Scripted baseline): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; you have not yet survived a night since building the shelter. 43% of its decisions worked (10 of 23). After a failure it changed course about half the time (7 of 11).
- **qnone_outpost_2** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: no shelter has been built yet; you have not yet survived a night since building the shelter. 14% of its decisions worked (14 of 102). After a failure it changed course about half the time (34 of 77).
- **qplan_outpost_2** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; no shelter has been built yet; you have not yet survived a night since building the shelter. 52% of its decisions worked (74 of 141). After a failure it mostly repeated itself (7 of 21).
- **qfull_outpost_2** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; no shelter has been built yet; you have not yet survived a night since building the shelter. 50% of its decisions worked (20 of 40). After a failure it usually changed course (13 of 13).
- **base_outpost_3** (Scripted baseline): Met its goal in 72 decisions and 18:39 of game time. 42% of its decisions worked (30 of 72). After a failure it usually changed course (27 of 27).
- **qnone_outpost_3** (Qwen3 4B Instruct, local): Met its goal in 62 decisions and 21:51 of game time. 31% of its decisions worked (19 of 62). After a failure it changed course about half the time (22 of 40).
- **qplan_outpost_3** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; no shelter has been built yet; you have not yet survived a night since building the shelter. 82% of its decisions worked (164 of 200). After a failure it changed course about half the time (2 of 3).
- **qfull_outpost_3** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; you have not yet survived a night since building the shelter. 45% of its decisions worked (18 of 40). After a failure it changed course about half the time (9 of 13).

<details><summary>How to read this</summary>

- **Worked**: decisions whose skill succeeded. **Changed course**: after a failure, the next decision was different.
- **Longest loop**: the same decision failing the same way, back to back. **Unusable answers**: replies that had to be asked again.
- **Tokens in / out**: everything sent to the model (prompts, cached or not, and re-asks) and everything it wrote. The local model's tokens are counted too, though it costs nothing.
- Game time: a whole day is 20:00. Costs are from token counts and list prices (`src/backends/pricing.ts`).
- Each agent's full report is in this folder, linked below.

Runs:

- [base_outpost_1](base_outpost_1.md)
- [qnone_outpost_1](qnone_outpost_1.md)
- [qplan_outpost_1](qplan_outpost_1.md)
- [qfull_outpost_1](qfull_outpost_1.md)
- [base_outpost_2](base_outpost_2.md)
- [qnone_outpost_2](qnone_outpost_2.md)
- [qplan_outpost_2](qplan_outpost_2.md)
- [qfull_outpost_2](qfull_outpost_2.md)
- [base_outpost_3](base_outpost_3.md)
- [qnone_outpost_3](qnone_outpost_3.md)
- [qplan_outpost_3](qplan_outpost_3.md)
- [qfull_outpost_3](qfull_outpost_3.md)

</details>
