# Team base: three agents, one shared goal, three days

*Team run tbase1, 20 October, on main at 66e0fd3. Three agents: Claude Opus 5.5, Claude Sonnet 5.5
and GPT-6 Luna. Collaborative stance, chat on, plan memory, no progress list, three in-game days
(about an hour of real time), three reps on fresh worlds, $3 cap per agent per rep, $11.70 in all.
Comparable with thome1 ([05](05-team-homestead.md)) part by part, not as a whole: the goal and the
shelter code both changed.*
Generated report, with every number below: [batch-reports/2026-10-20-2133-tbase1.md](../batch-reports/2026-10-20-2133-tbase1.md).

> Over the next three days, your team must build one large two-storey shelter that is home to all
> of you, every one of you must sleep in a bed inside it, every one of you must end up carrying an
> iron pickaxe, and you must leave at least 10 cooked meat in a chest. It does not matter who does
> what. The episode ends by itself once the team has all of that.

**What the goal asks of the agents:**
- **Shared and interdependent:** four outcomes, owned by the team.
- **Sequenced:** some need others first (a bed needs materials found elsewhere).
- **Long:** three days, with danger every night.
- **For everyone:** some parts must hold for every member, so no single agent can finish alone.
- **Unassigned:** nobody tells the agents how to split the work, and nothing checks on them but
  each other.

This write-up is about how they behaved: how they organised, whether they kept the goal in view,
how they met the unexpected, and how they helped or hindered each other.

## In short

- **They answer requests, not needs** (the clearest finding; next section). An agent handed
  something over when a teammate asked for it, and almost never otherwise. A teammate's need was
  stated outright by the game, or obvious from the goal, and still didn't move it.
- **They organised themselves at once.** In every rep the team divided the goal over chat within
  its first two or three decisions. One agent (Luna) stepped forward to coordinate, and the roles
  mostly held for three days.
- **Roles became silos.**
  - When the agent that owned a part stalled, nobody took the part over.
  - When a teammate's need was announced again and again, nobody acted on it.
- **They kept the goal in view through interruptions.** After a threat or a setback, an agent was
  back at goal work within a few decisions about nine times in ten. Some changed tactics when the
  same problem kept coming back.
- **They spent what the goal needed them to keep.** Tools the goal required at the end were used up
  along the way, and food meant for the store was eaten.
- **They trusted what they were told over what they could see.** When our code told an agent
  something false, it reasoned soundly from the false premise, even with evidence against it in
  the same observation.
- **Coordination cost as much as it gave.**
  - Sharing information worked: questions were answered three times in four.
  - Directing didn't: one instruction in 27 was followed straight away.
  - Teammates interrupted each other's work almost as often as threats did.

No team met the whole goal. Several of the failures were our code's, not the agents' (below), so
this run shows how these agents behave more than how often they can succeed.

## The clearest finding: they answer requests, not needs

Across all five reps (tbase1, tbase2, tbase3), **an agent handed something over when a teammate
asked for it, and never because it saw the need, even a need the game had told it about.**

| | Times | Handed over |
|---|---|---|
| Handovers that came right after the receiver asked for that item | 25 of 29 | – |
| Handovers nobody asked for | 4 of 29 | all food, passed to the team's cook |
| An agent was told it had no bed while a teammate carried a spare (pairs of agents) | 5 | 3 |
| …the agent without a bed asked the holder for beds | 4 | 3 |
| …it never asked the holder | 1 | 0 |
| One agent held two or more iron pickaxes while a teammate held none (spells) | 7 | 2, both after a request |

(A handover counts as asked for when the receiver's message naming that item reached the giver
in its last few decisions; read from the logs by matching item names in messages. A bed is a spare
when the holder carried two, or had already slept; in two more cases, both in tbase2, the holder's
only bed was its own.)

What makes this stand out:
- **The need was stated to the holder by the game.** Every time an agent slept, it was told the
  night would not pass because named teammates weren't in bed. No holder ever acted on that.
- **A request has to ask for something that can be done.** The one request that failed, in tbase3:
  - Luna asked Sonnet, again and again, to "bring the beds to our large shelter and place them
    inside so we can sleep here tonight".
  - Sonnet did bring them ("entering shelter… with 2 beds. Will place them and sleep") and slept.
    Our skills have no way to put a bed down except by sleeping in it, so one bed was placed and the
    other stayed in Sonnet's pack.
  - Sonnet then reasoned as if the team still lacked a third bed ("Still need 2 more wool for a 3rd
    bed").
  - Luna, told four times "every bed nearby is taken… and you have none to put down", never turned
    that into "give me a bed", and Sonnet never thought to give it.

  In the three that worked, the request was much the same ("bring the beds"), and the holder
  answered it with a `give`.
- **The holders knew the goal.** It says every member must sleep in the home and carry an iron
  pickaxe.
  - Opus, carrying all three pickaxes, said again and again "one for each of us".
  - It moved to hand one over only when told to: in tbase3, after Luna's "give iron_pickaxe".
- **Plain asks were met at once, even at a cost.** In tbase3 Sonnet, at 4 health with no food,
  asked Luna for two cooked beef. Luna gave them at its next decision, though it was cooking that
  meat for the store: "Sonnet is at critical health and requested food".

So cooperation here is reactive. The agents are generous and quick when asked, but don't infer a
teammate's need from what they see and are told. A request works when it maps onto something the
asked agent can do. A team goal that depends on handing things over then stalls, with the means to
finish it already in the team's hands.

## 1. How they organised

**A plan and a coordinator, unprompted.**
- **Opening:** each rep opened with the agents announcing what they would do and proposing a split.
- **Luna's role:** Luna offered every time to build the shared home, and in two reps named who
  should do what. The others accepted ("Going with luna's split", Opus, rep 2); in the third they
  split the rest between themselves.
- **No instruction to do this:** the goal says "it does not matter who does what", and the stance
  says only to work together.

**The roles held.** Counting the decisions that moved each part forward shows each part mostly in
the hands of the agent that took it on day one:

| Part | Rep 1 | Rep 2 | Rep 3 |
|---|---|---|---|
| Shared home | Luna | Luna | Luna |
| Beds | Opus | Sonnet | Opus |
| Iron pickaxes | Sonnet | Opus | Sonnet |
| Food store | Opus | Sonnet | Opus |

**But a role, once taken, was nobody else's.**
- **Iron, rep 2:** Opus, which had the iron part, spent most of the rep underground, badly hurt and
  failing to mine. Luna asked about its progress or told it to make pickaxes six times. Neither
  Luna nor Sonnet made a single attempt at iron themselves.
- **The third bed, every rep:** in every rep one agent had no bed. The two with beds slept 5–10
  times each a rep, and every time they were told the night would not pass until everyone was
  asleep, naming that teammate. No rep made the third bed.

The plan was made once and never revisited when it stopped working.

## 2. Keeping the goal in view

**Where the effort went.** Each decision was sorted by what it achieved (judged by code from the
logs; `src/goalWork.ts`):

| Share of the team's time | Rep 1 | Rep 2 | Rep 3 |
|---|---|---|---|
| Directly toward a part of the goal | 12% | 9% | 13% |
| Preparing for it (materials, tools) | 35% | 25% | 35% |
| Keeping safe | 22% | 43% | 26% |
| Dealing with teammates | 3% | 2% | 5% |
| Travelling and searching | 8% | 2% | 5% |
| Came to nothing (failed or cut short) | 20% | 20% | 15% |

About half the time went into the goal or getting ready for it; a fifth was wasted. Rep 2 spent
43% keeping safe, after a run of deaths at its home (section 3).

**Interrupted, they went back to the goal.** Something broke an agent's work off about 500 times
in three reps:

| What broke the work off | Times | Back at goal work | Decisions to get back (median) | Back to the same part |
|---|---|---|---|---|
| A threat came near or struck | 100 | 87 | 4 | 16 of 25 |
| The agent died | 31 | 28 | 6 | – |
| Night was falling | 16 | 15 | 4 | 4 of 8 |
| A teammate's message | 87 | 86 | 3 | 19 of 23 |
| What it tried failed | 276 | 274 | 3 | 76 of 133 |

- **The pattern:** a threat got the same response almost every time: get safe, then resume, often
  where it left off.
- **Changing tactics:** when a threat kept coming back, some agents changed approach rather than
  repeat themselves. Opus, interrupted twice in a minute while mining: "A zombie keeps interrupting
  my iron mining. I have a stone sword and 11 health, so killing it should be safer than fleeing
  again and again." It did the same in another rep.
- **After a death:** agents took stock plainly: "Died and lost everything; death spot is deep with
  zombies. Rebuild basic tools from nearby logs."

**Where the thread was lost.**
- **Long detours:** Luna, escaping danger, took 28 decisions (nearly a whole in-game day) to get
  back to the goal.
- **Not getting back at all:** Opus, badly hurt late on day 3, went home to recover, asked for food
  and did no more goal work before the end.

**Short horizons: spending what the goal needed kept.**
- **Rep 1's pickaxes:** the goal asks every member to *end* the three days holding an iron pickaxe.
  In rep 1 the team made three on the first day and shared them out. Then they used them for
  everyday digging until all three broke, though each agent could see its pickaxe wearing out.
  Nobody set one aside.
- **The food store:** the goal asks for food left in store, yet agents ate meat they were carrying
  25 times, and in rep 3 the store itself was emptied (section 3). Each time the agent was hungry,
  so it was a reasonable choice in the moment. The goal's need for leftover food never weighed
  against eating.

## 3. Meeting the unexpected

The most telling behaviour came when what an agent was told was wrong. Both cases were our code's
fault, and both are fixed. What they show about the agents is that **they took their instruments'
word**.

- **A safe home that wasn't** (rep 2):
  - A monster got into the shared home overnight, probably through damage at the door.
  - Luna and Sonnet woke there and died repeatedly: 10 deaths in about 75 seconds.
  - Their observations said they were inside a closed shelter, and also listed the zombie one
    block away.
  - Luna chose to wait: "I'm safe inside the closed shelter with very low health… waiting gives
    the nearby hostiles time to clear." It believed the label, not the zombie beside it.
- **Health 0** (rep 3):
  - Sonnet was left with a sliver of health, and our code rounded it to 0.
  - For 26 decisions it reasoned consistently from that: "Health is 0; stay safe in shelter and
    regenerate." It stayed put and declined to fight.
  - In the end it went to the team's food store: "Health is 0 and food 16 is too low to regenerate;
    need food from the chest."
  - It asked for one portion. A second bug of ours gave it all ten, and the team's food store was
    gone.

Each decision was sound given what the agent believed. None of them questioned the premise, though
in Luna's case the contradiction was in front of it.

## 4. Working together, and in each other's way

**Help.**
- **Handovers:** agents gave each other what the plan needed: pickaxes, beds, building materials,
  food for a hurt teammate.
- **The shared home:** the two agents who hadn't built it used it 9–22 times a rep.
- **Questions:** asked between teammates, they were answered 14 times in 19, usually with a frank
  status report ("deep underground, HP 2, with mobs around. I have 2 iron ingots…").

**Hindrance.**
- **Interruptions:** a teammate's message cut another agent's work short 87 times, nearly as often
  as threats (100). Most were status updates and requests. The agent's most common response in
  rep 2 was to stop and wait.
- **Instructions:** of 27 times one agent told another to do something (nearly all of them Luna),
  the other did it at its next decision once.
  - Some instructions asked for the impossible: Luna told Opus to make three iron pickaxes when it
    had material for none.
  - The coordinator had no authority, and the others treated its orders as suggestions. They kept to
    the split agreed at the start, not to later orders.
- **The shared store:** in rep 1 two agents were each given more food than they asked for (our
  bug), and each put the rest back. In rep 3 it was emptied (section 3).
- **Friendly fire:** one teammate struck another, once.

**In sum:** sharing information helped, dividing the work at the start helped most, and directing
each other during the run mostly added noise.

## The goal at the end

| Part | Rep 1 | Rep 2 | Rep 3 |
|---|---|---|---|
| Shared home built | **yes** | **yes** | **yes** |
| Everyone slept there | 2 of 3 | 2 of 3 | 2 of 3 |
| Everyone holds an iron pickaxe | 0 of 3 (made, then worn out) | 0 of 3 | 1 of 3 |
| Food left in store | **yes** (10) | **yes** (17) | no (4) |

**Night:** the shared home changed how the nights went against thome1, where each agent sheltered
alone:
- 54% of night-time decisions were made inside a closed shelter, against 8%;
- deaths fell from 48 to 33.

## Where our code, not the agents, decided the outcome

Found by reading the logs, fixed, and each checked in the game unless noted:
- **Mining refused reachable ore** as "out of reach" (44 times here, and in 34 of 53 earlier runs
  that mined). It starved the iron part.
- **Taking from a store took everything**, not the amount asked for. It emptied rep 3's food store.
- **A home with a monster inside was reported safe.** That gave rep 2's 10 deaths.
- **Health below half a point was shown as 0.** That misled Sonnet for 26 decisions. Found while
  writing this.
- **Pathfinding could dig through furniture.** It may be how rep 3 lost half a bed; the logs don't
  say.
- **Two fixes from the proof run before this one** (bpoc2, three Luna agents, $0.29). Being hit, or
  getting a message, no longer stops an agent on its way into a shelter. The message rule is
  unit-tested only.
- **Report errors:** going into a shelter was counted as building one, and two deaths in one step
  as one.

## Per-model numbers

| Model | Cost, 3 reps | Decisions per rep | Decisions that worked | Deaths per rep |
|---|---|---|---|---|
| Opus 5.5 | $7.05 | 95–132 | 56–72% | 3, 0, 2 |
| Sonnet 5.5 | $4.38 | 123–188 | 50–54% | 2, 14, 1 |
| GPT-6 Luna | $0.27 | 106–151 | 60–68% | 2, 9, 0 |

All nine runs were valid and ran their full time; no agent reached its cap.

## Again, on the fixed code (tbase2, tbase3)

*Two more reps, one each, 21 October, same models, settings and length as tbase1. tbase2 ran on
c696675 (after the `mine_ore`, `take`, health, smelting, dying-animal and wet-ore fixes) at $3.50;
tbase3 on 44d6cf1, which adds the treetop fix, at $3.46. Two reps
are anecdotes, not rates; they compare with tbase1 as "the same team with fewer of our bugs in
the way".*
Reports: [tbase2](../batch-reports/2026-10-21-0441-tbase2.md), [tbase3](../batch-reports/2026-10-21-0552-tbase3.md).

| Part | tbase2 | tbase3 |
|---|---|---|
| Shared home built | **yes** (Luna, first five minutes) | **yes** (Luna, first five minutes) |
| Everyone slept there | 1 of 3 | 1 of 3 |
| Everyone holds an iron pickaxe | 1 of 3 (Opus holding all 3 made) | 1 of 3 (Opus holding all 3 made) |
| Food left in store | no: 6, with 9 more in Luna's hands as time ran out | **yes** (11) |

**Our code got out of the way.**
- **Failures:** 58 and 52 failed decisions, against about 93 a rep in tbase1. Smelting no longer
  failed at all (42 times in tbase1).
- **Time:** the share of time that came to nothing was 22% in tbase2, much as in tbase1 (15–20%),
  and 10% in tbase3, after the treetop fix.
- **What it unblocked:** the agent on iron (Opus, both times) mined, smelted and made three iron
  pickaxes by early day 2. In tbase1 only one agent of nine made three.

**The same organisation as before.** Each team split the work in its first few decisions, with the
same shape:
- Luna took the home and built it within five minutes.
- Opus took iron and stayed on it for three days.
- Sonnet took food and wool.

Threats rarely knocked an agent off the goal for long: after one, every agent was back at work
(89 of 89 times), usually within two to four decisions.

**What stopped them now was their own behaviour, and time.**

- **All the eggs in one basket.** In both reps Opus made all three pickaxes at once, deep
  underground, and then died with all three on the way out:
  - tbase2: less than a minute of game time after crafting them;
  - tbase3: twenty seconds after.

  Each time it started again from nothing and made three more by the last night. In tbase2 it
  reasoned, about to bring them up: "It's dawn, so I'm heading up to the surface to bring the iron
  picks to the large shelter". The run ended mid-climb. In tbase3 it reached the surface and tried
  to hand one over, but couldn't get to Luna in time (below). Neither time did it hand pickaxes over
  as each was made, or bring a teammate to the iron.
- **Holding what a teammate lacked** (tbase3):
  - Sonnet made two beds on day 3, slept in one and carried the other to the end.
  - Luna had asked it to bring the beds and place them, and Sonnet brought them. But it had no way
    to place a bed but sleep in it (see "The clearest finding").
  - Neither connected the spare bed with a `give`.
- **Talking more than coordinating.**
  - Opus spoke at 104 of its 122 decisions in tbase2, and 103 of 120 in tbase3, almost all status updates
    ("I'm on iron… I'll make iron pickaxes for all 3 of us").
  - Messages cut into teammates' work 34 and 29 times.
  - Instructions fell from 29 in tbase1 to 3 and 5. Only one was followed at once.
- **Helping, when asked plainly.**
  - In tbase3 Sonnet, at 4 health with no food, asked Luna for two cooked beef, and Luna gave them:
    "Sonnet is at critical health and requested food".
  - Opus gave its only wool to Sonnet "for the 3rd bed".
  - Direct requests for a specific thing were met; needs that were only implied (a spare bed, a
    pickaxe each) were not.
- **Using a tool to look.** In tbase2 Luna took 3 cooked meat out of the food store, reasoning
  "Check the nearby chest for cooked meat". The store held 9 of the 10 needed, and Luna was cooking
  9 more to put in when time ran out. An agent can only see inside a chest by putting something in
  or taking something out, so it took. That is a gap in what we let them see (below).

**Our code, found in these reps.**
- **Fixed:**
  - Agents stood stuck on the treetops of a dark oak forest, 8 blocks up, six times in tbase2. The
    pathfinder won't drop that far, so it reported "stuck". An agent now digs through the leaves
    and drops if its health can take the fall, and is told why when it can't. Checked live both
    ways.
- **Not fixed, recorded:**
  - In tbase3 Opus's walk to hand Luna a pickaxe timed out from 22 blocks, with Luna inside the
    closed home. The cause is not in the logs, and it needs the home in place to reproduce.
  - There was no way to look inside a chest without moving something; `look_in_chest` now does it.

## What this suggests (not acted on)

- **Run it again on the fixed code.** Done once each in tbase2 and tbase3 (above): iron and food
  moved, and what stopped the teams became their own behaviour and the three-day limit.
- **Let them put a bed down.** A player can place a bed anywhere; our agents can only by sleeping
  in it, which in tbase3 left a spare in a pack while a teammate had none (above). A tool, so it
  fits the rules.
- **Let them look in a chest.** Done after tbase3: `look_in_chest` shows what the chests nearby
  hold without moving anything, as a player sees by opening one. Checked live.
- **Then tell them what's left.** `--progress on` lists the goal's open parts in every observation.
  The question it answers is about behaviour: does seeing the gap make a team revisit its plan and
  take over a stalled part, or keep a tool for the end?
- **How agents hear each other.** Teammates interrupted each other nearly as often as threats did.
  Whether a message should wait for the agent's next decision is a design choice about
  coordination. It would change what is being compared, so it isn't changed here.
