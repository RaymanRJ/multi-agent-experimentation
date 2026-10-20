# Skill usage since p5

*Built from the run logs by `npm run skills -- --batch p5 --batch p6 --team thome1 --title "Skill usage since p5" --out docs/results/skill-usage.md`. Logs stay in `runs/` (not committed).*

## Skills used

Across 33 runs (16 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `craft` | 33 of 33 | 286 | 79% | 16% | 5% | 4% | 100% / 100% |
| `gather_wood` | 33 of 33 | 147 | 52% | 1% | 46% | 11% | 100% / 100% |
| `mine_stone` | 33 of 33 | 91 | 56% | 8% | 36% | 12% | 100% / 100% |
| `wait` | 31 of 33 | 402 | 84% | 0% | 16% | 27% | 100% / 88% |
| `build_shelter` | 31 of 33 | 105 | 61% | 22% | 17% | 5% | 100% / 88% |
| `flee` | 17 of 33 | 302 | 91% | 9% | 0% | 4% | 0% / 100% |
| `explore` | 14 of 33 | 63 | 70% | 0% | 30% | 2% | 6% / 76% |
| `pick_up` | 14 of 33 | 48 | 73% | 25% | 2% | 1% | 13% / 71% |
| `sleep` | 12 of 33 | 39 | 0% | 100% | 0% | 3% | 19% / 53% |
| `hunt` | 11 of 33 | 64 | 59% | 14% | 27% | 1% | 0% / 65% |
| `climb_out` | 11 of 33 | 27 | 52% | 7% | 41% | 3% | 6% / 59% |
| `go_to` | 10 of 33 | 127 | 69% | 2% | 29% | 2% | 0% / 59% |
| `eat` | 9 of 33 | 39 | 79% | 21% | 0% | 0% | 0% / 53% |
| `smelt` | 8 of 33 | 50 | 28% | 66% | 6% | 1% | 0% / 47% |
| `tunnel` | 8 of 33 | 43 | 65% | 28% | 7% | 1% | 0% / 47% |
| `mine_ore` | 7 of 33 | 105 | 9% | 72% | 19% | 4% | 0% / 41% |
| `descend` | 7 of 33 | 40 | 25% | 45% | 30% | 4% | 0% / 41% |
| `give` | 7 of 33 | 19 | 74% | 21% | 5% | 0% | 0% / 41% |
| `ask_agent` | 3 of 33 | 13 | 62% | 23% | 15% | 0% | 0% / 18% |
| `store` | 3 of 33 | 3 | 100% | 0% | 0% | 0% | 0% / 18% |
| `tell_agent` | 1 of 33 | 1 | 100% | 0% | 0% | 0% | 0% / 6% |

**Never chosen:** `take`, `shear`.

<details><summary>Times chosen, by model</summary>

| Skill | Claude Haiku 4.5 | Claude Sonnet 5.5 | Claude Opus 5.5 | GPT-6 Luna |
|---|---|---|---|---|
| `craft` | 49 | 86 | 74 | 77 |
| `gather_wood` | 17 | 40 | 29 | 61 |
| `mine_stone` | 8 | 37 | 27 | 19 |
| `wait` | 53 | 168 | 106 | 75 |
| `build_shelter` | 18 | 20 | 22 | 45 |
| `flee` | 45 | 59 | 63 | 135 |
| `explore` | 13 | 18 | 9 | 23 |
| `pick_up` | 0 | 14 | 22 | 12 |
| `sleep` | 12 | 10 | 8 | 9 |
| `hunt` | 2 | 33 | 15 | 14 |
| `climb_out` | 5 | 9 | 6 | 7 |
| `go_to` | 2 | 53 | 22 | 50 |
| `eat` | 7 | 8 | 7 | 17 |
| `smelt` | 0 | 32 | 14 | 4 |
| `tunnel` | 2 | 5 | 35 | 1 |
| `mine_ore` | 0 | 46 | 52 | 7 |
| `descend` | 0 | 15 | 23 | 2 |
| `give` | 0 | 7 | 7 | 5 |
| `ask_agent` | 0 | 0 | 0 | 13 |
| `store` | 0 | 1 | 1 | 1 |
| `tell_agent` | 0 | 0 | 0 | 1 |

</details>

## By goal

### Goal: outpost

Across 24 runs (16 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `craft` | 24 of 24 | 177 | 78% | 21% | 1% | 5% | 100% / 100% |
| `gather_wood` | 24 of 24 | 60 | 52% | 0% | 48% | 10% | 100% / 100% |
| `build_shelter` | 24 of 24 | 52 | 54% | 33% | 13% | 3% | 100% / 100% |
| `mine_stone` | 24 of 24 | 40 | 68% | 8% | 25% | 12% | 100% / 100% |
| `wait` | 23 of 24 | 343 | 84% | 0% | 16% | 52% | 100% / 88% |
| `flee` | 8 of 24 | 118 | 86% | 14% | 0% | 4% | 0% / 100% |
| `explore` | 6 of 24 | 17 | 53% | 0% | 47% | 1% | 6% / 63% |
| `pick_up` | 6 of 24 | 8 | 88% | 13% | 0% | 0% | 13% / 50% |
| `sleep` | 5 of 24 | 12 | 0% | 100% | 0% | 0% | 19% / 25% |
| `hunt` | 4 of 24 | 6 | 50% | 0% | 50% | 0% | 0% / 50% |
| `climb_out` | 3 of 24 | 5 | 80% | 20% | 0% | 0% | 6% / 25% |
| `eat` | 2 of 24 | 8 | 25% | 75% | 0% | 0% | 0% / 25% |
| `go_to` | 2 of 24 | 2 | 50% | 0% | 50% | 0% | 0% / 25% |
| `tunnel` | 1 of 24 | 2 | 50% | 0% | 50% | 0% | 0% / 13% |

**Never chosen:** `mine_ore`, `smelt`, `descend`, `give`, `store`, `take`, `shear`, `tell_agent`, `ask_agent`.

<details><summary>Times chosen, by model</summary>

| Skill | Claude Haiku 4.5 | Claude Sonnet 5.5 | Claude Opus 5.5 | GPT-6 Luna |
|---|---|---|---|---|
| `craft` | 49 | 36 | 36 | 56 |
| `gather_wood` | 17 | 16 | 7 | 20 |
| `build_shelter` | 18 | 12 | 11 | 11 |
| `mine_stone` | 8 | 11 | 8 | 13 |
| `wait` | 53 | 138 | 96 | 56 |
| `flee` | 45 | 12 | 5 | 56 |
| `explore` | 13 | 0 | 1 | 3 |
| `pick_up` | 0 | 2 | 3 | 3 |
| `sleep` | 12 | 0 | 0 | 0 |
| `hunt` | 2 | 2 | 0 | 2 |
| `climb_out` | 5 | 0 | 0 | 0 |
| `eat` | 7 | 1 | 0 | 0 |
| `go_to` | 2 | 0 | 0 | 0 |
| `tunnel` | 2 | 0 | 0 | 0 |

</details>

### Goal: team-homestead

Across 9 runs (0 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `flee` | 9 of 9 | 184 | 94% | 5% | 1% | 4% | - / 100% |
| `craft` | 9 of 9 | 109 | 80% | 9% | 11% | 3% | - / 100% |
| `gather_wood` | 9 of 9 | 87 | 53% | 2% | 45% | 11% | - / 100% |
| `mine_stone` | 9 of 9 | 51 | 47% | 8% | 45% | 12% | - / 100% |
| `go_to` | 8 of 9 | 125 | 70% | 2% | 29% | 5% | - / 89% |
| `wait` | 8 of 9 | 59 | 83% | 0% | 17% | 4% | - / 89% |
| `smelt` | 8 of 9 | 50 | 28% | 66% | 6% | 3% | - / 89% |
| `explore` | 8 of 9 | 46 | 76% | 0% | 24% | 3% | - / 89% |
| `pick_up` | 8 of 9 | 40 | 70% | 28% | 3% | 1% | - / 89% |
| `climb_out` | 8 of 9 | 22 | 45% | 5% | 50% | 6% | - / 89% |
| `mine_ore` | 7 of 9 | 105 | 9% | 72% | 19% | 8% | - / 78% |
| `hunt` | 7 of 9 | 58 | 60% | 16% | 24% | 2% | - / 78% |
| `build_shelter` | 7 of 9 | 53 | 68% | 11% | 21% | 6% | - / 78% |
| `tunnel` | 7 of 9 | 41 | 66% | 29% | 5% | 1% | - / 78% |
| `descend` | 7 of 9 | 40 | 25% | 45% | 30% | 7% | - / 78% |
| `eat` | 7 of 9 | 31 | 94% | 6% | 0% | 0% | - / 78% |
| `sleep` | 7 of 9 | 27 | 0% | 100% | 0% | 5% | - / 78% |
| `give` | 7 of 9 | 19 | 74% | 21% | 5% | 1% | - / 78% |
| `ask_agent` | 3 of 9 | 13 | 62% | 23% | 15% | 1% | - / 33% |
| `store` | 3 of 9 | 3 | 100% | 0% | 0% | 0% | - / 33% |
| `tell_agent` | 1 of 9 | 1 | 100% | 0% | 0% | 0% | - / 11% |

**Never chosen:** `take`, `shear`.

<details><summary>Times chosen, by model</summary>

| Skill | Claude Opus 5.5 | Claude Sonnet 5.5 | GPT-6 Luna |
|---|---|---|---|
| `flee` | 58 | 47 | 79 |
| `craft` | 38 | 50 | 21 |
| `gather_wood` | 22 | 24 | 41 |
| `mine_stone` | 19 | 26 | 6 |
| `go_to` | 22 | 53 | 50 |
| `wait` | 10 | 30 | 19 |
| `smelt` | 14 | 32 | 4 |
| `explore` | 8 | 18 | 20 |
| `pick_up` | 19 | 12 | 9 |
| `climb_out` | 6 | 9 | 7 |
| `mine_ore` | 52 | 46 | 7 |
| `hunt` | 15 | 31 | 12 |
| `build_shelter` | 11 | 8 | 34 |
| `tunnel` | 35 | 5 | 1 |
| `descend` | 23 | 15 | 2 |
| `eat` | 7 | 7 | 17 |
| `sleep` | 8 | 10 | 9 |
| `give` | 7 | 7 | 5 |
| `ask_agent` | 0 | 0 | 13 |
| `store` | 1 | 1 | 1 |
| `tell_agent` | 0 | 0 | 1 |

</details>
