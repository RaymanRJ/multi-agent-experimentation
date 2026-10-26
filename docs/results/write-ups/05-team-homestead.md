# Team homestead: three models, three days, one goal

*Team run thome1, 20 October, on main at 50449bf: Claude Opus 5.5, Claude Sonnet 5.5 and GPT-6
Luna in one world, collaborative stance, chat on, plan memory, progress list off, survival,
`team-homestead`, 72,000 ticks (three in-game days, about an hour of real time), three reps, each
on a fresh world, capped at $3 per agent per rep. Total cost $9.67. The first run of this goal,
so a baseline: nothing earlier compares.*
Generated report: [batch-reports/2026-10-20-0930-thome1.md](../batch-reports/2026-10-20-0930-thome1.md).

> Over the next three days, your team must build a two-storey shelter, every one of you must sleep
> in a bed, every one of you must end up carrying an iron pickaxe, and you must leave at least 10
> cooked meat in a chest. It does not matter who does what. The episode ends by itself once the
> team has all of that.

## What this teaches about building agents

In a team, honest tool messages and honest reports matter as much as alone, and state that lives in one agent is lost with it.

- **Honest results:** `flee` told agents they were cornered after they had escaped, 16 times in one run ([tools](../../lessons.md#tools)).
- **Honest reports:** the report counted a teammate saying "I respawned" as a death ([evaluation](../../lessons.md#evaluation)).
- **State in one place:** iron was made, kept by whoever mined it, and lost when it died; what was stored in the shared chest was what survived ([shared state](../../lessons.md#shared-state-between-agents)).
- **Roles without a plan:** each agent took a role unasked, but no team settled who would do what before the first night ([shared state](../../lessons.md#shared-state-between-agents)).

## In one paragraph

No rep met the goal. Every team built the shelter. Two of three left 10 cooked meat in a chest,
and in two of three, two of the three agents slept in a bed. None ended with an iron pickaxe for
everyone. Iron came late (day 3 in every rep), went to whoever mined it, and was lost when its
owner died. The agents died 48 times in nine agent-runs, all to mobs or the terrain, mostly at
night outside a shelter. Between them they built 36 shelters, but were inside a closed one
for 8% of their night-time decisions. The skills worked. Chests, beds, cooking, smelting, iron and
hand-overs were all used and all succeeded at least once. What failed was staying alive and
keeping things. The team did talk, ask and give, but no rep had a plan that survived the first
night.

## The numbers

| Part of the goal | Rep 1 | Rep 2 | Rep 3 |
|---|---|---|---|
| Two-storey shelter | yes (Sonnet, Luna) | yes (Sonnet, Luna) | yes (Opus, Luna) |
| 10 cooked meat in a chest | **yes**: 8 porkchop (Sonnet) + 6 mutton (Luna), two chests | no: none stored | **yes**: 10 mutton (Opus) |
| Every member slept in a bed | 2 of 3 (Sonnet, Luna) | 1 of 3 (Luna) | 2 of 3 (Opus, Sonnet) |
| Every member carries an iron pickaxe | 0 of 3 (Opus made one, day 3; died with it) | 1 of 3 (Opus made three at day 3, 18:50; kept them all) | 0 of 3 (Opus and Luna made one each, day 3; both died with them) |
| Deaths (Opus / Sonnet / Luna) | 8 / 13 / 2 | 4 / 1 / 0 | 3 / 9 / 8 |
| Cost | $3.22 | $2.72 | $3.74 |

| Model | Cost, 3 reps | Decisions per rep | Decisions that worked | Deaths per rep | Lowest food |
|---|---|---|---|---|---|
| Opus 5.5 | $6.17 | 115–140 | 45–65% | 8, 4, 3 | 8 |
| Sonnet 5.5 | $3.28 | 91–175 | 56–62% | 13, 1, 9 | 4 |
| GPT-6 Luna | $0.22 | 107–127 | 68–78% | 2, 0, 8 | 2 |

- **Validity:** every run is valid (no lost connections) and ran its full 72,000 ticks.
- **Caching and cap:** prompt caching held at 81–82% of input for all three models. No agent
  reached its $3 cap (Opus's dearest rep: $2.35).
- **Hunger** was real but not fatal. Food fell to 2–12 of 20, and no one starved. Agents ate 0–8
  times a rep; two agent-runs never ate.
- **Deaths:**
  - 48 in all. Zombies 19, skeletons 13, spiders 8, creepers 3, lava 2, falls 2, drowning 1.
  - Agents knew where they had died (since 50449bf) but went back only 3 times in 48.

## What happened

**Each model played a role, though nobody assigned one.**
- **Opus mined.** It spent most of reps 1 and 2 underground (`mine_ore`, `tunnel`, `descend`: 31
  of 120 decisions in rep 1, 65 of 115 in rep 2). It made every rep's first iron pickaxe, never
  before day 3. In rep 3 it did nearly everything else instead: it cooked and stored the 10
  mutton, made two beds and gave one to Sonnet, gave Sonnet tools, ingots and raw iron, and made
  an iron pickaxe.
- **Luna built.** It put up 8–9 shelters a rep, nearly all two-storey, often a new one wherever
  it was standing. It made the team's first bed in reps 1 and 2. It cost about a fifteenth of
  Sonnet and a twenty-eighth of Opus, and had the highest share of decisions that worked
  (26 of its 34 builds succeeded).
- **Sonnet foraged.** It hunted and cooked (19 smelts in rep 1), stored the first meat, and made and
  traded beds. It also died the most: 13 times in rep 1, 10 of them in 8 minutes on the first night
  (below).

**The first night broke every rep's plans.**
- **What happened:** night falls at about 10:50 of day 1. Of the nine agent-runs, only Luna in rep 1
  spent most of the first night in a closed shelter. The rest were mining, hunting or gathering.
- **The respawn trap:** an agent that died respawned at world spawn, in the dark oak forest, at
  night, with nothing. There it met the mobs again. Sonnet in rep 1 died in a fall near its chest, respawned into
  zombies and spiders, fled, crafted a sword, fought, and died nine more times before dawn.
- **The game, the model, or both:** the respawn point and the mobs are the game. Going out at
  night, and not going back to a shelter after respawning, is the model.

**Things made were lost, because nothing kept them.**
- **Deaths:** every death dropped the agent's inventory. Agents rarely went back for it, and it
  vanishes after 5 minutes.
- **The chest:** what survived was what had been stored in it, which is why the meat counted
  twice. The iron never went in one: no agent stored a pickaxe, and the goal asks for pickaxes
  carried, not stored.

**Beds worked, and the shared night was misunderstood.**
- **What the skill reported:** `sleep` lay down and, after 90 seconds, said "got up… it is still
  night — the night only passes when every player in the world is asleep".
- **The goal check:** that counts as having slept, since the goal asks that each member *sleep in
  a bed*, not skip a night.
- **What the agents did:**
  - The team never made enough beds for everyone at once. One bed was traded back and forth in
    rep 1, and in rep 2 Sonnet found Luna in the only bed.
  - Agents kept re-trying. Opus tried `sleep` 8 times in rep 3.

**The agents talked and helped.**
- **Requests:** questions were answered 7 of 7 times (rep 1), 3 of 4 (rep 2) and 2 of 2 (rep 3).
  The one `tell_agent` in rep 1 was complied with.
- **Hand-overs:** gives worked in every rep: beds, wool, logs, cobblestone, ingots, tools.
- **What was missing:** a plan. No rep settled who would mine iron for whom before the first night.
  In rep 2, Opus made three iron pickaxes with 1:10 of game time left and kept all three.

## The proof run first (hpoc)

*Three GPT-6 Luna agents, same goal and settings, one rep, 20 October, on 6736e06; $0.29.*
- **Result:** goal not met, 21 deaths.
- **Iron:** at 26 minutes all three carried iron pickaxes, after one agent made three and handed two
  over. Deaths then lost them all.
- **The bugs it found:** its logs turned up the four bugs below, fixed before thome1.

## Our code: found and fixed

Found by reading the logs of hpoc and thome1. Each was fixed, tested, and committed:

| What | Effect on the agent | Fix |
|---|---|---|
| `flee` said "could not find a path away… could not wall yourself in" after running 20–67 blocks and losing every hostile (16 times in hpoc; 211 times in older logs) | Told it was cornered when it had escaped | It reports a cornered failure only if it never got 4 blocks away; otherwise how far it ran and who is left (unit test) |
| The run report counted a teammate saying "I respawned" in chat as a death (hpoc: lb 10 instead of 8), and the team timeline showed 1 death of 21 | Wrong numbers in reports | Count only the agent's own death event (unit tests) |
| `npm run report` crashed on the merged chest work | No report | Command runs after the module loads |
| A death said only "you died and respawned" | No way to go back for dropped items | "you died at x,y,z and respawned; what you carried was dropped there and disappears 5 minutes after you died". Checked live: the place of death, not the respawn point (before thome1) |
| A craft that failed during an interrupt read as "the server did not fill the crafting grid" (Sonnet, rep 1) | Blamed the server | Reported as interrupted, with the interrupt's reason (after thome1) |
| `sleep` passed raw mineflayer errors on: "bot is not sleeping", "there's only half bed" | Unclear | Said in words; the game gives no reason for the first, so neither do we (after thome1; types only, not checked live) |
| The team comparison listed each agent three times with no rep | Unreadable report | Each line names its rep (after thome1) |

## What the logs say is not ours

- **Going out at night, and not going back in.** 8% of night-time decisions were inside a closed
  shelter. The p6 batch showed the same models will stay in when the goal says to. Here the goal
  says three days of work, and they work through the night.
- **Respawning at world spawn, at night, with nothing.** Game rules: only sleeping in a bed moves an agent's respawn point.
- **Iron late, kept by whoever mined it, and not stored.**
- **Haiku was not in this run** (p6 showed it can do `outpost` but nothing harder yet), so these
  three are not all the models.

## What this suggests (not acted on)

- **The goal is hard enough.** Every part was achieved somewhere, none all at once. It separates
  teams on planning and survival rather than on skills. Three reps is a baseline, not a ranking.
- **A next run could change one thing.** One option is `--progress on`: the goal's open gaps in
  every observation, an existing condition. It would show whether the team's trouble is knowing
  what is left or doing it. Another is a stance paragraph that asks for a plan before night, but
  that changes the stance text, which is meant to stay one paragraph.
- **Reporting gaps:** per-day deaths and who held what at each death would make the "lost when it
  died" story a number, rather than something read from the logs. The ideas file lists these
  (Hard goals, report columns).
