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
  harder. No paid model has run `iron` or `diamond`; Haiku and Sonnet have
  played team runs.
  - Prompt caching works on Sonnet, Opus and Luna (about 83–88% of input cached in p5 and p6). Haiku 4.5
    never caches: our prompt is below its minimum.
  - Grok, Gemini, Groq and OpenRouter are wired up and unit-tested only. Each needs its model's
    price in `src/backends/pricing.ts`, or a paid run refuses to start.
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
  `docs/results/2026-10-iron.md`. Open problems found there, none fixed:
  - **The baseline waits out the night above y=55 even in the peaceful sandbox,** losing about
    11,000 ticks in two of three runs. The rule is meant for survival.
  - **`mine_ore` often can't reach iron it can see** ("out of reach", 20-second dig timeouts),
    then gives up after five blocks. One baseline call ran 5,000 ticks for nothing.
  - **"need 3 more cobblestone" didn't name `mine_stone`,** unlike the planks message, which
    names `gather_wood`. The model retried the craft 4–16 times per run before mining stone.
    Since fixed, but not yet confirmed in a full run: the message now names `mine_stone`.
  - **`descend` to y=16 takes 3,000–6,000 ticks** and usually wears out a stone pickaxe.
  - **Deaths are logged without a cause in the run log,** which says only "you died and respawned".
    The server log saved beside each batch run (`<log>.server.log`) has the cause.
- **The `diamond` goal has only been checked skill by skill** (`scripts/skill-smoke.sh`), never
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
  some other way still counts until someone opens it again.
- **Animals near spawn are placed by us (since 20 October).** The start area is dark oak forest,
  too dark for farm animals: a survey of a fresh world found none within 64 blocks of spawn and 3
  sheep within 128. Both scenarios now summon four small herds 45–60 blocks out (6 sheep, 4 cows,
  4 pigs, 4 chickens; `HERDS` in `src/scenario.ts`). Runs before then had almost no animals in reach,
  so food and wool results from them are not comparable with later ones.
- **`give` needs the receiver within reach of the giver.** The giver walks up beside them and drops
  the items at its feet; 8 of 8 live hand-overs worked that way. Tossing from two blocks or more
  overshot (1 of 5), and from one block the giver swept its own toss back up. A wall between them,
  such as the giver standing inside its shelter, can still leave the items on the giver's side; the
  receiver is then told by name that they are on the ground, so it can `pick_up` them.
- **`flee` walls the agent in when it can't run away,** for example in a pit or a cave. In b12 it
  walled one agent in, and once, underground, failed with two gaps left that it could not fill
  (that baseline run later died). Without dirt, cobblestone or planks to place it gives up. Before this fix, being cornered ended at least one outpost run.
- **How the outpost goal treats deaths (the owner's decision, 19 October).** A death doesn't end a
  run: the agent respawns with nothing and carries on, as a player would. Only a death at night
  counts against the goal, by losing that night; a death by day costs time and everything carried,
  and the report counts it. The check also doesn't enforce "before nightfall" from the goal text: it
  looks at what the agent holds at the end, not when the tools were made.
- **The local model rarely completes the outpost goal** (3 of 18 runs in b12; see
  `docs/results/2026-10-outpost.md`). `--progress on` got it to try the shelter more often
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
  - **`smelt` once failed three times with "destination full".** Not investigated. (The other
    rough edge noted here, `build_shelter` failing to clear dirt, was an interrupt reported as a
    blocked floor, and stone dug bare-handed; both fixed after p5.)
- **The terrain near spawn is awkward.**
  - Some agents start on top of dark oak trees and lose time getting down.
  - A flooded cave lies under the spawn area. The skills now stop before digging into water, and
    `climb_out` gets an agent back to the surface, but agents near it still mine slowly.
- **Ore must be visible to be mined.** By design there is no x-ray. Finding iron and diamonds
  means digging staircases and tunnels, which wears out pickaxes and takes many minutes.

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

## Rough edges in the code

- **Our own air reading works around a mineflayer bug (19 October).** mineflayer 4.39 sets
  `bot.oxygenLevel` from any entity's air, so creatures near water made agents "drown" on dry land.
  `src/breathFix.ts` restores the bot's own value; any new script that creates a bot and reads air
  must call `fixOwnAir(bot)` (the agent and `src/try.ts` do). Runs before this had false "under
  water" interrupts and `air` in their observations.

- **Two gaps in the drowning reflex, left on purpose (18 October).** A skill is stopped when air
  falls to half, and the code swims the agent out before the model decides, so the model is told
  afterwards and never asked to handle the water. Not covered:
  - **Water while the model is thinking.** No interrupt watches while a decision is being made, so
    an agent that slips into water then waits until the decision returns (5–20 s on a paid model)
    before the swim-out runs. Fix: run the same check on a timer during the decision.
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
- **A shelter is closed once built (since 20 October).** Its floor is filled where the ground has
  holes, and its doorway is filled in behind the builder; the pathfinder digs back out through any
  wall when the agent leaves. Before that the doorway stayed open (in p5 mobs walked in on agents
  waiting inside; in p6, with it closed, no agent took any damage) and the floor was taken as found (poc6's shelter stood over a 2-deep hole). While
  the agent is inside with every block in place, its observation says `inShelter` and a hostile
  nearby no longer interrupts it; damage still does. In poc6, before this, Luna left a closed
  shelter at night because a zombie came within 6 blocks.
- **CI runs no game.** Pull requests are checked by unit tests only. The skills' real
  behaviour is checked by hand with `scripts/skill-smoke.sh`, and by the batches.
- **Run logs are not backed up.** `runs/` is gitignored: logs hold every full prompt and come to
  about 130 MB so far. The write-ups in `docs/results/` are the record (see its README for why, and
  what batch names like b12 or p5 mean). Copy `runs/` somewhere if the raw logs matter.
