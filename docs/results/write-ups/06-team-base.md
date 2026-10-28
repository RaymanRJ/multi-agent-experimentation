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
- **Memory shared is work saved:** once each agent's sightings reached its teammates, the team found sheep, made beds and everyone slept in its home ([shared state](../../lessons.md#shared-state-between-agents)).
- **Reflexes for the seconds the model can't act:** nine deaths came while a model was still deciding to run; a step-back in code holds health where standing still lost three-quarters of it ([control loop](../../lessons.md#the-control-loop)).
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

## A proof run on the doorway fix (bpoc3)

*Three GPT-6 Luna agents, one rep, 26 October, on 79af053: tlunap1's settings without the progress
list (as the mixed paid run will have), after two changes: a shelter's line in the observation names
the hostile mobs at its doorway, and going in stops short of them and says why. Also `smelt`'s
interrupt message. $0.34 (capped at $0.50 an agent). A proof run, so no published report; one rep, so
it compares with tlunap1 loosely.*

| Part | tlunap1 rep 1 | rep 2 | rep 3 | bpoc3 |
|---|---|---|---|---|
| Shared home built | **yes** | **yes** | **yes** | **yes** (day 1) |
| Everyone slept there | 1 of 3 | 0 of 3 | 1 of 3 | 0 of 3 |
| Everyone holds an iron pickaxe | 0 | 0 | 0 | 0 |
| Food left in store | **10** | **10** | **10** | 0 |
| Deaths | 14 | 61 | 11 | 17 |

**Told the doorway was crowded, they mostly stayed out.**
- 42 observations named mobs at a shelter's doorway. The agent chose to go in anyway 5 times, and
  the tool stopped short 7 times, three of them for a drowned at a shelter beside water.
- Their reasons show the line being read: "the nearest shelter has a skeleton at its doorway; flee to
  avoid being killed before regrouping"; "the shelter doorway is blocked by a spider and there is also
  a nearby creeper; avoid another fatal approach while asking lb to clear the entrance".
- A hit stopped the way in 2 times in 99 shelter calls (tlunap1: 32 in 179), and an agent died within
  two decisions of one 10 times in 99 (tlunap1: 38 in 179). One rep, so a direction, not a size.

**Every death undid work, and dying is what they spent their time avoiding.**
- **Beds:** wool was gathered three times, and each time lost in a death before a bed was made.
- **Iron:** la made the team's only iron pickaxe on day 3 and died with it five game-minutes later.
- **Food:** cooked meat moved forward 22 times and back 14: dropped in deaths, eaten, and given to
  keep a teammate alive: la, at under half a point of health, asked for food ("Can you bring me food immediately"),
  and lb gave it all ("La is at critical health and explicitly needs food; deliver all four cooked
  beef immediately"). Keeping a teammate alive beat keeping the store, and nothing was ever stored.
- **Time:** keeping safe took 30% of the team's game time; 22% came to nothing.

**Where they died: while thinking, and while running away from home.** Of 17 deaths:
- **9 came while the model was deciding.** In the 7 where it was choosing to flee, the agent was
  already at 2–8 health with a monster 0–12 blocks away (0–2 in five of them), and the decision took
  2–7 seconds, through which the body stood still. The other two were choosing to craft and to hunt.
- **7 came during a flee.** Fleeing meant running straight away from the mobs: four died 64–76 blocks
  from the home, in the dark, two of them to drowned by a lake they had run to. Five of the seven
  got 0–2 blocks before they were caught; one ran 21 blocks across open ground and was shot.
- **1 came while building.**
- Fleeing was their answer to nearly every threat: 141 times with a hostile in view, against no
  fight with a monster at all. Most were unarmed (101 of 141 held no sword or axe) and outnumbered
  (79 had two or more hostiles in view), so that was a sound choice; the tool's direction was the problem.

**They looked for what wasn't there.**
- **The chest:** the goal asks for meat in a chest, and the agents looked for one ten times ("Check
  the shelter chest for the required cooked meat"), told each time "no chest within 32 blocks". lc
  crafted one and never put it down. Nobody placed a chest all run.
- **Sheep:** our herd of six stood untouched about 50 blocks south of the home, with 29 sheep in the
  world. lc hunted for sheep from the home five times, each time "no sheep within 32 blocks", and no
  sheep appeared in any of its observations. la saw sheep twice, but a sighting leaves the agent's
  view when the animal does, and its teammates never heard of it.

**Working together:** every question was answered (14 of 14); 4 of 14 instructions were followed at
the next decision. lc gathered logs and gave 47 of them to lb, who built the home.

**Where our code, not the agents, decided the outcome:**
- The body stood still while the model decided (9 deaths, 7 of them choosing to flee). Fixed: while it decides, the agent steps
  back from any hostile within reach, and the next observation says so (`src/agents/src/reflexes.ts`).
  Checked live: beside two zombies for 10 seconds, health fell from 20 to 5 standing still and stayed
  at 20 with the step-back.
- `flee` ran straight away from the mobs, whatever lay that way (7 deaths). Fixed: it runs into a known
  shelter on the far side from the mobs when there is one with a clear doorway, and otherwise turns
  aside rather than end in, or cross, water or a drop. Checked live: it got into a shelter 20 blocks
  off with zombies behind it, and turned away from a lake in its path (a first version checked only
  where the run ended, and still swam the lake to get there).
- With no logs written (the first try, on an expired key), the end-of-run report printed tlunap1's
  rows under bpoc3's name. Fixed: it says there is nothing to report.
- Not ours to fix in code, and left as their behaviour: never placing the chest, and eating the store
  to save a teammate. Where animals were last seen is information a player would remember, and is a
  candidate for the observation (not done yet).

## The same, with reflexes (bpoc4)

*Three GPT-6 Luna agents, one rep, 26 October, on 6527403: bpoc3's settings, with the reflexes added
after it (the agent steps back from a monster within reach while its model decides; `flee` runs into
a known shelter on the far side from the mobs and steers off water). $0.37 (capped at $0.50 an agent).
A proof run; one rep each, so bpoc3 and bpoc4 differ by more than the reflexes: a different night,
different monsters.*

| Part | bpoc3 | bpoc4 |
|---|---|---|
| Shared home built | **yes** (day 1) | **yes** (day 1) |
| Everyone slept there | 0 of 3 | 2 of 3 |
| Everyone holds an iron pickaxe | 0 | 0 (two made) |
| Food left in store | 0 | 8 (12 at most) |
| Deaths | 17 | 24 |
| Game time toward a part of the goal | 7% | 15% |
| Keeping safe | 30% | 22% |

**More of the goal moved, and more of them died.**
- **Beds:** two were made and two agents slept in the home. Beds were still set back five times,
  mostly wool dropped in a death.
- **Food:** the store reached 12 cooked meat, enough, and lc said so ("the chest already has enough
  cooked meat"). By the end it held 8: lb took three out to eat. Kept to the end it would have been
  the food part met, as in tlunap1; spending what the goal needed to keep is still theirs.
- **Iron:** la made iron pickaxes on day 1 and day 2; the first was dropped when it died that night,
  and none was held at the end.
- **Deaths:** 24, 18 of them at night. Skeletons killed 12 (in bpoc3, 3): arrows reach an agent
  running across open ground, and stepping back from a skeleton doesn't take it out of range.

**What the reflexes did.**
- **Stepping back:** it ran in 34 decisions, 39 times in all. 9 deaths still came while the model was
  deciding, the same as bpoc3: in 4 the step-back ran and the agent was killed anyway (at 2–5 health);
  in 5 the nearest monster was 5–19 blocks off, a skeleton among the nearest in four, out of the
  step-back's reach.
- **Running home:** `flee` ran into a shelter 11 times. 10 deaths came during a flee (bpoc3: 7), five
  of them to arrows, three after the agent had run 19–57 blocks.
- **What it suggests, not acted on:** the reflexes answer melee; ranged attack is the gap. Whether to
  answer it (for example, ending a flee out of a skeleton's line of sight, or in a shelter when one is
  anywhere in reach) is open.

**Where our code, not the agents, decided the outcome:**
- The step cap, meant as a safety net, ended lc's run after 200 decisions with about 10,000 ticks of
  game time left (it ended tlunap1's lb the same way). Fixed: the default cap scales with the time
  budget, 200 decisions a day, so 600 for three (checked in the real agent).

## Reflexes split in two, and flee leaning on shelter (bpoc5)

*Three GPT-6 Luna agents, one rep, 27 October, on 88f8d1b: bpoc4's settings, after the reflex was split
(step back from a monster within reach; take cover from a skeleton that can see the agent, its range
measured at 16 blocks) and `flee` was changed to count an archer in sight as danger, stay put inside
a closed shelter, run only to finished shelters and reach 64 blocks for one. $0.37 (capped at $0.50 an
agent). A first try was cut off when the session stopped (all three disconnected after 36-53
decisions, $0.09) and set aside; this is the restart. One rep, so it compares with bpoc3 and bpoc4
loosely.*

| Part | bpoc3 | bpoc4 | bpoc5 |
|---|---|---|---|
| Shared home built | **yes** | **yes** | **yes** (day 1) |
| Everyone slept there | 0 of 3 | 2 of 3 | 0 of 3 |
| Everyone holds an iron pickaxe | 0 | 0 | 0 |
| Food left in store | 0 | 8 | **11** |
| Deaths | 17 | 24 | 22 |
| Deaths while the model was deciding | 9 | 9 | **4** |
| Deaths during a flee | 7 | 10 | 12 |

**The food part was met and kept.** Six times an agent put cooked meat in the chest, and 11 were
still there at the end: the first proof run to hold that part to the end, as tlunap1's teams did with
the progress list on.

**The seconds while the model thinks are covered now.** Deaths while the model was deciding fell to 4,
from 9 in each run before. The step-back ran about 50 times and taking cover from a skeleton about 65.

**Running is still where they die.** 12 deaths came during a flee, and skeletons killed 12 of the 22
again. `flee` ran into a shelter 14 times and ended clear in the open 107 times, but at night clear
doesn't last: a skeleton keeps coming, and new monsters keep appearing in the dark.

**Beds didn't move.** One bed was made; wool came only from killing sheep (6, of which 3 were lost in
deaths), and nobody stored any. This, and how rarely a sheep was in view, led to the changes after it.

**Where our code, not the agents, decided the outcome:**
- An agent was stuck three times at one step on its way home (2,74,34, the unexplained pathfinder
  freeze), 12 blocks from the team's home. Fixed: a spot where the bot got stuck is walked round for
  the rest of the run (checked live on the same seed: home in 16 s, then 4 s, where it had never arrived).
- After it, for wool: the observation lists animals the agent or a teammate saw in the last 10 minutes
  (`animalsSeen`), `hunt` says a killed sheep drops 1 wool, `store` says a chest keeps items through a
  death, and the herd near spawn is 12 sheep, not 6.

## Remembering where the sheep were (bpoc6)

*Three GPT-6 Luna agents, one rep, 27 October, on 7bb0432: bpoc5's settings, after the changes for
wool and beds: the observation lists animals the agent or a teammate saw in the last 10 minutes
(`animalsSeen`), `hunt` says a killed sheep drops 1 wool, `store` says a chest keeps items through a
death, the herd near spawn is 12 sheep rather than 6, and a spot where the pathfinder got stuck is
walked round. $0.30 (capped at $0.50 an agent). One rep.*

| Part | bpoc4 | bpoc5 | bpoc6 |
|---|---|---|---|
| Shared home built | **yes** | **yes** | **yes** (day 1) |
| Everyone slept there | 2 of 3 | 0 of 3 | **3 of 3** |
| Everyone holds an iron pickaxe | 0 | 0 | 0 (three made, lost in one death) |
| Food left in store | 8 | **11** | **10** |
| Deaths | 24 | 22 | **8** |
| Game time toward a part of the goal | 15% | 12% | 18% |

**Three parts of four, level with tbase4's best, and everyone slept in the team's home for the first
time since bpoc2.** Only iron was missing.

**What one agent saw, the others used.** 415 of 422 observations carried a remembered sighting, and the
agents walked to them: "Reach the sheep last seen south of me so I can gather wool for beds; teammates
are already handling iron" (lc, going to the coordinates a sighting gave). Twelve wool came from nine
sheep, all by killing; three beds were made, and all three agents slept in the home (five sleeps in all).

**Organised by part, from the first minutes.** lb took beds ("Beds are still unclaimed; explore for
sheep so I can gather wool for the team's three beds"), lc the shelter, la iron and food. lb stored
11 cooked mutton in one go on the first day, and 10 were still there at the end.

**One death took the last part.** la made three iron pickaxes on day 2, one for each of them, and set
off to bring them home. It got lost underground, and drowned while its model was still deciding what
to do, with all three in its pack. No agent stored a pickaxe on the way, though `store` now said a
chest keeps what is in it through a death.

**Fewer deaths, and fewer to arrows.** 8 deaths, against 22-24 in the two runs before; one to a
skeleton (bpoc5: 12). Six came during a flee, one while the model decided (the drowning), one while
walking.

**Where our code, not the agents, decided the outcome:**
- `place_bed` failed 9 times before the third bed went down, six of them telling lc "no room left for
  a bed" in a large shelter with two beds in it. The game had refused the spots: it won't put a bed
  where any body stands, and our code checked only for blocks. Fixed: spots with a body in them are
  passed over, and a refused spot is reported as refused, not as a full room (checked live with a
  teammate standing in the room).
- The drowning that cost the iron came while the model decided; the agent swam out by itself only
  before a decision and before a skill. Fixed: the guard that runs while the model decides swims out
  too (checked live: a bot at the bottom of a 4-deep pool kept its air at 20 where standing still left
  it at 5 in 8 seconds). This was one of the two drowning gaps left open on 18 October "unless drowning
  shows up again".
- The run's report counted that loss as no setback for iron, since the death came between steps.
  Fixed after tbase5: a death counts what the agent held at the end of the step before, and bpoc6's
  rebuilt report shows "la died, dropping 4 iron ingot, 3 iron pickaxe".

## The mixed team again, on everything since (tbase5)

*Team run tbase5, 27 October, on 6799e5a. Claude Opus 5.5, Claude Sonnet 5.5 and GPT-6 Luna,
collaborative, chat on, plan memory, no progress list, three in-game days, three reps on fresh worlds,
$2 cap per agent per rep, $7.96 in all. Since tbase4 the code gained everything the proof runs bpoc3-bpoc6
led to: the doorway line and stop, reflexes while the model decides (step back, take cover, swim out),
`flee` leaning on finished shelters, shared animal sightings, a 12-sheep herd, `store` saying a chest keeps
items through a death, the walk-round for stuck spots, and `place_bed` passing over occupied spots.
Comparable with tbase1-tbase4 part by part, not as a whole.*
Report: [tbase5](../batch-reports/2026-10-27-0347-tbase5.md).

| Part | Rep 1 | Rep 2 | Rep 3 |
|---|---|---|---|
| Shared home built | **yes** (Luna, day 1) | **yes** (Luna, day 1) | **yes** (Luna, day 1) |
| Everyone slept there | **3 of 3** | 2 of 3 (not Opus) | 2 of 3 (not Opus) |
| Everyone holds an iron pickaxe | **3 of 3** | 0 | 0 |
| Food left in store | **11** | **13** | **24** |
| Deaths | **0** | 11 | 9 |
| Ended | **goal met at 30:05 of game time** | time (Opus: cost cap) | time (Opus: cost cap) |

**The first team to meet the whole goal.** In rep 1 every part was done halfway through the second day,
with no deaths, for $1.36.

**How they did it: each took a part, and finished it.**
- **Luna built the home** in the first five minutes of day 1, as it did in every rep.
- **Opus took food and beds:** 12 cooked mutton in the chest by early day 1, then wool and three beds
  before the first night.
- **Sonnet took iron:** 9 ingots and three iron pickaxes twelve minutes into day 1, then walked them round
  ("bringing you 1 iron_pickaxe, stay where you are"), and Opus passed one on to Luna.
- **Opus called the night:** "Beds are usable now and luna is asleep. Please sleep now, I'm going to bed
  too." When everyone was in bed in the home, the goal was met.
- Not all smooth: Sonnet twice took meat Opus had stored, and Opus hit Sonnet twice by mistake.

**Reps 2 and 3: home and food at once, then iron out of reach.**
- **The home and food came early again,** and stayed: 13 and 24 cooked meat at the end.
- **Iron never came.** No one made an iron pickaxe in either rep; the team never held more than three
  pieces of iron. Iron ore was in view in 6-25% of each agent's observations, but `mine_ore` turned it down ten times:
  the ore in sight lay beside water or lava, which it won't mine, and the rest was 10-14 blocks below,
  and every way down was stopped by monsters, water below or a drop.
- **Opus spent its cap before the end** (at 57,440 and 53,540 ticks of 72,000) and left, so it couldn't
  sleep or hold a pickaxe at the end. It costs about $2.60 over three days; the cap was $2.

**Where our code, not the agents, decided the outcome:**
- The cost cap ended Opus's run before the end in reps 2 and 3, which on its own made "everyone slept"
  unreachable. A setting of ours, not a bug; noted for the next run.
- `mine_ore` won't mine ore beside water or lava, a rule from the drowning fixes. With the agents now
  swimming out by themselves, whether ore beside water should stay off limits is an open question.

## Remembering ore, and digging past what can't reach (bpoc7)

*Three GPT-6 Luna agents, one rep, 27 October, on 7aae394: bpoc6's settings, after the changes tbase5
led to: the observation lists ore the agent or a teammate saw in the last 30 minutes, with how far
above or below (`oreSeen`); `descend`, `tunnel`, `mine_ore` and `climb_out` stop only for a monster
that can see or reach the agent, not one behind rock; and the run's report counts what a death between
steps took. $0.23 (capped at $0.50 an agent).*

| Part | bpoc5 | bpoc6 | bpoc7 |
|---|---|---|---|
| Shared home built | **yes** | **yes** (day 1) | **yes** (day 1) |
| Everyone slept there | 0 of 3 | **3 of 3** | **3 of 3** |
| Everyone holds an iron pickaxe | 0 | 0 (three made, lost in one death) | 1 of 3 (five made) |
| Food left in store | **11** | **10** | 0 (10 stored on day 1, taken out on day 3) |
| Deaths | 22 | 8 | **2** |
| Game time toward a part of the goal | 12% | 18% | 14% |

**Iron came on the first day, and kept coming.** la had 5 raw iron by 5:26 of day 1 and two iron
pickaxes by 10:11; it made four over the run, and lb mined iron too. The remembered ore was in 311 of
312 observations and was used: "I need three iron ingots for my own iron pickaxe; exposed iron is
listed nearby and I have a stone pickaxe" (lb, before mining it). No dig was stopped by a monster;
the few that stopped were cut short by damage, night, a teammate's message or a death.

**Two deaths, both ours, and they took two parts of the goal.** At 13:03 of day 1, la was climbing back
up with both iron pickaxes when gravel fell onto its head, and it suffocated. Near the end of day 3 it
died the same way underground, carrying 8 of the team's cooked meat.

**The team's food left the store for one agent's hunger.** lb cooked 10 porkchops and stored them before
7:00 of day 1, so that part was done for two days. On day 3 la came home and took all ten: "I'm low on
health and hunger; take the shelter's cooked meat so I can eat safely inside before night." It ate two
and went back underground for iron with the other eight. That is the agent's own judgement (the goal
says the meat must be in the chest), and it is left alone.

**An iron pickaxe spent as a digging tool.** la's last iron pickaxe wore out on a staircase down and the
paths after it ("your iron_pickaxe broke"). The digging skills spare an iron pickaxe only once it is down
to its last 16 uses, and the pathfinder's own digging doesn't spare it at all. Whether a pickaxe the goal
counts should be dug with at all is open (below).

**Where our code, not the agents, decided the outcome:**
- Both deaths were suffocation, a cause never seen in any earlier run, and only after `climb_out` came
  in. A stair up digs the block over the agent's own head; with gravel on top, it falls straight into
  the space the head is in. Reproduced live: a bot climbing through gravel on the old code died in 11
  seconds from full health, and `climb_out` then reported "success" from where it had respawned. Fixed:
  the digging skills won't dig out from under gravel or sand and step aside from it first, `clear`
  waits for any block still falling, and a reflex digs out any block that lands on an agent's head,
  during a skill as well as a decision. Checked live: the same climb with gravel overhead on one side
  stepped aside and climbed 10 blocks at full health; with the reflex alone (checking every 250 ms,
  since made every tick), three sand blocks dropped on a bot left it at 13 health where doing nothing
  left it at 6.
- lb's first smelt failed with "Can't find dark_oak_planks": `smelt` chose its fuel, then crafted a table
  for the furnace from the same planks. Fixed: fuel is chosen once the furnace is ready (checked live:
  the old code failed the same way; the new one says there isn't enough fuel left, and with two more
  planks smelts all three).

## A besieged home (bpoc8)

*Three GPT-6 Luna agents, one rep, 27 October, on 1118006: bpoc7's settings after its fixes (no digging
out from under gravel, a block on the head dug out, `smelt` fuel chosen after the furnace) and the
cheapest-tool rule (`mine_stone` and walking keep an iron pickaxe for when nothing cheaper will do).
$0.41 (capped at $0.50 an agent).*

| Part | bpoc6 | bpoc7 | bpoc8 |
|---|---|---|---|
| Shared home built | **yes** (day 1) | **yes** (day 1) | **yes** (day 1) |
| Everyone slept there | **3 of 3** | **3 of 3** | 2 of 3 (not lb) |
| Everyone holds an iron pickaxe | 0 | 1 of 3 | 0 (two made, both lost in deaths) |
| Food left in store | **10** | 0 | **10** |
| Deaths | 8 | **2** | 22 |
| Game time toward a part of the goal | 18% | 14% | 19% |

**The home drew the night to it.** Night after night the observations said the home had "a zombie at
its doorway", once "3 hostile mobs (zombie, skeleton)". 10 of the 22 deaths came within 6 blocks of it,
nearly all to zombies at night, most during a `flee` toward it: "At 1 health with a zombie only 3 blocks
away, get into a closed shelter immediately to avoid dying" (lb, killed on the way). Agents came back
to life near the home, among the same mobs, and three times lb died from full health within a single
decision. A creeper killed lc beside the home by day, and the home was repaired seven times, once 54
blocks.

**Iron was found and made, and lost the same way.** la made two iron pickaxes on day 2; it died with
both, picked one up, and lost it again in two more deaths; lc picked one up and died with it. None wore
out. The cheapest-tool rule had little to act on: no agent mined stone holding both an iron and a
cheaper pickaxe.

**The food held.** lb stored 10 cooked porkchops on day 1 and cooked more on day 2; with 1 health
inside the home it reasoned "recover using one cooked meat while preserving 10 in the chest".

bpoc7, on the same seed, had 2 deaths; the difference is where the mobs gathered, not a change in the
code. Whether to do anything about a home under siege (a fight-back skill, a second door, sleeping to
move the respawn point inside) is left open: it is the agents' situation to handle, and none of the
three tried to clear the doorway or wall off the crowd.

**Where our code, not the agents, decided the outcome:**
- The report said "la wore out 2 iron pickaxe" ten minutes after "la died, dropping 2 iron pickaxe".
  A death's step can still show what it dropped, which then goes missing in the next step and was read
  as wear. Fixed: a loss right after a death is the death's, counted there.

## Digging in, first try (bpoc9)

*Three GPT-6 Luna agents, one rep, 27 October, on 59c4d13: bpoc8's settings, with `flee` digging in at
night when monsters are still after the agent (above and below). $0.37 (capped at $0.50 an agent).*

| Part | bpoc7 | bpoc8 | bpoc9 |
|---|---|---|---|
| Shared home built | **yes** (day 1) | **yes** (day 1) | **yes** (day 1) |
| Everyone slept there | **3 of 3** | 2 of 3 | **3 of 3** |
| Everyone holds an iron pickaxe | 1 of 3 | 0 | 1 of 3 (la) |
| Food left in store | 0 | **10** | **20** |
| Deaths | **2** | 22 | 10 |
| Game time toward a part of the goal | 14% | 19% | 17% |

**Three parts of four again, and the nights were quieter.** 2 deaths at night against 19 in bpoc8.
Most of that is where the agents spent the night: inside a shelter at 35% of night decisions, against
13%. `flee` dug in only 3 times at night (once more by day), and stayed put twice when already shut in.

**When it worked, they used it.** Dug in at 2 health, lb reasoned "I'm dug in and covered, so waiting
through the last of the night is safer than emerging beside hostiles at 5 health", and waited.

**Where our code, not the agents, decided the outcome:**
- lb dug in with a zombie 5 blocks off and a skeleton in sight, was hit from 20 health to 5 while
  digging and knocked off the hole, and was told it had dug in. The next decision's reflexes, no longer
  seeing it as sheltered, moved it, and a skeleton killed it. Another time lb, counted as sheltered in
  its hole, had a zombie at distance 0 and was killed: apparently the zombie got in before the cover. Fixed: the burrow says it
  is dug in only when the agent is in the hole, closed round, with no monster in it; a hole with a
  monster in it is not a shelter to the reflexes either; it digs only with a lead of 5 blocks and stops
  if a monster comes within 2. Checked live: digging with a zombie 2 blocks off, the old code said "dug
  in" in 3 of 4 tries and the bot died in two of those; the new one said "a monster fell into the hole
  with you" in the two tries where one had.
- Once a dig timed out on stone with a stone pickaxe: the burrow had started while the agent was still
  in the air. Fixed: it lands first (checked live: from mid-jump it dug in 3 of 3, before it refused).
- Fleeing at night with two zombies 2-10 blocks off and a skeleton, old and new code alike dug in 8 of 9
  times; the new code adds honesty, not more dig-ins.

## What they last heard, over what had changed (bpoc10)

*Three GPT-6 Luna agents, one rep, 27 October, on 57b30b1: bpoc9's settings, with `flee` digging in
only with a lead and reporting a dig-in only when it is real. $0.22 (capped at $0.50 an agent).*

| Part | bpoc8 | bpoc9 | bpoc10 |
|---|---|---|---|
| Shared home built | **yes** | **yes** | **yes** (day 1) |
| Everyone slept there | 2 of 3 | **3 of 3** | **3 of 3** |
| Everyone holds an iron pickaxe | 0 | 1 of 3 | **3 of 3** |
| Food left in store | **10** | **20** | 8 |
| Deaths | 22 | 10 | **2** |

**Three parts, all three agents with an iron pickaxe for the first time in a Luna run, and 2 deaths.**
`flee` dug in once, on the first night, and the agent came out of it alive.

**The goal was missed by 3 seconds, through two of their own moves.** On day 2 la gave away both its
iron pickaxes, each to a teammate who already had one; at tick 38,380 la, at low health, took all 10
cooked meat out of the chest ("Recover health and hunger with the cooked meat stored nearby"); at
38,440 lb gave la a pickaxe back. Had the meat stayed, the run would have ended "goal met" then.

**Then all three believed the job was done.** Through the first half of day 3 each agent's decisions were `wait` and
`sleep`, with the same reasoning: "The shelter, beds, cooked meat, and my iron pickaxe are ready. Wait
until beds can be used." la said it too, while carrying the 8 porkchops it had taken. lb and lc had
last looked at the chest before la emptied it, and the chest was 18 blocks from the home, out of
anyone's sight. Only when sleeping a second time didn't end the run did they look again: "Verify the
chest still contains at least 10 cooked meat; the other requirements appear complete" (lc). la put its
8 back; nobody made the last 2 before time ran out.

**Where our code, not the agents, decided the outcome:**
- Nothing told lb and lc that la had found the chest empty, though la's look was in the team's tally.
  Changed after it: every agent sees the chests the team knows, each as last opened by anyone
  (`chestsSeen`), and a teammate finding one changed is said once as an event. Checked live with a
  scripted agent and a teammate's tally.
- A bed refusal said "the game did not let you sleep, and did not say why": the game's reason arrived
  before the skill was listening. Fixed: its own words are passed on ("This bed is obstructed").
- 3 of 10 `look_in_chest` calls said only "the chest did not open". Fixed after tbase6: it says how far
  the chest is and why the walk to it failed.

## The mixed team, with the shared chest (tbase6)

*Team run tbase6, 27 October, on 2ee9c2f. Claude Opus 5.5, Claude Sonnet 5.5 and GPT-6 Luna,
collaborative, chat on, plan memory, no progress list, three in-game days, three reps on fresh worlds,
$3 cap per agent per rep, $7.80 in all. Since tbase5: digging stops only for a monster that can reach
the agent, remembered ore, `climb_out` and its fixes, the cheapest tool for every dig, `flee` digging
in, and `chestsSeen`. Comparable with tbase5 part by part.*
Report: [tbase6](../batch-reports/2026-10-27-2131-tbase6.md).

| Part | Rep 1 | Rep 2 | Rep 3 |
|---|---|---|---|
| Shared home built | **yes** (Luna, day 1) | **yes** (Luna, day 1) | **yes** (Luna, day 1) |
| Everyone slept there | **3 of 3** | **3 of 3** | 0 of 3 |
| Everyone holds an iron pickaxe | **3 of 3** | 2 of 3 (Opus held Luna's) | 1 of 3 |
| Food left in store | **19** | **12** | 9 |
| Deaths | **0** | 7 | 21 (Opus 18) |
| Ended | **goal met at 30:10 of game time** | time | time |
| Cost | $1.43 | $3.31 | $3.06 |

**The whole goal again in rep 1, the second time running.** The same shape as tbase5's rep 1, for
about the same money ($1.43 against $1.36): Luna built the home in the first five minutes, Sonnet took
food and wool and made three beds by mid-day 1, and Opus took iron and had three iron pickaxes made
early on day 2, then gave them out. No deaths. Opus never hit its cap this time: the most it spent in a
rep was $1.92.

**Rep 2: one pickaxe short, still in the bag.** Opus took iron for the team from the first decision
("I'll handle iron pickaxes for all 3 of us"), lost everything in two early deaths, and made two iron
pickaxes only late on day 3, "one for me and one for luna". The last game hour went to a creeper it dug
in against, sheep already sheared, pigs for its own hunger, and waiting for another creeper to leave,
telling Luna all the while "I have a spare iron pickaxe for you". The run ended with it still in the
pack. Not hoarding: caution and its own needs first, with the clock running out.

**Rep 3: no wool, so no beds, so a spawn trap.** Sonnet took food and wool, but hunts kept finding "no
sheep within 32 blocks", and its one bed was lost when it died. With no bed slept in, everyone came back
to life at the world spawn, where a zombie stood at night: Opus died there 18 times, six of them in a
row. Sonnet ended holding three iron pickaxes, the other two agents none. 31% of the team's time came to nothing,
against 6-8% in the other reps.

**The shared chest was read and used.** "Found the chest changed" reached each agent 2-18 times a rep.
In rep 1 Sonnet saw "luna found the chest … holding 3 cooked_mutton", cooked 15 mutton ("need 10 cooked
meat in chest") and stored 10. In rep 2 Luna, hungry, ate its own food "without touching the 12 cooked
meat reserved in the chest". In rep 3 Luna took from the chest three times at low health knowing it was
short ("the chest currently has 8 cooked meat, so the team must add at least 3 more"): it knew, and
chose to eat. The chest ended one short.

**`flee` dug in 5 times,** each a real dig-in.

**Where our code, not the agents, decided the outcome:**
- After a death, an agent sometimes decided from an observation taken before it had come back to
  life: health 0, at the spot where it died. 90 decisions in the logs since 23 October were made that
  way; in rep 3 Opus decided six times running from "health 0" at the spawn point, beside the zombie
  that killed it. Fixed: the agent waits for the respawn before observing (checked live: killed three
  times, the old code made one decision at health 0, the new none).
- `look_in_chest`, `take` and `store` said only "the chest did not open" when the walk to it had
  failed (15 calls in the logs). Fixed: they say how far the chest is and why the walk failed.

| Model | Cost, 3 reps | Deaths per rep |
|---|---|---|
| Opus 5.5 | $4.28 | 0, 3, 18 |
| Sonnet 5.5 | $3.29 | 0, 3, 2 |
| GPT-6 Luna | $0.23 | 0, 1, 1 |

## The mixed team, told what's left (tbase7)

*Team run tbase7, 28 October: the same team and settings as tbase6, with the progress list on (each
observation lists what the goal still lacks, as facts). Two reps, run one at a time (tbase7a on
c68fd51, tbase7b on ea23943, which only corrected the price table); a third was left out because the
Anthropic credit might not have lasted it. US$4.51 at the verified prices. Comparable with tbase6 rep
by rep, with one condition changed.*
Report: [tbase7](../batch-reports/2026-10-28-0058-tbase7.md).

| Part | tbase6 rep 1 | tbase6 rep 2 | tbase7 rep 1 | tbase7 rep 2 |
|---|---|---|---|---|
| Shared home built | **yes** | **yes** | **yes** (Luna, day 1) | **yes** (Luna, day 1) |
| Everyone slept there | **3 of 3** | **3 of 3** | **3 of 3** | **3 of 3** |
| Everyone holds an iron pickaxe | **3 of 3** | 2 of 3 | **3 of 3** | 2 of 3 |
| Food left in store | **19** | **12** | **11** | 3 |
| Deaths | **0** | 7 | 1 | 6 |
| Ended | goal met at 30:10 | time | **goal met at 30:05** | time |

**Rep 1 met the whole goal again, the third mixed-team rep 1 running,** at the same point of day 2 as
tbase5 and tbase6 without the list (30:05, against 30:05 and 30:10). The same split, chosen in the first
decisions: Luna built the home by 5:08 on day 1; Sonnet cooked and stored 11 porkchops by 7:08 and made
the first two beds; Opus had three iron pickaxes made by 15:12 and handed them out, then made the third
bed. The list was read (Luna cited what was still needed 6 times), but there was nothing left for it to
point at that the team wasn't already doing.

**Rep 2: the list said what was missing, and the gaps stayed.** By the end it said "sonnet carries no
iron_pickaxe" and "the chests the team has opened hold 3 cooked meat, not 10", and Luna cited what was
still needed 23 times. Neither gap closed:
- **Food was lost to deaths, then the animals ran out.** Three deaths on days 1 and 2 dropped 35 raw
  meat and 3 cooked beef; later hunts found "no cow within 32 blocks" and lost pigs that got away.
- **A pickaxe was moved, not added.** On the evening of day 3 Luna asked "Please bring me an iron
  pickaxe when you have it", and Sonnet gave Luna its own, its only one: "Luna lacks an iron pickaxe; I
  can make another". Its next try for iron found only ore beside water, which mining won't take. The
  gap moved from Luna to Sonnet, and the count stayed 2 of 3.

**What it says about the list, from two reps:** nothing measurable yet. Rep 1 finished as fast without
it; in rep 2 the agents knew exactly what was missing and still couldn't close it, for want of animals
and reachable ore, not for want of knowing. The list helps when the gap is something an agent can act
on; it can't make the world give up what isn't there.

**Where our code, not the agents, decided the outcome:** nothing new. The respawn wait held (no
decision at health 0 in either rep), and both of `flee`'s dig-ins in rep 2 were real.
- One report fix: reps run one at a time and reported together were all labelled "rep 1"; they are now
  numbered in order under the report's name.
- Costs: the price table was checked against both providers' pages on 28 October; Opus 5.5 and Sonnet
  5.5 cache reads cost a twentieth of input, not a tenth. tbase5 and tbase6 were republished at the
  verified prices: US$7.43 and US$7.29 (published before as US$7.96 and US$7.80).

| Model | Cost, 2 reps (USD) | Deaths per rep |
|---|---|---|
| Opus 5.5 | 2.75 | 0, 1 |
| Sonnet 5.5 | 1.65 | 0, 1 |
| GPT-6 Luna | 0.11 | 1, 4 |

## Herds put back each morning (bpoc11)

*Three GPT-6 Luna agents, one rep, 28 October, on c0a4a49: bpoc10's settings, with `chestsSeen`, the
respawn wait, and the herds put back to their number at each dawn, silently. US$0.25 (capped at $0.50
an agent).*

| Part | bpoc9 | bpoc10 | bpoc11 |
|---|---|---|---|
| Shared home built | **yes** | **yes** | **yes** (day 1) |
| Everyone slept there | **3 of 3** | **3 of 3** | 2 of 3 |
| Everyone holds an iron pickaxe | 1 of 3 | **3 of 3** | 1 of 3 (lb held all three) |
| Food left in store | **20** | 8 | **10** |
| Deaths | 10 | 2 | 3 |

**Two parts met, with all three iron pickaxes made and three beds down: one agent, trapped, held the
rest back.** lb mined and smelted iron on day 2 and made three iron pickaxes early on day 3 ("exactly
enough to craft the three iron pickaxes the team needs"), 43 blocks underground. It spent its remaining
34 decisions trying to get them to the others ("I need to reach the shelter to distribute two while
keeping one"): `climb_out`, `tunnel` and `go_to` failed 16 times between them. la came down to within 8
blocks of it, and lb's three tries to hand la a pickaxe there failed ("could not reach la") until
nightfall; lb dug in for the night. lc made three beds on the evening of day 3 and put them in the home; lc and la lay down, and
the night didn't pass, because the game passes it only when every player sleeps, and lb was still
underground. One stuck agent cost both missing parts.

**The restock did its job: food and wool came back.** 4, 5 and 9 animals were put back on the three
mornings. lc lost its wool to deaths three times (5 white, then 4 of mixed colours, then 3 white) and
went back each time; the third gathering, 9 white wool, became three beds. The food store was filled
on day 1 (11 cooked beef), eaten from, and refilled to 10.

**The team kept to the roles it chose.** lb built the home, stored the first food and then took iron;
lc took wool and beds; la helped with iron and repaired the home. Questions were answered 8 of 9 times;
teammates' messages cut off each other's work 25 times. Once lb was stuck, la and lc kept asking it to
"bring the iron pickaxes here", and lb kept saying it would.

**Where our code, not the agents, decided the outcome:** lb's way out. Fixed after it, and checked
live in an open room with nothing to cut steps into:
- Standing at the edge of a block, its middle over air, `climb_out` said "not standing on solid
  ground" (five times for lb, in an amethyst geode). Reproduced exactly; now it steps onto the middle
  of the block first, and built 8 blocks up from the same spot in 4 seconds.
- Building up, it tried to place the iron pickaxe in lb's hand, and once a block the server didn't
  take. Now it checks the hand just before placing and tries up to three jumps; with the hand forced
  to the pickaxe every 150 ms, it put nothing wrong down and said why. What swapped lb's hand is not
  known.
- `tunnel` and `climb_out` passed on library errors: "invalid operation" (an inventory click refused
  while something else moved items) and "The goal was changed before it could be completed!" (our
  own interrupt cancelling the step). Items are now picked afresh before each equip, the errors are
  put in plain words, and a skill cut off by an interrupt is reported as interrupted, with the reason,
  instead of as its own failure. Going up, open space is "no rock to step up onto", not "a drop into
  a cave".
- `give` couldn't walk the last 8 blocks to la in the cave ("walking to la timed out"): the
  pathfinder found no way through, which the message says. Left as it is.

| Model | Cost (USD) | Deaths |
|---|---|---|
| GPT-6 Luna (×3) | 0.25 | 0, 0, 3 |

## Out of the caves, and back to dying (bpoc12)

*Three GPT-6 Luna agents, one rep, 28 October, on a54fbb2: bpoc11's settings with the cave fixes
(`climb_out` from a block's edge, the right item in hand, plain errors). US$0.31.*

| Part | bpoc10 | bpoc11 | bpoc12 |
|---|---|---|---|
| Shared home built | **yes** | **yes** | **yes** (day 1) |
| Everyone slept there | **3 of 3** | 2 of 3 | 0 of 3 |
| Everyone holds an iron pickaxe | **3 of 3** | 1 of 3 | 0 of 3 |
| Food left in store | 8 | **10** | 0 |
| Deaths | **2** | 3 | 8 |

**The cave fix held; the deaths came back.** la used `climb_out` six times and climbed every time (1
to 28 blocks), each stopped only by a creeper, nightfall or a teammate's message, never by "every way
up is unsafe", and no library error reached any agent. But 8 deaths, 5 of them lb's (an enderman, a
creeper, two skeletons, drowning); skeletons killed 5 of the 8, cost everything carried: lb died holding 7 wool and 15 raw meat on day
1, la holding its iron pickaxe and 5 raw iron on day 2, and wool was lost four times in all.

**Iron failed for want of two sticks.** On day 3 la had 7 iron ingots, one stick and one plank,
underground at night with no logs: "I have 7 iron ingots but only 1 stick, so I can't craft an iron
pickaxe". lc, in the home, offered "12 sticks for your iron pickaxes"; la tried to get back and the
way was blocked. The craft message said exactly what was missing.

**Where our code, not the agents, decided the outcome:**
- lb's agent crashed at tick 57,040 of 72,000 ("Cannot read properties of undefined (reading 'x')"),
  and the console holding the stack was deleted by the team script. The cause is unknown. Changed
  after it: a crash writes a last line to the run's log, with the error and its stack, and the report
  says "crashed"; the team and batch scripts keep a crashed agent's console; the 2-second look for
  animals and ore, which runs outside the main loop, logs an error and carries on instead of ending
  the agent. Checked with a crash forced at step 3.

| Model | Cost (USD) | Deaths |
|---|---|---|
| GPT-6 Luna (×3) | 0.31 | 1, 5, 2 |

## Three Haiku 5.5 agents (thaiku1)

*Three Claude Haiku 5.5 agents with neutral names (ha, hb, hc), one rep, 28 October, on 606d444:
bpoc12's settings. The first run of the cheaper-models workstream. US$0.20 (capped at $0.35 an
agent). Comparable with the Luna proof runs.*

| Part | bpoc11 (Luna) | bpoc12 (Luna) | thaiku1 (Haiku 5.5) |
|---|---|---|---|
| Shared home built | **yes** | **yes** | no |
| Everyone slept there | 2 of 3 | 0 of 3 | 0 of 3 |
| Everyone holds an iron pickaxe | 1 of 3 | 0 of 3 | 0 of 3 |
| Food left in store | **10** | 0 | 0 |
| Deaths | 3 | 8 | **0** |
| Cost (USD) | 0.25 | 0.31 | **0.20** |

**Safe, busy talking, and nowhere near the goal.** No Haiku agent died, a first on this goal; the
team spent 46% of its time keeping safe, hb 83% (67 of its 89 decisions were `wait`, healing in its
hut: "Waiting here lets health regenerate safely until morning"). They sent 84 to 124 messages each, nearly
all status ("ha here. Mining coal for fuel, then iron for iron pickaxes"), but none asked or told a
teammate to do anything, and nothing was handed over.

**A home that was "large" but one storey.** ha asked for a large shelter without a second storey, and
told the team "I'm sealed in the large shelter at 2,73,22"; the goal needs two storeys, and nobody
checked it against the goal. The Luna agents asked for `{"storeys": 2, "size": "large"}`.

**Where our code, not the agents, decided the outcome:** hc was in the flooded cave under the spawn
area from its 12th decision to the end, 3 blocks under the ground. `climb_out` refused 6 times ("in
water, and could not reach dry ground within 8 blocks to dig from"), `go_to` 42 times ("could not get
closer"), and `build_shelter` 37 times for the water; it was told 13 times it was repeating itself.
Changed after it: a `respawn` skill (die on purpose and come back at the respawn point, losing
everything carried), which the owner asked for; checked live from that cave (back at the world spawn
in 2 seconds, items left where it was) and with a set spawn point, and in the real agent, where the
report counts it apart from deaths. And `climb_out` now swims up and climbs onto the nearest bank:
from the bottom of that lake it said "already under open sky" and did nothing; now it is out in 9
seconds (checked from three spots), and in water filled to its roof it says so plainly.

| Model | Cost (USD) | Deaths |
|---|---|---|
| Claude Haiku 5.5 (×3) | 0.20 | 0, 0, 0 |

## The problem that kept coming back: staying alive

Across every run of this goal, one thing undid more work than anything else: agents dying. Each
death drops everything carried (wool for beds, the team's iron pickaxes, its food), and the agent
comes back empty-handed. The agents' own answer barely changed from run to run: when a monster came,
they ran, which was sound, since most were unarmed and outnumbered (bpoc3: 101 of 141 flees held no
weapon). What changed, run after run, was the code behind that choice. Each fix closed one way of
dying, and the next run showed the next one.

| Run | Deaths (3 agents, 3 days) | How they died | What we changed after |
|---|---|---|---|
| tbase1 | 33 in 3 reps | 10 in 75 seconds in a home with a zombie inside, which the observation called closed and safe | The shelter's status checks for a monster inside and says so |
| tbase4 | 28 | No beds, so they came back to life at the home's door, among the mobs: 11 deaths in three minutes | (where to build and sleep left to the agents) |
| tluna1 | 42, 16, 9 | Rep 1's home stood on the spawn point: 28 of 42 deaths at it | (the same) |
| tlunap1 | 14, 61, 11 | 39 of 86 came during a `flee` that ran on after the death and then reported success | A death ends any skill, reported as "you died" |
| bpoc3 | 17 | 9 while the model was still deciding, the body standing still; 7 running straight away from home into the dark or a lake | Reflexes: step back from a monster while the model decides. `flee` runs into a known shelter and steers off water |
| bpoc4 | 24 | Skeletons killed 12: stepping back doesn't take an agent out of bow range | A second reflex, taking cover from an archer that can see the agent; `flee` treats an archer in sight as danger, stays put inside a closed shelter, runs only to finished ones, up to 64 blocks |
| bpoc5 | 22 | Deaths while deciding fell from 9 to 4. 12 came during a flee: at night, "clear" doesn't last | (not yet answered) |
| bpoc6 | 8 | A drowning while the model decided, with the team's three iron pickaxes | The reflexes swim out too |
| tbase5 | 0, 11, 9 | Rep 1, the first full goal, had none | (the deaths were not what stopped reps 2 and 3) |
| bpoc7 | 2 | Both from our new `climb_out`: gravel fell onto the head it had just dug under | No digging out from under gravel or sand; a reflex digs out any block that lands on the head |
| bpoc8 | 22 | Mobs camped at the home's doorway every night; 18 of 124 night flees ended in a death, and 13 of the 20 killed in a flee held too few blocks to wall themselves in, 8 none | `flee` digs in: three blocks down and one over the head, which needs nothing carried |
| bpoc9 | 10 | 2 at night (bpoc8: 19), but the agents spent far more of the night inside (35% of night decisions, against 13%). Of 3 dig-ins at night, one was false: knocked aside while digging, the agent was told it had dug in, and died. A zombie apparently got into another hole with an agent | The burrow lands before digging, says it is dug in only if it is (in the hole, closed round, alone), digs only with a lead of 5 blocks, and stops a dig a monster reaches |
| bpoc10 | **2** | One drowning, one arrow. `flee` dug in once, for real, and the agent lived | (none for deaths) |
| tbase6 | 0, 7, 21 | Rep 1 none. Rep 3: no beds, so everyone came back to life at the world spawn, where a zombie stood at night; Opus died there 18 times, deciding six times running from an observation that still showed it dead (health 0) | The agent waits for the respawn before it observes (90 such decisions in the logs) |
| tbase7 | 1, 6 | No fault of ours: the respawn wait held and both dig-ins were real. Rep 2's deaths, early on, cost the food part | (none) |
| bpoc11 | 3 | All lc's, during flees; each cost its wool, which the morning restock let it gather again. What stopped the run was not a death but an agent trapped underground | `climb_out` steps onto the block it stands at the edge of, and checks the hand before building up |
| bpoc12 | 8 | Skeletons' arrows killed 5; lb died 5 times (an enderman, a creeper, two skeletons, drowning); together they lost the wool four times, the meat and an iron pickaxe | (none yet) |

**The burrow, checked live** (after bpoc8; at night on normal difficulty, the bot carrying nothing, three
zombies 3-4 blocks away, then 30 seconds left standing as an agent does while its model decides):
- On the old code the bot ran about 20 blocks, stopped "clear" at 12, and was caught and killed in 2
  of 3 tries.
- On the new code it survived in 10 of 11 tries: 8 dug in, and twice it ran off the test platform's
  edge and lived. Once it was killed, ending a block below where it started, so its dig apparently
  stopped part-way; the cause didn't show again. Digging in took 3.6 seconds from empty-handed.
- Dug in, 30 seconds with four zombies at the hole's edges and an armed skeleton nearby cost no health,
  and the step-back reflex left it where it was.
- The trigger took two tries to get right. Digging in only when still in danger by flee's own measure
  (a monster within 12) never fired: the bot stopped "clear" and was killed, 3 of 3. Digging in at night
  with a monster within 16 fired twice in 3, and the third time zombies just beyond 16 came back. Zombies
  follow from about 35 blocks, so it checks 32.

**What it teaches:** a failure that keeps coming back is rarely one bug. Here it was a chain of gaps
between the agent's choice and the world: what the agent was told (a home "safe" with a zombie inside),
the seconds it couldn't act (standing still while deciding), where its escape led (away from safety),
what a tool did after the goal was gone (running on after death), what it couldn't answer (arrows,
drowning), and what our own new tools caused (digging under gravel). The model's choice was right
throughout; the structure around it had to catch up, one run at a time. Whether the burrow closes the
night-time gap is for the next run to show.

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
| Died while its model was still choosing to run (9 deaths) | The body did nothing during the seconds a decision takes | It steps back from any monster in reach while the model decides, and is told it did | A safety-critical response waiting on a slow planner, when a simple rule could act at once and report |
| Fled away from home into a lake and drowned (7 deaths in a flee) | An escape action optimised "away from danger", not "toward safety" | It runs into a known shelter when one lies away from the danger, and steers off water | A failover that moves load away from a failing node onto whatever is next, including a worse one |
| A run was ended by a cap on decisions, with game time left | A safety limit set for a short run bound a long one | The cap scales with the time budget | A rate or step limit tuned for one workload silently truncating a longer one |
| Stuck three times at one ordinary step on the way home | A movement library froze at one spot, for no reason found | The spot is walked round once it has stuck the agent | A client that retries the same failing endpoint forever, where marking it bad and routing round it would do |
| Never found sheep that a teammate had seen | What one agent saw left its view, and no one else heard of it | Recent sightings, its own and its teammates', are listed with where and when | Observations kept only in one worker's short-term context, so the team re-discovers what one member already found |
| Told "no room left for a bed" in a room with space for it | A refusal was reported as a fact about the world ("full") instead of as what happened ("refused") | Spots with someone in them are passed over; a refusal is reported as one | An error mapped to the wrong cause, so the agent plans around a limit that isn't there |
| Drowned while its model was deciding, carrying the team's tools | A safety response ran before and after the planner, but not during it | It also runs while the model decides | A watchdog that only checks between jobs, so a failure mid-job goes unanswered |
| Suffocated twice climbing out, with the team's iron and food | A tool's own step created the danger (digging out from under gravel), and nothing recovered from it | It won't dig from under falling blocks; the body digs out of any that land on it | An automated change that triggers the failure it then can't see, with no recovery for the state it caused |
| Trapped in a cave with the team's three iron pickaxes for the rest of the run (bpoc11) | A tool judged where the agent stood by one point of it ("not on solid ground" at a block's edge), and took for granted that what it had put in hand was still there | It steps onto the block first, and checks the hand just before acting | A check made on a simplified model of the state (one field, a cached value) that disagrees with the real state, so a possible action is refused, or the wrong one taken |
| Smelt failed with "can't find planks" it had just checked for | A tool checked its inputs, then used them up in its own setup | Inputs are chosen after the setup | A check-then-act gap: a resource validated, then consumed by an earlier step of the same job |

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
