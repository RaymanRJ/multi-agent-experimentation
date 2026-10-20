# Team run quad1

*Built from the run logs on 2026-10-20 by the report code at 90710b0 (`scripts/publish-reports.sh quad1`). Where this differs from the write-up in `docs/results/`, the write-up was made at the time, and the report code has been fixed since.*

4 runs · 2026-10-18 · 308k / 21.7k tokens in / out · total cost $0.28

## Goal: team-camp

> Between you, your team must end up holding a stone pickaxe, a stone axe, a stone sword and a stone shovel, with every member carrying at least one of them, and one of you must build a two-storey shelter. It does not matter who builds. The episode ends by itself once the team has all of that.

scenario **sandbox** · stance collaborative · chat on · memory plan · time budget 20:00 of game time (24,000 ticks) · cost cap $1 per agent

### Team quad1, rep 1: goal met in 4:54 of game time · 308k / 21.7k tokens in / out · $0.28

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| haiku | Claude Haiku 4.5 | met, 4:53 | 16 | 63% | 3 of 3 | - | - | - | - | 69.0k / 7.3k | $0.11 |
| sonnet | Claude Sonnet 5.5 | met, 4:54 | 16 | 81% | 0 of 1 | - | - | 9 of 25 calls | - | 134k / 8.9k | $0.17 |
| luna | GPT-6 Luna | met, 4:42 | 10 | 70% | 1 of 1 | - | 0 of 1 | - | - | 32.6k / 2.6k | $0.0045 |
| qwen | Qwen3 4B Instruct, local | met, 4:35 | 21 | 10% | 2 of 18 | 13× `gather_wood` | 5 of 5 | - | - | 72.1k / 3.0k | free |

**Who did what**

- **haiku** (Claude Haiku 4.5): made wooden pickaxe; received stone axe from sonnet; said 7 things (0 to someone by name); ended holding stone axe, wooden pickaxe.
- **sonnet** (Claude Sonnet 5.5): made wooden pickaxe, stone pickaxe, stone axe ×2, stone sword ×2, stone shovel; gave stone sword to luna, stone axe to haiku, stone shovel to qwen; 3 gives failed; said 7 things (2 to someone by name); ended holding stone axe, stone pickaxe, stone sword, wooden pickaxe.
- **luna** (GPT-6 Luna): built a two-storey shelter; received stone sword from sonnet; said 1 thing (0 to someone by name); ended holding stone sword.
- **qwen** (Qwen3 4B Instruct, local): made wooden pickaxe; received stone shovel from sonnet; said 13 things (2 to someone by name); ended holding stone shovel, wooden pickaxe.

<details><summary>Key moments, in order</summary>

- 0:08 — sonnet made a wooden pickaxe
- 1:19 — haiku made a wooden pickaxe
- 1:30 — sonnet made a stone pickaxe
- 1:38 — sonnet made a stone axe
- 1:43 — sonnet made a stone sword
- 1:49 — sonnet made a stone shovel
- 1:58 — sonnet gave stone sword to luna
- 2:10 — sonnet gave stone axe to haiku
- 3:20 — luna built a two-storey shelter
- 3:49 — sonnet made a stone sword
- 3:53 — qwen made a wooden pickaxe
- 3:55 — sonnet made a stone axe
- 4:03 — sonnet gave stone shovel to qwen
- 4:05 — qwen's run ended: goal met
- 4:06 — luna's run ended: goal met
- 4:06 — haiku's run ended: goal met
- 4:11 — sonnet's run ended: goal met

Times are real minutes from the first agent's first decision.

</details>

## Skills used

Across 4 runs (4 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `gather_wood` | 4 of 4 | 18 | 22% | 72% | 6% | 32% | 100% / - |
| `craft` | 4 of 4 | 12 | 75% | 8% | 17% | 8% | 100% / - |
| `mine_stone` | 3 of 4 | 11 | 18% | 55% | 27% | 11% | 75% / - |
| `wait` | 2 of 4 | 7 | 100% | 0% | 0% | 2% | 50% / - |
| `give` | 1 of 4 | 6 | 50% | 17% | 33% | 8% | 25% / - |
| `pick_up` | 1 of 4 | 4 | 75% | 25% | 0% | 1% | 25% / - |
| `explore` | 1 of 4 | 3 | 100% | 0% | 0% | 1% | 25% / - |
| `build_shelter` | 1 of 4 | 2 | 50% | 50% | 0% | 6% | 25% / - |

**Never chosen:** `eat`, `flee`, `sleep`, `mine_ore`, `smelt`, `descend`, `tunnel`, `climb_out`, `go_to`, `store`, `take`, `hunt`, `shear`, `tell_agent`, `ask_agent`.

<details><summary>Times chosen, by model</summary>

| Skill | Claude Haiku 4.5 | Claude Sonnet 5.5 | GPT-6 Luna | Qwen3 4B Instruct, local |
|---|---|---|---|---|
| `gather_wood` | 1 | 1 | 2 | 14 |
| `craft` | 2 | 7 | 1 | 2 |
| `mine_stone` | 4 | 2 | 0 | 5 |
| `wait` | 5 | 0 | 2 | 0 |
| `give` | 0 | 6 | 0 | 0 |
| `pick_up` | 4 | 0 | 0 | 0 |
| `explore` | 0 | 0 | 3 | 0 |
| `build_shelter` | 0 | 0 | 2 | 0 |

</details>

## In a sentence or two each

- **haiku** (Claude Haiku 4.5): Met its goal in 16 decisions and 4:53 of game time. 63% of its decisions worked (10 of 16). After a failure it usually changed course (3 of 3).
- **sonnet** (Claude Sonnet 5.5): Met its goal in 16 decisions and 4:54 of game time. 81% of its decisions worked (13 of 16). After a failure it mostly repeated itself (0 of 1).
- **luna** (GPT-6 Luna): Met its goal in 10 decisions and 4:42 of game time. 70% of its decisions worked (7 of 10). After a failure it usually changed course (1 of 1).
- **qwen** (Qwen3 4B Instruct, local): Met its goal in 21 decisions and 4:35 of game time. 10% of its decisions worked (2 of 21). After a failure it mostly repeated itself (2 of 18).

<details><summary>How to read this</summary>

- **Worked**: decisions whose skill succeeded. **Changed course**: after a failure, the next decision was different.
- **Longest loop**: the same decision failing the same way, back to back. **Unusable answers**: replies that had to be asked again.
- **Tokens in / out**: everything sent to the model (prompts, cached or not, and re-asks) and everything it wrote. The local model's tokens are counted too, though it costs nothing.
- Game time: a whole day is 20:00. Costs are from token counts and list prices (`src/backends/pricing.ts`).
- Each agent's full report is in this folder, linked below.

Runs:

- [haiku-1](haiku-1.md)
- [sonnet-1](sonnet-1.md)
- [luna-1](luna-1.md)
- [qwen-1](qwen-1.md)

</details>
