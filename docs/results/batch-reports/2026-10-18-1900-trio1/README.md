# Team run trio1

*Built from the run logs on 2026-10-20 by the report code at 90710b0 (`scripts/publish-reports.sh trio1`). Where this differs from the write-up in `docs/results/`, the write-up was made at the time, and the report code has been fixed since.*

3 runs · 2026-10-18 · 242k / 28.1k tokens in / out · total cost $0.33

## Goal: team-camp

> Between you, your team must end up holding a stone pickaxe, a stone axe, a stone sword and a stone shovel, with every member carrying at least one of them, and one of you must build a two-storey shelter. It does not matter who builds. The episode ends by itself once the team has all of that.

scenario **sandbox** · stance collaborative · chat on · memory plan · time budget 20:00 of game time (24,000 ticks) · cost cap $1 per agent

### Team trio1, rep 1: goal met in 6:48 of game time · 242k / 28.1k tokens in / out · $0.33

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| haiku | Claude Haiku 4.5 | met, 6:48 | 9 | 33% | 0 of 2 | - | - | - | - | 28.6k / 2.2k | $0.04 |
| sonnet | Claude Sonnet 5.5 | met, 6:45 | 13 | 85% | - | - | - | 13 of 26 calls | - | 112k / 21.9k | $0.29 |
| qwen | Qwen3 4B Instruct, local | met, 6:42 | 33 | 9% | 2 of 29 | 16× `gather_wood` | 9 of 9 | - | - | 102k / 4.0k | free |

**Who did what**

- **haiku** (Claude Haiku 4.5): made wooden pickaxe; received stone shovel from sonnet; said 8 things (2 to someone by name); ended holding stone shovel, wooden pickaxe.
- **sonnet** (Claude Sonnet 5.5): made wooden pickaxe, stone pickaxe, stone axe, stone sword, stone shovel; built a two-storey shelter; gave stone axe to qwen, stone shovel to haiku; 1 give failed; said 12 things (4 to someone by name); ended holding stone pickaxe, stone sword, wooden pickaxe.
- **qwen** (Qwen3 4B Instruct, local): received stone axe from sonnet; said 27 things (0 to someone by name); ended holding stone axe.

<details><summary>Key moments, in order</summary>

- 1:24 — haiku made a wooden pickaxe
- 2:25 — sonnet made a wooden pickaxe
- 3:10 — sonnet made a stone pickaxe
- 3:18 — sonnet made a stone axe
- 3:25 — sonnet made a stone sword
- 3:31 — sonnet made a stone shovel
- 6:09 — sonnet built a two-storey shelter
- 6:22 — sonnet gave stone axe to qwen
- 6:40 — haiku's run ended: goal met
- 6:41 — sonnet gave stone shovel to haiku
- 6:41 — sonnet's run ended: goal met
- 6:47 — qwen's run ended: goal met

Times are real minutes from the first agent's first decision.

</details>

## Skills used

Across 3 runs (3 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `gather_wood` | 3 of 3 | 38 | 16% | 76% | 8% | 32% | 100% / - |
| `craft` | 2 of 3 | 7 | 86% | 0% | 14% | 6% | 67% / - |
| `mine_stone` | 2 of 3 | 3 | 33% | 0% | 67% | 23% | 67% / - |
| `pick_up` | 1 of 3 | 3 | 33% | 67% | 0% | 0% | 33% / - |
| `give` | 1 of 3 | 3 | 67% | 0% | 33% | 1% | 33% / - |
| `build_shelter` | 1 of 3 | 1 | 100% | 0% | 0% | 6% | 33% / - |

**Never chosen:** `wait`, `explore`, `eat`, `flee`, `sleep`, `mine_ore`, `smelt`, `descend`, `tunnel`, `climb_out`, `go_to`, `store`, `take`, `hunt`, `shear`, `tell_agent`, `ask_agent`.

<details><summary>Times chosen, by model</summary>

| Skill | Claude Haiku 4.5 | Claude Sonnet 5.5 | Qwen3 4B Instruct, local |
|---|---|---|---|
| `gather_wood` | 2 | 3 | 33 |
| `craft` | 2 | 5 | 0 |
| `mine_stone` | 2 | 1 | 0 |
| `pick_up` | 3 | 0 | 0 |
| `give` | 0 | 3 | 0 |
| `build_shelter` | 0 | 1 | 0 |

</details>

## In a sentence or two each

- **haiku** (Claude Haiku 4.5): Met its goal in 9 decisions and 6:48 of game time. 33% of its decisions worked (3 of 9). After a failure it mostly repeated itself (0 of 2).
- **sonnet** (Claude Sonnet 5.5): Met its goal in 13 decisions and 6:45 of game time. 85% of its decisions worked (11 of 13). Most of its game time went on `gather_wood` (30%).
- **qwen** (Qwen3 4B Instruct, local): Met its goal in 33 decisions and 6:42 of game time. 9% of its decisions worked (3 of 33). After a failure it mostly repeated itself (2 of 29).

<details><summary>How to read this</summary>

- **Worked**: decisions whose skill succeeded. **Changed course**: after a failure, the next decision was different.
- **Longest loop**: the same decision failing the same way, back to back. **Unusable answers**: replies that had to be asked again.
- **Tokens in / out**: everything sent to the model (prompts, cached or not, and re-asks) and everything it wrote. The local model's tokens are counted too, though it costs nothing.
- Game time: a whole day is 20:00. Costs are from token counts and list prices (`src/backends/pricing.ts`).
- Each agent's full report is in this folder, linked below.

Runs:

- [haiku-1](haiku-1.md)
- [sonnet-1](sonnet-1.md)
- [qwen-1](qwen-1.md)

</details>
