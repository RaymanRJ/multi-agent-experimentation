# Team run trio3

*Built from the run logs on 2026-10-20 by the report code at 90710b0 (`scripts/publish-reports.sh trio3`). Where this differs from the write-up in `docs/results/`, the write-up was made at the time, and the report code has been fixed since.*

3 runs · 2026-10-18 · 964k / 95.4k tokens in / out · total cost $1.28

## Goal: team-camp

> Between you, your team must end up holding a stone pickaxe, a stone axe, a stone sword and a stone shovel, with every member carrying at least one of them, and one of you must build a two-storey shelter. It does not matter who builds. The episode ends by itself once the team has all of that.

scenario **sandbox** · stance collaborative · chat on · memory plan · time budget 20:00 of game time (24,000 ticks) · cost cap $1 per agent

### Team trio3, rep 1: goal met in 15:56 of game time · 964k / 95.4k tokens in / out · $1.28

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| haiku | Claude Haiku 4.5 | met, 15:49 | 63 | 54% | 12 of 24 | 6× `pick_up` | 2 of 3 | 24 of 88 calls | - | 318k / 23.9k | $0.44 |
| sonnet | Claude Sonnet 5.5 | met, 15:56 | 36 | 67% | 6 of 6 | - | 0 of 1 | 43 of 79 calls | - | 382k / 60.8k | $0.85 |
| qwen | Qwen3 4B Instruct, local | met, 15:36 | 76 | 18% | 6 of 61 | 40× `gather_wood` | 19 of 20 | 1 of 77 calls | - | 264k / 10.7k | free |

**Who did what**

- **haiku** (Claude Haiku 4.5): made wooden pickaxe, stone pickaxe, stone axe, stone sword, stone shovel; gave stone shovel to sonnet; 3 gives failed; received stone shovel from sonnet ×2; said 48 things (25 to someone by name); ended holding stone axe, stone pickaxe, stone shovel, stone sword, wooden pickaxe.
- **sonnet** (Claude Sonnet 5.5): made wooden pickaxe, stone pickaxe, stone axe, stone sword, stone shovel; built 2 two-storey shelters; gave stone shovel to haiku ×2; 1 give failed; received stone shovel from haiku; said 18 things (5 to someone by name); ended holding stone axe, stone pickaxe, stone sword, wooden pickaxe.
- **qwen** (Qwen3 4B Instruct, local): made wooden pickaxe, stone pickaxe; 7 gives failed; said 63 things (35 to someone by name); ended holding stone pickaxe, wooden pickaxe.

**Requests between agents**

- Asked 5 questions: answered 3.
- haiku asked sonnet: Where did you drop the stone_shovel for me? I'm at (11, 72, 16) and can't find it nearby. → "bringing you 1 stone_shovel, stay where you are"
- haiku asked sonnet: Are you ready to build the 2-storey shelter now? Do you have enough logs and materials? (failed)
- haiku asked sonnet: What's your status on the two-storey shelter? I have stone_pickaxe, stone_axe, stone_sword, and ston… → "Shelter (2-storey) is done. I hold stone pickaxe, axe, sword. You have shovel. Give qwen your spare…"
- haiku asked haiku: Where are you? I need to give you a stone_shovel so each team member carries at least one of the fou… (failed)
- haiku asked sonnet: Did haiku receive a stone shovel? Should I verify everyone has a tool before ending? → "bringing you 1 stone_shovel, stay where you are"
- haiku asked qwen: Do you have at least one stone tool (pickaxe, axe, sword, or shovel)? I need to confirm the team is… → "I'm mining cobblestone to craft stone tools. Will let you know once I have enough."
- sonnet asked sonnet: I hold stone pickaxe/axe/sword; haiku has the shovel. Is the two-storey shelter built, and does anyo… (failed)

<details><summary>Key moments, in order</summary>

- 0:09 — sonnet made a wooden pickaxe
- 0:15 — haiku made a wooden pickaxe
- 2:25 — sonnet made a stone pickaxe
- 2:33 — sonnet made a stone axe
- 2:41 — sonnet made a stone sword
- 3:47 — haiku made a stone pickaxe
- 3:53 — haiku made a stone axe
- 3:56 — sonnet made a stone shovel
- 3:58 — haiku made a stone sword
- 4:04 — haiku made a stone shovel
- 8:13 — sonnet built a two-storey shelter
- 9:29 — sonnet gave stone shovel to haiku
- 12:24 — qwen made a wooden pickaxe
- 12:34 — sonnet built a two-storey shelter
- 13:16 — haiku gave stone shovel to sonnet
- 13:38 — sonnet gave stone shovel to haiku
- 14:56 — qwen made a stone pickaxe
- 14:56 — qwen's run ended: goal met
- 14:57 — haiku's run ended: goal met
- 15:08 — sonnet's run ended: goal met

Times are real minutes from the first agent's first decision.

</details>

## Skills used

Across 3 runs (3 met the goal). **Runs** is how many chose the skill at least once; **worked**, **failed** and **interrupted** are of the times it was chosen; **game time** is its share of all game time, thinking included in the total. **Met / other** is the share of goal-met runs that chose it, then of the rest: a skill far more common in met runs is one the successes leaned on. Usage alone is not value.

| Skill | Runs | Chosen | Worked | Failed | Interrupted | Game time | Met / other |
|---|---|---|---|---|---|---|---|
| `gather_wood` | 3 of 3 | 52 | 15% | 77% | 8% | 18% | 100% / - |
| `pick_up` | 3 of 3 | 31 | 13% | 87% | 0% | 2% | 100% / - |
| `craft` | 3 of 3 | 17 | 71% | 29% | 0% | 2% | 100% / - |
| `mine_stone` | 3 of 3 | 14 | 43% | 36% | 21% | 14% | 100% / - |
| `give` | 3 of 3 | 14 | 21% | 71% | 7% | 1% | 100% / - |
| `wait` | 2 of 3 | 21 | 86% | 0% | 14% | 3% | 67% / - |
| `explore` | 2 of 3 | 11 | 100% | 0% | 0% | 6% | 67% / - |
| `ask_agent` | 2 of 3 | 7 | 57% | 43% | 0% | 3% | 67% / - |
| `go_to` | 1 of 3 | 4 | 100% | 0% | 0% | 2% | 33% / - |
| `build_shelter` | 1 of 3 | 4 | 50% | 50% | 0% | 5% | 33% / - |

**Never chosen:** `eat`, `flee`, `sleep`, `mine_ore`, `smelt`, `descend`, `tunnel`, `climb_out`, `store`, `take`, `hunt`, `shear`, `tell_agent`.

<details><summary>Times chosen, by model</summary>

| Skill | Claude Haiku 4.5 | Claude Sonnet 5.5 | Qwen3 4B Instruct, local |
|---|---|---|---|
| `gather_wood` | 5 | 6 | 41 |
| `pick_up` | 23 | 2 | 6 |
| `craft` | 6 | 6 | 5 |
| `mine_stone` | 1 | 3 | 10 |
| `give` | 4 | 3 | 7 |
| `wait` | 14 | 7 | 0 |
| `explore` | 0 | 4 | 7 |
| `ask_agent` | 6 | 1 | 0 |
| `go_to` | 4 | 0 | 0 |
| `build_shelter` | 0 | 4 | 0 |

</details>

## In a sentence or two each

- **haiku** (Claude Haiku 4.5): Met its goal in 63 decisions and 15:49 of game time. 54% of its decisions worked (34 of 63). After a failure it changed course about half the time (12 of 24).
- **sonnet** (Claude Sonnet 5.5): Met its goal in 36 decisions and 15:56 of game time. 67% of its decisions worked (24 of 36). After a failure it usually changed course (6 of 6).
- **qwen** (Qwen3 4B Instruct, local): Met its goal in 76 decisions and 15:36 of game time. 18% of its decisions worked (14 of 76). After a failure it mostly repeated itself (6 of 61).

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
