# Where things stand, and what's next

Read this at the start of a session; update it when something finishes or a new ask comes in.
*Last updated 20 October 2026.*

## Setting up a new machine

1. Docker, [Ollama](https://ollama.com/) and Node 25+, then `npm install`.
2. `cp .env.example .env` and add `ANTHROPIC_API_KEY` (and any other keys). Never commit it.
3. `./start.sh --check` says what's missing. It pulls the local model (`qwen3:4b-instruct`); the
   agent makes its 8k-context variant itself on first use.
4. `npm test && npm run typecheck` should pass with no server, model or key.
5. `runs/` (run logs) is not in git, so it starts empty. The results that matter are written up in
   `docs/results/`.

## Where things stand

- **The single-agent loop** works with the free local model, the scripted baseline and Claude.
  Results so far are in `docs/results/`; what isn't done is in `docs/limitations.md`.
- **Paid models (18 October).** Haiku 4.5, Sonnet 5.5 and Opus 5.5 each met `tools` in 4–5
  decisions for $0.01–$0.04 (batch poc1). The free 4B model usually needs dozens. Prompt caching
  works on Sonnet and Opus (~70% of input); Haiku's minimum is above our prompt, so it never caches.
- **Teams (18 October).** `team-camp` is a goal for the whole team: four stone tools between them,
  every member carrying one, and a two-storey shelter. Agents can `give`, `pick_up` and `go_to`; a
  collaborative agent stays until the whole team is done. Each run writes a behaviour report beside
  its log (`runs/<file>.summary.md`), and the minds panel (`:3010`) has a Run setup dialog.
- **What the team runs showed:**
  - Haiku plans well, talks, and tried to help: it built the whole camp, then tried to hand qwen a
    tool. Early `give` failed in the real game (fixed: 8 of 8 live hand-overs now work).
  - The free 4B model (qwen) contributes nothing: it waits "for safety" in a peaceful world, crafts
    the same tool four times, or repeats one no-op decision 147 times even when told the fix.
  - Agents that drift apart couldn't meet again (fixed: `go_to`). Haiku died in lava while clearing
    a shelter (fixed: `build_shelter` won't dig beside lava or water).
  - Repeated chat ("Gathering 10 more logs…") interrupted teammates over and over (fixed: the same
    words from the same sender interrupt only once).
  - **First real teamwork** (team trio1: Haiku, Sonnet and qwen, all fixes in): goal met in 8,100
    ticks for $0.33. Sonnet proposed the split, made all four tools, built the two-storey shelter,
    then handed qwen an axe and Haiku a shovel with `give` (both worked). Haiku lost most of its run
    to `mine_stone` under water. qwen asked for logs it already held 28 times; told that `count` is a
    total, it raised its count twice (10, then 20, then 40) but kept looping.
  - **Requests between agents** (team trio2, 18 October: same three agents, with `tell_agent`,
    `ask_agent` and no hearing their own messages; 12,000 ticks by mistake, trio1 had 24,000). Goal
    not met; $0.41. By 5,500 ticks Haiku alone held all four stone tools and had built the
    two-storey shelter: only handing tools over was left, and that never happened.
    - Haiku asked qwen 17 questions (its tools, then its coordinates). qwen never answered one:
      every "answer" was its usual line to everyone ("Gathering more logs…"), which `ask_agent` then
      accepted (fixed: only a reply addressed to the asker counts). qwen started by exploring 10
      times and ended ~200 blocks away; it gave its coordinates once, addressed to itself.
    - Sonnet used `tell_agent` once, well: it told Haiku to give qwen a stone axe, and Haiku complied
      at once (the give failed: qwen was out of sight). qwen also told Haiku to give it the axe.
    - Haiku's `give` to Sonnet failed with the giver sweeping its own toss back up (8 of 8 had worked live).
    - Sonnet drowned in `mine_stone` twice, died once and lost its pickaxe (item 4).
    - Haiku's unusable answers rose from 0 in trio1 to 11 of 50 calls: analysis with no JSON, and
      invented skills (`say`, `tell_agent` with a `question`). The new skills may be confusing it.
  - **Team trio3** (18 October, after the drowning and trio2 fixes, 24,000 ticks): **goal met at
    ~19,000 ticks for $1.28** (Haiku $0.44, Sonnet $0.85, near its $1 cap). No deaths and no
    drowning: qwen went under twice and the reflex swam it out both times. Sonnet made all four tools,
    built the two-storey shelter (on its third try: twice "blocked by dark_oak_log") and gave Haiku a
    shovel; qwen looped on `gather_wood` 40 times, then crafted its own stone pickaxe at the very
    end, which completed the goal. Nobody used `tell_agent`; Haiku used `ask_agent` 7 times.
    Found:
    - **Agents are never told their own name** (not in the observation, not in the prompt). Haiku
      tried three times to `give` to "haiku", Sonnet asked "sonnet" a question, qwen spoke to "qwen".
    - **`go_to(to)` and `go_to(x, z)` are always rejected:** the parser requires every arg a skill
      lists, but go_to takes either. All 24 of Haiku's re-asks were this (~$0.12).
    - **`ask_agent` took `give`'s own chat line** ("bringing you 1 stone_shovel, stay where you
      are") as the answer, twice.
    - Sonnet answered in tool-call form first on 41 of its 79 calls (item 0): about half its cost.
    - *Fixed after trio3:* the prompt gives the agent its name; skill args can be optional (`"number?"`,
      so `go_to(to)`, `go_to(x, z)`, `give` without a count, `pick_up` without an item, `build_shelter`
      and `tunnel` without their options all parse); a skill's own chat lines are marked `[auto]` and
      `ask_agent` ignores them. Not yet tried in a team run.
    - Haiku called `pick_up` for a shovel 20 times, mostly while already holding it; qwen claimed to
      have handed over a sword it never had.

- **Team quad1** (18 October; Haiku, Sonnet, GPT-6 Luna and qwen, with every fix above): **goal met
  in 4:54 of game time for $0.28** (trio3: 15:56, $1.28). Sonnet made all four stone tools by 1:49
  and handed a sword to Luna, an axe to Haiku and a shovel to qwen; Luna built the two-storey
  shelter, its first and only build, in 10 decisions for under half a cent. Nobody died. qwen still
  looped (`gather_wood` 13 times) but ended holding the shovel it was given. Sonnet's re-asks fell
  from about half its calls to 9 of 25; all 9 were it calling a skill's name as a tool instead of
  `decide` (fixed after the run: read as choosing that skill; live, 4 of 4 decisions in one call).
  Nobody used `tell_agent` or `ask_agent`. One run, not a comparison.
- **Prompt changes on 18 October, after trio3:** the collaborative stance lost "so share what you
  find and split the work" (it steered the model); `air` now says what 0 means (2 health a second
  while under water, not instant death); `gather_wood` says every kind of log counts and makes the
  same things. Team runs trio1–trio3 had the old wording.

- **Prompt changes on 19 October, after b15 and b16:** the prompt now says what `recentEvents` is
  (it carries the repetition note, and had never been explained), and offers `give_up` with a
  reason beside `done`. Runs before this compare with runs after only loosely. Live: qwen gave up on
  an impossible goal ("fly to the moon") at its first decision. On `tools` (two short sandbox runs,
  6,000 ticks) it never gave up, and still looped on `gather_wood` for logs it held (43 and 28 times
  in a row), choosing the same again after all 23 repetition notes: explaining `recentEvents` didn't
  change that.

## Open, most wanted first

0. **Sonnet's tool-call answers: fixed 18 October.** Claude is now offered a `decide` tool (not
   forced, so Haiku still writes its reasoning before calling it). Live: Sonnet and Haiku each
   decided in one call through the tool. GPT stays on JSON text (see `docs/limitations.md`).

0a. **Done after trio2 (18 October), not yet tried in a team run:** a note after every third
   `ask_agent`/`tell_agent` in a row to the same agent; `give` paths away from the drop when
   stepping back goes nowhere (3 of 3 live, back to a wall) and won't drop for a receiver under
   water; a `say` to oneself goes to everyone. **Drowning:** `mine_stone` counted stone beside water
   as exposed and swam to it, so agents dug under water (25× slower: the "digging stone timed out"
   failures) until their air ran out. Now stone touching water is never mined, the search looks only
   for open stone (it used to look at the nearest 128 stone blocks, nearly all buried, and dig down
   when none was open), and swimming costs the pathfinder 8× a step. Live: 4 of 4 runs from spawn,
   random spots and a lake shore, 0 ticks under water. A skill is stopped at half air, before any
   damage; the code swims the agent out *before* the model decides (not after); the agent sees `air`
   when it is losing it. Live: out of a 5-deep pool in 1.3 s, out of a flooded room with a ceiling
   in 10.7 s.

1. **A comparison of goals and agents: done 18 October** (`npm run compare`, `src/compare.ts`).
   Every team run and batch writes `runs/compare-<team|batch>-<name>.md`: by goal, by model and
   condition, and for teams who did what, requests and a timeline. Extend it as questions come up.
2. **The long paid test: done 19 October (batch p2), 3 of 4 met.** One `outpost` run each in survival:
   Sonnet, Opus and GPT-6 Luna met it ($0.24, $0.33, $0.02); Haiku died at night, and its "goal met"
   came from a bug in our night check (fixed: a death at night now forfeits that night, in the
   agent's check and the report). $0.88 in all. Written up in `docs/results/write-ups/02-outpost.md`.
   Haiku's "flooded shelter" was a false drowning alarm: mineflayer reads any nearby creature's
   air as the bot's (fixed in `src/breathFix.ts`, checked live). 3 runs each (batch p3) started
   19 October. In p3, Sonnet's first run lost two-thirds of its time stuck in the flooded cave under
   spawn: `mine_stone` measured its 6-block drop limit from the bot's feet each time, so it walked
   20 blocks down in one call, and no skill could get back up. Fixed after p3 on branch `climb-out`
   (`mine_stone` measures from where the call started; new `climb_out` skill; observations show
   `underground`), each checked live on a test server.
   Ideas not yet started (hunting, chests, farming, shearing, torches) are in `docs/ideas.md`.
   **Day and night now have one definition** (`src/daytime.ts`, 19 October): night is 13000-23000,
   when hostiles spawn, for the observation (`isDay`, `ticksUntilNight`), the interrupts, the goal and
   `sleep` (beds from about 12,541, as in the game). Before, the observation called 12000 night and
   `sleep` called it day; Haiku noticed. Runs from here are not comparable with earlier ones on
   anything time-related. p4 was stopped after one run to fix this; Haiku runs come first.
   **Agents can now hunt and shear** (19 October, the owner's call: `hunt` may target anything,
   other agents included). Observations list `animals`; beds are reachable through wool. Checked
   live on a test server.
   **Batch p5 (three runs each, 19–20 October): Opus 2 of 3, Sonnet 1, Luna 1, Haiku 0; $2.75.**
   Three runs lost a night inside a finished shelter through its open doorway, and five hit a
   craft timeout at a table. Fixed after p5, each checked live: the shelter closes its doorway
   behind the builder, table crafts no longer hang, the shelter digs with the best tool and says
   when it was interrupted. The other failures were agents leaving the shelter at night. Written up
   in `docs/results/write-ups/02-outpost.md`. **Tool wear (20 October):** tools in their last quarter of life
   are listed as `wearingOut` with uses left, and a tool breaking adds "your stone_pickaxe broke" to
   `recentEvents` (`src/toolWear.ts`; checked live). Before, a pickaxe just vanished: 32 times in the
   logs, none in p5.
   **Batch p6 (20 October, same setup as p5, on 011c8ef): 12 of 12 met, no deaths, no damage taken,
   $1.66.** No craft timeouts, every shelter closed, no one left at night. `outpost` no longer
   separates the models; it measures cost (Luna ~1 cent a run, the Claude models 13–22) and
   decisions (20–33). Written up in `docs/results/write-ups/04-p6-outpost-after-fixes.md`. Next: the team goal `team-homestead`.
   **Team run thome1 (20 October; Opus, Sonnet, Luna, collaborative, three reps of three days): 0 of
   3, $9.67.** Every team built the shelter; two of three stored 10 cooked meat; two of three got
   two of three members into a bed; none ended with iron pickaxes for everyone (iron came on day 3
   and was lost in deaths). 48 deaths, mostly at night outside a shelter. Proof run hpoc (three Luna)
   first, $0.29. Seven fixes from their logs (flee's false "cornered", death counts, the death
   place, sleep and craft messages, the report crash, rep labels). Written up in
   `docs/results/write-ups/05-team-homestead.md`. Next, if wanted: the same team with `--progress on`.
   **`team-base` (20 October, the owner's call):** one large shared shelter that everyone sleeps in,
   instead of `team-homestead`'s any two-storey shelter. `build_shelter` now goes into a shelter within 32 blocks
   (its own or a teammate's) instead of building another, and closes it behind the agent. `size:
   "large"` (5×5, room for four beds) can be built in parts by several agents. `sleep` puts beds inside
   the shelter, and says who was awake when the night did not pass. Teammates' shelters within sight are
   in the observation (`shelters`). Checked live with two bots: a large two-storey built in two parts,
   left and gone back into, and both beds put down inside, so the night passed.
   **Proof run bpoc (three Luna, 20 October), stopped after 14 minutes** (the machine was needed; its
   logs are in `runs/.killed/`, and the first attempt lost an agent to the server's login throttle:
   `team.sh` now waits for each agent to be in the world). What it showed of the new code: lc, near
   lb's large shelter, went into it with a plain `build_shelter`; lb went back into its own and said it
   had no block left to close the doorway. But lb built three large two-storey shelters, starting
   again each time it had explored more than 32 blocks away. Fixed (not yet checked live): asking for a
   large shelter takes the agent back to its own large one up to 128 blocks off, and its observation
   lists it at any distance up to 128; a teammate's still counts only within sight.
   Checked live (base 80 blocks off). bpoc's logs also showed entries timing out (10 of them), the
   pathfinder digging through walls on the way in, and mobs stopping the way in (13 times): fixed by going
   in through the doorway, a stuck-pathfinder check, and a mob close by not stopping `build_shelter`.
   **Proof run bpoc2 (three Luna, 20 October, $0.29), not met:** one large two-storey base, all three
   slept in it, 2 of 3 iron pickaxes, 7 of 10 cooked meat. Inside a closed shelter at 39% of night-time
   decisions (bpoc 9%); no entry failed to get in, a third left the doorway open for want of a block.
   18 deaths, 6 of them water or drowned. After it: deaths are told to teammates; messages addressed to
   an agent keep their own queue; `build_shelter` goes on into a shelter while hit until health is 6 or
   less, and isn't stopped by messages (7 entries stopped by a hit in bpoc2, 3 by messages); `go_to`
   and `flee` have the stuck check, which no longer takes digging for being stuck. Checked live, except the message rule (unit-tested only).
   Batch reports are one page each now (the per-run pages stay in `runs/`).
   **Team run tbase1 (20 October, on 66e0fd3, $11.70): 0 of 3 teams.** Luna built the large base in the
   first five minutes of every rep. Two of three slept in it each rep, and the chest held 10 cooked
   meat in reps 1 and 2. One iron pickaxe was held at the end, in nine agent-runs. 54% of night-time
   decisions were in a closed shelter (thome1 8%), and there were 33 deaths (thome1 48). Our code was
   behind most of the misses, and is fixed and checked live:
   - `mine_ore` gave up on ore beside it as "out of reach" (44 iron blocks; 15 raw iron in 53 tries);
   - `take` moved whole stacks, emptying rep 3's food chest;
   - a zombie villager inside the "closed" base caused 10 deaths;
   - the pathfinder could dig through beds;
   - the report counted entries as builds and two deaths in a step as one.
   What is the model's: the third bed never made (sheep scarce, not looked for), and iron pickaxes
   used until they broke. Written up in `docs/results/write-ups/06-team-base.md`.
   **Reports now put the team and the goal first (21 October, the owner's ask).** The point of the
   experiment is how the agents behave on their own: what they do toward the goal and what moves
   away from it, how they handle the unexpected while keeping the goal in mind, and how they work
   together or hinder one another. Per-model numbers are secondary. A team report now opens with
   the goal at the end, each part's story (what moved it, what set it back), the share of game time
   by kind of work, what broke work off and how soon the agent was back at it, and help and
   hindrance between teammates; each agent's numbers fold underneath (`src/goalWork.ts`). tbase1's
   report and write-up 06 are redone that way. Rewriting it found one more bug of ours: health under
   half a point read as 0 (Sonnet, rep 3, 26 decisions; fixed, checked live). Still to do: change the
   triage skill's write-up template to match, once the owner has looked at 06.
   **Next, on the owner's word:** the same run again on the fixed code (about $12), since two of the
   four parts failed largely on our bugs; then, if wanted, with `--progress on`.
3. **The free model on the outpost goal: done 19 October (b15, b16), 0 of 9.** b15 (today's code,
   plan memory, progress off and on) met it 0 of 6; b16 (b12's code, three runs) 0 of 3, so b12's
   2 of 6 didn't repeat. Both versions loop on `gather_wood` for logs already held (up to 153 times
   in a row) and choose the same again after nearly every repetition note. The owner's call: that
   is the model's failure, to be reported, not fixed in code. The run report and comparison now
   count how often an agent was told it was repeating itself and kept on. Written up in
   `docs/results/write-ups/02-outpost.md`. Still open from `docs/limitations.md`: waiting out the night
   in the sandbox, and `mine_ore` failing to reach ore it can see.
4. **`mine_stone` is slow:** the drowning is fixed (0a; trio3 had none), but "digging stone timed
   out after 20000ms" still appears in trio3 (Haiku and qwen), with walking and exploring timeouts.
   The under-water digging explained some of it, not all. Not yet investigated.
5. **Panel start line: done 18 October.** An agent writes `<log>.start.json` when it starts, and the
   panel lists it as "Starting" until its first decision is logged.
6. **Extended thinking for Claude: left off, written up as a limitation** (`docs/limitations.md`,
   "Not yet tested", with how to measure it). Candidate for the long paid test (#2 above).
7. **Made public 18 October.** The history was scanned for keys, tokens and private keys (none); the
   `protect-main` ruleset is enforced and now also requires CI; outside contributors' pull requests
   need approval before any workflow runs; only GitHub-owned actions are allowed; the workflow token
   is read-only. Work goes through branches and pull requests (`CLAUDE.md`).
8. **Two drowning gaps, deferred by the owner (18 October):** water while the model is thinking,
   and a skill started after a failed escape. Both are described with their fixes in
   `docs/limitations.md` ("Rough edges in the code"). Leave them unless drowning shows up again.
