# Skill usage since p5

*Built from the run logs by `npm run skills -- --batch p5 --batch p6 --team thome1 --team tbase1 --title "Skill usage since p5" --out docs/results/skill-usage.md`. Logs stay in `runs/` (not committed).*

## Skills used

Across 42 runs (16 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `craft` | 42 of 42 | 365 | 78% | 16% | 6% | 3% | 100% / 100% |
| `gather_wood` | 42 of 42 | 182 | 53% | 2% | 45% | 8% | 100% / 100% |
| `mine_stone` | 42 of 42 | 116 | 58% | 6% | 36% | 10% | 100% / 100% |
| `wait` | 40 of 42 | 603 | 80% | 0% | 20% | 24% | 100% / 92% |
| `build_shelter` | 40 of 42 | 259 | 71% | 12% | 17% | 6% | 100% / 92% |
| `flee` | 26 of 42 | 357 | 91% | 9% | 1% | 3% | 0% / 100% |
| `explore` | 23 of 42 | 122 | 74% | 2% | 25% | 3% | 6% / 85% |
| `pick_up` | 22 of 42 | 104 | 59% | 35% | 7% | 1% | 13% / 77% |
| `hunt` | 19 of 42 | 128 | 57% | 18% | 25% | 1% | 0% / 73% |
| `sleep` | 19 of 42 | 91 | 1% | 99% | 0% | 5% | 19% / 62% |
| `climb_out` | 19 of 42 | 58 | 41% | 16% | 43% | 5% | 6% / 69% |
| `go_to` | 18 of 42 | 181 | 62% | 7% | 31% | 3% | 0% / 69% |
| `eat` | 17 of 42 | 76 | 87% | 13% | 0% | 0% | 0% / 65% |
| `smelt` | 16 of 42 | 109 | 18% | 77% | 5% | 2% | 0% / 62% |
| `mine_ore` | 15 of 42 | 173 | 8% | 69% | 23% | 4% | 0% / 58% |
| `tunnel` | 14 of 42 | 87 | 69% | 25% | 6% | 1% | 0% / 54% |
| `descend` | 13 of 42 | 84 | 19% | 50% | 31% | 5% | 0% / 50% |
| `give` | 13 of 42 | 38 | 76% | 13% | 11% | 0% | 0% / 50% |
| `store` | 10 of 42 | 17 | 76% | 24% | 0% | 0% | 0% / 38% |
| `ask_agent` | 9 of 42 | 32 | 59% | 31% | 9% | 1% | 0% / 35% |
| `tell_agent` | 5 of 42 | 30 | 97% | 3% | 0% | 0% | 0% / 19% |
| `take` | 5 of 42 | 7 | 57% | 43% | 0% | 0% | 0% / 19% |

**Never chosen:** `shear`.

<details><summary>Times chosen, by model</summary>

| Skill | Claude Haiku 4.5 | Claude Sonnet 5.5 | Claude Opus 5.5 | GPT-6 Luna |
|---|---|---|---|---|
| `craft` | 49 | 122 | 103 | 91 |
| `gather_wood` | 17 | 52 | 43 | 70 |
| `mine_stone` | 8 | 47 | 36 | 25 |
| `wait` | 53 | 228 | 180 | 142 |
| `build_shelter` | 18 | 71 | 45 | 125 |
| `flee` | 45 | 72 | 84 | 156 |
| `explore` | 13 | 44 | 30 | 35 |
| `pick_up` | 0 | 34 | 32 | 38 |
| `hunt` | 2 | 68 | 34 | 24 |
| `sleep` | 12 | 22 | 16 | 41 |
| `climb_out` | 5 | 22 | 17 | 14 |
| `go_to` | 2 | 90 | 32 | 57 |
| `eat` | 7 | 19 | 16 | 34 |
| `smelt` | 0 | 74 | 23 | 12 |
| `mine_ore` | 0 | 83 | 80 | 10 |
| `tunnel` | 2 | 15 | 60 | 10 |
| `descend` | 0 | 37 | 44 | 3 |
| `give` | 0 | 19 | 13 | 6 |
| `store` | 0 | 4 | 7 | 6 |
| `ask_agent` | 0 | 1 | 3 | 28 |
| `tell_agent` | 0 | 0 | 2 | 28 |
| `take` | 0 | 3 | 0 | 4 |

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

### Goal: team-base

Across 9 runs (0 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `wait` | 9 of 9 | 201 | 73% | 0% | 27% | 18% | - / 100% |
| `build_shelter` | 9 of 9 | 154 | 78% | 5% | 17% | 6% | - / 100% |
| `craft` | 9 of 9 | 79 | 76% | 14% | 10% | 1% | - / 100% |
| `explore` | 9 of 9 | 59 | 78% | 3% | 19% | 4% | - / 100% |
| `flee` | 9 of 9 | 55 | 89% | 9% | 2% | 1% | - / 100% |
| `gather_wood` | 9 of 9 | 35 | 57% | 3% | 40% | 5% | - / 100% |
| `mine_stone` | 9 of 9 | 25 | 64% | 0% | 36% | 6% | - / 100% |
| `mine_ore` | 8 of 9 | 68 | 7% | 63% | 29% | 3% | - / 89% |
| `hunt` | 8 of 9 | 64 | 55% | 22% | 23% | 2% | - / 89% |
| `smelt` | 8 of 9 | 59 | 10% | 86% | 3% | 2% | - / 89% |
| `pick_up` | 8 of 9 | 56 | 46% | 43% | 11% | 1% | - / 89% |
| `go_to` | 8 of 9 | 54 | 46% | 19% | 35% | 5% | - / 89% |
| `eat` | 8 of 9 | 37 | 95% | 5% | 0% | 0% | - / 89% |
| `climb_out` | 8 of 9 | 31 | 32% | 23% | 45% | 7% | - / 89% |
| `sleep` | 7 of 9 | 52 | 2% | 98% | 0% | 8% | - / 78% |
| `store` | 7 of 9 | 14 | 71% | 29% | 0% | 0% | - / 78% |
| `descend` | 6 of 9 | 44 | 14% | 55% | 32% | 6% | - / 67% |
| `tunnel` | 6 of 9 | 44 | 73% | 23% | 5% | 2% | - / 67% |
| `give` | 6 of 9 | 19 | 79% | 5% | 16% | 1% | - / 67% |
| `ask_agent` | 6 of 9 | 19 | 58% | 37% | 5% | 1% | - / 67% |
| `take` | 5 of 9 | 7 | 57% | 43% | 0% | 0% | - / 56% |
| `tell_agent` | 4 of 9 | 29 | 97% | 3% | 0% | 0% | - / 44% |

**Never chosen:** `shear`.

<details><summary>Times chosen, by model</summary>

| Skill | Claude Opus 5.5 | Claude Sonnet 5.5 | GPT-6 Luna |
|---|---|---|---|
| `wait` | 74 | 60 | 67 |
| `build_shelter` | 23 | 51 | 80 |
| `craft` | 29 | 36 | 14 |
| `explore` | 21 | 26 | 12 |
| `flee` | 21 | 13 | 21 |
| `gather_wood` | 14 | 12 | 9 |
| `mine_stone` | 9 | 10 | 6 |
| `mine_ore` | 28 | 37 | 3 |
| `hunt` | 19 | 35 | 10 |
| `smelt` | 9 | 42 | 8 |
| `pick_up` | 10 | 20 | 26 |
| `go_to` | 10 | 37 | 7 |
| `eat` | 9 | 11 | 17 |
| `climb_out` | 11 | 13 | 7 |
| `sleep` | 8 | 12 | 32 |
| `store` | 6 | 3 | 5 |
| `descend` | 21 | 22 | 1 |
| `tunnel` | 25 | 10 | 9 |
| `give` | 6 | 12 | 1 |
| `ask_agent` | 3 | 1 | 15 |
| `take` | 0 | 3 | 4 |
| `tell_agent` | 2 | 0 | 27 |

</details>
