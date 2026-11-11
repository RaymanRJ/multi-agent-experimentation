# Where things stand, and what's next

Read this at the start of a session; update it when something finishes or a new ask comes in. The
plan comes first; what's done is a dated list at the end, one line each, with the write-ups holding
the detail.
*Last updated 5 November 2026.*

## The road ahead (agreed with the owner, 28 October)

One change at a time, so each result says what caused it. team-base is now a solid baseline: the
mixed team met the whole goal in 2 of 6 reps (tbase5 and tbase6, rep 1 both times), Luna-only teams
never did, and what stops teams now is mostly their own behaviour, not our bugs.

1. **Done: tbase7** (28 October, two reps, US$4.51; the third left out for Anthropic credit, about
   US$2.90 left): rep 1 met the whole goal again (30:05, like tbase5 and tbase6); rep 2 had the home and
   beds, with the list saying exactly what was missing (a pickaxe, 7 cooked meat) and the world not
   giving it up. Written up in 06. **Still to do:** close the team-base chapter with one short summary
   of what all its runs showed. A third tbase7 rep, if wanted, after an Anthropic top-up.
2. **Next: new bots on the same goal.** Keep team-base fixed and change only the team, so a difference
   is the model, not the task.
   - New models: Gemini, Grok and OpenRouter backends exist already (each needs its key in `.env` and
     its price in `src/agents/src/backends/pricing.ts`). A Luna-priced proof run first for each, to
     learn its cost.
   - A bigger team: a fourth or fifth agent, to see whether coordination holds as the team grows.
     Memory allows it (about 0.25GB a bot).
3. **Then: a harder goal**, run with the team that does best on team-base. Options:
   - **Longer:** five days, with a farm for food that renews, so the store has to be kept, not just
     filled once.
   - **Deeper:** a diamond pickaxe each: iron tools first, deep mining, and real pressure on the
     cheapest-tool rule and the safety reflexes.
   - **Competitive:** two teams in one world with scarce resources (the stances support it already).
4. **New workstream (the owner's ask, 28 October): the same results for less.** Can a cheaper team
   meet team-base as often as the mixed team (3 of 8 reps, US$1.40-3.30 a rep)? First **thaiku1**:
   three Haiku 5.5 agents with neutral names (ha, hb, hc), the same settings, one rep capped at
   US$0.35 an agent to learn the cost (estimated US$0.30 a rep), then two more if it holds. Then one
   strong model with two cheap ones, to find the least that has to be paid. Credit on 28 October:
   Anthropic US$3.30, OpenAI US$2.55.
   **thaiku1** (US$0.20): 0 of 4 parts, no deaths; the agents mostly waited and talked status, built a
   one-storey "large" home, and one was stuck all run in the flooded cave, which led to the `respawn`
   skill and to `climb_out` swimming up onto a bank. **thaiku2** (reps 2-3, US$0.46): 2 of 4 parts in
   each (home, food; 2 of 3 slept), as many as the best Luna proof runs, for about US$0.22 a rep; iron
   never started, and the third bed was nobody's job. Done after it: under rock, `climb_out` swims
   to the nearest air first (checked live). **tluna2** (three Lunas, 3 reps, US$0.76): rep 2 met the whole
   goal for US$0.15, the first all-Luna win; reps 1 and 3 met 2 and 3 parts. **tmix1** (Sonnet with two
   Haiku 5.5, 1 rep, US$0.95): home and food; Sonnet died with all three iron pickaxes. So far the
   cheapest team that can win is three Lunas. **tluna3** (three more Luna reps, US$1.02): 2, 3 and 1 parts;
   over six reps three Lunas won 1 (95% 3-56%), against the mixed team's 3 in 8 (14-69%), at about
   US$1.78 per win against US$6.40. Iron was missing in every tluna3 rep; rep 3 was a besieged home (19
   deaths). Changed after: `mine_ore` mines ore with water only beside it (a small gain: 7 of the 70
   iron ores by water around spawn). Night deaths reviewed (29 October): 44 of 77 at night or dawn, 31 within 24 blocks of a
   home, which was open 21% of the night (leaving dug the doorway and nothing closed it) or had a monster
   at its doorway. **Done:** a wooden door, opened and shut on every walk, shut by the body when left open,
   walls never dug, entry allowed with a monster beyond 3 blocks, and a skill that walks out at night says
   so (checked live, two bots, zombies at the door; the night note not yet seen live). **bpoc13** (Luna proof,
   US$0.15): the whole goal by the end of day 2, no deaths, the nights slept through, so it says little
   about the door; but lb's `descend` from inside the home dug through its floor and doorway. Fixed: skills
   that dig for themselves leave a known home alone (checked live). Three Luna teams on recent code: 2
   whole goals in 7 reps. **tluna4** (3 of 5 reps, stopped, US$1.38): 3, 3 and 1 parts, iron missing
   in all; with the door, a home was open 10% of the night against 21%, monsters inside it 5 times against 27,
   night deaths about 2 a rep against 6. Fixed after: descend and tunnel inside a home walk out by themselves; a door is never
   made at a far table (lc looped 125 times on a false "no building block"); harm between players off. Luna on
   recent code: 2 whole goals in 10 reps. **Overnight 30 October (the owner's ask: Luna more than half the
   time; a review and fix after each rep):** nine one-rep runs, tluna5a-i (US$3.22): 1, 2, 2, 2, 3, 2, 2, 2
   parts, then the whole goal in the last (tluna5i, US$0.28, one agent made all three iron pickaxes), so 3 in
   19 on recent code. Home every rep; iron the part missing until the last.
   Fixed after each: rotten flesh eaten when it is all there is; smelt mines its furnace's stone and takes back
   what it didn't smelt; give throws across and retries past the receiver; descend and tunnel plug water instead
   of refusing it; the pathfinder's timeout in plain words; nothing put in a doorway's way; beds only where the
   room stays walkable (two homes became traps, 5g and 5h). Each checked live. Left as the agents': an agent
   that made all three pickaxes died far from the team at health 7 with no food, another sat 80 decisions at
   health 3 fleeing a spider that couldn't reach it. Not found: what shut 5g's agents in (a workbench in the
   doorway does it, and is guarded). Write-up 06. **Done after (the owner's asks):** digs now take the game's
   own time (descend 16 blocks 74 s to 31 s, mine_stone 26 s to 19 s, tunnel 28 s to 24 s, measured live: a
   third of descend's digs had started before landing, five times slower); a walk that stops more than a block
   short fails, saying how far, instead of passing as arrived; placements of workbenches, chests, furnaces and
   beds are logged with where. **Afternoon 30 October, one rep at a time, gaps reported before any fix (the
   owner's rule):** tluna6 (2 of 4), tluna6b (3 of 4), tluna6c (2 of 4), US$1.01. Fixed after, each checked
   live: anything put down in a home goes only where the room stays walkable (a furnace had sealed its back
   half); every tool shows its uses left, and each skill says what it spent; no diagonal step past a solid
   corner (an agent snagged on a bed all night). **Then the home itself (the owner's call):** the large
   home is one room, 5×5 and 3 high, not two storeys of 2 high; no agent ever used the upper room, and beds
   under a 2-high ceiling were the cause of most home traps. team-base runs from here on are not directly
   comparable with earlier ones on the home part. Open: "This bed is obstructed" (a block found on top of
   a bed, placed by something unknown); two dropped iron pickaxes nobody could pick up (tluna6c, cause
   unknown). **Evening 30-31 October:** tluna7a (first rep on the one-room home) met the whole goal by day 2,
   US$0.16; tluna7b 2 parts (lc made all three iron pickaxes 65 s before the end, after waiting out the last
   night underground) and then each observation says which day of the run it is (the owner's call); tluna7c 3
   parts. Doors are now made on the spot from logs, and the report counts sleepers in a one-room home.
   **tluna8** (5 reps, frozen 2ae4987, US$1.58): 1 whole goal (rep 4, first night, US$0.06); 2, 3, 2, 4 and 3
   parts; home and food every rep, deaths 7 in all. Iron is what is left: lost in deaths carrying it (reps 2,
   3, 5; rep 3's la died with all 17 raw iron mined) and in a last-minute swap of pickaxes (rep 1). With
   tluna7a, 2 whole goals in 8 reps on the one-room home. Looked into after (read-only): rep 3 nobody slept because
   a second large home held all the beds, 58 blocks from where everyone sheltered; a second home went up in 4 of 8
   reps. Fixed: asked for a large shelter, `build_shelter` goes to a teammate's large one up to 80 blocks away
   (was 32). Set aside: showing the item a teammate holds (`docs/ideas.md`). Rep 4's win: roles set in the first
   decisions and kept, one agent straight through to 9 iron, one question about iron all run. tluna9a 2 parts (two
   agents stuck underground by a lake, cost sleep; the log now records the blocks round a failed walk), tluna9b the
   whole goal. **tluna10** (5 reps, frozen 124f45b, US$1.96): 1 whole goal; 4, 3, 3, 3 and 2 parts. **On the one-room
   home: 4 whole goals in 15 reps, 27%; home and food in all 15.** Iron is what stands between that and more than
   half: lost in deaths carrying it. The minds panel's Progress card now shows each goal's own parts.
   **31 October-1 November:** `flee` keeps to its height underground (17 healthy agents had died fleeing through
   tunnels); **tluna11** (2 reps, US$0.77): 1 whole goal, so **5 in 17 on the one-room home**; rep 2 ended with the
   stored meat eaten down to 7 and the team's second pickaxe lost with an agent at health 1. **tluna12a** (US$0.29,
   not comparable): la crashed on day 1 holding all three pickaxes; the others met every other part. Fixed after,
   each checked live: under a home `flee` goes up into it by its doorway; walks into a home go by its door; a far
   home is walked to in legs, and unloaded ground no longer crashes an agent. tluna12b stopped early by the owner
   (an agent stuck), not looked into. Write-up 06. All pushed 5 November. **tluna13** (7 November, one rep on
   828d025, US$0.38): 3 of 4 parts (home, all slept, 10 meat), no iron pickaxe at the end; 10 deaths. Gaps
   reported to the owner, not fixed yet: one pickaxe made all run, lost twice to a witch throwing potions into a
   home with 15 gaps blown in its walls and no blocks left to fill them (a witch isn't treated as a ranged
   attacker); `mine_ore` refused 23 times (all iron within 48 blocks wet or by lava, "descend closer") while
   `descend` refused for drops into caves and water; `descend` from inside the home refused 5 times for no open
   ground before its door. Not written up yet. **Fixed after (the owner's calls, 7 November), each checked live:** a
   witch is an archer with a 13-block throw (measured: potions hurt to 12.7 blocks, none at 14 or through a wall), so
   the body takes cover from it while the model decides; `mine_ore` plugs water touching ore and mines it from a dry
   place, dug out of the rock if need be, never swimming (tluna13's lake-wall iron: 2 raw iron in 26 s); `descend`
   and `tunnel` from inside a home walk out to any open ground before the door (the agents' own stairs had left the
   straight line out with none). Still open: dry iron 14-40 blocks down that `descend` can't reach past caves and
   water. **Then torches (the owner's ask):** a `light` skill, and `build_shelter` lights a home it finishes or
   enters when the agent has torches, coal or charcoal (checked live: one torch took a sealed dark room from 121 of
   121 cells dark to 0). **tluna14** (7 November, one rep on bf666b5, US$0.37): 3 of 4 parts again (home, all slept,
   11 meat), 1 of 3 iron pickaxes; 2 deaths (tluna13: 10). The home was lit (3 torches, from coal lb carried); no
   agent chose `light`. `mine_ore` 3 of 12 worked (tluna13: 0 of 27), one on plugged wet ore. No witch, no doorway
   refusal. Gap reported, not fixed: `descend` stopped 5 times at "every way down is unsafe: water below" on all
   sides (y=59 to 36), cut short 6 times by teammates' messages and twice by running out of air; la made a pickaxe
   on day 1 and died with it that night. Not written up yet (tluna13 and tluna14 together). **Then a new world
   (the owner's call):** seed `testbed`, chosen by a survey of seven: water under 9% of the ground round spawn
   against 42%, trees 39%, open grass 32%, flat (62-70); the herds moved to its grass. Main world reset to it and
   both servers checked (seed -1422453073, the hash of "testbed"). **tluna15** (8 November, first rep on testbed,
   3d0702b, US$0.54): 1 of 4 parts (home only; 2 of 3 slept, 1 pickaxe, 8 meat), 7 deaths. Gaps reported, not
   fixed: `flee` dug in 3 blocks down in sand with nothing to cover the hole, reported success, and left lc in the
   pit for 67 decisions (41 more flees, 17 pick_ups, never climb_out); sleep refused 23 times for monsters nearby;
   `hunt` found "no sheep within 32" 19 times: the herd scatters on open grass (never more than 4 seen at once,
   14 killed). **Fixed after (the owner's calls, 8 November), each checked live:** `flee` digs in only when the
   hole can be covered (never with sand or gravel), and `climb_out` gets out of an open pit, digging its walls for
   blocks to build up on (6 of 6 pits walked away from); `sleep` leaves monsters to the game's own rule, measured
   live (about 7 blocks a side, 6 up or down, walls or not), instead of our 10-block check, which caused 8 of the
   23 refusals; the other 15 were monsters 2-7 blocks outside a closed home, which the game refuses; `hunt` and
   `shear` look 64 blocks out (12 sheep at 49-59 blocks: 2 killed in 18 s). Then the door (the owner's call): 3 of
   tluna15's 7 deaths were zombies inside the shut home. A door is no longer opened with a monster within 6 blocks of
   it or of the agent, and while the model decides the body hits a monster inside its home in reach (live: alone
   with a zombie inside, unguarded died, guarded killed it in 5 blows at full health, 3 of 3). How the zombies got
   in was not reproduced: on the old code 5 chases in and 4 walks out with a zombie at the door let none in; the
   door was broken twice by creeper blasts in that run. **tluna16** (8 November, one rep on 5908aaa, US$0.14): **the
   whole goal**, by day 2 (31:50 of game time), the first on the testbed world; 1 death; 165 decisions in all. None
   of the new guards fired (no door kept shut, no monster inside, no torch, no pit, no sleep refused for monsters),
   so the win says the code allows it, not that the fixes caused it. Not written up yet (tluna13-16 together).
   **tluna17** (8 November, the owner's ask: the fixes on the first world; SEED=multiagent, 478ba33, US$0.21): **the
   whole goal** again, by day 2 (30:25); 2 deaths (a skeleton, a witch); one door kept shut, one torch up; la's
   `mine_ore` failed all 14 tries but the team mined 9 raw iron. On that world tluna13 and tluna14 (before the
   fixes since) met 3 of 4. So on the latest code: 1 of 1 on each world. One SEED setting now picks the world for
   server and agents, with each seed's herds (`HERDS_BY_SEED`). Noticed, not fixed: the report credits items that
   arrive during a smelt to the smelt ("lb smelted 2 iron pickaxe": one given by la, one crafted). **Next:** more reps
   on this code, on either world, to see the rate (ask first), then the write-up of tluna13-17.
   **Overnight 8 November (the owner's ask: 3 reps per world, US$2.90 credit; capped US$0.25 an agent, a driver
   that stops before a rep could pass US$2.75):** all six ran on 15fca7f, US$1.88. Original world (tluna18a-c): 3, 3
   and 2 parts, no whole goal; with tluna17, **1 of 4**. New world (tluna19a-c): 3 parts, **the whole goal**
   (19b, 17:51 of game time, US$0.09, no deaths) and 2 parts; with tluna16, **2 of 4**. Home every rep, food every
   rep; iron the part missing in 5 of the 6 losses. Where it went: on the original world, pickaxes made and lost in
   deaths (18a: all three made, la died carrying two), `descend` stopped by water below (18b, 19 refusals), and 10
   of 18c's 13 deaths healthy agents (13-20 health) killed while fleeing underground (y 31-53); on the new world one
   pickaxe short twice (19a lost one in a death; 19c made two). Sleep: 19c nobody slept, mostly not tried (3
   tries); 18c one never slept. The guards fired: intruders fought in 3 reps, doors kept shut 7 times, wet ore
   plugged in all 3 original-world reps, torches up in 4; `light` never chosen. Open, not fixed: underground flee
   deaths on the original world; descend past water below; 19c's "walking to the door timed out" from inside a
   home (5); the report undercounts sleepers (19b: all three slept, it says 2) and credits items gained during a
   smelt to the smelt. Not written up yet (tluna13-19).
   **Fixed after (the owner's calls, 8 November), each checked live:** underground with a monster close, `flee`
   shuts the agent in before running (dug in, into the rock, or walled in; carved caves, monsters 7 blocks off:
   old died 3 of 3, new survived 3 of 3); inside a home with no monster in it, `flee` closes the home and stays, and
   never digs or walls up inside one (19c's door timeouts: two dig-ins through the floor left blocks that, with the
   table, furnace and chest, boxed the room's centre; old walled itself in the room 3 of 3, new closed up 3 of 3);
   the report counts sleepers where they slept (19b and 18c were 3 of 3, so 18c met 3 of 4 parts, not 2) and credits
   smelts and crafts only with what they made. Owner's questions (8 November): progress was off in every run (its
   own condition); agents talk a lot (1,181 messages in 2,143 decisions, 120 questions, 65 answered) and see shared
   sightings and chests in most observations; no agent ever stored iron (0 of 21 stores); 10 swords made, no armor
   or shield, never chose to fight a monster (226 flees). The owner is unhappy switching worlds: the original world
   is the one to beat. Then (the owner's calls): progress on by default (71f7942); `descend` and `tunnel` light their
   way, a torch every 8 steps from what is carried (checked live: 2 of 113 path cells left dark); fighting and
   shields left for a later round. **tluna20a-e** (9 November, the original world, 086a57d, progress on, US$1.45
   estimated, about US$0.75 billed): **3 of 5 whole goals** (20a 49:39, 20b 25:34, 20d 47:26 of game time); 20c and
   20e met everything but iron (0 and 1 of 3 pickaxes). With tluna17, the latest code is 4 of 6 on the original world
   (tluna18a-c, before the flee/home/torch fixes and with progress off, 0 of 3). Deaths 4.4 a rep against 7.3,
   underground 2.4 against 5.0; but 13 healthy agents still died fleeing (10 underground). Underground flees: 37
   reached home, 11 shut in, 8 tried home and failed, 24 ran with a monster within 10. Fatal ones mostly had home 29-46
   blocks off: flee still runs for a home that far through the cave before the shut-in is reached. Not fixed (the
   owner's call): shut in first underground and run home only when it is close. Torches along the way: 41 placed;
   10 descents and tunnels had none to place. Our cost estimate is about double the bill (cached input priced in full).
   **tluna21a-c** (9 November, 35e2506: underground flee shuts in before running for a home more than 12 blocks off;
   stopped by the owner during 21d, whose partial logs are in runs/.killed): **0 of 3** (3, 3 and 2 parts; iron short
   in all, 21c also 9 of 10 meat). 27 deaths (9.0 a rep against 4.4 in tluna20): 15 during flee on the surface, 6
   underground; 6 underground shut-ins, none followed by a death. On the original world the latest code stands at
   4 of 9 (tluna17, 20a-e, 21a-c). US$1.09 estimated. **Why it was worse (looked into, 9 November):** not the flee
   change. In 21a and 21b nobody slept on night 1: no beds until day 2 (wool late: 21a's day-1 sheep hunts failed 9
   of 12, 5 of them cut short by teammates' messages and 4 "the sheep got away"; in 21b sheep were in view in 15 of
   142 day-1 observations against 64-99 elsewhere). With no bed there is no respawn point: 19 of 27 respawns were
   outside the home (tluna20: 3 of 22), at night, empty-handed, and 18 deaths came before an agent's first sleep (tluna20:
   3). Respawned with nothing, flee could not dig in ("stone too slow without a pickaxe" 12 times) or wall in (no
   blocks, 8), and the home had monsters at its doorway, so it ran until it died: lb died 7 times on night 2 of 21a.
   That spiral began with lb walking out of the closed home at night to dig (its own choice, left alone).
   **Changed after (the owner's calls):** a bed put down, or found in a home walked into, is used by day, which makes
   it the agent's respawn point (live: both agents came back 3 blocks from the home's centre); `hunt` runs to its end
   through teammates' messages, which wait for the next decision. **tluna22a-b** (9 November, 90ff1ec, US$0.93
   estimated): **0 of 2**, both 3 of 4 parts, iron short (2 and 1 of 3). The two changes worked: 3 deaths a rep (21a-c:
   9), every agent asleep on night 1, every respawn inside the home, day-1 sheep hunts 12 of 17 worked. Iron is the
   only part left: pickaxes made and then lost in deaths on day 3 (22a lc; 22b lb twice), and in 22a lb could not walk
   out of the closed home 26 times ("No path to the goal") on days 2-3, with its doorway holding a block, not a door;
   not reproduced live (two tries could not build a whole large home on this world's forest ground). The latest code
   on the original world: 4 of 11.
   **Where agents get stuck (looked into, 9 November; ten reps on the latest code, 3,938 decisions):** 23% of
   decisions failed, but only 244 in runs of the same skill failing back-to-back (pick_up 62, sleep 41, flee 31,
   ask_agent 22, go_to 22, give 20). Standing still is the bigger thing: 1,615 decisions in stretches of 8+ within 3
   blocks, 1,327 of them in the home; some trapped by our code, more waiting and messaging about iron instead of
   mining it (left as the agents' own behaviour). Fixed (the owner's calls): a doorway filled with blocks is dug out
   before walking through (gravel two high had shut lb in for 100 decisions in 22a; reproduced at its spot, fixed);
   after the same skill fails the same way 3 times in a row, the failure says plain facts: where the agent is, the
   home's doorway, and what lies on the ground (no advice; smoke-run only, not seen live in a repeat). The owner
   declined guidance or the code stepping in.
   **tluna23** (9 November, 00b5fb2, US$0.32 estimated, about US$0.12 billed): 3 of 4 parts, **no iron pickaxe**: 5
   raw iron mined in three days, none made. Safety held (3 deaths, none at night, every respawn in the home, the
   facts note fired once). What stopped iron is water: descend stopped at "every way down is unsafe: water below"
   11 times, and mine_ore found iron only "under or below water" with no dry ground beside it 12 times. That is the gap
   left open after tluna14 (descend plugs water behind a block, not below it), now the main one on this world. lb also
   could not walk out of the home twice ("No path"), not looked into. Latest code on the original world: 4 of 12.
   **Then (the owner's calls, 10 November):** descend and tunnel fill water in or under the next step with a block
   carried (live at tluna23's spots: old reached y=30 from 1 of 3, new from 3 of 3, health 20). Wet ore: left alone
   after a look (round tluna23's mines 502 iron ore within 48 blocks, 14 in sight, 1 wet, on a pool's floor; the rest
   is reached by digging, which descend now can). lb's walk-out in tluna23: no snapshot was taken at that spot and
   the wall had changed since the last one, so the cause is unknown. Cost: GPT-6 cached input is now priced at its
   listed rate (Luna $0.01) instead of in full; tluna20 re-priced is US$0.69 against US$0.53 billed (was US$1.45).
   BUDGET_USD caps are on the estimate, so a $0.25 cap now allows about twice the real spend it did.
   **mine_ore and the loop (looked into, the owner's calls, 10 November):** of 188 mine_ore calls in 11 reps, 87
   failed at once on ore in sight it would not mine; only 17 were retried within 3 decisions, half citing ore "in
   sight". Only 8 of 71 ore failures were an ore that had failed before (lb 6 times on one), and 24 were interrupts
   logged as the ore failing. Changed, each checked live: one rule (`unmineable`) for mine_ore and the shared
   sightings, which now mark partly wet veins too; the refusal says why each can't be mined ("can't be mined from
   here: under water with no dry ground or rock beside it"); failed ore is left alone for 10 minutes across calls; an
   interrupted walk no longer marks the ore failed; the description states the dry-ground condition.
   **tluna24** (10 November, 94c2dd0, US$0.17 on the new pricing): 3 of 4 parts, no iron pickaxe (la made one and
   died with it on day 3); 4 raw iron in all. The water fix backfired here: descend was cut short 49 times, 39 by "you
   are under water and running out of air", in a flooded layer at y 57-61 under the home (x 8-16, z 20-24). It fills
   the water in its step, but water floods in from all round; the swim-out reflex lifts the agent and it tries again
   (la 16 times, lb 12, lc 11). Before, descend refused there. The live check passed only because its three spots had
   small pockets. Latest code on the original world: 4 of 13. No agent used tunnel all run; they kept choosing
   descend because its new description promised to handle water and each failure read as a passing "under water"
   interrupt. **Changed (the owner's calls):** descend stops when water keeps coming back (6 s with the head under,
   or under twice in one call), says so, and refuses to dig down within 6 blocks of there for 10 minutes; its
   description no longer promises more than it does; the repeated-failure facts count a skill driven out by water.
   A count of water round the step could not tell a pocket from a flooded layer (10-11 where filling worked, 11-14
   where it did not), so it was dropped. Live, in a built flooded layer: first dig down through it fine (2 s under);
   back down the stair it had flooded, stopped after 6 s at health 20; a third try 3 blocks off refused at once;
   tluna23's spots still reach y=30.
   **tluna25** (10 November, 071cbaf, US$0.23): 3 of 4 parts, no iron pickaxe (lc made one on day 2, gave it to lb, who
   died with it on day 3); 5 raw iron in all. Air interrupts down to 12 (tluna24: 39); but descend was refused 35 times
   "you were driven out by water digging down within N blocks of here": the flooded layer lies under the home, and the
   agents kept starting descents from near it, each time after doing something else (only 1 right after a refusal), so
   the repeated-failure facts never fired. tunnel once all run. Latest code on the original world: 4 of 14. OpenAI credit about US$0.65 left (estimate). Was open: the deaths at night round the home, most of them during a
   flee, often with a skeleton in view or right after a respawn. Credit after these: Anthropic about
   US$1.70; OpenAI about US$0.75 after tluna3 (an estimate: the balance couldn't be read).
5. **Small, any time:**
   - **Done (28 October, the owner's call): herds restocked each morning.** Failed reps were the ones
     with deaths on day 1 (every success had at most one), and lost food and wool couldn't be replaced:
     the game barely brings animals back in the dark forest. Now at each dawn the herds are put back to
     their number, silently (checked live: 12 sheep, 5 killed, 12 again after dawn). keepInventory was
     considered and left alone: it would remove the cost of dying, which is part of the test.
     **Proof run bpoc11** (three Lunas, US$0.25): the restock worked (4, 5 and 9 animals put back);
     lc lost its wool to deaths three times and gathered it again, and three beds went into the home.
     2 of 4 parts: lb made all three iron pickaxes 43 blocks underground and never got out, so neither
     the pickaxes nor the last sleeper reached the home. Write-up 06.
   - **Done: getting out of caves** (after bpoc11): `climb_out` steps onto the block it hangs off
     before building up, checks the hand before each placement and retries a jump; library errors are
     in plain words; a skill cut off by an interrupt is reported as interrupted. Checked live (the
     edge case reproduced, then fixed). **bpoc12** (US$0.31): the cave fix held (six climbs, none
     refused), but 8 deaths cost the wool, the meat and an iron pickaxe: 1 of 4 parts. lb's agent
     crashed (cause unknown); crashes now write their stack to the run's log and the scripts keep the
     console. Write-up 06.
   - The prompt-caching article (rrjamal.ca, draft): four TODOs before publishing.
   - The tbase3 `give` timeout to a teammate inside the closed home (cause unknown).
   - The second drowning gap: a skill started after a failed escape from water (`docs/limitations.md`).
   - The merged branch `worktree-goals-section` on GitHub can be deleted.

Costs to plan with: a 3-rep mixed team run is about $8 (tbase6: $7.80); a Luna team run about
$0.25-0.40. Ask before any paid run, and no Claude run without the owner's OK. The cap is $3 per agent
per rep (Opus costs up to about $2.70 over three days).

## Where things stand

- **The experiment** lives in `src/agents/`; every command runs from there. The root holds the docs,
  README, CLAUDE.md, the site (`src/site/`) and its hosting (`src/terraform/`).
- **The site** is live at `multi-agent-experiment.rrjamal.ca`: a private S3 bucket behind CloudFront,
  deployed by `.github/workflows/site.yaml` on every push to `main` (it signs in to AWS through
  GitHub's OIDC by hand, since workflows may use only GitHub's own actions). It is built from `docs/`
  at build time; the Results page and batch summaries come from `docs/results/batch-reports/`
  (`src/site/lib/batches.ts`), so `src/agents/scripts/publish-reports.sh <name>` puts a run on the site
  at the next push. Lesson cards and the Results story are hand-written (`src/site/content/`).
- **Results so far** (`docs/results/`):
  - One agent, one day (`outpost`): after the fixes every paid model met it 12 of 12 (p6); the free 4B
    local model met it 0 of 9, looping on what it already had (write-ups 02 and 04).
  - Teams of three, three days (`team-homestead`, then `team-base`, write-ups 05 and 06): the mixed
    team (Opus, Sonnet, Luna) met the whole goal in rep 1 of tbase5 and of tbase6; teams of three
    Lunas never have, though bpoc6, bpoc9 and bpoc10 met three of four parts (bpoc11 two).
  - What the agents do: split the work at once and keep to it; answer requests, not needs; trust what
    they were last told over what changed; run from monsters (a sound choice: most are unarmed).
  - What the tools learned (`docs/lessons.md`, and 06's "How this testbed gets better"): reflexes for
    the seconds the model can't act, escapes that lead somewhere safe, shared sightings and chest
    contents, honest tool results, waiting for a respawn before observing.
- **Known limits** are in `docs/limitations.md`; ideas not started in `docs/ideas.md`.
- **The owner pushes `main`**, which also deploys the site; Claude commits locally and never pushes.

## Setting up a new machine

1. Docker, [Ollama](https://ollama.com/) and Node 25+, then `cd src/agents && npm install` (its
   postinstall patches the browser viewer so beds and chests are drawn).
2. `cp .env.example .env` and add `ANTHROPIC_API_KEY` (and any other keys). Never commit it.
3. `./start.sh --check` says what's missing. It pulls the local model (`qwen3:4b-instruct`); the
   agent makes its 8k-context variant itself on first use.
4. `npm test && npm run typecheck` should pass with no server, model or key.
5. `runs/` (run logs) is not in git, so it starts empty. The results that matter are written up in
   `docs/results/`.

## Comparing runs: where the code changed under them

Runs on either side of these lines compare only loosely.
- **18 October:** the collaborative stance lost "so share what you find and split the work"; `air`
  and `gather_wood` worded better. Team runs trio1-trio3 had the old wording.
- **19 October:** one definition of day and night (`src/agents/src/daytime.ts`): nothing time-related
  compares across it. The prompt explained `recentEvents` and offered `give_up`.
- **26 October, from bpoc6:** `store` says a chest keeps items through a death.
- **27 October:** the team report counts what a death between steps took, and no longer reads a
  death's drops as tools worn out; reports rebuilt since may differ from ones published before.
- **From tbase6:** the cap is $3 (tbase5: $2, which ended Opus early in reps 2 and 3).
- **After tbase7 (28 October):** the herds are restocked each morning; food and bed results compare
  with earlier runs only loosely.
- **From 10 November:** costs of GPT-6 runs are priced with cached input at its listed rate; reports rebuilt
  since then show about half the cost of the same run published before.
- **From 8 November (after tluna19): progress is on by default** (each observation lists what the goal still
  lacks); runs before had it off unless named (tlunap1). They compare only loosely.
- **From 7 November (after tluna14): a new world, seed `testbed`** instead of `multiagent`, with the herds
  moved to its open grass. Nothing about the terrain, ore or distances compares across it.

## Done, in short

The write-up named on each line has the detail.

**18 October**
- Paid models on `tools`: Haiku, Sonnet and Opus each met it in 4-5 decisions for $0.01-0.04 (poc1).
- Teams: `team-camp`, `give`, `pick_up`, `go_to`, requests between agents (`tell_agent`, `ask_agent`);
  trio1 met it ($0.33), trio2 didn't, trio3 met it ($1.28), quad1 met it in 4:54 ($0.28).
- Claude decides through a `decide` tool; agents are told their own name; optional skill args.
- `npm run compare` (comparison report); the minds panel shows agents as they start.
- Prompt caching on paid models (17 October; Haiku never caches: its minimum is above our prompt).
- Made public: history scanned for secrets, `protect-main` enforced with CI.

**19-20 October**
- `outpost`, one long run each (p2): 3 of 4 met; Haiku's "met" was a bug in our night check (fixed).
  Write-up 02.
- p3, p5 (Opus 2 of 3, Sonnet 1, Luna 1, Haiku 0), then the fixes (doorway closed behind the builder,
  table crafts no longer hang) and p6: 12 of 12, no deaths, $1.66. Write-ups 02 and 04.
- `climb_out`, `mine_stone` measuring its drop from where it started, `underground` in the observation,
  `hunt` and `shear`, tool wear (`wearingOut`), drowning fixes (`breathFix.ts`).
- The free model: 0 of 9 on `outpost` (b15, b16); its looping is reported, not fixed (the owner's call).
- `team-homestead`: thome1, 0 of 3, $9.67. Write-up 05.
- `team-base` and large shared shelters; proof runs bpoc and bpoc2; tbase1, 0 of 3, $11.70, with five
  fixes from it (`mine_ore` reach, `take` amounts, a zombie in a "closed" base, beds dug through,
  report counts). Reports and write-ups put the team and the goal first. Write-up 06.

**21-23 October**
- The experiment moved to `src/agents/`; the site went live.
- tbase2 and tbase3 (0 of 2, iron and food moving); tbase4: 3 of 4 parts, every agent with an iron
  pickaxe for the first time. Fixes: treetops, `look_in_chest`, beds shown and `place_bed`, sleepers
  staying in bed. Write-up 06.
- tluna1 (three Lunas, 0 of 3); tlunap1 (`--progress on`, 0 of 3, food kept in every rep). Fixes: a
  death ends any skill, one rule for the team's home, holdings shared every 2 seconds. Write-up 06.
- `mine_stone` timeouts: the pathfinder left a shovel in hand; now the pickaxe goes in hand first.

**26 October**
- The site reframed around building agents (`docs/lessons.md`, lesson cards, Case studies); a Goals
  section on Results.
- Doorways: mobs at a shelter's doorway named in the observation, and going in stops short of them.
- Proof runs bpoc3-bpoc6 and what they led to: reflexes while the model decides (step back from melee,
  take cover from archers, swim out), `flee` running only to finished shelters within 64 blocks and
  staying put inside, shared animal sightings, a 12-sheep herd, `store` saying chests keep items
  through a death, stuck spots walked round, `place_bed` passing over bodies. bpoc6: 3 of 4 parts.
  Write-up 06.

**27 October**
- tbase5 (Opus, Sonnet, Luna, $7.96): rep 1 met the whole goal, the first team ever. Write-up 06.
- Digging stops only for a monster that can reach the agent; ore seen is remembered and shared
  (`oreSeen`); `climb_out` steps out from under gravel; a block on the head is dug out; `smelt` picks
  fuel after making the furnace; every dig uses the cheapest tool that does the job.
- Proof runs bpoc7-bpoc10; `flee` digs in at night (checked live: 10 of 11 survived, old code 1 of
  3), honest about whether it did; `chestsSeen` and chest-change events; bed refusals give the game's
  reason. The run of deaths and fixes told as one story in 06 ("The problem that kept coming back").
- tbase6 ($7.80): rep 1 met the whole goal again; rep 2 one pickaxe short; rep 3 no beds, a spawn
  trap. Report published; write-up 06; a site chapter.

**28 October**
- The agent waits for its respawn before observing (90 decisions had been made at health 0).
- Chest calls say why a chest didn't open.
- The skill-description replay: the detail earns its place, mostly in safety (`docs/ideas.md`).
- Beds and chests drawn in the browser viewer (`scripts/patch-viewer.mjs`); the minds page no longer
  bounces past its panels.
- The prompt-caching article drafted on rrjamal.ca (pushed as a draft).
- A Stats page on the site (`#/stats`): runs, decisions, cost, deaths and goals met, in all and by
  model, added up from the published reports.
- Herds restocked each morning; proof run bpoc11 (2 of 4 parts, an agent trapped underground with
  the team's iron pickaxes). Write-up 06.
- The Stats page shows each model's typical time to decide; the browser viewer darkens at night.
- Getting out of caves: `climb_out` from the edge of a block, the right item in hand, plain errors.
- Proof run bpoc12 (1 of 4 parts, 8 deaths); crashes keep their stack.
- thaiku1, three Haiku 5.5 agents (0 of 4, no deaths, US$0.20); a `respawn` skill for an agent no skill can move.
- `climb_out` swims up onto a bank; thaiku2 (Haiku reps 2-3): 2 of 4 parts each.
- `climb_out` swims to air under rock; tluna2: the first all-Luna win (1 of 3, US$0.15); tmix1 (Sonnet + 2 Haiku): 2 of 4.

**29 October**
- tluna3: 0 of 3; six Luna reps, 1 win. `mine_ore` mines ore with water only beside it.
- Night deaths reviewed; homes get a real door, kept shut, and walls the pathfinder never digs.
- bpoc13: the whole goal, no deaths (nights slept through); skills that dig leave the home alone.
- tluna4 (3 reps): the door halves open-home nights; fixes for descend-in-home, far-table doors, and harm between players; richer call logs.

**30 October**
- Overnight, tluna5a-i (nine Luna reps, a fix after each): the whole goal in the last only; fixes to eat, smelt, give, digging through wet ground, doorways and bed placement. Write-up 06.
- Digs at the game's own speed (descend about 2.4 times faster); walks that stop short say so; placements logged with where.
- tluna6, 6b, 6c (one rep at a time): room check for every placement in a home, tool uses shown, no corner-cutting past a bed.
- The large home is one room, 5×5 and 3 high, instead of two 2-high storeys; the team-base goal asks for "one large shelter".

**31 October**
- tluna7a-c, then tluna8 (5 reps on frozen code): 1 of 5 whole goals; doors on the spot; the day of the run shown. Write-up 06.
- A teammate's large home counts within 80 blocks; failed walks log the blocks round the agent; tluna9a-b and tluna10 (1 of 5). On the one-room home: 4 of 15.
- The minds panel's Progress card shows each goal's own parts.
- `flee` keeps its height underground; tluna11 (1 of 2); under a home `flee` goes in by the doorway, walks into a home use its door.

**1 November**
- tluna12a (not comparable: an agent crashed); unloaded ground no longer crashes an agent, far homes walked to in legs. Write-up 06.
