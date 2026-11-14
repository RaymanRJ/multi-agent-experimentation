# Reaching 80%: the harness, then the model

*Team runs on the first world (seed `multiagent`), 12–14 November. Three GPT-6 Luna agents: set D (tluna32a–j, frozen
651817b), set E (tluna33a–f, e2a0b25), set F (tluna34a–f, 4fabf64), set H (tluna36a–j, frozen 2f1c753), set I
(tluna37a–j, frozen 00697eb), set J (tluna38a–j, frozen 7d113eb); US$0.25 cap per agent, US$7.78 in all. Three GPT-6.1
Sol agents: tsol2 (be44268), then tsol3–12 and tsolnp1–10 on frozen 077e0f4, the second ten with the progress list off;
US$2.00 cap per agent, US$21.46 in all with a test call and a stopped run. Every run: collaborative stance, chat on,
plan memory, three in-game days (60:00 of game time). Comparable with [write-up 07](07-luna-majority.md)'s sets (same
goal, world and conditions; the code differs by the fixes below). Sol ran only on the final code, after four fixes
Luna never ran with: the comparison between the models is close, not exact. Not counted: set G (tluna35a–d), stopped
part way for a change already shown to do harm, and tsol1, stopped by the owner ten minutes in for a bug in our code.*
Generated reports: [batch-reports](../batch-reports/) (tluna32a–tsolnp10).

> Over the next three days, your team must build one large shelter that is home to all of you, every one of you
> must sleep in a bed inside it, every one of you must end up carrying an iron pickaxe, and you must leave at
> least 10 cooked meat in a chest. It does not matter who does what.

**The result: three GPT-6.1 Sol agents met the whole goal in 20 of 20 runs on one unchanged commit**, 10 of them
without being told what the goal still lacked, at about US$1.04 a success. On nearly the same harness, three GPT-6
Luna agents met it in 15 of 30 (sets of 7, 4 and 4), at about 28¢ a success, after six more fixes to their tools had
stopped moving their rate.

## What this teaches about building agents

Fixing the harness took a team of the cheapest model from rarely to about half and then stopped paying; a stronger model on the same harness met the goal every time, even with less guidance, which shows where each lever's limit is.

- **When fixes stop moving the rate, test the model.** Six fixes, each checked live and each removing a real failure,
  left Luna at 15 of 30; what remained was its own judgement, which the harness reports but doesn't coach
  ([evaluation](../../lessons.md#evaluation)).
- **A true, neutral fact can still pull agents off the goal.** Showing agents where they had dropped things sent them
  out after those things at night, and the team got worse ([observations and context](../../lessons.md#observations-and-context)).
- **Then test taking guidance away.** The stronger team didn't need the list of what was still missing
  ([evaluation](../../lessons.md#evaluation)).
- **Pool the failures before fixing.** Sorting 131 deaths found that 81 came while running away, and that the escape
  tool never fought back: one fix, not 81 stories ([improvement loop](../../lessons.md#the-improvement-loop)).
- **Protect what an agent can't afford to lose from its own tools.** A pathfinder sent "another way" dug under the
  home's doorstep, and no agent could get in again ([tools](../../lessons.md#tools)).

## In short

- **Luna plateaued at about half.** After set C's 8 of 10, six more sets of Luna on slowly improving code scored 6, 2
  of 6, 2 of 6, 7, 4 and 4. Each set's losses had our-code causes that were found, fixed and checked live; the rate
  didn't follow.
- **Its losses were about iron pickaxes and death.** 25 of Luna's 27 losses in sets D–J ended short of iron pickaxes.
  In sets H–J, losing teams often mined more iron than winning ones, then died carrying it, passed the pickaxes around,
  or ended with two on one agent and none on another. Every set's wins had fewer deaths than its losses: 0 to 4.2 a
  run against 5.3 to 6.7.
- **Sol, on the same harness, met the goal every time, and not by dying less.** It died about as often as Luna did in
  its wins (3.2–3.7 a run against 2.7). What it did differently was get the team's pickaxes back: after a death with
  a pickaxe, a teammate went back for it in 11 of 15 cases, against 6 of 27 for Luna. It also sized its first iron
  trip to the team, asked and told far less, and never haggled over a pickaxe.
- **With less guidance, the same.** Without the list of what the goal still lacked, Sol met it 10 of 10, in a median 30
  minutes of game time against 33 with the list.
- **It cost more per run and less per worry.** About US$1.04 a success for Sol against about 28¢ for Luna; Luna is the
  cheaper choice only if half the runs failing is acceptable.

## The cheapest model stops improving

Set C (write-up 07) had met the goal 8 of 10. The next sets, each on frozen code with fixes between them:

| Set | Runs | Code | What changed before it | Met the goal |
|---|---|---|---|---|
| D | tluna32a–j | 651817b | a furnace already in use counts as busy | 6 of 10 |
| E | tluna33a–f | e2a0b25 | a standing fact of what was dropped on dying, and `pick_up` to a spot | 2 of 6 |
| F | tluna34a–f | 4fabf64 | a new home's site claimed on the team board; `pick_up` reports honestly | 2 of 6 |
| H | tluna36a–j | 2f1c753 | ore searches see exposed ore; a spider by day doesn't keep the door shut; the drop fact removed | 7 of 10 |
| I | tluna37a–j | 00697eb | underground, a cornered agent fights one or two monsters | 4 of 10 |
| J | tluna38a–j | 7d113eb | `descend` keeps enough pickaxe to climb back; an iron pickaxe's last uses are kept | 4 of 10 |

Every change was found in a loss, reproduced in the real game, and checked against the old code before it went in
(the list is [below](#where-our-code-not-the-agents-decided-the-outcome)). Sets H, I and J together met the goal 15
times in 30. Read set by set, they look like a fall from 7 to 4; read together, they are one rate of about half, and
set H's 7 was its lucky end: the three sets differ by about what chance gives at ten runs.

What the losses had in common, read from every log:

- **Iron pickaxes, not iron.** 25 of the 27 losses in sets D–J ended short of iron pickaxes; the other two were one
  agent who never slept (32a) and a chest three meat short (34a). The teams mined the iron: losing teams in sets H–J
  mined 17 to 30 raw iron a run, more than the winners in sets H and I (12 and 9) and a little less than set J's (24).
  What they lost was the pickaxes afterwards.
- **Death took them.** In nine losing runs of sets H and I, the teams made 44 iron pickaxes; 35 were dropped in deaths
  (about 5 picked up again), 2 wore out, and 12 were held at the end. Every set's wins had fewer deaths than its
  losses: 3.3 a run against 6.7 in set H, 0 against 6.5 in set I, 4.2 against 5.3 in set J.
- **And the team passed them around.** The same nine runs moved pickaxes between agents 54 times. In 36a and 36b the
  team ended holding three pickaxes, two on one agent and none on another.

The pooled deaths showed one more thing worth fixing. Of 131 deaths in sets D to H (H in part), 81 came during `flee`, and `flee`
never fought: 19 were healthy agents with one or two melee monsters near, and 22 had tried to dig in, take a nook and
wall in, and failed all three. Set I's fix (fight first when it is winnable) cut deaths in flight from 29 to 19 a set,
and the rate didn't move: the deaths that decided runs were elsewhere, on the surface and in the agents' own choices.

## A true fact that made them worse

Iron lost in deaths had decided 6 of the 9 losses in sets B–D, and 49 of 56 deaths that carried goal items were within
100 blocks of where the agent came back. The fix looked obvious: tell the agents, as a standing fact, what they and
their teammates had dropped, where, and what was still lying there, and let `pick_up` walk to a spot. It was checked
live (4 of 4 drops recovered with the spot, 0 of 4 without) and it was true and neutral, a fact a player would know.

It made the team worse. Set E met the goal 2 of 6 and set F 2 of 6, against 21 of 30 before. Per run against set D:

| | Set D (no drop fact) | Sets E and F (with it) |
|---|---|---|
| `pick_up` calls | 17 | about 37 |
| at night | 1.3 | about 15 |
| that failed | 84% | about 89% |
| deaths | 2.7 | 5.2 (E), 8.8 (F) |

The agents went back for what they had dropped, often at night, often into the same danger that had killed them; most
trips came back empty, and some came back dead. The fact was taken out (2f1c753) and `pick_up`'s spot kept. Nothing in
the prompt had changed: a true line in the observation was enough to change what the agents chose.

## Why we moved from Luna to Sol

By the end of set J the loop of [write-up 06](06-team-base.md#how-this-testbed-gets-better-from-where-the-agents-get-stuck)
had run out of things it may fix. It sorts every stuck point three ways: a tool that failed or misled, information the
agent lacked, or its own judgement, and changes only the first two. Six rounds of it had found and fixed real failures
in our code; what was left in Luna's losses was the third kind:

- dying while carrying the team's only pickaxes, often on a hunt at dusk, and not going back for them in the five
  minutes before they vanished;
- making fewer pickaxes than the team needed, or making them and handing them back and forth;
- asking and telling instead of doing: questions and instructions between agents took 15% of decisions in losing runs
  against 8% in winning ones, much of it about who held which pickaxe;
- waiting inside while a monster stood by the door, rather than fighting it or going round.

The harness may report these, never coach them: told how to behave, the agents would be measuring the coaching. The
remaining lever was the model. A trial of a stronger one on the same harness answers the question directly: if it
meets the goal, the limit was the model's judgement; if it doesn't, it was ours. Priced from sets H–J's real token use,
a Sol team run was estimated at US$2.59; it cost about US$1, because Sol decided in fewer, shorter turns.

### How the two models behaved

Read from all 50 runs (Luna's sets H–J, both Sol sets), per run. Luna's losses ran to the end of the three days, so
its wins are the fairer comparison for effort:

| Per run | Luna, won (15) | Luna, lost (15) | Sol, list on (10) | Sol, list off (10) |
|---|---|---|---|---|
| Decisions; game minutes to finish | 215; 35 | 391; 60 (time ran out) | 203; 33 | 185; 30 |
| Deaths (of them carrying a pickaxe) | 2.7 (0.4) | 6.1 (1.9) | 3.2 (0.9) | 3.7 (1.4) |
| Asks and tells between agents | 18 | 57 | 9 | 14 |
| "The Nth time in a row" notes | 1.8 | 3.9 | 1.2 | 0.1 |
| A failed skill chosen again, per 100 decisions | 4.6 | 5.6 | 2.3 | 2.3 |
| Waits (share of decisions) | 19% | 20% | 19% | 13% |

**How they organised: alike, except in sizing the job.** In 48 of 50 runs one builder had the large home up in 3–4
minutes of game time. Both models announced roles early, named teammates in about half their rationales, and made
about 3.5 iron pickaxes a run; both won with one agent making every pickaxe and with each making its own. The one
difference: Sol sized its first iron trip to the team. 18 of 20 Sol runs first asked for 9 or more iron, against 13
of 30 Luna runs.

> *"Mine the visible iron first; eleven ingots will cover three pickaxes and lc's shears."* (Sol, tsol4, la)
>
> *"The team needs iron pickaxes, and a visible iron ore block is nearby. Mine it while using a stone pickaxe."*
> (Luna, tluna37d, lb, asking for one)

**Meeting the unexpected: what decided it.** Not dying: per hour of game time Sol died a little more often than Luna,
not less. What differed was what came after. When an agent died carrying a pickaxe with time left, a Sol teammate
went back for it in 11 of 15 cases, and the team's pickaxe count was back within 10 minutes in 13 of 15 (median about
2 minutes); for Luna, 6 of 27 and 10 of 27. Dropped things vanish after 5 minutes. The teams made the same number of
pickaxes; Sol kept them. That is what the drop fact had tried to give Luna, and what Sol did unprompted from the
one-line death message alone.

**Working together, and in each other's way.** Luna spent its decisions on asking and telling: 57 a run in its losses
against 9–14 for Sol. Each question waits about 28 seconds of game time for an answer that often never comes, about 13
agent-minutes in a losing run. Sol instead said what it was doing in a free line on 82–90% of its decisions. In every
group about one instruction in five was acted on at once. And Luna haggled: 48 messages refusing to hand over a
pickaxe, in 15 of its 30 runs; none in Sol's.

> lc: *"Please obtain or craft an iron pickaxe for me and give it to me; I currently carry none."*
> la: *"I only have one iron pickaxe and need to keep it to meet the goal. Please find or craft another for yourself."*
> (Luna, tluna37b, minute 26)

With two pickaxes for three agents, refusing is reasonable: the haggling marks a shortage more than it causes one.

**Keeping the goal in view.** Sol chose a failed skill again half as often (2.3 per 100 decisions against 4.6–5.6),
and drew the harness's "the Nth time in a row" note far less. Without the progress list it kept the tally in its own
words:

> *"We need five more raw iron to craft the two remaining team pickaxes…"* (tsolnp1, lc)
>
> *"…everyone now has an iron pickaxe, so beds and sleeping are the remaining requirements."* (tsolnp3, la)

**So, why move.** The harness could fix what the tools did and what the agents were told. It could not, without
coaching, make an agent go back for the team's pickaxe within five minutes, size a trip to the team, or stop refusing
a teammate. Sol did all three on the same tools and the same facts. The win rate moved because the judgement did.

## A stronger model on the same harness

The trial ran one run at a time first, at the owner's request, so each could be read before the next, and so the new
door-hunt fix could be watched in real runs before any were run side by side.

- **The test call** confirmed the model answered as asked, cached its prompt (5,388 of 5,634 input tokens on the second
  call) and decided in 2–3 seconds; in the runs, about 3.3, against Luna's 4.6.
- **tsol1 was stopped ten minutes in** by the owner, watching: an agent that couldn't step in by the door was sent
  "another way" by the pathfinder, which dug the doorstep and tunnelled under the door and floor, and from then on no
  agent could reach the door. The ground round a home is now kept from digging like the home itself (be44268).
- **tsol2 met the goal in 14:20 of game time for US$0.38,** in a home built on a tree's canopy, ten blocks up, with no
  door: the game hangs no door on leaves, so the door was made and the doorway filled with planks. Doors are now hung
  on a block, and a new home goes on the ground (077e0f4).
- **tsol3 to tsol6, one at a time, then tsol7 to tsol12 two and three at once, on 077e0f4 unchanged:** 10 of 10 met the
  whole goal, in 23:29 to 43:14 of game time (median 33 minutes, all on day 2 of 3), at US$10.83 in all. No run
  crashed, lost its connection or hit a provider error, and every call was answered by the model asked for.

The door hunt, the fix for monsters camped at the home (1b50012), came up 12 times in the 20 runs: out and killed it 7
times, refused with two monsters near once (as meant), the target got away once, and cut short by a creeper coming
near 3 times (as meant). Nobody died after one.

## Less guidance

The progress list adds the goal's remaining gaps to every observation as facts ("lb carries no iron_pickaxe"). It has
been on by default since 8 November, because the cheaper teams lost track of the goal without it. With Sol meeting the
goal every time, the owner's principle (the goal met with as little guidance as possible) asked the next question:
does it still need the list?

It didn't. With the list off (tsolnp1–10, same frozen code), 10 of 10 met the whole goal, in 10:44 to 49:54 of game
time (median 30 minutes against 33 with the list), at US$10.02. They took a few more deaths (3.7 a run against 3.2)
and asked each other a little more (14 asks and tells a run against 9), and kept the goal in view by themselves.

## Where our code, not the agents, decided the outcome

Each fixed after it was found, checked live against the old code:

- A digging skill used up an agent's last pickaxe 31 times in sets D–I, stranding one at y=24 among lava (e7bf756).
- `climb_out` spared a worn iron pickaxe, then took it up again for a slow block until it broke (7d113eb).
- Ore searches took the first 64 iron ore found, all buried, and said "no iron ore in reach" with 37 in sight (173a9da).
- A spider by day kept the home's door shut, refusing every hunt for it and then every night's sleep (d1a87cd).
- Two agents arriving together built two homes two blocks apart, each wall through the other's room (4fabf64).
- `flee` underground never fought, and died with a lone zombie beside it (00697eb).
- A hunt for a monster camped by the home was refused at the door, 91 times in a day (1b50012).
- Each agent's three days ran on its own clock, so the last request in 36b went to an agent already gone (1233ea9).
- The pathfinder could dig a home's doorstep and tunnel under its door (be44268).
- A door was never hung on leaves, and a home could be built up a tree (077e0f4).
- And one of ours that made things worse: the standing drop fact (e2a0b25, removed in 2f1c753).

## How this testbed gets better: from where the agents get stuck

| Where they got stuck | What was wrong | What changed | The same problem in a real system |
|---|---|---|---|
| "No iron ore in reach" with ore in sight | our search capped before filtering, so it saw only buried ore | filter inside the search | a query that pages before it filters, and reports "none found" |
| Stranded deep with no pickaxe | a tool spent the resource the agent needed to get back | stop while enough remains to return | a job that spends its last credit, or deletes its own rollback, before finishing |
| Shut out of their own home | a fallback dug the approach to the door away | the ground round the home can't be dug | an automated fix that removes the access it was meant to restore |
| Gone after drops at night | a true fact made a side issue look urgent | the standing fact removed | an alert that is correct and still pulls attention from the work that matters |
| Waiting out a monster at the door | the safety rule had no exception for the case it guarded against | a fit agent may go out to a lone one | a lock-out rule that also locks out the people who could fix the problem |
| Losses with nothing left to fix | the failures were the model's own judgement | a stronger model on the same harness | a pilot that has reached its tooling limit: try the stronger model before more tuning |

Left alone, as the agents' own behaviour: hunting at dusk, carrying the team's only pickaxes far from home, passing
them around, waiting a monster out, filling the home with furniture until a third bed won't fit (tsol3: refused for
want of room, rightly; the team took turns in two beds and met the goal).

## Per-set numbers

| Set | Model | Code | Runs | Met the goal | Median game time of wins | Cost |
|---|---|---|---|---|---|---|
| D | GPT-6 Luna | 651817b | 10 | 6 | 31 min | US$1.43 |
| E | GPT-6 Luna | e2a0b25 | 6 | 2 | 41 min | US$1.09 |
| F | GPT-6 Luna | 4fabf64 | 6 | 2 | 45 min | US$1.11 |
| H | GPT-6 Luna | 2f1c753 | 10 | 7 | 37 min | US$1.33 |
| I | GPT-6 Luna | 00697eb | 10 | 4 | 28 min | US$1.30 |
| J | GPT-6 Luna | 7d113eb | 10 | 4 | 42 min | US$1.52 |
| Sol, list on | GPT-6.1 Sol | 077e0f4 | 10 | 10 | 33 min | US$10.83 |
| Sol, list off | GPT-6.1 Sol | 077e0f4 | 10 | 10 | 30 min | US$10.02 |

Per run, all of sets H–J against the Sol sets: deaths 4.4 against 3.2 (list on) and 3.7 (list off); decisions 303
against 203 and 185; asks and tells between agents 37 against 9 and 14. Luna's losses ran to the time limit, so against
its wins alone (2.7 deaths, 215 decisions) Sol died a little more and decided about as much. Costs are the reports' estimates at the provider's rates,
which matched the bill on these days. 20 of 20 puts Sol's rate at 84% or more with 95% confidence (Wilson); 15 of 30
puts Luna's at 33–67%.
