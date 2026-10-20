# Batch b11

*Built from the run logs on 2026-10-20 by the report code at 90710b0 (`scripts/publish-reports.sh b11`). Where this differs from the write-up in `docs/results/`, the write-up was made at the time, and the report code has been fixed since.*

2 runs · 2026-10-17 · 105k / 14.5k tokens in / out · total cost free

## Goal: iron

> Craft an iron pickaxe. Once you have it, end the episode.

scenario **sandbox** · stance neutral · chat off · memory plan

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| base_iron_1 | Scripted baseline | not met (time budget) | 65 | 62% | 19 of 23 | 3× `craft` | 1 of 1 | - | - | - | free |
| qnone_iron_1 | Qwen3 4B Instruct, local | not met (time budget) | 54 | 11% | 33 of 46 | 4× `craft` | 1 of 1 | - | - | 105k / 14.5k | free |

## Skills used

Across 2 runs (0 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `craft` | 2 of 2 | 35 | 23% | 77% | 0% | 6% | - / 100% |
| `mine_ore` | 2 of 2 | 28 | 4% | 96% | 0% | 11% | - / 100% |
| `descend` | 2 of 2 | 7 | 14% | 71% | 14% | 10% | - / 100% |
| `gather_wood` | 2 of 2 | 4 | 100% | 0% | 0% | 7% | - / 100% |
| `wait` | 1 of 2 | 24 | 92% | 0% | 8% | 29% | - / 50% |
| `tunnel` | 1 of 2 | 12 | 58% | 42% | 0% | 3% | - / 50% |
| `smelt` | 1 of 2 | 5 | 0% | 100% | 0% | 0% | - / 50% |
| `mine_stone` | 1 of 2 | 2 | 100% | 0% | 0% | 7% | - / 50% |
| `build_shelter` | 1 of 2 | 1 | 100% | 0% | 0% | 1% | - / 50% |
| `explore` | 1 of 2 | 1 | 0% | 100% | 0% | 5% | - / 50% |

**Never chosen:** `eat`, `flee`, `sleep`, `climb_out`, `give`, `pick_up`, `go_to`, `store`, `take`, `hunt`, `shear`, `tell_agent`, `ask_agent`.

<details><summary>Times chosen, by model</summary>

| Skill | Scripted baseline | Qwen3 4B Instruct, local |
|---|---|---|
| `craft` | 9 | 26 |
| `mine_ore` | 12 | 16 |
| `descend` | 3 | 4 |
| `gather_wood` | 2 | 2 |
| `wait` | 24 | 0 |
| `tunnel` | 12 | 0 |
| `smelt` | 0 | 5 |
| `mine_stone` | 2 | 0 |
| `build_shelter` | 1 | 0 |
| `explore` | 0 | 1 |

</details>

## In a sentence or two each

- **base_iron_1** (Scripted baseline): Did not meet its goal. Still outstanding at the end: you have no iron_pickaxe. 62% of its decisions worked (40 of 65). After a failure it usually changed course (19 of 23).
- **qnone_iron_1** (Qwen3 4B Instruct, local): Did not meet its goal. Still outstanding at the end: you have no iron_pickaxe. 11% of its decisions worked (6 of 54). After a failure it usually changed course (33 of 46).

<details><summary>How to read this</summary>

- **Worked**: decisions whose skill succeeded. **Changed course**: after a failure, the next decision was different.
- **Longest loop**: the same decision failing the same way, back to back. **Unusable answers**: replies that had to be asked again.
- **Tokens in / out**: everything sent to the model (prompts, cached or not, and re-asks) and everything it wrote. The local model's tokens are counted too, though it costs nothing.
- Game time: a whole day is 20:00. Costs are from token counts and list prices (`src/backends/pricing.ts`).
- Each agent's full report is in this folder, linked below.

Runs:

- [base_iron_1](base_iron_1.md)
- [qnone_iron_1](qnone_iron_1.md)

</details>
