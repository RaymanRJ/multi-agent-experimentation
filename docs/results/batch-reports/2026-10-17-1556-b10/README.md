# Batch b10

*Built from the run logs on 2026-10-20 by the report code at 90710b0 (`scripts/publish-reports.sh b10`). Where this differs from the write-up in `docs/results/`, the write-up was made at the time, and the report code has been fixed since.*

3 runs · 2026-10-17 · - tokens in / out · total cost free

## Goal: outpost

> Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. Then survive the night. The episode ends by itself at sunrise once you have all of that.

scenario **survival** · stance neutral · chat off · memory plan

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| base_outpost_1 | Scripted baseline | met, 18:39 | 59 | 66% | 18 of 19 | - | - | - | - | - | free |
| base_outpost_2 | Scripted baseline | met, 20:35 | 30 | 60% | 7 of 8 | - | - | - | - | - | free |
| base_outpost_3 | Scripted baseline | met, 18:39 | 43 | 77% | 9 of 10 | - | - | - | - | - | free |

By model:

| Model | Runs | Goal met | 95% range | Median time to goal | Median decisions | Tokens in / out per run | Cost per run |
|---|---|---|---|---|---|---|---|
| Scripted baseline | 3 | 3 of 3 | 44–100% | 18:39 | 43 | - | free |

## Skills used

Across 3 runs (3 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `mine_ore` | 3 of 3 | 23 | 4% | 91% | 4% | 7% | 100% / - |
| `craft` | 3 of 3 | 20 | 100% | 0% | 0% | 4% | 100% / - |
| `tunnel` | 3 of 3 | 16 | 75% | 25% | 0% | 5% | 100% / - |
| `descend` | 3 of 3 | 11 | 18% | 55% | 27% | 25% | 100% / - |
| `mine_stone` | 3 of 3 | 7 | 86% | 14% | 0% | 13% | 100% / - |
| `gather_wood` | 3 of 3 | 6 | 100% | 0% | 0% | 6% | 100% / - |
| `build_shelter` | 3 of 3 | 3 | 100% | 0% | 0% | 3% | 100% / - |
| `wait` | 2 of 3 | 40 | 98% | 0% | 3% | 34% | 67% / - |
| `flee` | 1 of 3 | 5 | 0% | 100% | 0% | 2% | 33% / - |
| `smelt` | 1 of 3 | 1 | 100% | 0% | 0% | 1% | 33% / - |

**Never chosen:** `explore`, `eat`, `sleep`, `climb_out`, `give`, `pick_up`, `go_to`, `store`, `take`, `hunt`, `shear`, `tell_agent`, `ask_agent`.

## In a sentence or two each

- **base_outpost_1** (Scripted baseline): Met its goal in 59 decisions and 18:39 of game time. 66% of its decisions worked (39 of 59). After a failure it usually changed course (18 of 19).
- **base_outpost_2** (Scripted baseline): Met its goal in 30 decisions and 20:35 of game time. 60% of its decisions worked (18 of 30). After a failure it usually changed course (7 of 8).
- **base_outpost_3** (Scripted baseline): Met its goal in 43 decisions and 18:39 of game time. 77% of its decisions worked (33 of 43). After a failure it usually changed course (9 of 10).

<details><summary>How to read this</summary>

- **Worked**: decisions whose skill succeeded. **Changed course**: after a failure, the next decision was different.
- **Longest loop**: the same decision failing the same way, back to back. **Unusable answers**: replies that had to be asked again.
- **Tokens in / out**: everything sent to the model (prompts, cached or not, and re-asks) and everything it wrote. The local model's tokens are counted too, though it costs nothing.
- Game time: a whole day is 20:00. Costs are from token counts and list prices (`src/backends/pricing.ts`).
- Each agent's full report is in this folder, linked below.

Runs:

- [base_outpost_1](base_outpost_1.md)
- [base_outpost_2](base_outpost_2.md)
- [base_outpost_3](base_outpost_3.md)

</details>
