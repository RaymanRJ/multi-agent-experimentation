# Team base: one shared shelter, three models, three days

*Team run tbase1, 20 October, on main at 66e0fd3: Claude Opus 5.5, Claude Sonnet 5.5 and GPT-6
Luna in one world, collaborative stance, chat on, plan memory, progress list off, survival,
`team-base`, 72,000 ticks (three in-game days, about an hour of real time), three reps, each on a
fresh world, capped at $3 per agent per rep. Total cost $11.70. Same models, settings and length
as thome1 ([05](05-team-homestead.md)). The iron and meat parts of the goal are worded the same.
The shelter part now asks for one large shelter for everyone, and the sleep part for a bed inside
it. The shelter code changed between the two runs too, so the runs compare part by part, not as
a whole.*
Generated report: [batch-reports/2026-10-20-2133-tbase1.md](../batch-reports/2026-10-20-2133-tbase1.md).

> Over the next three days, your team must build one large two-storey shelter that is home to all
> of you, every one of you must sleep in a bed inside it, every one of you must end up carrying an
> iron pickaxe, and you must leave at least 10 cooked meat in a chest. It does not matter who does
> what. The episode ends by itself once the team has all of that.

## In one paragraph

No rep met the goal. Every rep built the shared base: Luna, within the first five minutes, each
time. In every rep two of the three agents slept in it, and in two reps the chest held 10 cooked
meat. Iron failed everywhere: 1 iron pickaxe held at the end, in nine agent-runs. That was mostly
our code. `mine_ore` gave up on ore it was standing next to as "out of reach" 44 times, and 53
calls to mine iron gained 15 raw iron in all. A second bug in our code, `take` moving a whole
stack when asked for one, emptied rep 3's food chest. A third told the agents their base was
"closed" while a zombie villager was inside it, which cost 10 of rep 2's deaths. All three are
fixed. The shared base did what it was meant to: the agents spent 54% of their night-time
decisions inside a closed shelter (thome1: 8%) and died 33 times (thome1: 48). Every part of
the goal was met in some rep, never all four in one.

## The numbers

| Part of the goal | Rep 1 | Rep 2 | Rep 3 |
|---|---|---|---|
| One large two-storey shelter | yes, Luna, day 1 5:00 | yes, Luna, day 1 5:40 | yes, Luna, day 1 5:17 |
| Every member slept in a bed inside it | 2 of 3 (not Sonnet) | 2 of 3 (not Opus) | 2 of 3 (not Sonnet) |
| Every member carries an iron pickaxe | 0 of 3 (Sonnet made three on day 1; all worn out) | 0 of 3 (none made) | 1 of 3 (Sonnet, day 3 19:44) |
| 10 cooked meat in a chest | **yes**: 12 stored by Opus, 10 left | **yes**: 10 mutton + 7 porkchop, Sonnet | no: 10 mutton (Opus), all taken out; 4 at the end |
| Deaths (Opus / Sonnet / Luna) | 3 / 2 / 2 | 0 / 14 / 9 | 2 / 1 / 0 |
| Cost | $3.70 | $4.02 | $3.98 |

| Model | Cost, 3 reps | Decisions per rep | Decisions that worked | Deaths per rep | Lowest food |
|---|---|---|---|---|---|
| Opus 5.5 | $7.05 | 95–132 | 56–72% | 3, 0, 2 | 3 |
| Sonnet 5.5 | $4.38 | 123–188 | 50–54% | 2, 14, 1 | 2 |
| GPT-6 Luna | $0.27 | 106–151 | 60–68% | 2, 9, 0 | 3 |

- **Validity:** every run is valid (no lost connections) and ran its full 72,000 ticks.
- **Cap:** no agent reached its $3 cap; Opus's dearest rep cost $2.51.
- **Deaths:** 33 in all. Zombies 11, zombie villagers 10, skeletons 8, creepers 3, a spider 1.
  None were from the terrain (thome1: 4 from lava and falls).
- **Night:** 54% of night-time decisions were made inside a closed shelter, and 64% inside one
  closed or not, against 8% in thome1. In the proof run before this one (bpoc2, below) it was 39%.

## What happened

**Luna built the base, and the others used it.**
- **Who built it:** Luna built the large two-storey base at its second or third decision in every
  rep, from the logs it had gathered. It later went into it 14, 36 and 17 times.
- **Who used it:** Opus and Sonnet built only small shelters of their own, each in a rep where it
  was far from the base: Opus underground in rep 2, Sonnet in rep 3. Otherwise `build_shelter`
  took them into the base, 1–22 times a rep each.
- **Against thome1:** there, the same models built 36 shelters between them, wherever night found
  them.

**Staying in at night worked. Sleeping never passed a night.**
- **In the base:** the agents were inside it with the doorway closed for most of each night, and
  deaths fell from 48 to 33.
- **But rep 2 had a respawn trap of its own:**
  - At the first dawn, a zombie villager was inside the base. It probably came in through gaps a
    creeper's blast left at the doorway: Luna died to that creeper, and Sonnet's next `build_shelter`
    filled 5 missing blocks.
  - Luna and Sonnet had slept in the base, so they respawned at its bed, next to the zombie. They
    died 10 times there in 75 seconds, until Sonnet killed it with `hunt`.
  - Every observation told them "you are inside it, closed", and Luna chose `wait 60` beside it.
    That was our code (below).
- **Beds:** in every rep, one agent never had a bed. Wool comes from sheep, and the base was in
  dark oak forest: `hunt` for sheep failed with "no sheep within 32 blocks" 10 times, and the
  agents seldom went further to look.
- **The night never passed:** the two with beds slept 5–10 times each per rep. Each time they were told
  "the night only passes when every player in the world is asleep (not in bed: …)", naming the
  teammate. No rep made the third bed.
- **The goal check:** what's checked is that each member slept in the base, so 2 of 3 is what each
  rep scored.

**Iron was our code first.**
- **Where it went wrong:**
  - `mine_ore` gave up on ore within a few blocks of the agent as "out of reach", 44 times in all.
  - Opus spent most of rep 2 underground beside visible iron ore, with stone pickaxes and 200
    cobblestone. Its 5 tries gained nothing: 14 of the ore blocks were "out of reach".
  - Across the run, 53 tries to mine iron gained 15 raw iron, and only 9 of the 53 gained any.
- **Why:** the pathfinder stops within 2 blocks of the ore. When the ore's open face is on the far
  side, as on a cave wall reached from the other side, there is still rock between the agent and
  the ore, and the skill refused to dig. Reproduced on a test server, and fixed (below).
- **Rep 1:** Sonnet did get iron. It made three pickaxes on day 1 and handed them round, and then
  they wore out. Each agent's `wearingOut` counted the uses down (14, 2, 1) while they were used
  to tunnel and to `climb_out`, Luna climbing 71 blocks up from the bottom of the world. The goal
  asks for pickaxes carried at the end, and no one kept one aside. That part is the model.

**The food chest was emptied by `take`.**
- **What happened:** in rep 3, Opus cooked 12 mutton and stored 10. Sonnet then asked `take` for 1
  and got all 10, because `take` moved whole stacks; its description said so ("may be a few
  more"). The chest stayed empty until Luna stored 4 porkchop on day 3.
- **The same in rep 1:** Luna and Sonnet each asked for 2 porkchop and got the stack, but each put
  the rest back, so 10 stayed.
- **Fixed** (below).

**Telling teammates what to do didn't work.**
- **The numbers:** `tell_agent` was used 29 times (Luna 27, Opus 2). Of the 27 the report could
  follow, the recipient's next decision did as told once, partly 3 times, and did something else 23
  times.
- **A caveat:** that judges only the very next decision. In rep 1 Sonnet gave Luna the iron
  pickaxe it asked for three times over, but not always as its next move.
- **Questions:** `ask_agent` questions were answered 14 of 19 times.

## The proof run first (bpoc2)

*Three GPT-6 Luna agents, same goal and settings, one rep, 20 October, on c7723bd; $0.29.*
- **Result:** goal not met. All three slept in the shared base, 2 of 3 carried iron pickaxes,
  and 7 of 10 cooked meat were stored. 18 deaths, 6 of them in or near water.
- **What it checked:** going into a shelter by its doorway. `build_shelter` was called 62 times,
  and no call failed to get the agent in; in the first proof run (bpoc) 10 calls timed out. A
  third of the entries left the doorway open for want of a block to close it, and said so.
- **What it found:**
  - 7 entries were stopped by a hit on the way in, and 4 of those agents then fled and never went
    back in.
  - 3 more entries were stopped by a teammate's message.
  - Both fixed before tbase1 (below).

## Our code: found and fixed

| What | Effect on the agent | Fix |
|---|---|---|
| A hit on the way into a shelter stopped `build_shelter` (bpoc2: 7 times) | Fled instead of getting in | On the way into a shelter that stands, a hit stops it only at health 6 or less; building in the open still stops at the first hit. Checked live with zombies (before tbase1) |
| A teammate's message stopped `build_shelter` (bpoc2: 3 times) | Left outside to read a message | Messages wait for the next decision (before tbase1; unit-tested only) |
| `go_to` and `flee` had no check for a frozen pathfinder, and the one in `build_shelter` took digging for being stuck | Walks that hung until timeout | All three nudge and retry a stuck pathfinder, and digging counts as moving. Checked live: digging out of a stone box (before tbase1) |
| `mine_ore` refused ore within reach but out of sight (tbase1: 44 times; 286 times in 34 of 53 earlier runs that mined) | Gave up on iron beside it, said "out of reach" | It digs up to 3 blocks between it and the ore, never furniture or a block touching water or lava. It now waits for the drop: leaving after exactly 10 ticks had left raw iron on the floor. Checked live where Opus failed in rep 2: 0 of 8 raw iron before, 8 of 8 after (after tbase1) |
| `take` moved whole stacks: asked for 1 cooked mutton, it took 10 | Emptied the team's food chest | Takes exactly the count, the rest of a stack one paced click at a time. Checked live: 1, 5, 10 and 20 of stacks of 10 and 16 (after tbase1) |
| A shelter with a mob inside was "closed" (rep 2: a zombie villager, 10 deaths at the base) | Told it was safe: waited beside the zombie; the "mob within 6 blocks" interrupt is off in a closed shelter | The observation and `build_shelter` say ", but a zombie villager is inside with you", and a shelter with a mob inside no longer counts as one no mob can reach. Checked live with a zombie villager summoned inside (after tbase1) |
| The pathfinder could dig through a bed (or furnace, crafting table) in its way | One half of rep 3's base bed was found missing (cause not in the logs) | It goes round furniture instead. Checked live: library defaults dug through a bed in a low corridor; with the fix it went round (after tbase1) |
| The comparison counted going into a standing shelter as building one ("Luna built 37 shelters") | Wrong report | Entries are counted apart, and a large shelter says so (after tbase1) |
| Two deaths in one step counted as one (rep 2: Sonnet 13 for 14, Luna 8 for 9) | Wrong report | Count each death the log records (after tbase1) |

## What the logs say is not ours

- **Beds for everyone.** Sheep were scarce near every base, and the agents rarely went far to find
  more. The third bed was never made. That's the game (where sheep are) and the model (not going
  to look).
- **Pickaxes worn out.** The agents were shown each pickaxe's uses left, and mined with the iron
  ones until they broke.
- **Telling teammates to do things they couldn't.** That was Luna, mostly.

## What this suggests (not acted on)

- **Run it again on the fixed code.** Two of the four parts failed largely on our bugs: iron on
  `mine_ore`, and rep 3's meat on `take`. Until it's run again, these numbers don't say how well
  the models do on this goal.
- **Then the progress list.** `--progress on`, an existing condition, lists the goal's open parts
  in every observation, such as "Sonnet has not slept in the base". The question is whether
  knowing what's left gets a team the third bed, or a pickaxe kept for the end.
