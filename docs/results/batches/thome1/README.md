# Team run thome1

9 runs · 2026-10-20 · 7178k / 460k tokens in / out · total cost $9.67

## Goal: team-homestead

> Over the next three days, your team must build a two-storey shelter, every one of you must sleep in a bed, every one of you must end up carrying an iron pickaxe, and you must leave at least 10 cooked meat in a chest. It does not matter who does what. The episode ends by itself once the team has all of that.

scenario **survival** · stance collaborative · chat on · memory plan · time budget 60:00 of game time (72,000 ticks) · cost cap $3 per agent

### Team thome1, rep 1: goal not met · 2509k / 156k tokens in / out · $3.22

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| opus | Claude Opus 5.5 | not met (time budget) | 120 | 54% | 18 of 18 | - | - | - | 8 | 827k / 50.4k | $1.91 |
| sonnet | Claude Sonnet 5.5 | not met (time budget) | 165 | 56% | 29 of 37 | 3× `smelt` | 0 of 2 | 2 of 167 calls | 13 | 1146k / 61.3k | $1.23 |
| luna | GPT-6 Luna | not met (time budget) | 124 | 78% | 8 of 10 | - | 1 of 2 | - | 2 | 535k / 44.5k | $0.08 |

**Who did what**

- **opus** (Claude Opus 5.5): made wooden pickaxe ×5, stone pickaxe ×11, wooden sword, iron pickaxe, stone sword; said 85 things (27 to someone by name); ended holding no tools.
- **sonnet** (Claude Sonnet 5.5): made wooden sword ×4, wooden pickaxe ×6, stone pickaxe ×4, stone sword ×2; built 3 two-storey shelters; built a one-storey shelter; gave white bed to luna; 1 give failed; received white bed from luna, birch log from luna ×13; said 46 things (16 to someone by name); ended holding no tools.
- **luna** (GPT-6 Luna): made wooden sword, wooden pickaxe, wooden axe; built 8 two-storey shelters; gave white bed to sonnet, birch log to sonnet ×13; 1 give failed; received white bed from sonnet; said 35 things (20 to someone by name); ended holding no tools.

**Requests between agents**

- Told to do something 1 time: complied 1, partly 0, did something else 0.
- Asked 7 questions: answered 7.
- luna asked sonnet: Do you have any wool or beds yet? Please prioritize collecting wool for three beds after cooking mea… → "No wool/beds yet. I have 8 raw pork, 14 dark oak logs. Cooking meat first, then hunting sheep for wo…"
- luna asked sonnet: How many wool or beds do you have now? Please focus on getting wool for three beds if you haven't al… → "sonnet: 0 wool/beds yet. I'll cook meat now, then hunt sheep for wool (swords give 1 each)."
- luna asked sonnet: How much wool do you have now, and can you craft/place beds for everyone once you have 9 wool? I hav… (aborted)
- luna asked sonnet: How many cooked meat are stored, and can you get wool for beds? We need 3 beds total; shelter is fin… → "8 cooked porkchop in chest at (-50,62,-68). I died and lost my gear; no wool yet. Will hunt sheep an…"
- luna asked sonnet: How much wool and cooked meat do you have now, and are you able to get enough wool for 3 beds? Let m… → "sonnet: 8 cooked porkchop in chest at (-50,62,-68). I died, inventory lost. Will get wool and more m…"
- luna asked sonnet: Please prioritize getting wool for 3 beds and cooking at least 2 more meat; let me know your locatio… → "I died and lost everything. I have 0 wool and 0 meat. I'm at (-15,9) regathering wood. I'll hunt she…"
- luna asked sonnet: Is there a spare bed in the two-storey shelter near (39,68,49) for me to use, or do you still need y… (aborted)
- luna told sonnet: give {"to":"luna","item":"white_bed","count":1}

<details><summary>Key moments, in order</summary>

- 0:09 — opus made a wooden pickaxe
- 0:23 — sonnet made a wooden sword
- 1:23 — sonnet made a wooden pickaxe
- 3:00 — luna built a two-storey shelter
- 3:24 — opus made a stone pickaxe
- 4:21 — sonnet made a stone pickaxe
- 5:20 — luna built a two-storey shelter
- 5:31 — luna made a wooden sword
- 7:51 — sonnet made a stone sword
- 8:39 — luna built a two-storey shelter
- 9:35 — opus made a stone pickaxe
- 10:52 — luna built a two-storey shelter
- 11:11 — sonnet died
- 11:49 — sonnet made a wooden sword
- 12:16 — opus died
- 12:35 — sonnet died
- 12:53 — opus died
- 13:01 — sonnet died
- 13:12 — sonnet made a wooden pickaxe
- 14:28 — opus made a wooden pickaxe
- 15:21 — sonnet died
- 15:30 — sonnet died
- 15:51 — sonnet died
- 16:54 — opus died
- 17:21 — sonnet died
- 17:59 — sonnet made a wooden pickaxe
- 18:23 — opus died
- 18:39 — sonnet died
- 18:54 — sonnet died
- 19:40 — sonnet died
- 20:09 — opus made a wooden sword
- 20:56 — sonnet made a wooden pickaxe
- 21:53 — opus died
- 22:12 — opus made a wooden pickaxe
- 22:22 — sonnet made a stone pickaxe
- 22:29 — sonnet made a stone sword
- 23:20 — luna gave white bed to sonnet
- 24:38 — luna gave birch log to sonnet
- 26:32 — opus made a stone pickaxe
- 26:54 — sonnet built a two-storey shelter

Times are real minutes from the first agent's first decision.

</details>

### Team thome1, rep 2: goal not met · 1917k / 131k tokens in / out · $2.72

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| opus | Claude Opus 5.5 | not met (time budget) | 115 | 45% | 47 of 47 | - | - | - | 4 | 803k / 51.3k | $1.91 |
| sonnet | Claude Sonnet 5.5 | not met (time budget) | 91 | 62% | 17 of 18 | - | - | 3 of 94 calls | 1 | 652k / 38.9k | $0.74 |
| luna | GPT-6 Luna | not met (time budget) | 107 | 78% | 8 of 9 | - | 1 of 4 | - | - | 462k / 40.7k | $0.07 |

**Who did what**

- **opus** (Claude Opus 5.5): made wooden pickaxe ×3, wooden sword, stone pickaxe ×8, iron pickaxe ×3; built a one-storey shelter; said 84 things (6 to someone by name); ended holding iron pickaxe, stone pickaxe, wooden pickaxe.
- **sonnet** (Claude Sonnet 5.5): made wooden pickaxe ×2, stone pickaxe ×3, stone sword, wooden sword; built a two-storey shelter; built 2 one-storey shelters; gave white wool to luna; received dark oak log from luna ×8; said 43 things (7 to someone by name); ended holding wooden sword.
- **luna** (GPT-6 Luna): made wooden sword, wooden pickaxe, stone pickaxe; built 8 two-storey shelters; built a one-storey shelter; gave dark oak log to sonnet ×8; received white wool from sonnet; said 27 things (7 to someone by name); ended holding stone pickaxe, wooden pickaxe.

**Requests between agents**

- Asked 4 questions: answered 3.
- luna asked opus: Are you asleep/in a bed now? Please get to a bed and sleep so the night can pass; what do you still… → "No bed (no wool), and I'm underground at 24,13,92. Night ends in about a minute anyway. I'm mining i…"
- luna asked sonnet: Is there a bed in the shelter, and do I have wool or a bed available? We need every player to sleep… → "Shelter is built (2 storey) at 72,46. A bed exists there (someone slept in it), I have no wool. I ho…"
- luna asked sonnet: How are beds and cooked meat coming along? I have 4 mutton and 2 porkchops raw; can bring them to yo… (failed)
- luna asked sonnet: How many beds and cooked meat do you have or expect to make? Please prioritize getting beds for ever… → "sonnet: 0 beds, 0 meat now. I'm underground at 124,51,87 with no wood/tools; climbing out to get woo…"

<details><summary>Key moments, in order</summary>

- 0:09 — sonnet made a wooden pickaxe
- 0:11 — opus made a wooden pickaxe
- 0:19 — opus made a wooden sword
- 1:37 — sonnet made a stone pickaxe
- 1:44 — sonnet made a stone sword
- 3:07 — luna built a two-storey shelter
- 5:27 — luna built a two-storey shelter
- 5:36 — luna made a wooden sword
- 6:01 — opus made a stone pickaxe
- 7:35 — luna built a two-storey shelter
- 8:31 — opus made a stone pickaxe
- 9:32 — sonnet built a shelter
- 10:48 — luna built a two-storey shelter
- 13:02 — sonnet gave white wool to luna
- 14:48 — luna gave dark oak log to sonnet
- 15:59 — sonnet built a two-storey shelter
- 18:59 — luna made a wooden pickaxe
- 18:59 — opus made a stone pickaxe
- 21:30 — sonnet made a stone pickaxe
- 22:00 — sonnet died
- 22:19 — opus died
- 23:19 — opus made a wooden pickaxe
- 25:09 — luna built a two-storey shelter
- 26:04 — sonnet made a wooden pickaxe
- 27:42 — opus made a stone pickaxe
- 27:48 — sonnet made a stone pickaxe
- 30:17 — luna built a two-storey shelter
- 30:35 — sonnet built a shelter
- 32:24 — sonnet made a wooden sword
- 32:55 — luna built a shelter
- 36:02 — opus died
- 36:34 — opus died
- 38:23 — opus died
- 39:24 — opus made a wooden pickaxe
- 41:59 — opus made a stone pickaxe
- 43:46 — luna built a two-storey shelter
- 48:24 — luna made a stone pickaxe
- 50:18 — luna built a two-storey shelter
- 57:44 — opus built a shelter
- 57:58 — opus made a iron pickaxe

Times are real minutes from the first agent's first decision.

</details>

### Team thome1, rep 3: goal not met · 2753k / 172k tokens in / out · $3.74

| Agent | Model | Goal | Decisions | Worked | Changed course after failing | Longest loop | Kept on after a repeat note | Unusable answers | Deaths | Tokens in / out | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| opus | Claude Opus 5.5 | not met (time budget) | 140 | 65% | 24 of 27 | - | 0 of 2 | - | 3 | 961k / 67.2k | $2.35 |
| sonnet | Claude Sonnet 5.5 | not met (time budget) | 175 | 58% | 43 of 46 | - | 1 of 3 | 4 of 179 calls | 9 | 1241k / 64.2k | $1.31 |
| luna | GPT-6 Luna | not met (time budget) | 127 | 68% | 14 of 18 | - | 1 of 5 | - | 8 | 551k / 41.0k | $0.08 |

**Who did what**

- **opus** (Claude Opus 5.5): made wooden sword, wooden pickaxe, stone pickaxe ×2, stone sword, iron pickaxe; built a two-storey shelter; built a one-storey shelter; gave white bed to sonnet, stone pickaxe to sonnet, wooden sword to sonnet, cobblestone to sonnet ×20, iron ingot to sonnet, raw iron to sonnet; 1 give failed; received cobblestone from sonnet ×20, dirt from sonnet ×6; said 113 things (22 to someone by name); ended holding no tools.
- **sonnet** (Claude Sonnet 5.5): made wooden pickaxe ×3, stone pickaxe ×5, stone sword ×2, wooden sword ×2; gave iron ingot to luna, cobblestone to opus ×20, dirt to opus ×6; 1 give failed; received white bed from opus, stone pickaxe from opus, wooden sword from opus, cobblestone from opus ×20, iron ingot from opus, raw iron from opus; said 52 things (24 to someone by name); ended holding no tools.
- **luna** (GPT-6 Luna): made wooden pickaxe ×2, wooden sword, stone pickaxe ×3, iron pickaxe; built 9 two-storey shelters; 1 give failed; received iron ingot from sonnet; said 29 things (9 to someone by name); ended holding no tools.

**Requests between agents**

- Asked 2 questions: answered 2.
- luna asked opus: I don't have a bed. Can you bring or place one near me, or tell me where I can sleep? (failed)
- luna asked sonnet: Do you have wool or a bed, and can you help get enough beds for everyone? The two-storey shelter is… (failed)

<details><summary>Key moments, in order</summary>

- 0:10 — sonnet made a wooden pickaxe
- 0:22 — opus made a wooden sword
- 2:11 — luna built a two-storey shelter
- 2:27 — luna made a wooden pickaxe
- 3:17 — sonnet made a stone pickaxe
- 4:49 — opus made a wooden pickaxe
- 6:53 — opus made a stone pickaxe
- 7:00 — opus made a stone sword
- 7:06 — luna built a two-storey shelter
- 7:53 — luna made a wooden sword
- 8:19 — sonnet made a stone pickaxe
- 8:39 — opus built a shelter
- 9:45 — sonnet made a stone sword
- 10:14 — luna built a two-storey shelter
- 11:00 — luna died
- 12:12 — sonnet died
- 12:26 — sonnet made a wooden sword
- 12:36 — luna died
- 12:42 — sonnet died
- 14:39 — sonnet died
- 15:00 — sonnet made a wooden sword
- 15:05 — sonnet made a wooden pickaxe
- 16:09 — sonnet made a stone pickaxe
- 16:18 — luna built a two-storey shelter
- 18:50 — sonnet made a stone sword
- 18:57 — luna died
- 21:03 — luna made a wooden pickaxe
- 21:22 — luna made a stone pickaxe
- 25:55 — luna made a stone pickaxe
- 28:04 — sonnet died
- 28:20 — sonnet made a wooden pickaxe
- 28:37 — opus gave white bed to sonnet
- 32:11 — sonnet made a stone pickaxe
- 38:14 — sonnet died
- 38:44 — luna made a stone pickaxe
- 38:46 — sonnet died
- 38:49 — opus made a stone pickaxe
- 40:13 — opus gave stone pickaxe to sonnet
- 40:22 — opus gave wooden sword to sonnet
- 40:30 — luna built a two-storey shelter

Times are real minutes from the first agent's first decision.

</details>

## In a sentence or two each

- **opus** (Claude Opus 5.5, rep 1): Did not meet its goal; it got as far as: survived a night. 54% of its decisions worked (65 of 120). After a failure it usually changed course (18 of 18).
- **sonnet** (Claude Sonnet 5.5, rep 1): Did not meet its goal; it got as far as: survived a night. 56% of its decisions worked (93 of 165). After a failure it usually changed course (29 of 37).
- **luna** (GPT-6 Luna, rep 1): Did not meet its goal; it got as far as: survived a night. 78% of its decisions worked (97 of 124). After a failure it usually changed course (8 of 10).
- **opus** (Claude Opus 5.5, rep 2): Did not meet its goal; it got as far as: survived a night. 45% of its decisions worked (52 of 115). After a failure it usually changed course (47 of 47).
- **sonnet** (Claude Sonnet 5.5, rep 2): Did not meet its goal; it got as far as: survived a night. 62% of its decisions worked (56 of 91). After a failure it usually changed course (17 of 18).
- **luna** (GPT-6 Luna, rep 2): Did not meet its goal; it got as far as: survived a night. 78% of its decisions worked (83 of 107). After a failure it usually changed course (8 of 9).
- **opus** (Claude Opus 5.5, rep 3): Did not meet its goal; it got as far as: survived a night. 65% of its decisions worked (91 of 140). After a failure it usually changed course (24 of 27).
- **sonnet** (Claude Sonnet 5.5, rep 3): Did not meet its goal; it got as far as: survived a night. 58% of its decisions worked (102 of 175). After a failure it usually changed course (43 of 46).
- **luna** (GPT-6 Luna, rep 3): Did not meet its goal; it got as far as: survived a night. 68% of its decisions worked (86 of 127). After a failure it usually changed course (14 of 18).

<details><summary>How to read this</summary>

- **Worked**: decisions whose skill succeeded. **Changed course**: after a failure, the next decision was different.
- **Longest loop**: the same decision failing the same way, back to back. **Unusable answers**: replies that had to be asked again.
- **Tokens in / out**: everything sent to the model (prompts, cached or not, and re-asks) and everything it wrote. The local model's tokens are counted too, though it costs nothing.
- Game time: a whole day is 20:00. Costs are from token counts and list prices (`src/backends/pricing.ts`).
- Each agent's full report is in this folder, linked below.

Runs:

- [opus-1](opus-1.md)
- [sonnet-1](sonnet-1.md)
- [luna-1](luna-1.md)
- [opus-2](opus-2.md)
- [sonnet-2](sonnet-2.md)
- [luna-2](luna-2.md)
- [opus-3](opus-3.md)
- [sonnet-3](sonnet-3.md)
- [luna-3](luna-3.md)

</details>
