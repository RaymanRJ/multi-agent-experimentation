# Batch p6

12 runs · 2026-10-20 · 1472k / 77.2k tokens in / out · total cost $1.66

## Goal: outpost

> Before nightfall, make a stone pickaxe, a stone axe, a stone sword and a stone shovel, and build a shelter. Then survive the night. The episode ends by itself at sunrise once you have all of that.

scenario **survival** · stance neutral · chat off · memory plan · time budget 22:30 of game time (27,000 ticks) · cost cap $1.5 per agent

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| chap_outpost_1 | Claude Haiku 4.5 | met, 19:01 | 26 | 81% | 3 of 3 | - | - | - | - | 112k / 9.7k | $0.16 |
| csop_outpost_1 | Claude Sonnet 5.5 | met, 18:35 | 33 | 94% | - | - | - | - | - | 176k / 7.2k | $0.15 |
| copp_outpost_1 | Claude Opus 5.5 | met, 18:23 | 23 | 91% | - | - | - | - | - | 123k / 5.1k | $0.22 |
| glup_outpost_1 | GPT-6 Luna | met, 18:23 | 22 | 95% | - | - | - | - | - | 71.5k / 3.9k | $0.0091 |
| chap_outpost_2 | Claude Haiku 4.5 | met, 19:12 | 31 | 87% | 3 of 3 | - | - | - | - | 137k / 11.1k | $0.19 |
| csop_outpost_2 | Claude Sonnet 5.5 | met, 18:35 | 33 | 94% | - | - | - | - | - | 175k / 7.0k | $0.15 |
| copp_outpost_2 | Claude Opus 5.5 | met, 18:27 | 25 | 92% | - | - | - | - | - | 133k / 5.5k | $0.24 |
| glup_outpost_2 | GPT-6 Luna | met, 18:24 | 20 | 85% | - | - | - | - | - | 65.3k / 3.2k | $0.0081 |
| chap_outpost_3 | Claude Haiku 4.5 | met, 18:34 | 28 | 82% | 3 of 3 | - | - | - | - | 125k / 9.3k | $0.17 |
| csop_outpost_3 | Claude Sonnet 5.5 | met, 18:22 | 30 | 93% | - | - | - | - | - | 160k / 6.2k | $0.13 |
| copp_outpost_3 | Claude Opus 5.5 | met, 18:26 | 23 | 91% | - | - | - | - | - | 123k / 5.2k | $0.22 |
| glup_outpost_3 | GPT-6 Luna | met, 18:21 | 22 | 91% | - | - | - | - | - | 71.4k / 3.9k | $0.0091 |

By model:

| Model | Runs | Goal met | 95% range | Median time to goal | Median decisions | Tokens in / out per run | Cost per run |
|---|---|---|---|---|---|---|---|
| Claude Haiku 4.5 | 3 | 3 of 3 | 44–100% | 19:01 | 28 | 125k / 10.0k | $0.17 |
| Claude Sonnet 5.5 | 3 | 3 of 3 | 44–100% | 18:35 | 33 | 170k / 6.8k | $0.14 |
| Claude Opus 5.5 | 3 | 3 of 3 | 44–100% | 18:26 | 23 | 126k / 5.3k | $0.23 |
| GPT-6 Luna | 3 | 3 of 3 | 44–100% | 18:23 | 22 | 69.4k / 3.7k | $0.0088 |

## Skills used

Across 12 runs (12 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `wait` | 12 of 12 | 206 | 89% | 0% | 11% | 72% | 100% / - |
| `craft` | 12 of 12 | 62 | 100% | 0% | 0% | 3% | 100% / - |
| `mine_stone` | 12 of 12 | 13 | 92% | 0% | 8% | 8% | 100% / - |
| `gather_wood` | 12 of 12 | 12 | 100% | 0% | 0% | 7% | 100% / - |
| `build_shelter` | 12 of 12 | 12 | 100% | 0% | 0% | 2% | 100% / - |
| `sleep` | 3 of 12 | 9 | 0% | 100% | 0% | 0% | 25% / - |
| `pick_up` | 1 of 12 | 1 | 100% | 0% | 0% | 0% | 8% / - |
| `climb_out` | 1 of 12 | 1 | 100% | 0% | 0% | 0% | 8% / - |

**Never chosen:** `explore`, `eat`, `flee`, `mine_ore`, `smelt`, `descend`, `tunnel`, `give`, `go_to`, `store`, `take`, `hunt`, `shear`, `tell_agent`, `ask_agent`.

<details><summary>Times chosen, by model</summary>

| Skill | Claude Haiku 4.5 | Claude Sonnet 5.5 | Claude Opus 5.5 | GPT-6 Luna |
|---|---|---|---|---|
| `wait` | 50 | 72 | 46 | 38 |
| `craft` | 16 | 15 | 15 | 16 |
| `mine_stone` | 3 | 3 | 3 | 4 |
| `gather_wood` | 3 | 3 | 3 | 3 |
| `build_shelter` | 3 | 3 | 3 | 3 |
| `sleep` | 9 | 0 | 0 | 0 |
| `pick_up` | 0 | 0 | 1 | 0 |
| `climb_out` | 1 | 0 | 0 | 0 |

</details>

## In a sentence or two each

- **chap_outpost_1** (Claude Haiku 4.5): Met its goal in 26 decisions and 19:01 of game time. 81% of its decisions worked (21 of 26). After a failure it usually changed course (3 of 3).
- **csop_outpost_1** (Claude Sonnet 5.5): Met its goal in 33 decisions and 18:35 of game time. 94% of its decisions worked (31 of 33). Most of its game time went on `wait` (77%).
- **copp_outpost_1** (Claude Opus 5.5): Met its goal in 23 decisions and 18:23 of game time. 91% of its decisions worked (21 of 23). Most of its game time went on `wait` (79%).
- **glup_outpost_1** (GPT-6 Luna): Met its goal in 22 decisions and 18:23 of game time. 95% of its decisions worked (21 of 22). Most of its game time went on `wait` (76%).
- **chap_outpost_2** (Claude Haiku 4.5): Met its goal in 31 decisions and 19:12 of game time. 87% of its decisions worked (27 of 31). After a failure it usually changed course (3 of 3).
- **csop_outpost_2** (Claude Sonnet 5.5): Met its goal in 33 decisions and 18:35 of game time. 94% of its decisions worked (31 of 33). Most of its game time went on `wait` (80%).
- **copp_outpost_2** (Claude Opus 5.5): Met its goal in 25 decisions and 18:27 of game time. 92% of its decisions worked (23 of 25). Most of its game time went on `wait` (77%).
- **glup_outpost_2** (GPT-6 Luna): Met its goal in 20 decisions and 18:24 of game time. 85% of its decisions worked (17 of 20). Most of its game time went on `wait` (56%).
- **chap_outpost_3** (Claude Haiku 4.5): Met its goal in 28 decisions and 18:34 of game time. 82% of its decisions worked (23 of 28). After a failure it usually changed course (3 of 3).
- **csop_outpost_3** (Claude Sonnet 5.5): Met its goal in 30 decisions and 18:22 of game time. 93% of its decisions worked (28 of 30). Most of its game time went on `wait` (67%).
- **copp_outpost_3** (Claude Opus 5.5): Met its goal in 23 decisions and 18:26 of game time. 91% of its decisions worked (21 of 23). Most of its game time went on `wait` (76%).
- **glup_outpost_3** (GPT-6 Luna): Met its goal in 22 decisions and 18:21 of game time. 91% of its decisions worked (20 of 22). Most of its game time went on `wait` (68%).

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
- [csop_outpost_2](csop_outpost_2.md)
- [copp_outpost_2](copp_outpost_2.md)
- [glup_outpost_2](glup_outpost_2.md)
- [chap_outpost_3](chap_outpost_3.md)
- [csop_outpost_3](csop_outpost_3.md)
- [copp_outpost_3](copp_outpost_3.md)
- [glup_outpost_3](glup_outpost_3.md)

</details>
