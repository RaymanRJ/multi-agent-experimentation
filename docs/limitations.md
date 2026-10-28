# Known limits and further work

What this MVP does not do, does not do well, or has not been tested on. Nothing here is being
worked on. The list is so a reader knows where the edges are before trusting a result or
building on it.

## Not yet tested

- **Extended thinking is off for every model, and its effect is unmeasured** (decided 18 October).
  Claude is never asked to think before answering (no `thinking` in the request), and there is no
  `--thinking` option. What stands in for it: Haiku often writes its reasoning as text before its
  decision, and GPT-6 reasoning models think internally at their default effort.
  - **Why it might help:** what holds the agents back is planning, not mechanics: loops, believing
    they hold things they don't, misreading the goal. Haiku's best decisions are the ones it reasons
    through first.
  - **Why it is off:** it costs several times more per decision and makes each one slower, while
    the game keeps running; Sonnet and Opus already meet the simple goals in 4–5 decisions. It
    would also be its own condition, so runs with and without it can't be pooled.
  - **To measure it:** add `--thinking on|off` (a thinking budget in the Claude request), recorded
    in the run config like memory and stance, then run the same long goal (`outpost`) with it on and
    off on one model, Haiku first, for a few dollars. The decision tool is offered, not forced, so
    it already allows thinking (the API refuses a forced tool together with thinking).
  - Logs already keep any thinking a provider returns (`thinking` on each call), so nothing else
    needs to change to read it.
- **Paid models have been compared on one goal only, three runs each.** Haiku 4.5, Sonnet 5.5,
  Opus 5.5 and GPT-6 Luna ran `outpost` in batches p2 (once each), p3 (stopped early), p5 (three
  each: Opus 2 of 3, Sonnet 1, Luna 1, Haiku 0) and p6 (the same after the p5 fixes: 12 of 12). On
  this goal they now differ only in cost and decisions; the models are not yet ranked on anything
  harder. No paid model has run `iron` or `diamond`. Opus, Sonnet and Luna have played
  `team-homestead` together (thome1, 0 of 3; `docs/results/write-ups/05-team-homestead.md`).
  - Prompt caching works on Sonnet, Opus and Luna (about 83–88% of input cached in p5 and p6). Haiku 4.5
    never caches: our prompt is below its minimum.
  - Grok, Gemini, Groq and OpenRouter are wired up and unit-tested only. Each needs its model's
    price in `src/agents/src/backends/pricing.ts`, or a paid run refuses to start.
  - **Claude decides through a tool; GPT and the local model write JSON text.** Claude is offered a
    `decide` tool (not forced), because Sonnet 5.5 otherwise wrote its decision as tool-call syntax
    in text on about half its calls, each one re-asked. With the tool it sometimes calls a skill's
    name as a tool instead (`mine_stone`); that is read as choosing the skill, but such a decision
    carries no rationale, plan or message. OpenAI's reasoning models refuse tools on
    the Chat Completions API unless reasoning is switched off, so GPT is not offered it; moving GPT
    to the Responses API would allow both. The system prompt is the same either way.
- **The `iron` goal has been met only twice** (batch b13, sandbox, one day, three runs per
  condition): both by the model with `--progress on` (2/3). The model without it and the
  baseline went 0/3. Too few runs to credit the progress list. Details in
  `docs/results/write-ups/03-iron.md`. Open problems found there:
  - **The baseline waits out the night above y=55 even in the peaceful sandbox,** losing about
    11,000 ticks in two of three runs. The rule is meant for survival.
  - **`mine_ore` often couldn't reach iron it could see** ("out of reach", 20-second dig timeouts),
    then gave up after five blocks. Found the cause after tbase1 (44 iron ore blocks given up, 15 raw
    iron in 53 tries): the pathfinder stops within 2 blocks, which can leave rock between the agent
    and ore whose open face is on the far side. It now digs up to 3 blocks through to the ore, and
    waits for the drop; live, where Opus failed, 0 of 8 raw iron became 8 of 8. The 20-second dig
    timeouts are still seen, rarely.
  - **"need 3 more cobblestone" didn't name `mine_stone`,** unlike the planks message, which
    names `gather_wood`. The model retried the craft 4–16 times per run before mining stone.
    Since fixed, but not yet confirmed in a full run: the message now names `mine_stone`.
  - **`descend` to y=16 takes 3,000–6,000 ticks** and usually wears out a stone pickaxe.
  - **Deaths:** since 20 October the agent is told where it died, what killed it, and that its items
    vanish 5 minutes later; in thome1 it went back 3 times in 48 deaths.
- **The `diamond` goal has only been checked skill by skill** (`src/agents/scripts/skill-smoke.sh`), never
  as a full run.
- **Other platforms.** Developed on an Apple Silicon Mac. Linux, Windows (WSL2) and Intel Macs
  should work but are untested. So is running Ollama in Docker on an NVIDIA machine.

## What agents can't do

- **Fighting is melee only (since 19 October).** `hunt` kills animals, mobs or other agents with a
  sword, an axe or bare hands; there are no bows, shields or armour use. In p5 models chose it 7
  times: a zombie, a cow and a skeleton killed, a pig and a salmon got away. One fight is
  unexplained: a zombie inside Sonnet's shelter took it from 20 to 5 health with no kill, where the
  same fight on a test server took five hits and no damage. Since 20 October every hit is reported
  as a player would see it: the agent hit is told by whom, the attacker when it hits another agent,
  and agents within sight see "qa hit qb" (repeated hits fold into one line). Each run log records the hits
  between agents, and the run report and batch comparison count them (given and taken, by whom).
  `hunt` gives up on a target only after 30 seconds out of reach since its last hit; it used to be 30
  seconds for the whole chase, so a target knocked back down a slope "got away" mid-fight. Live, a
  stone and a wooden sword each killed another bot, in about 20 seconds.
- **No farming.** Food comes from what an agent `hunt`s and cooks. Chests (`store`, `take`, since 20
  October) let agents leave things for each other. Goal checks see each chest as the agent (or for a
  team goal, the member) that last opened it saw it; `team-homestead` counts cooked meat that way. A chest emptied or broken
  some other way still counts until someone opens it again. `take` moves exactly the count asked for
  (since 20 October, after tbase1); before, it moved whole stacks, and taking one cooked mutton
  emptied rep 3's food chest of its 10.
- **Animals near spawn are placed by us (since 20 October).** The start area is dark oak forest,
  too dark for farm animals: a survey of a fresh world found none within 64 blocks of spawn and 3
  sheep within 128. Both scenarios now summon four small herds 45–60 blocks out (12 sheep since
  bpoc6, 4 cows, 4 pigs, 4 chickens; `HERDS` in `src/agents/src/scenario.ts`). Runs before then had almost no animals in reach,
  so food and wool results from them are not comparable with later ones.
- **The herds are restocked each morning (since 28 October, after tbase7).** The game barely brings
  animals back in that dark forest, so killed ones stayed gone and food and wool ran out mid-run
  (tbase6 rep 3: no sheep, no beds; tbase7 rep 2: no cows by day 2). Now at each dawn one agent per
  world puts back the herd animals that are gone, silently; no agent is told. An animal that has only
  wandered out of loaded ground can be put back twice, so a herd may grow a little. Runs before this
  compare with later ones only loosely on food and beds.
- **`give` needs the receiver within reach of the giver.** The giver walks up beside them and drops
  the items at its feet; 8 of 8 live hand-overs worked that way. Tossing from two blocks or more
  overshot (1 of 5), and from one block the giver swept its own toss back up. A wall between them,
  such as the giver standing inside its shelter, can still leave the items on the giver's side; the
  receiver is then told by name that they are on the ground, so it can `pick_up` them.
- **`flee` walls the agent in when it can't run away,** for example in a pit or a cave. In b12 it
  walled one agent in, and once, underground, failed with two gaps left that it could not fill
  (that baseline run later died). Without dirt, cobblestone or planks to place it gives up. Before this fix, being cornered ended at least one outpost run. Until 20 October
  it also reported being cornered after it had run 20–67 blocks and lost every hostile, whenever
  two legs of the run failed (211 times in the logs); now it reports the run.
- **How the outpost goal treats deaths (the owner's decision, 19 October).** A death doesn't end a
  run: the agent respawns with nothing and carries on, as a player would. Only a death at night
  counts against the goal, by losing that night; a death by day costs time and everything carried,
  and the report counts it. The check also doesn't enforce "before nightfall" from the goal text: it
  looks at what the agent holds at the end, not when the tools were made.
- **The local model rarely completes the outpost goal** (3 of 18 runs in b12; see
  `docs/results/write-ups/02-outpost.md`). `--progress on` got it to try the shelter more often
  (6 of 9 runs against 3 of 9), but the sample is small. Open problems found in b12, none fixed:
  - **The baseline's outpost goes on to dig for iron** after its shelter, and the flooded-cave
    fix now takes it away from the shelter to do so. It fell from 3/3 in b10 to 1/3. Now
    it never digs with its last pickaxe (one run lost the outpost that way), and in b14 it met
    the goal 3/3. Being caught underground at night (the other failed b12 run) is not addressed.
  - **The model keeps crafting tools it already holds,** dozens of times per run, failing for
    want of cobblestone. Since fixed, but not yet confirmed: a failed craft now says when the
    item is already held, and the cobblestone message names `mine_stone`.
  - **A run with the goal all but met ended on two "done"s** before the night it had to survive.
  - **The model repeats one decision dozens of times after being told it is doing so** (b15, b16):
    `gather_wood` for logs it already holds, up to 153 times in a row, choosing the same again
    after 290 of 293 repetition notes. It happens on b12's code too. This is left to the model on
    purpose: the code says what is happening, and the report flags an agent that kept on ("Told it
    was repeating itself, and kept on"), but nothing stops the loop for it.
  - **Full memory fills the local model's 8,192-token window** (~7,200 tokens per call), and
    five of six runs gave up early.
  - **`smelt` once failed three times with "destination full".** It was two kinds of fuel in one
    slot, fixed after tbase1 (below). In bpoc7 it also burnt planks it had just crafted into a table
    for the furnace; fuel is now chosen once the furnace is ready. (The other rough edge noted here, `build_shelter` failing to clear dirt, was an interrupt reported as a
    blocked floor, and stone dug bare-handed; both fixed after p5.)
- **The terrain near spawn is awkward.**
  - Some agents start on top of dark oak trees and lose time getting down.
  - A flooded cave lies under the spawn area. The skills now stop before digging into water, and
    `climb_out` gets an agent back to the surface, but agents near it still mine slowly. Not always:
    in bpoc11 an agent at y=24 in an open cave found no way up (a drop on every side, its pillar
    placing the wrong item) and stayed there for the rest of the run; to be fixed.
- **Ore must be visible to be mined.** By design there is no x-ray. Finding iron and diamonds
  means digging staircases and tunnels, which wears out pickaxes and takes many minutes.
- **An iron pickaxe still gets dug with, but only where nothing cheaper will do.** Since bpoc7 every dig
  takes the cheapest tool that does the job, whatever the goal: `mine_stone` the cheapest pickaxe, and
  walking a cheaper tool or a bare hand when that is quick enough (2 s a block), an iron one only when
  not (stone with no other pickaxe). The digging skills still use an iron pickaxe down to its last 16
  uses when it is the only one. Across this machine's runs, 1 of 14 iron pickaxes wore out; 24 were
  held at a death.

## What the measurements can and can't show

- **Small samples.** Most conditions have 3 runs, so a 3/3 is consistent with a true success
  rate as low as 44%. Pooled batches are firmer, but only batches run on the same code are
  comparable.
- **Few models, and one local one.** The local-model findings are about one 4B model (Qwen3 4B
  Instruct); bigger local models may behave differently, especially with plan memory. The paid
  models have three runs each on one goal.
- **The code changed between batches.** Each batch was run on one version of the code, but fixes
  went in between batches. Compare batches only where the write-ups say they are comparable.
- **Start points vary within a 20-block area,** which puts some agents beside oak and others beside
  dark oak, and some near the flooded cave.
- **Wall-clock depends on the machine.** The game keeps running while a model thinks, so a slow
  machine or a slow provider costs game time. That is on purpose, but it means results from
  different machines are not directly comparable.
- **No pre-registration.** Hypotheses were not written down before the batches ran.
- **"Toward the goal" is judged by code, not by intent.** A team report sorts each decision by what
  it gained (`src/agents/src/goalWork.ts`): wool, iron or meat is progress toward that part, and wood, stone and
  tools are groundwork. A decision that sets up later progress without gaining anything, such as
  walking to a cave to mine iron, counts as moving. Eating counts against the meat part even when the
  agent had to eat. "Back at work" after a disruption is read from the next decision's skill and
  arguments, not from how it went.
- **What our code tells the agents was audited on 20 October** against all 322 logs, looking for a
  conclusion that the same observation contradicts. Fixed:
  - `smelt` loaded two kinds of fuel into the one fuel slot ("destination full", 42 times in tbase1);
  - an animal killed a moment before was still listed (4 agents hunted a corpse);
  - `mine_ore` said "no ore in reach" while ore in sight sat beside water or lava, which it won't
    mine (165 times); it now says so.

  Checked and sound:
  - "not in bed: X" (44 of 45 right, one a timing overlap);
  - "every way down is unsafe", whose reasons are nearly all real water or drops.

  Left as is:
  - the observation counts buried stone within 24 blocks while `mine_stone` looks for exposed stone,
    so "stone: 217" can sit beside "no exposed stone within 64 blocks" (148 times, all in single-agent
    runs of 16–19 October);
  - "in sight" for agents means within the server's tracking range, not line of sight.
- **Health under half a point read as 0 until 20 October.** Observations rounded health, so an agent
  alive at 0.4 was told 0. In tbase1 rep 3 Sonnet reasoned from it for 26 decisions, and four earlier
  single-agent runs show it too, up to 32 decisions. Since then it is shown as 0.4.

## Rough edges in the code

- **Our own air reading works around a mineflayer bug (19 October).** mineflayer 4.39 sets
  `bot.oxygenLevel` from any entity's air, so creatures near water made agents "drown" on dry land.
  `src/agents/src/breathFix.ts` restores the bot's own value; any new script that creates a bot and reads air
  must call `fixOwnAir(bot)` (the agent and `src/agents/src/try.ts` do). Runs before this had false "under
  water" interrupts and `air` in their observations.

- **Two gaps in the drowning reflex, left on purpose (18 October).** A skill is stopped when air
  falls to half, and the code swims the agent out before the model decides, so the model is told
  afterwards and never asked to handle the water. Not covered:
  - **Water while the model is thinking: closed on 27 October.** In bpoc6 an agent drowned
    underground mid-decision carrying the team's three iron pickaxes. The guard that runs while the
    model decides now swims out too (checked live: air held at 20 where standing still fell to 5 in
    8 seconds).
  - **A failed escape.** If the swim-out finds no way out, the next skill starts with air already
    below half, and the air interrupt only fires when air *crosses* half, so only drowning damage
    stops it (and `flee`, `eat` and `sleep` ignore damage). The model does see "could not find a
    way out" and `air`. Fix: start no skill but the one the model chose with that in view, and fire
    the air interrupt whenever air is below half.

- **Messages by name interrupt an agent at most once a minute,** timed on the wall clock. That is
  enough to stop two agents cancelling each other's work, but it is a rule of thumb, not tuned.
- **Narration in chat is limited to once every 1.5 seconds** to avoid the server kicking a bot for
  spam. In a burst of instant failures, other agents' view of what that agent is doing can lag.
- **Prompt caching works, but not on every model** (seen on real accounts, 18 October):
  - Claude requests mark the system prompt and the history for caching. Sonnet 5.5 and Opus 5.5
    read about 70–77% of their input from the cache.
  - Haiku 4.5 never caches: the prompt (about 2,150 tokens) is under its minimum. Runs with no or
    plan memory get no saving on it.
  - OpenAI caches long prompts by itself, and the report counts the hits. GPT-6 cached input is
    billed at the full input price in our numbers (its cache writes are dearer than input and not
    counted), so our numbers can overstate its cost, never understate it.
  - With full memory on a paid model, the history is now cut to half its budget when it fills,
    rather than one exchange at a time. That keeps the cache hitting, but it also means the model
    sees between 10,000 and 20,000 tokens of history rather than always about 20,000.
- **A crafting table sometimes ignores the bot's click** and never opens. Seen in about a dozen
  logs up to p5, in none of p6's 12 runs; never reproduced in about 30 crafts on a test server, so the cause is unknown.
  Since 20 October it costs one failed craft of about 8 seconds (the bot steps up and tries once
  more) rather than a run of 15-second timeouts.
- **Shelters are shared and gone back into (since 20 October).** `build_shelter` goes into any shelter the
  agent or a teammate built within 32 blocks instead of building another (thome1's three agents built 36
  huts), and a large one (5×5 inside) can be built in parts by several agents. Agents learn of a
  teammate's shelter from the team's shared state, but only within 32 blocks and only while its walls
  still stand in the world, as a player would see a hut. Its own large shelter the agent remembers up to
  128 blocks away (a player remembers where their base is). In tbase1, Luna built the large base in
  the first five minutes of every rep, and the others went into it 1–22 times a rep each.
  Going into one is by its doorway: walk to it, dig its two blocks, wait to pick them up, step in,
  close it. In bpoc the pathfinder found its own way in instead, timed out 10 times and left 4-7
  gaps in the walls when it got in; live, after the change, 2 of 3 approaches went in by the doorway
  and closed it (10 s and 29 s).
- **The pathfinder can freeze mid-jump at an ordinary one-block step.** Seen at 2,74,34 on this
  seed: the bot hangs at y=74.42 with forward and jump held, a path is found, and nothing above or
  around it is in the way. Cause unknown. Getting into a shelter now notices after 4 s, hops and
  tries again, and after three tries fails saying where it is stuck (37 s, not 80). `go_to` and
  `flee` have the same watch, and digging through something in the way counts as moving.
  Since 27 October a spot where the bot got stuck is walked round for the rest of its run: in bpoc5 a
  team's home stood 12 blocks from 2,74,34 and one agent was stuck there three times. Reproduced on
  the same seed (sprinting it hangs at y=74.42; without sprinting it can't climb the step at all), and
  checked live: the walk home froze once, went round, and arrived in 16 s; the next time it went round
  from the start (4 s). The cause is still unknown.
- **The pathfinder digs through what is in its way,** except chests, beds, furnaces and crafting
  tables (since 20 October, after tbase1). Live, with the library's defaults, it dug through a bed
  in a corridor too low to walk over it. Half of rep 3's base bed went missing in tbase1, and the
  logs don't say how.
- **The progress list (`--progress on`) is computed by each agent from the team's shared state.**
  Since 23 October every teammate's list names the same base (the one most have slept in, then the
  first finished), and each agent reports what it holds every 2 seconds rather than only between its
  own steps. Before, in tlunap1, lists named different bases to different teammates and lagged a
  teammate's holdings by a whole step.
- **Deaths are recorded with their cause (since 20 October),** as the game words it ("was slain by
  Zombie"), with the place, the in-game day and time, and are listed in the minds panel. The agent's
  death event says it too. Older logs show the deaths without a cause.
- **A shelter is closed once built (since 20 October).** Its floor is filled where the ground has
  holes, and its doorway is filled in behind the builder; the pathfinder digs back out through any
  wall when the agent leaves. Before that the doorway stayed open (in p5 mobs walked in on agents
  waiting inside; in p6, with it closed, no agent took any damage) and the floor was taken as found (poc6's shelter stood over a 2-deep hole). While
  the agent is inside with every block in place, its observation says `inShelter` and a hostile
  nearby no longer interrupts it; damage still does. In poc6, before this, Luna left a closed
  shelter at night because a zombie came within 6 blocks.
  A mob already inside is another matter. In tbase1 rep 2 a zombie villager was inside the closed
  base, probably through a creeper's hole; agents respawning at the base's bed died 10 times to it
  while told "closed". Since then the agent is told ", but a zombie villager is inside with you",
  and a shelter with a mob inside is not taken as one no mob can reach.
- **Getting into a shelter while being hit (since 20 October):** on the way into a shelter that
  stands, a hit stops `build_shelter` only at health 6 or less, and a teammate's message doesn't
  stop it at all. In bpoc2, 7 entries were stopped by a hit (4 of those agents fled and never went
  back in) and 3 by a message. The floor of 6 can leave too little to get away on: in tlunap1 rep 2
  a crowd of mobs stood at the doorway of a holed base, and an agent coming back from the dead was
  hit down to 5 on the way in, fled and died, six times in one night. Since 26 October the shelter's line
  names hostile mobs within 8 blocks of its doorway, and going in stops short of them and says why;
  the floor of 6 is unchanged. In bpoc3 (one rep), a hit stopped the way in 2 times in 99 shelter
  calls (tlunap1: 32 in 179).
- **`place_bed` passes over spots with a body in them (since 27 October).** The game refuses a bed
  where a teammate, a monster or the agent stands, and our check looked only at blocks; in bpoc6 the
  agent was told "no room left" six times in a room with space. A refusal is now reported as one.
- **The team report missed losses from deaths between steps (fixed 27 October).** A death after one
  skill ended and before the next observation is logged with the next step, whose observation already
  shows the agent respawned empty-handed, so the goal story counted nothing lost (bpoc6: three iron
  pickaxes shown as "set back 0 times"). It now counts what the agent held at the end of the step
  before too; bpoc6's rebuilt report reads "la died, dropping 4 iron ingot, 3 iron pickaxe".
- **Reflexes (since 26 October).** While the model decides, the agent steps back from any hostile
  within 3 blocks, unless it is in a closed shelter, and the next observation says so; `flee` runs
  into a known shelter that lies away from the mobs with a clear doorway, and otherwise steers off
  water and drops. In bpoc4 (one rep) the step-back ran 39 times and `flee` ran into a shelter 11
  times, but deaths didn't fall (24; bpoc3 17), and skeletons killed 12. After bpoc4 the
  reflex was split in two (the owner's call): a monster within 3 blocks is stepped back from; a
  skeleton (or stray, bogged) within 16 blocks that can see the agent is hidden from, at the nearest
  spot within 5 blocks it can't see. The range was measured live: a skeleton with a bow fired at 15
  and 16.7 blocks, not at 17 or beyond, and never through a wall. `flee` counts such a skeleton as
  danger, takes a shelter on any side when one is in sight, and ends behind cover. What they don't cover:
  - a skeleton that keeps coming: cover holds until it walks round it (checked live: hidden at the
    end of a flee, seen again five seconds later), so the next step-to-cover waits for the next decision;
  - open ground with no cover within 5 blocks, where the reflex does nothing;
  - the moment between a skill being interrupted and the next decision starting;
  - a decision made after the step-back starts from an observation a few blocks out of date (the
    skill reads the world afresh, so this costs accuracy in the model's reasoning, not in what is done).
- **A death ends the skill it happens in (since 23 October),** reported as "interrupted: you died
  and respawned". Before, the skill ran on from the respawn point: 39 of tlunap1's 86 deaths came in
  a `flee` that then reported success. A death while the model is deciding (25 in tlunap1, with a
  median of about 3 seconds to decide) is still only seen in the next observation's events.
- **CI runs no game.** Pull requests are checked by unit tests only. The skills' real
  behaviour is checked by hand with `src/agents/scripts/skill-smoke.sh`, and by the batches.
- **Run logs are not backed up.** `runs/` is gitignored: logs hold every full prompt and come to
  about 130 MB so far. The write-ups in `docs/results/` are the record (see its README for why, and
  what batch names like b12 or p5 mean). Copy `runs/` somewhere if the raw logs matter.
