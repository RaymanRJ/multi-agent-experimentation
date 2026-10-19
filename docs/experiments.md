# Running experiments

How to run a fair comparison between models, settings or stances, and how to read the results.
For playing around, `./start.sh` is enough; this page is for when you want numbers.

## The idea

An **experiment** is a set of runs that differ in exactly one thing: the model, its memory, its
stance toward other agents, or the goal. Everything else is held fixed:

- **The same world:** every run gets a fresh copy, generated from one seed.
- **The same start area:** agents appear within a 20-block area.
- **The same time budget:** in game ticks, so a slow model loses game time.
- **The same skills and prompt.**

Each run writes one log file to `runs/`. The report reads those logs, so you can re-analyse old
runs without spending anything again.

## The knobs

| Option | Values | What it changes |
|---|---|---|
| `--brain` | `scripted`, `ollama`, `claude`, `gpt`, `gemini`, `grok`, `groq`, `openrouter` | Who decides. `scripted` is fixed rules, no model; it is the control. |
| `--goal` | `tools`, `shelter`, `outpost`, `iron`, `diamond`, `team-camp`, or any sentence in quotes | What the agent is asked to achieve. Preset goals are checked by code, and the run ends when they are met. `tools-guided` and `shelter-guided` spell out the steps. |
| `--scenario` | `sandbox`, `survival` | Peaceful world, or one with hostile mobs and hunger. |
| `--ticks` | e.g. `12000` (half a day), `27000` (a day and a night) | The time budget. 20 ticks = 1 second. |
| `--memory` | `none`, `plan`, `full` | What the model remembers between decisions: nothing, a short plan it wrote itself, or the whole conversation. |
| `--stance` | `neutral`, `collaborative`, `competitive` | How the agent is told to regard other agents. See [communication](communication.md). |
| `--comms` | `on`, `off` | Whether agents can read and send chat. |
| `--progress` | `off` (default), `on` | Whether each observation lists what a preset goal still lacks, e.g. "no shelter has been built yet". Facts, not steps: it measures how much a model needs to be reminded. |
| `--budget-usd` | e.g. `1.00` (the default) | Stops a paid run before it spends more than this. |

## One agent, many conditions: `batch.sh`

```bash
CONDITIONS="scripted ollama:none ollama:full" GOALS="tools shelter" scripts/batch.sh b10 3 12000 sandbox
```

This runs every condition on every goal, 3 times each, for 12,000 ticks each, in the sandbox.
Each run gets a fresh world on its own throwaway server, so your main world is never touched. A
condition is `brain:memory`, and a paid model is named the same way, e.g. `claude:full`. Add
`+progress` to turn on `--progress` for that condition, e.g. `ollama:none+progress`. Add `@model` to pick the model, so one batch can compare several models from one
provider:

```bash
BUDGET_USD=15 CONDITIONS="claude:plan@claude-haiku-4-5 claude:plan@claude-sonnet-5-5 claude:plan@claude-opus-5-5" \
  GOALS=outpost scripts/batch.sh p1 3 27000 survival
```

`BUDGET_USD` caps what each paid run may spend (default $1.00). A run that reaches it ends as
"cost budget", so raise it for long goals: an outpost run on a large model can cost several dollars.

The list of runs goes to `runs/batch-b10.txt`. Each run's server log is saved next to its run log.

To watch, add `VIEW=on`: each run serves its 3D view at http://localhost:3007 (or `VIEW_PORT`). The
runs go one at a time, so the same address shows whichever run is going. The viewer only watches;
nothing extra joins the world, so watching doesn't change the experiment.

## Several agents together: `team.sh`

```bash
STANCE=competitive scripts/team.sh t2 "qa=ollama:full qb=ollama:full" 3 12000
STANCE=collaborative GOAL=shelter scripts/team.sh t3 "opus=claude:full@claude-opus-5-5 qwen=ollama:full"
STANCE=collaborative GOAL=team-camp VIEW=on scripts/team.sh t4 "haiku=claude@claude-haiku-4-5 qwen=ollama"
```

Each agent is `name=brain:memory@model`, where the memory and the model are optional. All agents in
one repeat share a world and an episode ID, so the report can score them together:
- **collaborative:** the team wins only if every member reaches the goal;
- **competitive:** only the first agent to reach it wins.

A collaborative agent that reaches the goal doesn't leave: its run goes on until every teammate has
reached it too, so it can help. Agents can hand each other items with `give`, and collect dropped
items with `pick_up`.

**`team-camp`** is a goal for the whole team: between them, the agents must hold a stone pickaxe, axe,
sword and shovel, with every member carrying at least one, and one of them must build a two-storey
shelter (`build_shelter` with `storeys` 2: about 87 blocks, or 22 logs). It doesn't matter who builds,
so it pays to split the work. Every agent's run ends as soon as the team has it all. Agents learn what teammates
hold only by looking and asking; the shared tally behind the check (`runs/.teams/`) is never shown
to them. `VIEW=on` serves each agent's view in a browser, from localhost:3007 up.

## Reading the results

```bash
npm run report                                   # one row per run
npm run report -- --by condition --batch b10     # one row per condition, with success rates
```

The per-condition table is the one to quote:

| Column | Meaning |
|---|---|
| Success | Runs that met the goal, out of runs that count. Uses the stance's rule for team runs. |
| 95% CI | How sure we can be. With 3 runs, 3/3 is consistent with a true rate as low as 44%. |
| Ticks*, Decisions* | Median game time and model decisions to reach the goal, over successful runs only. |
| TokenIn, Median(ms) | Total input tokens, and median time per decision. |
| Cost(USD) | Total spend at the prices in `src/backends/pricing.ts`. |
| Excluded | Runs that don't count, e.g. a paid run that ran out of credits. |

The per-run table adds why each run ended:
- **goal met**;
- **time budget**: the time ran out;
- **model ended**: the model said "done" twice in a row;
- **model gave up**: the model chose `give_up`, saying why it can't meet the goal (the run report
  quotes the reason, and the minds panel shows it);
- **brain unavailable**: a bad key or no credits;
- **step limit**: the safety cap on decisions (`--steps`) was hit.

It also has these columns:
- **Furthest**: the furthest milestone the run reached (logs, wooden pickaxe, stone, stone pickaxe, shelter, survived the night).
- **Re-asks**: answers the model got wrong and was asked again for.
- **Throttled**: provider rate-limit retries.
- **Cached**: the share of input tokens read from the provider's prompt cache, which are billed at a discount.
- **Done refused**: times the model said "done" before the goal was met.

Every run also writes a short report on how the agent behaved, beside its log as
`runs/<file>.summary.md`, when it ends. It starts with a verdict in plain sentences, then:
- **a scorecard:** decisions that worked, how often it changed course after a failure, failures
  that repeated an earlier one exactly, its longest loop, how often it was told it was repeating
  itself and kept on, false "done" claims, unusable answers,
  deaths, think time, tokens and cost;
- **progress** through the milestones;
- **where the game time went,** by skill and waiting on the model;
- **what got in its way;**
- **for a model, its own reasons** at the start, in its longest loop and at the end.

The step-by-step story and the final inventory are folded away at the bottom. To rebuild
reports, for example for runs from before this existed:

```bash
npm run summary                         # the newest run
npm run summary -- runs/<file>.jsonl    # a particular run
npm run summary -- --batch b10          # every run in a batch
```

**Comparing runs.** Every team run and batch also ends with one readable report across all its
runs, `runs/compare-team-<name>.md` or `runs/compare-batch-<name>.md`. For each goal:

- **an at-a-glance table,** one row per agent: the outcome, decisions, how many worked, whether it
  changed course after failing, its longest loop, how often it kept on after being told it was
  repeating itself, unusable answers, deaths and cost;
- **by model and condition,** when a goal was run more than once: how often it was met (with a 95%
  range), the median time and decisions, and the cost per run;
- **for a team,** who made, built and handed over what, what they asked of each other and whether it
  was done, and a timeline of the key moments across all the agents;
- **a sentence or two on each agent,** from its own report.

```bash
npm run compare -- --team trio3         # rebuild a team run's comparison
npm run compare -- --batch b13          # a batch's
npm run compare -- runs/a.jsonl runs/b.jsonl --title "Haiku vs Sonnet"   # any runs
```

`runs/` is not committed: copy a comparison worth keeping into `docs/results/`.

To see why a run failed, open its log in the minds panel (`npm run minds`, then
http://localhost:3010). It shows every decision: what the agent saw, what it chose and why, and
what happened. Its **Run setup** button opens the world settings, the run's limits and the full
system prompt the model was given.

## Running paid models

Paid models cost real money, so start small and size the real test from what the first runs cost.

1. **Set up the keys.** `cp .env.example .env`, then fill in `ANTHROPIC_API_KEY` and/or
   `OPENAI_API_KEY`. Set a monthly spend limit in each provider's console too.
2. **Proof of concept: one short and one long run per model.**
   ```bash
   BUDGET_USD=3 CONDITIONS="claude:plan@claude-haiku-4-5 claude:plan@claude-sonnet-5-5 claude:plan@claude-opus-5-5" \
     GOALS="tools" scripts/batch.sh poc1 1 12000 sandbox
   BUDGET_USD=15 CONDITIONS="claude:plan@claude-haiku-4-5 claude:plan@claude-sonnet-5-5 claude:plan@claude-opus-5-5" \
     GOALS="outpost" scripts/batch.sh poc2 1 27000 survival
   ```
   The same works for OpenAI with `gpt:plan@<model>`. A model with no price in
   `src/backends/pricing.ts` refuses to start, so `--budget-usd` can always stop it.
3. **Check the proof of concept.** `npm run report -- --batch poc2` and `npm run summary -- --batch poc2`:
   - **Ended** is "goal met" or "time budget", not "brain unavailable" (a key or credit problem)
     or "cost budget" (`BUDGET_USD` too low).
   - **Cached** is above 0% after the first few decisions. If it stays at 0% for a model, its
     minimum prompt length for caching is above our prompt's, and runs on it cost full price.
   - **Cost(USD)** per run, to multiply out for the real test.
4. **The real test:** the conditions you want to compare × at least 3 reps, with `BUDGET_USD` set a
   little above the most expensive run seen in the proof of concept.

## Making a result trustworthy

- **Run the baseline too.** If `scripted` fails a goal, the problem is in the skills, not the model.
- **3 runs per condition is a hint, not a finding.** Look at the interval, and pool comparable batches.
- **Read the failures.** Every failure in [the results so far](results/) was read from its log. Several turned out to be bugs in our code, not the model.
- **Don't change code during a batch.** All runs in a batch must use the same code.
