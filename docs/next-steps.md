# Where things stand, and what's next

Read this at the start of a session; update it when something finishes or a new ask comes in.
*Last updated 28 October 2026.*

## The road ahead (agreed with the owner, 28 October)

One change at a time, so each result says what caused it. team-base is now a solid baseline: the
mixed team met the whole goal in 2 of 6 reps (tbase5 and tbase6, rep 1 both times), Luna-only teams
never did, and what stops teams now is mostly their own behaviour, not our bugs.

1. **Now: tbase7** (running): the mixed team with the progress list on, against tbase6 as the
   comparison. Rep by rep: evaluate after rep 1, carry on if nothing major; rep 3 only if the
   Anthropic credit allows (about $2.50 a rep). Then close the team-base chapter with one short
   summary of what all its runs showed.
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
4. **Small, any time:**
   - Why tbase6 rep 3 found no sheep: the world places a 12-sheep herd near spawn, yet hunts kept
     finding "no sheep within 32 blocks", which meant no beds and the spawn trap (Opus died 18 times).
     Check where the herd stood against the home; it may be a setting of ours.
   - The prompt-caching article (rrjamal.ca, draft): four TODOs before publishing.
   - A `/stats` page on the site: decisions, cost and runs played per model (being built).
   - Older: the tbase3 `give` timeout into a closed home; the second drowning gap; the merged branch
     `worktree-goals-section` on GitHub can be deleted.

Costs to plan with: a 3-rep mixed team run is about $8 (tbase6: $7.80); a Luna team run about
$0.25-0.40. Ask before any paid run, and no Claude run without the owner's OK.

**21 October: the experiment moved to `src/agents/`.** Everything that runs (code, scripts, Docker,
`package.json`) is there, and every command runs from there; the root keeps the docs, README,
CLAUDE.md and repo plumbing, with `src/site/` (the project site) and `src/terraform/` (its hosting)
beside it.
**The site is live at `multi-agent-experiment.rrjamal.ca` (21 October).** Its hosting is copied from
music-viz (the owner's choice over GitHub Pages):
`src/terraform/` makes a private S3 bucket behind CloudFront, an ACM certificate, Route 53 records for
the domain and a deploy role for GitHub's OIDC;
`.github/workflows/site.yaml` builds `src/site/` and deploys it. The deploy signs in to AWS by hand
(OIDC token traded with the AWS CLI), since this repo's workflows use only GitHub's own actions.
Checked: `terraform fmt` and `validate`, and `actionlint` on both workflows. `src/site/` is built (Vite + React,
hash routes, every doc but next-steps rendered from `docs/` at build time; the overview's lesson cards
are hand-written in `content/lessons.ts`). The Results page and each batch report's summary are
built from `docs/results/batch-reports/` by code (`src/site/lib/batches.ts`), so publishing a report
with `src/agents/scripts/publish-reports.sh` puts it on the site at the next deploy; How it's built
shows the README's control-loop diagram, read from the README. The Terraform is applied and the
repository secrets are set, so a push to `main` deploys the site. Agentic work resumed on 23 October.

## Next session (set 26 October)

Done on 26 October, on local `main`, not pushed:
- **The site reframe is merged** (the owner's choice: everything but the newest-first Results and the
  Timeline). `docs/lessons.md` holds the lessons by system component, each write-up opens with "What
  this teaches about building agents", and the site is "Building agents": six lesson cards on the
  home page, Lessons in the nav, "Case studies", "How it's built". Results stays oldest first, in
  chapters under the overview. A new write-up opens with the same section.
- **Doorway deaths: both fixes.** A shelter's line in the observation names hostile mobs within 8
  blocks of its doorway (", with a zombie at its doorway"), and going into a shelter (`build_shelter`,
  `sleep`) stops short of them and says why. Checked live: a zombie 4 blocks from the doorway at night,
  the agent stayed put at health 20; with it gone, it went in and closed the doorway.
- **`smelt`** reports an interrupt while it makes the furnace as aborted, so the model hears the real
  reason, not "the run is ending".
- **Dependencies:** the site's mermaid is 12.2.0 (KaTeX 0.18.10, Dependabot #3); the agents pin uuid
  11.1.1 (Dependabot #2) and take body-parser 1.20.9. `npm audit` is clean in both. A scripted agent
  with the viewer joined a test server on the new packages. Not checked in a browser: the How it's
  built diagram under mermaid 12.
- Old worktrees and branches removed. `main` up to 79af053 was pushed on 26 October.
- **The Results page has a Goals section** (the owner's ask: let readers take in and compare the
  goals, without ranking them): one card per goal with its text as the agents are told it (read from
  `src/agents/src/goals.ts`, so it can't drift), its guided variant, the world, and how often each
  model that tried it met it, in the order the goals were first tried.
- **Proof run bpoc3** (three Lunas, `team-base`, one rep, on 79af053, $0.34; the first try failed on
  an expired OpenAI key): the base on day 1, nothing else; 17 deaths. The doorway change worked (a hit
  stopped the way in 2 times in 99 shelter calls, tlunap1 32 in 179). Deaths undid every other part:
  9 came while the model was deciding, 7 during a flee that ran away from home, two of them to
  drowned by a lake. No chest was ever placed; sheep stayed out of sight 50 blocks south. Written up
  in 06.
- **Reflexes, after bpoc3 (the owner's call: "providing more reflexes is the right call"):** while
  the model decides, the agent steps back from any hostile within reach (`src/agents/src/reflexes.ts`);
  `flee` runs into a known shelter that lies away from the mobs, and steers off water. Checked live:
  health held at 20 beside two zombies where standing still fell to 5; flee got into a shelter 20
  blocks off, and turned away from a lake. Not yet in a run. Also: an end-of-run report with no logs
  no longer prints an earlier run's rows.

- **Proof run bpoc4 on the reflexes** (same settings, on 6527403, $0.37): more of the goal moved
  (2 of 3 slept in the home; the store reached 12 cooked meat, then was eaten down to 8; 15% of game
  time toward the goal, bpoc3 7%), but deaths rose to 24, 12 of them to skeletons. The step-back ran
  39 times and `flee` ran into a shelter 11 times; 9 deaths still came while deciding, 5 of them with
  the monster 5–19 blocks off, out of reach. After it: the step cap scales with the time budget
  (600 for three days), since 200 ended lc's run early. Written up in 06.

- **Ranged attack (the owner's call, after bpoc4): the reflex is split in two.** A monster within 3
  blocks is stepped back from; a skeleton within 16 blocks that can see the agent is hidden from (the
  range measured live: shots at 15 and 16.7 blocks, none at 17+, none through a wall). `flee` counts
  such a skeleton as danger, takes a shelter on any side with one in sight, and ends behind cover.
  Checked live: no arrows after taking cover, where standing still drew three; flee got into a
  shelter to the side. The Agent minds page has a favicon.
- **Flee and shelters (the owner's call, from bpoc4's logs):** running in the open gets an agent clear
  for a moment but rarely for good at night (65% of open-ground flees were followed by another within
  two decisions, 14% by a death), so `flee` now leans on shelters: it stays put inside a closed one
  (15 flees in bpoc4 started inside one), runs only to finished ones (all 26 failed ways in were an
  agent trying to finish a half-built base mid-chase), and reaches 64 blocks for one, not 40. Checked
  live: it stayed inside with zombies at the walls, and ran home from 56 blocks. The first bpoc5 was
  cut off when the session stopped (all three disconnected after 36-53 decisions, $0.09; set aside in
  `runs/.killed/`) and is restarted on these changes.
- **`store` says chests keep items through a death** (the owner's call, 26 October: "we're describing a
  tool, not telling them what to do"). In bpoc4 and bpoc5, 12 of 13 `store` calls were cooked meat,
  the goal's item, while wool and an iron pickaxe were lost in deaths. Runs from bpoc6 on carry the new
  wording, so compare deaths and losses across that line with care.
- **Proof run bpoc5** (restarted on the split reflex and the flee changes, on 88f8d1b, $0.37): the
  base, and the food part met and kept to the end (11 cooked meat) — 2 of 4; no beds, no iron. 22
  deaths, 12 to skeletons; deaths while deciding fell to 4 (bpoc3 and bpoc4: 9 each), deaths during a
  flee rose to 12. Not yet written up.
- **Wool and beds (the owner's ask, after bpoc5):** in bpoc3-bpoc5 every wool came from killing sheep
  (6-10 a run, against 9 for three beds), most was lost in deaths (6, 6, 3), nobody sheared, and a
  sheep was in view in 6-7% of observations. Done, all three (the owner's call): the observation lists
  animals the agent or a teammate saw in the last 10 minutes (`animalsSeen`, `src/agents/src/sightings.ts`,
  shared on the team board); `hunt` says a killed sheep drops 1 wool; the herd near spawn is 12 sheep,
  not 6. Checked live: a teammate's observation read "seen by sa"; a bot beside the herd remembered 13.
- **The pathfinder freeze at 2,74,34** is walked round after a first stuck (see limitations), checked
  live on the same seed.
- **Proof run bpoc6** (on 7bb0432, $0.30): **3 of 4 parts**, level with tbase4's best: the home on day
  1, everyone slept in it (first since bpoc2), 10 cooked meat stored; only iron missing. 8 deaths
  (bpoc4 24, bpoc5 22), one to a skeleton. Sightings were in 415 of 422 observations and agents walked
  to them. The iron was lost when la drowned mid-decision with all three pickaxes. Fixed after it, both
  checked live: swimming out while the model decides; `place_bed` passing over spots with a body in
  them and reporting a refusal as one (it had said "no room left" six times). Written up in 06.

- **The mixed team run tbase5** (27 October overnight, on 6799e5a; Opus 5.5, Sonnet 5.5, GPT-6 Luna;
  3 reps; $2 cap per agent per rep; $7.96): **1 of 3 teams met the whole goal — the first ever.** Rep 1
  finished every part halfway through day 2 with no deaths, for $1.36: Luna built the home, Opus did
  food and beds, Sonnet made three iron pickaxes and walked them round, and Opus called everyone to bed.
  Reps 2 and 3 met the home and food (13 and 24 cooked meat) but no one made an iron pickaxe: the ore in
  sight lay beside water or lava, which `mine_ore` refuses, and the way down to the rest was blocked.
  Opus also spent its $2 cap with time left in both, so it couldn't sleep at the end. Report published,
  written up in 06, on the site's Results story. The Claude key was checked first (both models answered
  through our backend).

Next, waiting on the owner:
1. **The cost cap: $3 per agent per rep from tbase6 on (the owner's call, 27 October).** Opus costs about
   $2.50-2.70 over three days; with a $2 cap it left reps 2 and 3 early, which alone made "everyone
   slept" unreachable. Three reps should cost about $10-12.
2. **Iron: done differently (27 October, the owner's call).** Looking closer, tbase5's iron wasn't far,
   it was deep: rep 1 mined it 42 blocks below the home's area, and in reps 2 and 3 `descend` toward it
   was called off at least 15 times by creepers, skeletons and endermen in caves beside the shaft,
   behind rock. Exploring the surface wouldn't have helped: iron came into view right after an `explore`
   only twice in two reps. Now `descend`, `tunnel` and `mine_ore` stop only for a mob that can get at the
   agent (in view, or right beside it), skill and interrupt alike. Checked live: a dig passed 5.9 blocks
   from a creeper behind rock and reached its depth; one with a creeper in view stopped at once. Ore
   beside water or lava stays off limits (the owner preferred not to change that).
   **Also done (27 October): ore memory.** `explore` reported only what was in view where it stopped, so
   ore passed on the way, or seen down a cave and left, was forgotten. Now each agent remembers ore it
   saw (as a player could see it) for 30 minutes and shares it with teammates; the observation lists it
   as `oreSeen`, with how far above or below, and flags a vein touching water or lava. Checked live.
3. **Then the same run again** (tbase6, `BUDGET_USD=3`), to see whether rep 1 repeats and iron comes in
   reps like 2 and 3.
   **Also done (27 October, the owner's call):** `climb_out` stops only for a mob that can get at the
   agent, like the other digging skills (in recent runs a mob nearby stopped 8 of 28 calls, and 3
   succeeded; checked live: it climbed out past a creeper 5 blocks off behind rock, and stopped for one
   in view). And the team report now counts what a death between steps took (see limitations).
   **Proof run bpoc7 (27 October, Luna, $0.23)** on all of that: home, beds and 3 of 3 asleep on day 1;
   iron on day 1 too (la had two iron pickaxes by 10:11, four made in all), but 1 of 3 held one at the
   end; 10 cooked meat stored on day 1 and taken back out by la on day 3. Only 2 deaths (bpoc6: 8),
   both la suffocating under gravel, never seen before `climb_out`: the first took both iron pickaxes,
   the second 8 of the meat. Fixed (checked live): the digging skills won't dig out from under gravel or
   sand and step aside instead, and a reflex digs out any block that lands on an agent's head. Also
   fixed: `smelt` chose planks as fuel and then crafted a table from them. Written up in 06.
   **Done (27 October, the owner's call): the cheapest tool that does the job, everywhere.** Not tied to
   the goal, so it holds for a later goal of a better pickaxe. `mine_stone` used the best pickaxe and
   walking the fastest tool, iron included; now both take the cheapest quick enough, and the prompt's
   `wearingOut` line says so. Checked live: 6 stone cost the iron pickaxe 6 uses before and the stone one
   6 after; digging out of a sealed room took the stone pickaxe through stone and a bare hand through
   dirt, the iron one untouched. Wear was rare anyway: 1 of 14 iron pickaxes wore out, 24 were held at
   a death.
   **Proof run bpoc8 (27 October, Luna, $0.41)** on all of that: home and food (10 in the chest) met;
   2 of 3 slept; two iron pickaxes made, none worn out, all lost in deaths. 22 deaths (bpoc7: 2), 10 of
   them within 6 blocks of the home, mostly zombies at night: mobs gathered at its doorway every night
   and agents came back to life among them. Nothing of ours caused it; left open whether to give agents
   a way to deal with a besieged home. Fixed: the report read a death's drops, gone a step late, as
   tools worn out. Written up in 06.
   **Done (27 October, the owner's call): `flee` digs in.** When a monster keeps up, the agent is
   still in danger after running, or at night a melee mob is still within 32 blocks, it digs three
   blocks down and covers the hole, needing nothing carried; a dug-in or walled-in agent counts as
   sheltered, so the reflexes leave it there. Checked live: from empty-handed, dug in in 3.6 s; 30 s
   dug in among four zombies and a skeleton cost no health; fleeing three zombies at night, the old code
   was killed in 2 of 3 tries and the new survived 10 of 11. The owner asked for the run of deaths
   and fixes to be told as one story: 06 "The problem that kept coming back: staying alive", a lesson in
   lessons.md, and the site's Results page.
   **Proof run bpoc9 (27 October, Luna, $0.37):** 3 of 4 parts (home, 3 of 3 slept, 20 meat; iron 1 of
   3), 10 deaths, 2 at night (bpoc8: 19), mostly because the agents spent more of the night inside (35%
   of night decisions against 13%). `flee` dug in 3 times at night; one was false (knocked off the hole
   while digging, told it had dug in, then killed). Fixed and checked live: the burrow lands first,
   reports a dig-in only when the agent is really shut in alone, digs only with a 5-block lead, and stops
   when a monster reaches it. Whether digging in closes the night gap is still open: it ran too rarely
   here to say. Written up in 06.
   **Proof run bpoc10 (27 October, Luna, $0.22):** 3 of 4 parts, all three with an iron pickaxe, 2
   deaths; missed by 3 seconds when la took the stored meat to eat, and its teammates, whose last look
   at the chest was older, believed the food was stored for most of day 3. After it: `chestsSeen` (each
   chest the team knows, as last opened by anyone, and an event when a teammate finds one changed), and
   a bed refusal passes on the game's reason.
   **tbase6 (27 October, Opus, Sonnet and Luna, $7.80, $3 cap):** rep 1 met the whole goal again
   (30:10 of game time, no deaths, $1.43); rep 2 one iron pickaxe short (Opus was carrying Luna's when
   time ran out); rep 3 no beds (no sheep found), so a spawn trap: Opus died 18 times. The shared chest
   was read and used. Fixed after it: the agent waits for the respawn before observing (90 decisions in
   the logs were made at health 0, at the death spot), and chest calls say why a chest didn't open.
   Report published; written up in 06. Credit left: about $7 Anthropic, $1 OpenAI. **No Claude run
   without the owner's OK.**
   **Also done (28 October):** the description-length replay (`docs/ideas.md`, "The prompt": the
   detail earns its place, mostly in safety; $0.10 on Luna); beds and chests drawn in the browser
   viewer (`scripts/patch-viewer.mjs`, run by `npm install`'s postinstall); the minds page no longer
   bounces past its panels; the prompt-caching article drafted on rrjamal.ca (four TODOs left).
4. **Open, not urgent:** the tbase3 `give` timeout to a teammate inside the closed home (cause
   unknown); the second drowning gap (a skill started after a failed escape).
5. **Not pushed:** the owner pushes `main` (which also deploys the site). The branch
   `worktree-goals-section` on GitHub is merged and can be deleted.

## Setting up a new machine

1. Docker, [Ollama](https://ollama.com/) and Node 25+, then `cd src/agents && npm install`.
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

1. **A comparison of goals and agents: done 18 October** (`npm run compare`, `src/agents/src/compare.ts`).
   Every team run and batch writes `runs/compare-<team|batch>-<name>.md`: by goal, by model and
   condition, and for teams who did what, requests and a timeline. Extend it as questions come up.
2. **The long paid test: done 19 October (batch p2), 3 of 4 met.** One `outpost` run each in survival:
   Sonnet, Opus and GPT-6 Luna met it ($0.24, $0.33, $0.02); Haiku died at night, and its "goal met"
   came from a bug in our night check (fixed: a death at night now forfeits that night, in the
   agent's check and the report). $0.88 in all. Written up in `docs/results/write-ups/02-outpost.md`.
   Haiku's "flooded shelter" was a false drowning alarm: mineflayer reads any nearby creature's
   air as the bot's (fixed in `src/agents/src/breathFix.ts`, checked live). 3 runs each (batch p3) started
   19 October. In p3, Sonnet's first run lost two-thirds of its time stuck in the flooded cave under
   spawn: `mine_stone` measured its 6-block drop limit from the bot's feet each time, so it walked
   20 blocks down in one call, and no skill could get back up. Fixed after p3 on branch `climb-out`
   (`mine_stone` measures from where the call started; new `climb_out` skill; observations show
   `underground`), each checked live on a test server.
   Ideas not yet started (hunting, chests, farming, shearing, torches) are in `docs/ideas.md`.
   **Day and night now have one definition** (`src/agents/src/daytime.ts`, 19 October): night is 13000-23000,
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
   `recentEvents` (`src/agents/src/toolWear.ts`; checked live). Before, a pickaxe just vanished: 32 times in the
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
   and `flee` have the stuck check, which no longer takes digging for being stuck. Checked live; the
   message rule on 23 October: a second bot sent one message addressed to a scripted agent and 12 to
   everyone during its `build_shelter`, which none of them interrupted, and its next observation kept
   the addressed one (the oldest) with the newest 8 of the 12.
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
   **Reports now put the team and the goal first (20 October, the owner's ask).** The point of the
   experiment is how the agents behave on their own: what they do toward the goal and what moves
   away from it, how they handle the unexpected while keeping the goal in mind, and how they work
   together or hinder one another. Per-model numbers are secondary. A team report now opens with
   the goal at the end, each part's story (what moved it, what set it back), the share of game time
   by kind of work, what broke work off and how soon the agent was back at it, and help and
   hindrance between teammates; each agent's numbers fold underneath (`src/agents/src/goalWork.ts`). tbase1's
   report and write-up 06 are redone that way. Rewriting it found one more bug of ours: health under
   half a point read as 0 (Sonnet, rep 3, 26 decisions; fixed, checked live). 06 was then rewritten
   again with the game only as examples; the owner called it "the vibe we want moving forwards", not
   perfect. The triage skill and CLAUDE.md now say so; the generated report's goal sections are in
   plain words too.
   **On the fixed code: tbase2 and tbase3 (21 October, one rep each, $3.50 and $3.46): 0 of 2.** The
   owner's rule for improving agents: tools and true environmental information only. Before them,
   an audit of what our code tells the agents fixed smelting with mixed fuel (42 failures in tbase1),
   a just-killed animal still listed, and "no ore in reach" beside ore in sight across water. Iron
   and food now moved: Opus made three iron pickaxes by early day 2 both times, and tbase3 met the
   food part. What stopped the teams was their own behaviour and the three-day limit: Opus carried
   all three pickaxes and died with them each time; Sonnet kept a spare bed while Luna was told
   every bed was taken; messages remained mostly status updates. Fixed after: agents stuck on the
   treetops (six times in tbase2), and `look_in_chest`, since an agent took meat out of the store to
   see what was in it. Not fixed: in tbase3 a `give` walk to a teammate inside the closed home timed
   out from 22 blocks (cause unknown). Written up in 06, which now leads with the clearest finding
   (agents answer requests, not needs; measured in every team report as "Asked for, or only needed")
   and has a section on the development loop itself: where the agents got stuck, what was changed,
   and the same problem in real AI-agent systems (the owner's ask; the triage skill now requires it).
   Fixed since tbase3, each checked live: beds shown in the observation, with how many are in use, and
   furniture counted apart so stone can't crowd a chest out; `place_bed`; and sleepers stay in bed
   until the night passes or a teammate speaks to them, not 90 seconds (they had missed each other by
   seconds). **tbase4 (21 October, one rep, $3.56, cap $2 per agent): 3 of 4 parts,
   the most complete team yet.** Every agent held an iron pickaxe at the end for the first time
   (Sonnet handed each over as it was made, each after requests), 24 cooked meat were stored, and
   `place_bed` let Sonnet put a bed down that Luna slept in. Beds stopped it: one made all rep, after
   a spawn trap at the home's door (it stands on the world spawn point) cost 11 deaths in three
   minutes and eight lots of wool. Hand-reading every handover in six reps: 31 of 35 followed a
   request or a plain "I still need X". The report's own count of this only matches item names in
   messages, and is now labelled a rough guide. After it: "no agent called X in this world" for one
   that had left now says it isn't in the world right now. About $1.20 of Anthropic credit is left,
   so no paid runs until the owner tops up.
   **tluna1 (21 October, three Lunas, three reps, $0.91): 0 of 3, worse than the mixed teams and
   than bpoc2's one rep.** One Luna built the home each rep and another made three iron pickaxes in
   two reps, but both sets were lost: rep 2 to two of our messages (`give` said "beside them" of a
   receiver that had walked off; `take` called pickaxes picked up off the ground "taken from the
   chest"), both fixed and checked live, and rep 3 to one agent carrying all three and dying. Beds
   were hardly tried (three made, three sleeps); the spawn trap returned in rep 1 (28 of 42 deaths
   by the home). Written up in 06. `--progress on` was run next (tlunap1, below). The spawn trap
   is left alone: where a world's spawn point is, and whether to build there, is the game's, but
   the team chose it.
   **tlunap1 (23 October, three Lunas, three reps, `--progress on`, on 5d8b958, $0.95): 0 of 3.**
   The food part was met on day 1 of every rep and kept (tluna1: 1 of 3); in rep 3 lb saw the store
   drop to 8 and topped it up unasked. Iron and beds didn't move. Three faults of ours, fixed and
   checked live: `flee` ran on after a death and reported success (39 of 86 deaths); each agent's
   list named its own base when nobody had slept in one; and a teammate's holdings reached the
   list only between its steps, so la gave away its last iron pickaxe on a list 16 s old. Rep 2's
   home became a trap (23 of 61 deaths at it). Written up in 06.
   **Next, on the owner's word:** the mixed team (Opus, Sonnet, Luna) on the fixed code, about $12,
   once Anthropic credit is topped up (24 October); with `--progress on` as its own condition after.
3. **The free model on the outpost goal: done 19 October (b15, b16), 0 of 9.** b15 (today's code,
   plan memory, progress off and on) met it 0 of 6; b16 (b12's code, three runs) 0 of 3, so b12's
   2 of 6 didn't repeat. Both versions loop on `gather_wood` for logs already held (up to 153 times
   in a row) and choose the same again after nearly every repetition note. The owner's call: that
   is the model's failure, to be reported, not fixed in code. The run report and comparison now
   count how often an agent was told it was repeating itself and kept on. Written up in
   `docs/results/write-ups/02-outpost.md`. Still open from `docs/limitations.md`: waiting out the night
   in the sandbox, and `mine_ore` failing to reach ore it can see.
4. **`mine_stone` timeouts: found and fixed 23 October, checked live.** mineflayer fixes a dig's time
   when it starts, from the item in hand and whether the bot is on the ground. The pathfinder equips
   whatever digs its way fastest (a shovel for dirt), or the dirt it places as a step, and leaves it
   in hand, so `mine_stone` dug stone with a shovel: 7.5 s a block and no cobblestone, or 37.5 s off
   the ground, which was the "timed out after 20000ms". Agents carrying a shovel (every team run) were
   the ones hit. Live, with a stone shovel and pickaxe at the same places: before, 50 of 83 stone digs
   without the pickaxe, 4 timeouts, one call 0 of 12 in 247 s, 561 s in all; after (the best pickaxe
   put in hand and the bot landed before every dig), 0 of 40, no timeouts, 5 of 5 met, 114 s.
   Walking and exploring timeouts are separate and not looked at.
5. **Panel start line: done 18 October.** An agent writes `<log>.start.json` when it starts, and the
   panel lists it as "Starting" until its first decision is logged.
6. **Extended thinking for Claude: left off, written up as a limitation** (`docs/limitations.md`,
   "Not yet tested", with how to measure it). Candidate for the long paid test (#2 above).
7. **Made public 18 October.** The history was scanned for keys, tokens and private keys (none); the
   `protect-main` ruleset is enforced and now also requires CI; outside contributors' pull requests
   need approval before any workflow runs; only GitHub-owned actions are allowed; the workflow token
   is read-only. Work goes through branches and pull requests (`CLAUDE.md`).
8. **Two drowning gaps, deferred by the owner (18 October):** water while the model is thinking
   (closed on 27 October: drowning showed up again in bpoc6 and cost the iron part), and a skill
   started after a failed escape (still open). See `docs/limitations.md` ("Rough edges in the code").
