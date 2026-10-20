# Batch b16

*Built from the run logs on 2026-10-20 by the report code at 90710b0 (`scripts/publish-reports.sh b16`). Where this differs from the write-up in `docs/results/`, the write-up was made at the time, and the report code has been fixed since.*

3 runs · 2026-10-19 · 779k / 34.5k tokens in / out · total cost free

## Goal: outpost

> Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. Then survive the night. The episode ends by itself at sunrise once you have all of that.

scenario **survival** · stance neutral · chat off · memory plan

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| qplan_outpost_1 | Qwen3 4B Instruct, local | not met (time budget) | 144 | 26% | 11 of 23 | 8× `craft` | 15 of 20 | - | 11 | 306k / 13.8k | free |
| qplan_outpost_2 | Qwen3 4B Instruct, local | not met (time budget) | 71 | 51% | 10 of 26 | 5× `mine_stone` | 7 of 11 | - | 3 | 151k / 6.6k | free |
| qplan_outpost_3 | Qwen3 4B Instruct, local | not met (time budget) | 148 | 90% | 5 of 14 | 4× `mine_stone` | 42 of 43 | - | - | 322k / 14.2k | free |

By model:

| Model | Runs | Goal met | 95% range | Median time to goal | Median decisions | Tokens in / out per run | Cost per run |
|---|---|---|---|---|---|---|---|
| Qwen3 4B Instruct, local | 3 | 0 of 3 | 0–56% | - | 144 | 260k / 11.5k | free |

## Skills used

Across 3 runs (0 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `gather_wood` | 3 of 3 | 223 | 64% | 0% | 36% | 18% | - / 100% |
| `craft` | 3 of 3 | 72 | 36% | 58% | 6% | 5% | - / 100% |
| `mine_stone` | 3 of 3 | 68 | 56% | 32% | 12% | 42% | - / 100% |

**Never chosen:** `wait`, `explore`, `eat`, `flee`, `sleep`, `build_shelter`, `mine_ore`, `smelt`, `descend`, `tunnel`, `climb_out`, `give`, `pick_up`, `go_to`, `store`, `take`, `hunt`, `shear`, `tell_agent`, `ask_agent`.

## In a sentence or two each

- **qplan_outpost_1** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; no shelter has been built yet; you have not yet survived a night since building the shelter. 26% of its decisions worked (38 of 144). After a failure it changed course about half the time (11 of 23).
- **qplan_outpost_2** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; no shelter has been built yet; you have not yet survived a night since building the shelter. 51% of its decisions worked (36 of 71). After a failure it mostly repeated itself (10 of 26).
- **qplan_outpost_3** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; no shelter has been built yet; you have not yet survived a night since building the shelter. 90% of its decisions worked (133 of 148). After a failure it mostly repeated itself (5 of 14).

<details><summary>How to read this</summary>

- **Worked**: decisions whose skill succeeded. **Changed course**: after a failure, the next decision was different.
- **Longest loop**: the same decision failing the same way, back to back. **Unusable answers**: replies that had to be asked again.
- **Tokens in / out**: everything sent to the model (prompts, cached or not, and re-asks) and everything it wrote. The local model's tokens are counted too, though it costs nothing.
- Game time: a whole day is 20:00. Costs are from token counts and list prices (`src/backends/pricing.ts`).
- Each agent's full report is in this folder, linked below.

Runs:

- [qplan_outpost_1](qplan_outpost_1.md)
- [qplan_outpost_2](qplan_outpost_2.md)
- [qplan_outpost_3](qplan_outpost_3.md)

</details>
