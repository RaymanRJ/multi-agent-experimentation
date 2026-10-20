# Batch p3

*Built from the run logs on 2026-10-20 by the report code at 441cbad (`scripts/publish-reports.sh p3`). Where this differs from the write-up in `docs/results/`, the write-up was made at the time, and the report code has been fixed since.*

5 runs · 2026-10-19 · 581k / 53.3k tokens in / out · total cost $0.78

## Goal: outpost

> Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. Then survive the night. The episode ends by itself at sunrise once you have all of that.

scenario **survival** · stance neutral · chat off · memory plan · time budget 22:30 of game time (27,000 ticks) · cost cap $1.5 per agent

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| chap_outpost_1 | Claude Haiku 4.5 | not met (time budget) | 52 | 65% | 9 of 11 | - | 0 of 1 | - | 3 | 196k / 20.4k | $0.30 |
| csop_outpost_1 | Claude Sonnet 5.5 | not met (time budget) | 15 | 33% | 6 of 6 | - | - | - | - | 67.5k / 5.7k | $0.09 |
| copp_outpost_1 | Claude Opus 5.5 | not met (step limit / stopped) | 17 | 76% | 1 of 1 | - | - | - | - | 76.0k / 4.7k | $0.18 |
| glup_outpost_1 | GPT-6 Luna | met, 18:35 | 40 | 83% | 2 of 2 | - | - | - | 3 | 107k / 9.3k | $0.02 |
| chap_outpost_2 | Claude Haiku 4.5 | met, 18:50 | 37 | 84% | 4 of 4 | - | - | - | - | 134k / 13.2k | $0.20 |

By model:

| Model | Runs | Goal met | 95% range | Median time to goal | Median decisions | Tokens in / out per run | Cost per run |
|---|---|---|---|---|---|---|---|
| Claude Haiku 4.5 | 2 | 1 of 2 | 9–91% | 18:50 | 52 | 165k / 16.8k | $0.25 |
| Claude Sonnet 5.5 | 1 | 0 of 1 | 0–79% | - | 15 | 67.5k / 5.7k | $0.09 |
| Claude Opus 5.5 | 1 | 0 of 1 | 0–79% | - | 17 | 76.0k / 4.7k | $0.18 |
| GPT-6 Luna | 1 | 1 of 1 | 21–100% | 18:35 | 40 | 107k / 9.3k | $0.02 |

## Skills used

Across 5 runs (2 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `craft` | 5 of 5 | 36 | 94% | 3% | 3% | 4% | 100% / 100% |
| `mine_stone` | 5 of 5 | 17 | 29% | 29% | 41% | 37% | 100% / 100% |
| `build_shelter` | 5 of 5 | 17 | 59% | 41% | 0% | 4% | 100% / 100% |
| `gather_wood` | 5 of 5 | 14 | 79% | 0% | 21% | 12% | 100% / 100% |
| `wait` | 4 of 5 | 41 | 78% | 2% | 20% | 24% | 100% / 67% |
| `pick_up` | 4 of 5 | 8 | 63% | 38% | 0% | 0% | 100% / 67% |
| `flee` | 3 of 5 | 20 | 90% | 10% | 0% | 3% | 50% / 67% |
| `sleep` | 2 of 5 | 4 | 0% | 100% | 0% | 0% | 50% / 33% |
| `explore` | 1 of 5 | 2 | 0% | 100% | 0% | 4% | 0% / 33% |
| `eat` | 1 of 5 | 1 | 100% | 0% | 0% | 0% | 0% / 33% |
| `descend` | 1 of 5 | 1 | 0% | 0% | 100% | 1% | 50% / 0% |

**Never chosen:** `mine_ore`, `smelt`, `tunnel`, `climb_out`, `give`, `go_to`, `store`, `take`, `hunt`, `shear`, `tell_agent`, `ask_agent`.

<details><summary>Times chosen, by model</summary>

| Skill | Claude Haiku 4.5 | Claude Sonnet 5.5 | Claude Opus 5.5 | GPT-6 Luna |
|---|---|---|---|---|
| `craft` | 16 | 1 | 5 | 14 |
| `mine_stone` | 5 | 6 | 2 | 4 |
| `build_shelter` | 11 | 2 | 1 | 3 |
| `gather_wood` | 6 | 1 | 1 | 6 |
| `wait` | 27 | 0 | 7 | 7 |
| `pick_up` | 6 | 0 | 1 | 1 |
| `flee` | 12 | 3 | 0 | 5 |
| `sleep` | 4 | 0 | 0 | 0 |
| `explore` | 0 | 2 | 0 | 0 |
| `eat` | 1 | 0 | 0 | 0 |
| `descend` | 1 | 0 | 0 | 0 |

</details>

## In a sentence or two each

- **chap_outpost_1** (Claude Haiku 4.5): Did not meet its goal. Still outstanding at the end: you have no stone_axe; you have no stone_sword; you have no stone_shovel; you have not yet survived a night since building the shelter. 65% of its decisions worked (34 of 52). After a failure it usually changed course (9 of 11).
- **csop_outpost_1** (Claude Sonnet 5.5): Did not meet its goal. Still outstanding at the end: you have no stone_pickaxe; you have no stone_axe; you have no stone_sword; you have no stone_shovel; no shelter has been built yet; you have not yet survived a night since building the shelter. 33% of its decisions worked (5 of 15). After a failure it usually changed course (6 of 6).
- **copp_outpost_1** (Claude Opus 5.5): Did not meet its goal. Still outstanding at the end: you have not yet survived a night since building the shelter. 76% of its decisions worked (13 of 17). After a failure it usually changed course (1 of 1).
- **glup_outpost_1** (GPT-6 Luna): Met its goal in 40 decisions and 18:35 of game time. 83% of its decisions worked (33 of 40). After a failure it usually changed course (2 of 2).
- **chap_outpost_2** (Claude Haiku 4.5): Met its goal in 37 decisions and 18:50 of game time. 84% of its decisions worked (31 of 37). After a failure it usually changed course (4 of 4).

<details><summary>How to read this</summary>

- **Worked**: decisions whose skill succeeded. **Changed course**: after a failure, the next decision was different.
- **Longest loop**: the same decision failing the same way, back to back. **Unusable answers**: replies that had to be asked again.
- **Tokens in / out**: everything sent to the model (prompts, cached or not, and re-asks) and everything it wrote. The local model's tokens are counted too, though it costs nothing.
- Game time: a whole day is 20:00. Costs are from token counts and list prices (`src/backends/pricing.ts`).
- Each agent's full report is in this folder, linked below.

Runs:

- [chap_outpost_1](chap_outpost_1.md)
- [csop_outpost_1](csop_outpost_1.md)
- [copp_outpost_1](copp_outpost_1.md)
- [glup_outpost_1](glup_outpost_1.md)
- [chap_outpost_2](chap_outpost_2.md)

</details>
