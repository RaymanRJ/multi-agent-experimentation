# Three Lunas, most of the time: what it took on the hard world

*Team batch tluna27 (reps a–e), 11 November, on branch `overnight-luna` at dc6fb61, frozen for all five reps. Three
GPT-6 Luna agents, collaborative stance, chat on, plan memory, progress list on, three in-game days (60:00 of game
time) on the first world (seed `multiagent`, the lake under the start area), $0.25 cap per agent per rep,
US$0.57 in all. Comparable with tluna20–26 (same goal, world and conditions; the code differs by the fixes below),
not with tbase1–7 (other models).*
Generated reports: [batch-reports](../batch-reports/) (tluna27a–e).

> Over the next three days, your team must build one large shelter that is home to all of you, every one of you
> must sleep in a bed inside it, every one of you must end up carrying an iron pickaxe, and you must leave at
> least 10 cooked meat in a chest. It does not matter who does what.

**The result: the whole goal in 4 of 5 reps** (27b–e), on one frozen commit. The owner's bar was at least 3 of 5 consecutive reps on unchanged code. Before this batch the
cheapest team had met the whole goal in 4 of 14 reps on this world on its latest code, and on the run-up code
(b040a1e) 1 of 3. The one rep that fell short met 3 of the 4 parts, as did the two that fell short on b040a1e.

**A second night (11-12 November) took it to 8 of 10 on one commit**, after a hunting bug in our code was found
and fixed: see [the second night](#the-second-night-80-on-one-commit).

## What this teaches about building agents

Once the tools stopped misleading them, three cheap agents organised, recovered and finished a three-day team goal in most runs; what changed between "rarely" and "mostly" was the harness, not the agents.

- **A safety reflex can do quiet harm:** a reflex that dug a block off an agent's head also dug out the home's door whenever an agent stood in the doorway, about 4,500 times over two weeks of logs (against 56 for every other block), and nobody read the event as a bug; count how often a reflex fires against what it guards ([control loop](../../lessons.md#the-control-loop)).
- **Tools should solve the obstacle, not name it:** "descend closer first" was said 144 times in 13 reps; digging toward the ore itself removed a whole class of stuck runs ([tools](../../lessons.md#tools)).
- **A refusal must fit the situation it is given in:** "walk outside first", said to an agent standing on its home's roof, sent it back to the same refusal ([tools](../../lessons.md#tools)).
- **Measure the rate on frozen code:** one-rep-at-a-time fixing found failures but said nothing about how often the team wins; five reps on unchanged code did ([improvement loop](../../lessons.md#the-improvement-loop)).

## In short

- **They organised at once.** In each rep read for it (a–d) the work was split in the first three decisions: one agent
  on the home, one on iron, one on meat, and beds to whoever was free. Nobody waited to be assigned.
- **They kept the remaining goal in view, by name.** Late in a run, rationales name exactly which teammate still
  lacks what: *"The team still needs iron pickaxes for lb and lc; I have two and lb is nearby"* (la, 27d, day 2).
- **They came back from death quickly.** All 17 deaths were followed by a return to goal work, in a median of 7 to 20
  seconds of game time; the fastest win (27e, day 2) had none.
- **Handing over worked; passing in a circle did not.** Iron pickaxes moved between teammates 3–5 times in three of reps a–d (raw iron and ingots in the fourth). In
  the one loss, three agents passed two pickaxes around instead of making the third.
- **Teammates still interrupted each other** more than threats did in three reps of four (20–25 skills cut off by a
  teammate's message against 10–16 by a threat in b–d).

## 1. How they organised

Roles came from the agents themselves, in their first messages, and held:

| Rep | Home | Iron | Meat | Beds |
|---|---|---|---|---|
| 27a | lc (day 1 4:31) | la: *"I'm handling iron pickaxes for everyone"* | lb | whoever was free |
| 27b | lb (day 1 4:01) | la and lc; lb made all three pickaxes | la | shared |
| 27c | lc (day 1 3:31) | la (13 of 25 iron decisions) | lb: 10 cooked meat stored by day 1 8:58 | lc |
| 27d | lc (day 1 3:44) | la made 4 iron pickaxes | lb (12 of 12 meat decisions) | lb |
| 27e | lc (day 1 3:46) | la made all three by day 1 19:08 | lb (9 of 12 meat decisions) | shared |

Directing worked less well than asking (reps a–d): of 11–19 instructions a rep, 3–5 were followed at the next decision; of
17–23 questions, 11–15 were answered.

## 2. Keeping the goal in view

Directly toward a part of the goal took 16–26% of the team's game time, preparing for it (wood, tools, smelting)
15–41%, and keeping safe 15–33%. Each rep's base stood between 3:31 and 4:31 into day 1 (a day is 20:00); the rest of
the run was beds, iron and meat.

What stands out in the rationales is that the agents tracked the goal per teammate, not per item. Late in the runs
they named who still lacked what and acted on it:

- *"The team still needs me to carry an iron pickaxe, and lb has already crafted three and is returning to the
  shelter."* (la, 27b, day 2)
- *"Beds are the remaining team bottleneck; lb is hunting sheep, so coordinate wool while La handles the iron
  pickaxe delivery."* (lc, 27d, day 2)

## 3. Meeting the unexpected

| Rep | Deaths | Back at goal work after a death | Median time back |
|---|---|---|---|
| 27a | 7 | 7 of 7 | 0:20 |
| 27b | 2 | 2 of 2 | 0:19 |
| 27c | 5 | 5 of 5 | 0:07 |
| 27d | 3 | 3 of 3 | 0:11 |
| 27e | 0 | — | — |

After a death an agent respawns in the home with nothing; the agents said so and went back for tools first:
*"I respawned with only dirt, so I need to coordinate for tools and iron"* (la, 27c, day 2), then asked a teammate
for them. The one loss was the rep with the most deaths: seven over nights 1 and 2 cost tools, wool, three beds and
14 mutton, and pushed the first iron to day 3 at 2:14.

## 4. Working together, and in each other's way

Iron pickaxes changed hands 3, 5, 0 and 4 times in reps a–d (27c moved raw iron and ingots instead); handovers came
right after the receiver mentioned the item in 17 of 18 cases. In 27b lb made all three pickaxes and handed two out;
in 27d la made four; in 27e la made all three by the end of day 1 and the team was done early on day 2.

The loss shows the other side. In 27a the team smelted only 6 ingots, two pickaxes' worth. Each agent saw the goal's
gap as "X carries no iron pickaxe" and answered it by giving its own away: on day 3 there were seven tries to hand a
pickaxe to a teammate (three went through), the last two from la to lb and then to lc seven seconds apart, while lc
tried to give its own to la. lc saw it: *"The only remaining
requirement is that La carry an iron pickaxe. I should stop La from transferring theirs to me and keep my own
pickaxe."* No one went back for the 3 ingots a third pickaxe needed, and the run ended with 2 of 3.

Hindrance was small: meat taken from or eaten out of the store 6–7 times a rep in b–d (17 in a, most of them deaths
dropping it), and 20–25 skills a rep cut off by a teammate's message.

## The fifth rep (27e)

The cleanest run of all: no deaths, the home by 3:46 on day 1, la mining and smelting from 9:44 and making all three
pickaxes by 19:08 the same day, lb storing the meat, and the goal met at 30:02, early on day 2, for $0.07. With
27b–d it makes 4 of 5 on frozen code.

## Where our code, not the agents, decided the outcome

In the run-up (tluna13–26, 7–11 November), and fixed before or during this batch:

- A reflex dug out the home's door whenever an agent stood in its open doorway (every run since 27 October). In
  tluna26b it left la outside a doorless home at dusk, killed with an iron pickaxe.
- `descend` swam into the lake under the start area, then refused all ground near it; it now plans a dry stair
  before digging and walks clear of where anyone was flooded out.
- `mine_ore` named ore far below as "descend closer first" instead of reaching it.
- An enderman, neutral unless provoked, stopped mining 5 times by being near.

Found in this batch and fixed after it (not in these five reps):

- `descend` told an agent on its home's roof to "walk outside first" (twice in 27a); it now walks to open ground
  clear of the home.
- Teammates' messages still cut `mine_ore` short (4 of 44 calls across tluna26–27b); they now wait, as for
  `descend` and `hunt`.

## Per-rep numbers

| Rep | Result | Game time to goal | Deaths | Decisions (la / lb / lc) | Tokens in / out | Cost |
|---|---|---|---|---|---|---|
| 27a | 3 of 4 parts (pickaxes 2 of 3) | — | 7 | 128 / 127 / 110 | 2,498k / 150k | $0.15 |
| 27b | whole goal | 44:39 | 2 | 96 / 94 / 111 | 2,063k / 121k | $0.12 |
| 27c | whole goal | 55:50 | 5 | 139 / 95 / 110 | 2,368k / 130k | $0.14 |
| 27d | whole goal | 50:02 | 3 | 98 / 102 / 52 | 1,714k / 87k | $0.09 |
| 27e | whole goal | 30:02 | 0 | 67 / 63 / 43 | 1,175k / 62k | $0.07 |

Costs are our estimate; the bill runs about 1.3× lower.

## How this testbed gets better: from where the agents get stuck

The loop is [06's](06-team-base.md#how-this-testbed-gets-better-from-where-the-agents-get-stuck). The stuck points
from tluna13 to tluna27, on the hard world:

| Where an agent got stuck | What was wrong | What changed | The same thing in a real system |
|---|---|---|---|
| A witch's potions killed agents inside their home | A ranged attacker was treated as melee | Agents take cover from a witch as from an archer | A threat model that covers the common attacker and misses one that acts at a distance |
| Iron beside water refused 23 times | A tool refused a recoverable case outright | The water is plugged and the ore mined from dry rock | A tool that fails on a dirty input it could have cleaned first |
| Dug in under sand, reported "safe", stuck 67 decisions | A success reported for a state that wasn't safe | Digs in only where the hole can be closed; `climb_out` gets out of an open pit | A health check that reports green for a degraded state |
| Respawned in the open with nothing, night after night | A precondition (a bed used once) no tool set up | A bed put down is slept in by day, which sets the respawn point | A failover target that was never registered, so recovery starts from scratch |
| Hunts broken off by teammates' messages; no beds by night 1 | Low-value notifications preempted long work | Messages wait until the hunt ends (later: digging and mining too) | Interrupt-driven work where every ping cancels the job in progress |
| Shut in by gravel in its own doorway for 100 decisions | No recovery path for a blocked exit | The doorway is dug out before walking through | A process that can't clear its own stale lock |
| Went back down a flooded stair 39 times | A tool promised to handle a case it handled only sometimes | It stops when water keeps coming back, says so, and the description promises only that | Documentation that overstates a tool, so the agent keeps retrying it |
| Then refused 35 times near the flood | A guard with no way round it | A dry stair is planned from up to 24 blocks off | A circuit breaker that opens and offers no alternative route |
| "descend closer first" for ore 28 blocks down (144 times) | A tool named the obstacle instead of solving it | `mine_ore` digs toward the ore | An API that answers "not found here" when it could follow the reference |
| The home's door dug out by the agents' own reflex (about 4,500 events) | A safety reflex matched more than its target | It reacts only to a block that really covers the head | An auto-remediation rule that fires on a look-alike signal and quietly breaks what it protects |
| "Walk outside first", said to an agent on the roof | A refusal written for one situation, given in another | It walks clear of the home and digs | An error message that assumes the caller's state, so the suggested fix doesn't apply |

**Left alone as the agents' own:** going out at night, hunting until health 1, one bed among three for a night,
eating stored meat, and passing pickaxes in a circle. Each cost a part of the goal at least once; each is a choice,
and coaching it away would measure the coaching.

## The second night: 80% on one commit

*Sets A, B and C (tluna29a-f, tluna30a-j, tluna31a-j), 11-12 November, branch `overnight-luna`. Set A on 131eb8f; sets B
and C both on 54c5f86, frozen across all twenty reps. Same goal, world and conditions as above; two teams ran at once
from midnight, each on its own server (206 tick-rate readings, every one at 20: no lag). US$2.88 estimated in all.
The owner's bar: 8 of 10 on one unchanged commit, then 9 of 10.*

**The result: set C met the whole goal in 8 of 10; set B, on the same commit, in 7 of 10.** Together, 15 of 20 (75%). Set
A, on the code before the fixes below, stopped at 2 of 6. 90% was not tried: the credit left would not cover a set of ten.
The fastest win was 13:22 of game time, still on day 1 (31i); the median 30:49.

### What changed between set A and set B

One bug decided most of the losses. **A hunt begun inside a closed home never left it**: it followed the animal from
inside, ran its chase clock down in place and reported "the sheep got away". In tluna29a-f, 71 of 89 animal hunts begun
inside ended that way with nothing killed. The agents read it as the animals' doing and planned around it (more hunts,
other animals, waiting), while the wool for beds and the meat for the chest stayed out of reach. Hunts now walk out by
the door first. In sets B and C, 40 of 54 hunts begun inside a home killed their animal.

Three smaller fixes went in with it, each checked live against the old code: a hunt fights a creeper by striking and
backing out of its blast (old 0 of 4 killed, new 4 of 4); the body climbs out of lava while the model decides (old 4 of
4 died in a sunk pool, new 2 of 4); and asking to craft "bed" names the real items (`white_bed`). A creeper that kept
everyone from sleeping for three nights in 29c led to one neutral fact in the sleep refusal: a creeper doesn't burn in
daylight and stays near a player it can sense.

### How the agents behaved

- **They organised at once.** In 19 of 20 reps someone was building the home by the third decision; in 14 the first
  three decisions covered home, food and tools between them. lc built 16 of the 20 homes, lb the other 4.
- **One agent often carried the iron for everyone.** In 11 reps one agent made all three pickaxes and handed them out;
  10 of those 11 met the goal. The exception, 30b, is the night's clearest loss: la made all three pickaxes on day 1,
  140 blocks from home, waited out the night dug in at health 8, set off just before sunrise and was shot.
- **They tracked the goal per teammate.** *"La and lb still need iron pickaxes; I have 7 iron ingots, enough to craft
  two."* (lc, 30j, day 1). *"The shelter, beds, and 10 cooked meat are already in place; lc is the only teammate still
  missing an iron pickaxe."* (la, 31c, day 2).
- **Death was the main way away from the goal.** 64 deaths in 20 reps (median 3), 23 of them carrying iron. Every loss
  but 30e (which never made iron) had iron die with whoever carried it, and agents rarely went back for what they dropped. Three wins had no deaths.
  After a death they were back at goal work quickly (median of the reps' medians 0:23): *"I respawned with an empty
  inventory, and my iron pickaxe is still needed. Coordinate with lb, who reported having enough iron for two more
  picks."* (la, 31a, day 2).
- **Asking worked; telling didn't.** 220 of 308 questions were answered; 36 of 201 instructions were acted on at the
  next decision.

### The five losses

| Rep | What was missing | Why |
|---|---|---|
| 30b | pickaxes, 1 meat | All three pickaxes lost with la far from home at dawn (above); lc died with 6 raw iron |
| 30c | pickaxes | Two deaths carrying iron; an iron pickaxe worn out digging |
| 30e | pickaxes, lc's sleep | No agent worked on iron beyond ore under water; monsters by the home refused sleep about 60 times |
| 31d | beds, pickaxes, 1 meat | Wool lost in two deaths on night 1, no sheep in range after; skeletons by the door, 60% of the time keeping safe |
| 31h | pickaxes | Iron mined on day 2 lost in two deaths; 2 ingots by day 3 |

All five come down to the agents' own choices about risk (travelling hurt or at night, carrying the team's iron far
from home) and to the game's monsters, not to our code as far as the logs show. Left alone, as before.

### How this testbed gets better (second night)

| Where an agent got stuck | What was wrong | What changed | The same thing in a real system |
|---|---|---|---|
| "The sheep got away", 71 of 89 hunts from a home | A tool's own failure to start was reported as the world's doing | Hunt walks out by the door first | A job that times out waiting on its own lock and reports "upstream unavailable" |
| A creeper by the wall, beds refused three nights | No safe way to remove the obstacle, and a false belief it would leave | Hunt fights creepers by hit-and-retreat; the refusal states one fact | A tool missing for a known blocker, plus an error that doesn't say the blocker is permanent |
| Burned to death in lava while the model decided | A safety reflex covered water but not lava | The body climbs out of lava, as out of water | A watchdog that handles one failure mode and not its close cousin |
| "Bed is not a known item", 5 times | An error that names no valid alternative | The error lists real names with the word in them | "Invalid parameter" with no hint of the valid values |

**Tried and dropped:** letting the door open so a hunt can fight a monster waiting outside it. Live, the agent went out
and lost (1 death, health 5-6 in the other tries, no kills); the refusal protects it, so it stays.
