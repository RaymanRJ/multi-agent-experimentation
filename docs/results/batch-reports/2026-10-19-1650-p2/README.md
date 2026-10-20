# Batch p2

*Built from the run logs on 2026-10-20 by the report code at 441cbad (`scripts/publish-reports.sh p2`). Where this differs from the write-up in `docs/results/`, the write-up was made at the time, and the report code has been fixed since.*

4 runs · 2026-10-19 · 677k / 53.5k tokens in / out · total cost $0.88

## Goal: outpost

> Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. Then survive the night. The episode ends by itself at sunrise once you have all of that.

scenario **survival** · stance neutral · chat off · memory plan · time budget 22:30 of game time (27,000 ticks) · cost cap $5 per agent

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| chap_outpost_1 | Claude Haiku 4.5 | met, 19:04 | 54 | 69% | 6 of 12 | 4× `sleep` | 2 of 2 | - | 1 | 200k / 20.1k | $0.30 |
| csop_outpost_1 | Claude Sonnet 5.5 | met, 18:24 | 48 | 79% | 5 of 7 | - | - | - | 1 | 215k / 13.6k | $0.24 |
| copp_outpost_1 | Claude Opus 5.5 | met, 18:32 | 32 | 66% | 2 of 2 | - | - | - | - | 144k / 9.5k | $0.33 |
| glup_outpost_1 | GPT-6 Luna | met, 18:23 | 44 | 77% | 2 of 2 | - | - | - | - | 118k / 10.3k | $0.02 |

## Skills used

Across 4 runs (4 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `wait` | 4 of 4 | 78 | 81% | 0% | 19% | 46% | 100% / - |
| `craft` | 4 of 4 | 37 | 81% | 19% | 0% | 7% | 100% / - |
| `build_shelter` | 4 of 4 | 18 | 72% | 28% | 0% | 7% | 100% / - |
| `flee` | 4 of 4 | 10 | 90% | 10% | 0% | 2% | 100% / - |
| `gather_wood` | 4 of 4 | 8 | 75% | 0% | 25% | 9% | 100% / - |
| `mine_stone` | 4 of 4 | 8 | 75% | 0% | 25% | 14% | 100% / - |
| `explore` | 3 of 4 | 4 | 0% | 0% | 100% | 0% | 75% / - |
| `go_to` | 2 of 4 | 3 | 33% | 33% | 33% | 0% | 50% / - |
| `sleep` | 1 of 4 | 9 | 0% | 100% | 0% | 0% | 25% / - |
| `pick_up` | 1 of 4 | 3 | 67% | 33% | 0% | 0% | 25% / - |

**Never chosen:** `eat`, `mine_ore`, `smelt`, `descend`, `tunnel`, `climb_out`, `give`, `store`, `take`, `hunt`, `shear`, `tell_agent`, `ask_agent`.

<details><summary>Times chosen, by model</summary>

| Skill | Claude Haiku 4.5 | Claude Sonnet 5.5 | Claude Opus 5.5 | GPT-6 Luna |
|---|---|---|---|---|
| `wait` | 12 | 27 | 17 | 22 |
| `craft` | 12 | 15 | 5 | 5 |
| `build_shelter` | 8 | 1 | 3 | 6 |
| `flee` | 5 | 1 | 2 | 2 |
| `gather_wood` | 2 | 2 | 1 | 3 |
| `mine_stone` | 2 | 2 | 2 | 2 |
| `explore` | 1 | 0 | 1 | 2 |
| `go_to` | 0 | 0 | 1 | 2 |
| `sleep` | 9 | 0 | 0 | 0 |
| `pick_up` | 3 | 0 | 0 | 0 |

</details>

## In a sentence or two each

- **chap_outpost_1** (Claude Haiku 4.5): Met its goal in 54 decisions and 19:04 of game time. 69% of its decisions worked (37 of 54). After a failure it changed course about half the time (6 of 12).
- **csop_outpost_1** (Claude Sonnet 5.5): Met its goal in 48 decisions and 18:24 of game time. 79% of its decisions worked (38 of 48). After a failure it usually changed course (5 of 7).
- **copp_outpost_1** (Claude Opus 5.5): Met its goal in 32 decisions and 18:32 of game time. 66% of its decisions worked (21 of 32). After a failure it usually changed course (2 of 2).
- **glup_outpost_1** (GPT-6 Luna): Met its goal in 44 decisions and 18:23 of game time. 77% of its decisions worked (34 of 44). After a failure it usually changed course (2 of 2).

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

</details>
