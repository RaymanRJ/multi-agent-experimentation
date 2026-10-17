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
| `--goal` | `tools`, `shelter`, `outpost`, `iron`, `diamond`, or any sentence in quotes | What the agent is asked to achieve. Preset goals are checked by code, and the run ends when they are met. `tools-guided` and `shelter-guided` spell out the steps. |
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
`+progress` to turn on `--progress` for that condition, e.g. `ollama:none+progress`.

The list of runs goes to `runs/batch-b10.txt`. Each run's server log is saved next to its run log.

## Several agents together: `team.sh`

```bash
STANCE=competitive scripts/team.sh t2 "qa=ollama:full qb=ollama:full" 3 12000
STANCE=collaborative GOAL=shelter scripts/team.sh t3 "opus=claude:full@claude-opus-5-5 qwen=ollama:full"
```

Each agent is `name=brain:memory@model`, where the memory and the model are optional. All agents in
one repeat share a world and an episode ID, so the report can score them together:
- **collaborative:** the team wins only if every member reaches the goal;
- **competitive:** only the first agent to reach it wins.

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
- **brain unavailable**: a bad key or no credits;
- **step limit**: the safety cap on decisions (`--steps`) was hit.

It also has these columns:
- **Furthest**: the furthest milestone the run reached (logs, wooden pickaxe, stone, stone pickaxe, shelter, survived the night).
- **Re-asks**: answers the model got wrong and was asked again for.
- **Throttled**: provider rate-limit retries.
- **Cached**: the share of input tokens read from the provider's prompt cache, which are billed at a discount.
- **Done refused**: times the model said "done" before the goal was met.

To see why a run failed, open its log in the minds panel (`npm run minds`, then
http://localhost:3010). It shows every decision: what the agent saw, what it chose and why, and
what happened.

## Making a result trustworthy

- **Run the baseline too.** If `scripted` fails a goal, the problem is in the skills, not the model.
- **3 runs per condition is a hint, not a finding.** Look at the interval, and pool comparable batches.
- **Read the failures.** Every failure in [the results so far](results/) was read from its log. Several turned out to be bugs in our code, not the model.
- **Don't change code during a batch.** All runs in a batch must use the same code.
