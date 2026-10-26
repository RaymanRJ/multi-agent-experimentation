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

## What this teaches about building agents

Agents trust what they are told, answer requests but not needs, and interrupt each other; fixing tools and information moved the same team from one or two parts of the goal to three.

- **They trust the summary:** a home reported "closed" with a monster inside, a health rounded to 0, a progress list over their own last action ([observations](../../lessons.md#observations-and-context)).
- **Requests, not needs:** 31 of 35 hand-overs followed a request; design needs into explicit requests ([shared state](../../lessons.md#shared-state-between-agents)).
- **Shared state is distributed state:** one rule for everyone, published on a clock, or agents disagree and act twice ([shared state](../../lessons.md#shared-state-between-agents)).
- **Messages cost:** teammates' messages broke off work nearly as often as threats; questions worked, orders didn't ([shared state](../../lessons.md#shared-state-between-agents)).
- **The improvement loop**, with every fix beside the same problem in real systems, is [at the end](#how-this-testbed-gets-better-from-where-the-agents-get-stuck) ([improvement loop](../../lessons.md#the-improvement-loop)).

## In short

- **They answer requests, not needs** (the clearest finding; next section). An agent handed
  something over when a teammate asked for it, and almost never otherwise: in 31 of 35 handovers
  across six reps. A teammate's need was
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

Across all six reps (tbase1–4), **an agent handed something over when a teammate asked for it,
and almost never because it saw the need, even a need the game had told it about.**

Every handover, read by hand with the giver's reasoning and the receiver's last words:

| | tbase1–3 | tbase4 |
|---|---|---|
| Handovers | 29 | 6 |
| …after a request, or a plain "I still need an iron pick" said to the holder | 26 | 5 |
| …the giver's own idea | 3: coal for the cook, logs for the builder, an iron ingot for the iron-maker | 1: Luna gave Sonnet a pickaxe, "Sonnet may have lost their iron pick" |
| Times an agent was told it had no bed while a teammate carried a spare | 5 pairs; 3 handed over, every one after asking | none (one bed made all rep) |
| Times one agent held two or more iron pickaxes while a teammate held none | 7; 2 handed over, both after a request | 4; 4 handed over, each after repeated requests |

A bed is a spare when the holder carried two, or had already slept. In two more cases, both in
tbase2, the holder's only bed was its own. The team reports' own count of this ("Asked for, or only
needed") matches item names in messages, so it also counts status updates. It is a rough guide; the
numbers above come from reading the reasons.

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
logs; `src/agents/src/goalWork.ts`):

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

## A fourth rep, with what the earlier reps taught (tbase4)

*One rep, 21 October, on cb27f91, same models and
settings, capped at $2 per agent to fit the credit left; $3.56. New since tbase3: beds shown in the
observation with how many are in use, furniture counted apart, `place_bed`, `look_in_chest`, and
sleepers staying in bed until the night passes or a teammate speaks to them.*
Report: [tbase4](../batch-reports/2026-10-21-1638-tbase4.md).

| Part | tbase4 |
|---|---|
| Shared home built | **yes** (Luna, first five minutes) |
| Everyone slept there | 1 of 3 |
| Everyone holds an iron pickaxe | **yes, 3 of 3**: the first time in any rep |
| Food left in store | **yes** (24) |

**The most complete team so far, and how it got there.**
- **Iron:** Sonnet took it this time, and handed each pickaxe over as it was made, not all three
  at the end. Each went to a teammate who had asked for one again and again.
  - Four times one agent held a spare while another had none, and all four were handed over.
  - In tbase2 and tbase3 Opus had carried all three and died with them.
- **Food:** reached 24, more than twice the goal. Agents looked in the chest 11 times
  (`look_in_chest`), and none took food out to find out what was in it.
- **The tools added after tbase3 did their job, once:** Sonnet made a bed on day 3, put it down in
  the shared home with `place_bed` and gave its spare wool to Opus, "crafting beds". Luna, who had
  none, then slept in it for 283 seconds, longer than the old 90-second limit allowed.

**What still stopped them: one bed all rep, and why.**
- **A spawn trap at the door.** Opus and Sonnet had no beds, so each time they died they came back
  at the world's spawn point, four blocks from the home's doorway.
  - On the first night zombies gathered there. The agents respawned beside them, tried to get in or
    run, and died again: 11 deaths in about three minutes of game time.
  - At dawn the zombies stayed, shaded by the dark oak canopy, and killed Luna four times.
  - When one finally got inside, Luna was told "but a zombie is inside with you", as it now should
    be.
- **What it cost:** the deaths cost the team eight lots of wool, and wool was the only way to beds.
- **Whose it was:** the game's, and where the team chose to build: the home went up on the spawn
  point, which is where an agent without a bed comes back. Nothing in our code decided it, and
  nothing tells a player where the world's spawn point is either.

**Smaller things.**
- **The cap:** Opus reached its $2 cap about a minute of game time before the end; its pickaxe
  still counted.
- **A misleading message:** Luna then asked after Opus and was told "there is no other agent called
  "opus" in this world". It now says the agent isn't in the world right now (unit-tested only).
- **Interruptions:** messages cut into teammates' work 17 times, the fewest of any rep (22–34
  before).

## Three of one model (tluna1)

*Three GPT-6 Luna agents together, three reps, 21 October, on d307279, same goal and settings;
$0.91 in all (capped at $0.40 an agent). The only earlier team of three Lunas is the proof run bpoc2:
one rep on older code. Not comparable with the mixed teams (tbase1–4): which model takes which job
changes the game.*
Report: [tluna1](../batch-reports/2026-10-21-1801-tluna1.md).

| Part | bpoc2 (1 rep, older code) | Rep 1 | Rep 2 | Rep 3 |
|---|---|---|---|---|
| Shared home built | yes | **yes** | **yes** | **yes** |
| Everyone slept there | **3 of 3** | 1 of 3 | 0 of 3 | 0 of 3 |
| Everyone holds an iron pickaxe | 2 of 3 | 0 | 0 | 0 |
| Food left in store | 7 | 0 | 9 | **10** |
| Deaths | 18 | 42 | 16 | 9 |

A team of Lunas did worse than the mixed teams, and worse than its one earlier rep. One earlier
rep can't say the code made them worse: where the home went and where the sheep were moved these
results more than anything we changed.

**The same organisation.**
- **Roles:** one Luna (lc) built the home in every rep, as Luna did in the mixed teams.
- **Iron:** in reps 2 and 3 another (la) took iron, and made three iron pickaxes both times (day 1
  13:41 and day 2 4:01), as early as any mixed team.

**Iron was made, then lost, twice.**
- **Rep 2: lost to two of our messages and a fall.**
  - la carried the pickaxes to the home "keeping one for myself" and tossed two to lc. lc had
    walked off; `give` told everyone they were "on the ground beside" lc.
  - lc tried to pick them up five times and was told each time there were none within 8 blocks.
  - The third Luna, lb, had walked over them on its way to the chest. `take` reported "took 2
    iron_pickaxe… the chest holds 9", so lb thought they came from the chest.
  - lb fell to its death nine decisions later, with both.
  - Both messages are fixed (below).
- **Rep 3: all three in one pack, again.** la died ("suffocated in a wall") on its way to the home
  with all three: the same thing that happened to Opus in tbase2 and tbase3.

**Beds were hardly tried.** Three beds were made and three sleeps tried in three reps.
- **Sheep:** "no sheep within 32 blocks" came back 20 times.
- **Deaths:** wool or beds were lost at deaths 19 times.
- **In bpoc2,** by contrast, all three Lunas slept in the home.

**Getting back to work after a death was harder for them.**
- **Back at work:** after a death, a Luna was back at work on the goal 42 times in 66, against
  27 of 27 in tbase4.
- **Running:** they ran from 71 of 117 threats, against taking shelter.
- **Rep 1, the spawn trap again:** the home went up on the world spawn point. 28 of the 42 deaths
  were beside it, 14 of them in daylight under the dark oak canopy.
- **Reps 2 and 3:** the homes were built elsewhere, with 16 and 9 deaths, almost none at the home.

**Repeating themselves.**
- **Looking for a chest that wasn't there:** in rep 3 lc looked in a "shared shelter chest" ten
  times. Its own observation showed no chest, and each time it was told there was none within 32
  blocks.
- **Time to nothing:** in rep 1 a third of the team's time came to nothing.

**Requests and needs.**
- **Handovers:** 6 in three reps.
- **Spare pickaxes:** three times one Luna held two or more iron pickaxes while another had none,
  and none was handed over: la tried in rep 2 (above), and died in rep 3.

## Three of one model, told what's left (tlunap1)

*Three GPT-6 Luna agents, three reps, 23 October, on 5d8b958, same goal and settings as tluna1 but
with `--progress on`: every observation lists what the goal still lacks ("lb carries no
iron_pickaxe", "the chests the team has opened hold 8 cooked meat, not 10"). $0.95 in all (capped
at $0.40 an agent). Compares with tluna1 on one condition, loosely: since tluna1 the `give`/`take`
messages from its own logs and `mine_stone`'s tool were fixed, and where the home goes still moves
the result more than anything else.*
Report: [tlunap1](../batch-reports/2026-10-23-2139-tlunap1.md).

| Part | tluna1 rep 1 | rep 2 | rep 3 | tlunap1 rep 1 | rep 2 | rep 3 |
|---|---|---|---|---|---|---|
| Shared home built | **yes** | **yes** | **yes** | **yes** | **yes** | **yes** |
| Everyone slept there | 1 of 3 | 0 of 3 | 0 of 3 | 1 of 3 | 0 of 3 | 1 of 3 |
| Everyone holds an iron pickaxe | 0 | 0 | 0 | 0 | 0 | 0 |
| Food left in store | 0 | 9 | **10** | **10** | **10** | **10** |
| Deaths | 42 | 16 | 9 | 14 | 61 | 11 |
| Time that came to nothing | 34% | 19% | 17% | 15% | 21% | 17% |

**A gap they could see, they closed, and kept closed.**
- **Food:** 10 cooked meat were in store on the first day of every rep, and still there at the end;
  without the list, one rep in three ended with it.
- **Kept closed:** in rep 3 la took meat out of the store to eat, and the list showed 8. lb
  read it and went back to work: "The team chest is short by two cooked meat, and two pigs are
  nearby", then hunted, cooked and stored exactly two ("adding my 2 cooked porkchops reaches the
  10-meat requirement"). Nobody had to ask.
- **Citing it:** about one decision in ten (148 of 1,437) cited what was still needed. Most
  were in rep 3, where lb and lc quoted it 44 and 42 times.

**A list is only as good as what feeds it, and they trusted it over what they had just done.**
- **Two homes, two lists:**
  - Rep 3 had two large bases, lb's first and lc's later. Each agent's list named the base it
    knew of first, so lc was told for 118 decisions that the home was its own: "The team goal
    specifically requires everyone to sleep in the large shelter at -38,81,41."
  - la and lb's lists named the other base. The one bed made in that rep was slept in at lc's,
    because lc told lb "Live tracker confirms the required shelter is here".
  - Rep 1 had the same split for lb, from its own second base.
- **A stale entry:**
  - In rep 2 la made three iron pickaxes on day 3, gave one to lc, and gave lb one.
  - Sixteen seconds later its list still said "lb carries no iron_pickaxe", because lb's holdings
    reached the team only between lb's own steps. la gave lb its last pickaxe: "lb is the only
    teammate still missing an iron pickaxe".
  - la then asked lc for its spare, and was told there was none.
- Both were our code, and are fixed (below). What is the agents': each believed the summary over
  its own last action, the same as tbase1's agents believing a "closed" home with a monster in it.

**Iron and beds didn't move.**
- **Iron:**
  - Rep 2's three pickaxes were all lost in deaths at night: two at the home (one at its doorway,
    one inside), the rest out working.
  - In rep 3 la ended the run underground with seven iron ingots and one plank: not enough sticks
    for even one pickaxe, and no pickaxe left to dig out with. It told everyone so ("I have 7 iron
    ingots and one plank underground … I'll need 2 more ingots and sticks from the team"), but asked
    no one. lc ended holding three sticks. Between them they had a pickaxe: a need said aloud went
    unanswered, as in every team run before.
  - The list said "carries no iron_pickaxe" for every member the whole time. Seeing the gap was
    not the problem.
- **Beds:**
  - Two beds were made in three reps, as sheep stayed scarce ("no sheep within 32 blocks" 11 times).
  - Sleeping failed 17 times in 20, mostly for no bed or every bed taken.

**One home became a trap (rep 2).**
- **The numbers:** 61 deaths, 23 of them within six blocks of the home, 20 at night, 5 inside it.
- **The loop:**
  - The home stood about 20 blocks from where agents come back after dying, and by the second
    night it had holes in its walls.
  - lb came back, chose to go in (six times that night: "Get inside the nearby large two-storey
    shelter and out of immediate danger"), met the zombies and spiders at the doorway, was hit
    down to 5 health, fled, and died.
  - Reps 1 and 3 had 14 and 11 deaths, almost none at their homes.
- **Like tluna1's rep 1,** where the home stood on the spawn point: where the home goes decides
  more than anything the team does after.

**Where our code, not the agents, decided the outcome:**
- `flee` ran on after the agent died and reported success: 39 of the 86 deaths came during a flee
  that then said it had worked, and the next decision read "flee success" beside "you died". Fixed: a death ends any skill as "you died"
  (checked live, in a flee and in gather_wood).
- The progress list named different homes to different teammates (above). Fixed: every teammate is
  told of the same base, the one finished first when nobody has slept in one (unit-tested; the
  team file carries when each was finished, checked live).
- The list lagged a teammate's holdings by a whole step (above). Fixed: each agent tells the team
  what it holds every 2 seconds (checked live: 2 s after a give, mid-skill).
- `smelt` said "the run is ending" when an interrupt stopped its furnace craft mid-run. Not fixed.

## How this testbed gets better: from where the agents get stuck

The structure around the agents improves by one loop, run after every batch:
1. **Run** the agents on a goal, with nothing in their prompt about how to reach it.
2. **Read the logs where they got stuck,** putting three things side by side: what the agent was
   told, what it reasoned (its own words), and what really happened in the world.
3. **Sort each stuck point.** Our tool failed or misled it; it lacked information a person in its
   place would have; or it was its own judgement.
4. **Change only the first two:** fix the tool, or give the missing information, and check the fix
   in the game. Its judgement is left alone and reported, because that is what is being measured.
5. **Run again,** and see whether the agents get further.

Each change in this write-up came from that loop. Each is the kind of thing that also trips AI agents
working on real systems, such as support desks, IT operations and business tools:

| Where an agent got stuck | What was wrong | What changed | The same thing in a real system |
|---|---|---|---|
| Gave up on iron beside it as "out of reach" (44 times) | A tool refused a possible action, with a reason that sounded final | It digs to the ore | A tool that returns "not permitted" or "not found" when the action was possible; the agent plans around a problem that isn't there |
| Asked for 1 cooked meat, got all 10, emptied the team's store | A tool did more than it was asked | It takes exactly the count | A bulk side effect: asked to update one record, the call updates all of them |
| Waited beside a zombie because its home was "closed" | A computed status contradicted the evidence, and the agent believed the status | The status checks for a mob inside, and says so | A dashboard showing green while the raw signals say otherwise; agents, like people, trust the summary |
| Reasoned for 26 decisions from "health 0" | A number rounded away the one fact that mattered | Under half a point shows as 0.4 | Rounding or formatting that hides an edge case: a balance of 0.4 shown as 0 |
| Took meat out of the store just to see what was in it | No way to look without changing anything | `look_in_chest`, which moves nothing | No read-only view, so an agent learns the state of something by changing it |
| Planned to "place beds" for the team; one bed sat unused in its pack | The plan needed an action no tool offered, and nothing said so | `place_bed` | A tool-coverage gap: the agent's plan includes a step it has no way to do, and it fails silently |
| Didn't see the team's chest while standing beside it; no one saw how many beds were down | A cap on what the observation listed dropped the important items; beds weren't listed at all | Furniture gets its own count; beds are shown, with how many are in use | Context truncated by a fixed limit, so the record that mattered is the one cut off |
| Smelting failed 42 times with "destination full" | A low-level error the agent couldn't act on | Fuel goes in one kind at a time | An error message from deep in a library, passed up unexplained |
| Stuck on the treetops on the way home, six times | A situation the movement code had no way out of | Climb down through the leaves if health allows; say why if not | An automation with no recovery path for an unusual state |
| Sleepers kept missing each other by seconds | A timeout made the coordination window too short | Stay in bed until the night passes or a teammate speaks | Timeouts that make a handshake between agents (or services) all but impossible |
| Told the team two pickaxes lay "beside" a teammate who had walked off; lc searched five times | A message assumed where things were instead of checking | It says where the item lies and how far the receiver is from it now | A status that reports the expected state ("delivered to the user") instead of the observed one |
| Reported two pickaxes picked up off the ground as "taken from the chest" | A result counted everything gained as the action's doing | Only what left the chest is "taken"; the rest is "picked up on the way" | An action's report that claims credit for side effects, so the next decision rests on a false account of where things came from |
| Told a teammate "doesn't exist" after it had left | A message stated a permanent fact from a passing state | "isn't in the world right now (it may have left)" | An error saying a user or service doesn't exist when it is only offline, so the agent gives up on it for good |
| Read "flee success" beside "you died" (39 deaths) | A long-running action kept going after the thing it acted for was gone, then reported on what it found | A death ends the action, reported as "you died" | A job that loses its session mid-run, carries on against a fresh one, and reports success |
| Two teammates told to sleep in two different homes | A shared status computed separately per agent, with a tie broken by each one's own view | One rule for everyone: most slept in, then first finished | Each instance of a service computing "the primary" for itself, so they disagree when it matters |
| Gave a teammate a second, last pickaxe on "lb carries no iron_pickaxe", 16 s after the first | A shared view refreshed only when each member finished its own work | Each agent reports what it holds every 2 seconds | A cache or replica serving stale state right after a write, so the next action is taken twice |

**What we left alone, and why** (besides the game itself, such as tbase4's spawn trap):
- **The agents' own behaviour:**
  - they answer requests, not needs;
  - one agent carried every pickaxe;
  - status chatter drowned out requests.
- **Why:** a prompt could coach these away, but then the result would show the coaching, not
  the agents.
- **The real-world parallel:** this is team process. In organisations it is handled by how work is
  routed: explicit requests and tickets, and a shared view of what's still open. Those are things we
  can test here as separate conditions (`--progress on`, quieter messages), not as defaults.

**The lesson for real deployments:** when an AI agent fails, look first at what it was told and what
its tools did, then at its judgement. In these runs most of the early failures were ours:
- tools that misled it;
- information it couldn't see;
- actions it had no tool for.

Fixing those moved the agents further than any change to the prompt would have, and left their own
behaviour visible to study.

## What this suggests (not acted on)

- **Run it again on the fixed code.** Done once each in tbase2 and tbase3 (above): iron and food
  moved, and what stopped the teams became their own behaviour and the three-day limit.
- **Let them put a bed down.** A player can place a bed anywhere; our agents can only by sleeping
  in it, which in tbase3 left a spare in a pack while a teammate had none (above). A tool, so it
  fits the rules.
- **Let them look in a chest.** Done after tbase3: `look_in_chest` shows what the chests nearby
  hold without moving anything, as a player sees by opening one. Checked live.
- **Then tell them what's left.** `--progress on` lists the goal's open parts in every observation.
  Done once (tlunap1, above): a team of Lunas closed and kept closed the gap it could act on
  (food), and trusted the list over its own last action. Iron and beds didn't move. Next: the same
  on the fixed list, and with the mixed team.
- **How agents hear each other.** Teammates interrupted each other nearly as often as threats did.
  Whether a message should wait for the agent's next decision is a design choice about
  coordination. It would change what is being compared, so it isn't changed here.
