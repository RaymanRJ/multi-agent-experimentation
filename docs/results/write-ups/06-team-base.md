# Team base: one shared shelter, three agents, three days

*Team run tbase1, 20 October, on main at 66e0fd3: Claude Opus 5.5, Claude Sonnet 5.5 and GPT-6
Luna in one world, collaborative stance, chat on, plan memory, progress list off, survival,
`team-base`, 72,000 ticks (three in-game days, about an hour of real time), three reps, each on a
fresh world, capped at $3 per agent per rep. Total cost $11.70. Same models, settings and length
as thome1 ([05](05-team-homestead.md)). The iron and meat parts of the goal are worded the same.
The shelter part now asks for one large shelter for everyone, and the sleep part for a bed inside
it. The shelter code changed between the two runs too, so the runs compare part by part, not as
a whole.*
Generated report: [batch-reports/2026-10-20-2133-tbase1.md](../batch-reports/2026-10-20-2133-tbase1.md).
Times below are game time from the start of the episode (a day is 20:00).

> Over the next three days, your team must build one large two-storey shelter that is home to all
> of you, every one of you must sleep in a bed inside it, every one of you must end up carrying an
> iron pickaxe, and you must leave at least 10 cooked meat in a chest. It does not matter who does
> what. The episode ends by itself once the team has all of that.

This write-up is about how the agents behaved on their own:
- what they did that moved the goal forward, and what set it back;
- how they handled what they didn't plan for;
- how they worked together, or got in each other's way.

Which model was which is noted where it matters. Per-model numbers are at the end.

## In one paragraph

No team met the goal, but every team organised itself the same way:
- **Split the work:** in the first two or three decisions they split the goal in four over chat,
  and mostly kept to the split. Luna took the base every time and built it.
- **Kept the goal in mind:** when a mob, nightfall, a message or a death broke an agent's work off,
  it was back at work on the goal 87–99% of the time, usually within a few decisions.
- **Got in each other's way:** teammates' messages broke off each other's work 87 times, nearly as
  often as mobs (100). Of 27 times one agent told another what to do, the other did it next only once.
- **What stopped them:** largely our code.
  - `mine_ore` gave up on reachable iron, which starved the iron pickaxes.
  - `take` emptied rep 3's food chest.
  - A shelter was called safe with a zombie villager inside, which made rep 2's respawn trap.
  - Health was rounded to 0, which this rewrite turned up (below).

  All of these are fixed. What's left is the agents' own: the third bed was never made, and iron
  pickaxes were used until they broke.

## The goal at the end

| Part of the goal | Rep 1 | Rep 2 | Rep 3 |
|---|---|---|---|
| One large two-storey base | **yes**: Luna, day 1 5:22 | **yes**: Luna, day 1 5:59 | **yes**: Luna, day 1 5:42 |
| Everyone slept in a bed inside it | 2 of 3 (not Sonnet) | 2 of 3 (not Opus) | 2 of 3 (not Sonnet) |
| Everyone carries an iron pickaxe | 0 of 3 (three made on day 1, all worn out) | 0 of 3 (none made) | 1 of 3 (Sonnet, day 3 19:55) |
| 10 cooked meat in a chest | **yes**: 10 | **yes**: 17 | no: 4 |

## 1. Toward the goal, and away from it

Each decision is sorted by what it did, judged by code from its inventory and result
(`src/goalWork.ts`):
- **Toward a part:** it gained something on the way to that part (wool, iron, meat), or did the
  part itself (built the base, slept in a bed for the first time, stored cooked meat).
- **Groundwork:** it gained wood, stone or tools, which every part needs.

| Share of game time spent on | Rep 1 | Rep 2 | Rep 3 |
|---|---|---|---|
| Toward a part of the goal | 12% | 9% | 13% |
| Groundwork (wood, stone, tools) | 35% | 25% | 35% |
| Staying alive (shelter, flee, eat, wait) | 22% | 43% | 26% |
| With teammates (give, ask, tell, chest) | 3% | 2% | 5% |
| Moving and looking (explore, descend, go to) | 8% | 2% | 5% |
| Came to nothing (failed or cut short, nothing gained) | 20% | 20% | 15% |

- **Mostly preparing:** about half the time went toward the goal or into groundwork for it, and a
  fifth came to nothing.
- **Rep 2's 43% staying alive:** that was its respawn trap (below). Two agents spent much of the
  first night and morning dying and sheltering at the base.

**What set the goal back** (all reps):

| Part | Lost at a death | Eaten | Taken out of the chest | Worn out |
|---|---|---|---|---|
| Cooked meat in a chest | 12 | 25 | 3 | 0 |
| Beds | 11 | 0 | 0 | 0 |
| Iron pickaxes | 2 | 0 | 0 | 3 |

Each part, in turn:

**The base: done early, every time, then kept up.**
- **Built:** Luna built it at its second or third decision. In rep 3, Opus and Sonnet gave it 22 logs.
- **Kept up:** blocks went missing from it 5–10 times a rep, and someone replaced them each time.
  It was mostly Luna (15 of 20 repairs); one repair in rep 2 came to 32 blocks.

**Beds: two came quickly, the third never.**
- **The first two:** in each rep the agent with the beds part hunted sheep and made two beds by
  about day 1 7:00, and the two with beds slept in the base the first night.
- **The third:** wool for it never came:
  - `hunt` for sheep failed "no sheep within 32 blocks" 10 times;
  - deaths dropped a bed, wool or string 11 times, and rep 2 lost the most (6).
- **The night never passed:** every time an agent slept it was told "the night only passes when
  every player in the world is asleep", naming the teammate without a bed. No rep turned that into
  a third bed.

**Iron pickaxes: made once, then worn out; starved after that.**
- **Rep 1, made:** Sonnet, the agent with the iron part, had three iron pickaxes by day 1 14:29 and
  handed them round: to Luna three times, and once to Opus, which gave it back.
- **Rep 1, worn out:** all three were used for tunnelling and climbing until they broke (day 2
  17:14 to day 3 12:01), though each agent was shown the uses running down. That is the agents'
  own doing. The goal asks for pickaxes carried at the end, and no one kept one aside.
- **Reps 2 and 3, starved:** these never got that far. Two decisions in rep 2, and seven in rep 3,
  moved iron forward at all. That was mostly `mine_ore` refusing reachable ore as "out of reach"
  (44 times; our code, fixed).

**Cooked meat: stored early, then eaten and taken.**
- **Stored:** in every rep the agent with the meat part had 10 or more stored by about day 1 18:00.
- **Rep 1, survived:** two teammates each asked for 2 and got the whole stack, and each put the
  rest back.
- **Rep 3, emptied:** Sonnet took all 10 out (below), and the chest held 4 at the end.
- **Eaten:** meat was eaten 25 times over the run. Agents needed to eat, and the chest was the
  nearest food.

## 2. When something unexpected happened

These are the times something broke an agent's work off, and how soon it was back:
- **Back at work:** its next decision aimed at a part of the goal or at groundwork. This is read from
  the skill and its arguments, not from how it went.
- **Back to what it was on:** it went back to the same part it had been working on.

| What broke the work off | Times | What it did next, most often | Back at work on the goal | Decisions to get back (median) | Game time (median) | Back to what it was on |
|---|---|---|---|---|---|---|
| Died | 31 | `pick_up` 9, `build_shelter` 7, `wait` 4 | 28 of 31 | 6 | 1:08 | 1 of 1 |
| A mob came near or hit it | 100 | `build_shelter` 33, `flee` 31, `hunt` 11 | 87 of 100 | 4 | 0:56 | 16 of 25 |
| Night was falling | 16 | `build_shelter` 5, `go_to` 3, `mine_ore` 2 | 15 of 16 | 4 | 1:57 | 4 of 8 |
| A teammate's message cut in | 87 | `wait` 22, `mine_ore` 9, `build_shelter` 8 | 86 of 87 | 3 | 0:36 | 19 of 23 |
| The skill failed | 276 | `build_shelter` 35, `wait` 25, `smelt` 24 | 274 of 276 | 3 | 0:51 | 76 of 133 |

(31 is steps with a death; there were 33 deaths, since two steps had two each.)

**How they handled it.**
- **Mobs:** the agents got safe first (`build_shelter` into the base, or `flee`) and went back to
  work within about a minute of game time. Two times in three they went back to the part they had
  been on.
- **Changing tactics when a threat kept coming back:** in rep 1, Opus fled a zombie while mining
  iron at day 2 4:41. When a zombie broke in again less than a minute later, Opus chose `hunt` instead: "A zombie keeps
  interrupting my iron mining. I have a stone sword and 11 health, so killing it should be safer than
  fleeing again and again." It did the same in rep 3.
- **After a death:** agents went back for their dropped things first (`pick_up`), and were at work
  again within about six decisions. In rep 1, Opus was clear about what a death had cost it: "Died
  and lost everything; death spot is deep with zombies. Rebuild basic tools from nearby logs."

**Where the goal slipped.**
- **Luna under water** (rep 1, day 2 7:28):
  - Its air was running out with hostiles about, so it chose `flee`: "get to safety and out of the
    water before retrieving the iron pick or returning to shelter".
  - It took 28 decisions and 19:30 of game time (nearly a whole day) to get back to work.
- **Opus at health 4** (rep 1, day 3 19:58): it reasoned it could not heal at food 17, went back
  to the shelter "and ask[ed] for food so I can heal". The run ended before it worked on the goal again.
- **The rep 2 respawn trap:**
  - A zombie villager got into the base, probably through a creeper's hole.
  - Luna and Sonnet had slept there, so they respawned beside it, and died 10 times in 75 seconds.
  - Every observation told them they were "inside it, closed", and Luna chose `wait 60` beside the
    zombie. That was our code: the shelter counted as safe with a mob inside. It is fixed: they
    are now told "…but a zombie villager is inside with you".
- **Sonnet at "health 0"** (rep 3, day 2):
  - A hit left it at 0.4 health, and it was too hungry to heal. Our observation rounded that to
    0 for 26 decisions.
  - It reasoned from that: "Health is 0; stay safe in shelter and regenerate." It waited, refused
    to fight ("stopped fighting at health 0"), and finally went to the chest: "Health is 0 and food
    16 is too low to regenerate; need food from the chest."
  - It asked `take` for 1 cooked mutton and, because of the `take` bug, got all 10. That is how the
    rep 3 chest was emptied. A sound decision, made on a wrong number and carried out by a broken
    skill. Both are fixed.

**Failures** were the most common interruption, and the agents almost always moved on: 274 of 276
were back at work, and 76 of 133 went back to what they'd been doing. Most iron failures were
`mine_ore` saying "out of reach" about ore it could have dug to. That is fixed.

## 3. Working together, and in each other's way

**They split the work at once, and mostly kept to the split.**
- **Proposed:** each rep, Luna (GPT-6) opened by saying it would build the base and asking the
  others to take the rest.
  - In reps 1 and 2 it named who should do what, and the others went along: in rep 2 Opus said
    "Going with luna's split".
  - In rep 3 it only asked, and Opus and Sonnet split the rest between themselves.
- **Kept:** the decisions that moved each part forward show they stuck to it:

| Part | Rep 1 | Rep 2 | Rep 3 |
|---|---|---|---|
| Base | Luna 5, Opus 1 | Luna 4, Sonnet 2 | Luna 9, Sonnet 2 |
| Beds | **Opus 7**, Luna 2, Sonnet 1 | **Sonnet 9**, Luna 6 | **Opus 6**, Luna 3, Sonnet 1 |
| Iron pickaxes | **Sonnet 12**, Luna 2, Opus 1 | **Opus 2** | **Sonnet 5**, Opus 2 |
| Cooked meat | **Opus 10**, Luna 1, Sonnet 1 | **Sonnet 17**, Luna 6 | **Opus 10**, Sonnet 5, Luna 4 |

**Helping.**
- **Handovers:**
  - rep 1: iron pickaxes passed round 5 times, and a bed;
  - rep 2: 2 beds from Sonnet to Luna;
  - rep 3: 22 logs for the base, 16 cobblestone, 8 planks and two handfuls of cooked food when a
    teammate was low.
- **The shared base:** each rep, the two agents who didn't build it went into it 9–22 times
  between them.
- **Questions** between agents were answered 14 of 19 times.

**Getting in each other's way.**
- **Messages:** a teammate's message broke off an agent's skill 87 times in three reps. That was
  sent by Luna 39 times, Sonnet 29 and Opus 19. In rep 2 the agents' most common reply was `wait`.
  - These were mostly status updates and instructions: "Shelter is at (4,74,43); I'm inside. Please
    bring the beds here…"
  - Since tbase1, a message no longer breaks off `build_shelter`. Everywhere else it still does, by
    design: the agent decides whether to answer.
- **Telling teammates what to do:** of 27 `tell_agent` requests (Luna 27 of 29 sent), the recipient
  did it at its next decision once, and partly 3 times. Some asked for what the recipient couldn't
  do yet: in rep 2 Luna told Opus to craft 3 iron pickaxes while Opus had 2 iron ingots.
- **The chest:**
  - rep 1: two agents each took a whole stack of a teammate's meat to eat one piece, and put the rest back;
  - rep 3: the take above, which emptied it.
- **Hits:** one hit between agents (Sonnet on Luna, rep 2).

## Our code: found and fixed

| What | Effect on the agents | Fix |
|---|---|---|
| A hit on the way into a shelter stopped `build_shelter` (bpoc2: 7 times) | Fled instead of getting in | On the way into a shelter that stands, a hit stops it only at health 6 or less; building in the open still stops at the first hit. Checked live with zombies (before tbase1) |
| A teammate's message stopped `build_shelter` (bpoc2: 3 times) | Left outside to read a message | Messages wait for the next decision (before tbase1; unit-tested only) |
| `go_to` and `flee` had no check for a frozen pathfinder, and the one in `build_shelter` took digging for being stuck | Walks that hung until timeout | All three nudge and retry a stuck pathfinder, and digging counts as moving. Checked live: digging out of a stone box (before tbase1) |
| `mine_ore` refused ore within reach but out of sight (tbase1: 44 times; 286 times in 34 of 53 earlier runs that mined) | Gave up on iron beside it, said "out of reach" | It digs up to 3 blocks between it and the ore, never furniture or a block touching water or lava. It now waits for the drop: leaving after exactly 10 ticks had left raw iron on the floor. Checked live where Opus failed in rep 2: 0 of 8 raw iron before, 8 of 8 after (after tbase1) |
| `take` moved whole stacks: asked for 1 cooked mutton, it took 10 | Emptied the team's food chest | Takes exactly the count, the rest of a stack one paced click at a time. Checked live: 1, 5, 10 and 20 of stacks of 10 and 16 (after tbase1) |
| A shelter with a mob inside was "closed" (rep 2: a zombie villager, 10 deaths at the base) | Told it was safe: waited beside the zombie; the "mob within 6 blocks" interrupt is off in a closed shelter | The observation and `build_shelter` say ", but a zombie villager is inside with you", and a shelter with a mob inside no longer counts as one no mob can reach. Checked live with a zombie villager summoned inside (after tbase1) |
| Health under half a point was shown as 0 (rep 3: Sonnet, 26 decisions; also 4 earlier single-agent runs, up to 32 decisions) | Reasoned from being at 0: waited, refused to fight, took the team's meat | A living agent is shown a tenth of a point (0.4) rather than 0. Checked live: a bot damaged to 0.39999 health was told 0 before, 0.4 after (found by this rewrite) |
| The pathfinder could dig through a bed (or furnace, crafting table) in its way | One half of rep 3's base bed was found missing (cause not in the logs) | It goes round furniture instead. Checked live: library defaults dug through a bed in a low corridor; with the fix it went round (after tbase1) |
| The comparison counted going into a standing shelter as building one ("Luna built 37 shelters"), and two deaths in one step as one | Wrong report | Fixed (after tbase1) |

## What the logs say is the agents' own

- **The third bed.** Sheep were scarce near every base, and no agent went far to find more,
  though each night's failed sleep named who had no bed.
- **Pickaxes worn out.** Rep 1's agents were shown each iron pickaxe's uses running down and used
  them up anyway.
- **Talking past each other.** Messages broke off each other's work 87 times, and instructions were
  seldom followed. Mostly Luna, which sent most of both.

## Per-model numbers

| Model | Cost, 3 reps | Decisions per rep | Decisions that worked | Deaths per rep | Lowest food |
|---|---|---|---|---|---|
| Opus 5.5 | $7.05 | 95–132 | 56–72% | 3, 0, 2 | 3 |
| Sonnet 5.5 | $4.38 | 123–188 | 50–54% | 2, 14, 1 | 2 |
| GPT-6 Luna | $0.27 | 106–151 | 60–68% | 2, 9, 0 | 3 |

- **Validity:** every run is valid (no lost connections) and ran its full 72,000 ticks.
- **Cap:** no agent reached its $3 cap; Opus's dearest rep cost $2.51.
- **Deaths:** 33 in all: zombies 11, zombie villagers 10, skeletons 8, creepers 3, a spider 1.
  Against thome1 (48), and none from the terrain (thome1: 4).
- **Night:** 54% of night-time decisions were made inside a closed shelter (thome1: 8%; bpoc2, below: 39%).

## The proof run first (bpoc2)

*Three GPT-6 Luna agents, same goal and settings, one rep, 20 October, on c7723bd; $0.29.*
- **Result:** goal not met. All three slept in the shared base, 2 of 3 carried iron pickaxes,
  and 7 of 10 cooked meat were stored. 18 deaths, 6 of them in or near water.
- **What it checked:** going into a shelter by its doorway. `build_shelter` was called 69 times,
  and no call failed to get the agent in; in the first proof run (bpoc) 10 calls timed out.
- **What it found:** 7 entries stopped by a hit on the way in and 3 by a teammate's message, both
  fixed before tbase1 (above).

## What this suggests (not acted on)

- **Run it again on the fixed code.** Iron failed on `mine_ore`, and rep 3's meat failed on `take`
  and the health display. Until it runs again, these numbers don't say how well a team of these
  agents does on this goal.
- **Then the progress list.** `--progress on` lists the goal's open parts in every observation,
  such as "Sonnet has not slept in the base". The question is whether knowing what's left gets a
  team the third bed, or a pickaxe kept for the end.
- **Messages as interruptions.** Teammates' messages broke off work nearly as often as mobs did.
  Whether a message should wait for the agent's next decision, rather than cut in, is a design
  question about how agents hear each other. It would change the comparison, so it isn't changed here.
