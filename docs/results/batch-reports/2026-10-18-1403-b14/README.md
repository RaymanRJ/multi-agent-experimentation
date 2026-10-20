# Batch b14

*Built from the run logs on 2026-10-20 by the report code at 90710b0 (`scripts/publish-reports.sh b14`). Where this differs from the write-up in `docs/results/`, the write-up was made at the time, and the report code has been fixed since.*

3 runs · 2026-10-18 · - tokens in / out · total cost free

## Goal: outpost

> Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. Then survive the night. The episode ends by itself at sunrise once you have all of that.

scenario **survival** · stance neutral · chat off · memory plan

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| base_outpost_1 | Scripted baseline | met, 20:39 | 27 | 70% | 5 of 5 | - | - | - | - | - | free |
| base_outpost_2 | Scripted baseline | met, 18:42 | 36 | 89% | 3 of 3 | - | - | - | - | - | free |
| base_outpost_3 | Scripted baseline | met, 19:27 | 48 | 88% | 3 of 3 | - | - | - | 1 | - | free |

By model:

| Model | Runs | Goal met | 95% range | Median time to goal | Median decisions | Tokens in / out per run | Cost per run |
|---|---|---|---|---|---|---|---|
| Scripted baseline | 3 | 3 of 3 | 44–100% | 19:27 | 36 | - | free |

## Skills used

Across 3 runs (3 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `craft` | 3 of 3 | 25 | 100% | 0% | 0% | 3% | 100% / - |
| `mine_stone` | 3 of 3 | 13 | 85% | 0% | 15% | 17% | 100% / - |
| `mine_ore` | 3 of 3 | 9 | 0% | 89% | 11% | 6% | 100% / - |
| `gather_wood` | 3 of 3 | 8 | 100% | 0% | 0% | 12% | 100% / - |
| `descend` | 3 of 3 | 7 | 14% | 57% | 29% | 20% | 100% / - |
| `build_shelter` | 3 of 3 | 4 | 100% | 0% | 0% | 3% | 100% / - |
| `explore` | 3 of 3 | 3 | 67% | 0% | 33% | 3% | 100% / - |
| `wait` | 2 of 3 | 39 | 100% | 0% | 0% | 33% | 67% / - |
| `tunnel` | 1 of 3 | 2 | 100% | 0% | 0% | 2% | 33% / - |
| `smelt` | 1 of 3 | 1 | 100% | 0% | 0% | 1% | 33% / - |

**Never chosen:** `eat`, `flee`, `sleep`, `climb_out`, `give`, `pick_up`, `go_to`, `store`, `take`, `hunt`, `shear`, `tell_agent`, `ask_agent`.

## In a sentence or two each

- **base_outpost_1** (Scripted baseline): Met its goal in 27 decisions and 20:39 of game time. 70% of its decisions worked (19 of 27). After a failure it usually changed course (5 of 5).
- **base_outpost_2** (Scripted baseline): Met its goal in 36 decisions and 18:42 of game time. 89% of its decisions worked (32 of 36). After a failure it usually changed course (3 of 3).
- **base_outpost_3** (Scripted baseline): Met its goal in 48 decisions and 19:27 of game time. 88% of its decisions worked (42 of 48). After a failure it usually changed course (3 of 3).

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
