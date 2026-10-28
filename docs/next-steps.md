# Where things stand, and what's next

Read this at the start of a session; update it when something finishes or a new ask comes in. The
plan comes first; what's done is a dated list at the end, one line each, with the write-ups holding
the detail.
*Last updated 28 October 2026.*

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
4. **Small, any time:**
   - **Done (28 October, the owner's call): herds restocked each morning.** Failed reps were the ones
     with deaths on day 1 (every success had at most one), and lost food and wool couldn't be replaced:
     the game barely brings animals back in the dark forest. Now at each dawn the herds are put back to
     their number, silently (checked live: 12 sheep, 5 killed, 12 again after dawn). keepInventory was
     considered and left alone: it would remove the cost of dying, which is part of the test.
     **Proof run bpoc11** (three Lunas, US$0.25): the restock worked (4, 5 and 9 animals put back);
     lc lost its wool to deaths three times and gathered it again, and three beds went into the home.
     2 of 4 parts: lb made all three iron pickaxes 43 blocks underground and never got out, so neither
     the pickaxes nor the last sleeper reached the home. Write-up 06.
   - **Next: getting out of caves** (bpoc11, our code): `climb_out`'s pillar placed whatever was in
     hand (an iron pickaxe) instead of making sure of a block; "not standing on solid ground" and "a
     drop into a cave" on every side left no way up; `tunnel` and `climb_out` pass on library errors
     ("invalid operation", "The goal was changed…"). Reproduce at lb's spot (12,24,60 on the seed),
     fix, check live, then another Luna proof run.
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
