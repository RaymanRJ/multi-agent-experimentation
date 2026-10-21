# Results

What the batches measured. Two kinds of file, both in the order things happened:

- **[`write-ups/`](write-ups/)**: what a set of batches found, read from their logs and written by hand,
  numbered in the order they were started. A write-up can cover several batches over several days.
- **[`batch-reports/`](batch-reports/)**: what the code reported for each batch, one page per batch,
  named by when its first run started, in UTC (`2026-10-17-2006-b13` ran before `2026-10-17-2302-b12`).
  The table under [Batch reports](#batch-reports) lists them in that order, with the write-up for each.

## How the testbed is developed

By reading where the agents get stuck, and changing only their tools and the information they're
given: never their prompt, and never by deciding for them. Each write-up has a section on what our
code got wrong and what was fixed after. [06](write-ups/06-team-base.md#how-this-testbed-gets-better-from-where-the-agents-get-stuck)
sets the loop out in full, with each fix beside the same problem in real systems that use AI agents
(misleading tool results, statuses that contradict the evidence, no read-only views, missing tools,
truncated context). Earlier write-ups' "found and fixed" sections are the same loop:
[02](write-ups/02-outpost.md), [04](write-ups/04-p6-outpost-after-fixes.md),
[05](write-ups/05-team-homestead.md).

## Terms

From smallest to largest:

| Term | What it is | Example |
|---|---|---|
| **Run** | One agent playing one game from start to end: a model, a goal and a time limit, in a freshly made world. It ends when the goal is met, the time runs out or the model stops. One run is one log file in `runs/`, and one row in a report. | Opus playing `outpost` for 27,000 ticks (about 22 minutes) |
| **Condition** | The settings a run is played under: the model (or the scripted baseline), memory, the progress list, the stance. Runs are compared condition against condition. | Opus with plan memory and the progress list off |
| **Rep** | One repeat of the same thing. A model can do well or badly by chance, so each condition is run several times, usually three. | Opus's 3 runs of `outpost` in p6 |
| **Batch** | A set of runs started with one command, on one version of the code: every condition, each repeated. Runs go one after another, each agent alone in its own world. A batch has a short name. | p6: 4 models × 3 reps = 12 runs, about 4 hours |
| **Team run** | Like a batch, but several agents play together in one world, started together. One rep is one game with the whole team, so a team run of 3 agents and 3 reps is 9 runs. Here "batch" covers team runs too. | thome1: Opus, Sonnet and Luna together, 3 reps = 9 runs |
| **Proof run** (`poc`) | A small batch, usually one cheap run, to check a code change works before spending on a real batch. Not published. | poc7: one Luna run |
| **Batch report** | What the code writes at the end of a batch, from the logs alone: success per condition, every run's scorecard, which skills were used. No judgement. | [`batch-reports/2026-10-20-0428-p6.md`](batch-reports/2026-10-20-0428-p6.md) |
| **Write-up** | What a person concluded from one or more batches, after reading the logs: why runs failed (our code, the game or the model), what was fixed, and whether batches compare. | [`04-p6-outpost-after-fixes.md`](write-ups/04-p6-outpost-after-fixes.md) |

| Write-up | Dates | Batches | Question |
|---|---|---|---|
| [01 Local-model memory](write-ups/01-local-model-memory.md) | 16–17 Oct | b1, b4–b7 | What does memory (none, plan, full) do for a small local model? |
| [02 Outpost](write-ups/02-outpost.md) | 17–20 Oct | b8–b10, b12, b14–b16, p2, p3, p5 | Can an agent make four stone tools and a shelter before dark, and survive the night? The local model, the scripted baseline, then the paid models. |
| [03 Iron](write-ups/03-iron.md) | 17 Oct | b11, b13 | Can the local model mine, smelt and craft an iron pickaxe in a day? |
| [04 Outpost after the p5 fixes](write-ups/04-p6-outpost-after-fixes.md) | 20 Oct | p6 | The paid models on the outpost goal again: 12 of 12 met. |
| [05 Team homestead](write-ups/05-team-homestead.md) | 20 Oct | hpoc, thome1 | Can three models together build, sleep, mine iron and store food over three days? 0 of 3 teams. |
| [06 Team base](write-ups/06-team-base.md) | 20–21 Oct | bpoc, bpoc2, tbase1–3 | The same, with one large shelter for everyone and a bed inside it. 0 of 3 teams. Every team split the work over chat at once and kept to it; teammates' messages broke off each other's work nearly as often as mobs. Iron failed mostly on a `mine_ore` bug, since fixed; on the fixed code (tbase2, tbase3) iron and food moved, and the agents' own habits (one agent carrying every pickaxe, a spare bed kept) and time stopped them. |

[`skill-usage.md`](skill-usage.md) is a running tracker across batches (below).

## Skill usage

[skill-usage.md](skill-usage.md) counts, for every real batch and team run since p5, how many runs chose
each skill, how often it worked, its share of game time, and how common it was in goal-met runs
against the rest; then the same per goal. Each batch's report (`batch-reports/<date>-<time>-<name>.md`) has
the table for its own runs. Rebuild it with the command at its top after a new batch.

Read it with the skills' own rules in mind:
- **`sleep` counts as failed** whenever the night did not pass, though the agent did sleep. The
  goal check counts the sleep.
- **`mine_ore` counts as failed** when it got fewer ore than asked.
- **`wait` is most of `outpost`'s game time:** sitting in the shelter is the goal there.

As of tbase1:
- **Every run needs `craft`, `gather_wood` and `mine_stone`.**
- **`build_shelter` and `wait` carried `outpost`.** Every goal-met run used both.
- **The team goal leans on more of the library:** `flee`, `go_to`, `smelt`, `pick_up`, `hunt`,
  `give`, `eat` and `sleep` appear in 7–9 of 9 team runs.
- **`mine_ore` worked 8% of the times it was chosen** (173 times, 15 runs): it gave up on ore
  beside it as "out of reach". Fixed after tbase1, so later batches should differ.
- **`shear` has never been chosen;** wool came from `hunt`ing sheep. `take` was first used in
  tbase1, and its whole-stack bug emptied a food chest (fixed).
- **`tell_agent` was used once before tbase1, then 29 times in it** (Luna 27), against 19
  `ask_agent` questions there.

## Batch reports

`batch-reports/<date>-<time>-<name>.md` is the report built from each real batch's logs, one page: the
batch comparison (each run's scorecard, who did what, which skills were used), then success per condition
with intervals. It carries no prompts. `scripts/publish-reports.sh <name>` builds it from `runs/`; runs
are named by agent, `<agent>-<rep>` in a team run. Each run's step-by-step behaviour report stays in
`runs/` beside its log (`npm run summary`), unpublished like the logs: until 20 October they were
published too, 245 pages that repeated the comparisons and that almost no one would open.

Batches before p5 were rebuilt on 20 October from the logs kept on this machine, with that day's
report code. Each report says which code built it. Where a number differs from its write-up, the
write-up was made at the time and the report code has been fixed since. Proof runs (`poc`) and dev
runs that no write-up uses are not published.

| Run | Started | Goal | Who | Met | Written up in |
|---|---|---|---|---|---|
| [b1](batch-reports/2026-10-16-2227-b1.md) | 16 Oct | `tools-guided`, `shelter-guided` | qwen3 4B, scripted | 18 of 24 | [local-model memory](write-ups/01-local-model-memory.md) |
| [b4](batch-reports/2026-10-17-0215-b4.md) | 17 Oct | `tools-guided` | qwen3 4B, scripted | 11 of 12 | [local-model memory](write-ups/01-local-model-memory.md) |
| [b5](batch-reports/2026-10-17-0249-b5.md) | 17 Oct | `tools`, `shelter`, `shelter-guided` | qwen3 4B, scripted | 32 of 36 | [local-model memory](write-ups/01-local-model-memory.md) |
| [b6](batch-reports/2026-10-17-0454-b6.md) | 17 Oct | `tools`, `shelter` | qwen3 4B | 6 of 12 | [local-model memory](write-ups/01-local-model-memory.md) |
| [b7](batch-reports/2026-10-17-0653-b7.md) | 17 Oct | `tools`, `shelter` | qwen3 4B | 9 of 12 | [local-model memory](write-ups/01-local-model-memory.md) |
| [b8](batch-reports/2026-10-17-0809-b8.md) | 17 Oct | `outpost` | qwen3 4B, scripted | 1 of 12 | [outpost](write-ups/02-outpost.md) |
| [b9](batch-reports/2026-10-17-1211-b9.md) | 17 Oct | `outpost` | qwen3 4B, scripted | 3 of 12 | [outpost](write-ups/02-outpost.md) |
| [b10](batch-reports/2026-10-17-1556-b10.md) | 17 Oct | `outpost` | scripted | 3 of 3 | [outpost](write-ups/02-outpost.md) |
| [b11](batch-reports/2026-10-17-1655-b11.md) | 17 Oct | `iron` | qwen3 4B, scripted | 0 of 2 | [iron](write-ups/03-iron.md) |
| [b13](batch-reports/2026-10-17-2006-b13.md) | 17 Oct | `iron` | qwen3 4B, scripted | 2 of 9 | [iron](write-ups/03-iron.md) |
| [b12](batch-reports/2026-10-17-2302-b12.md) | 17 Oct | `outpost` | qwen3 4B, scripted | 4 of 21 | [outpost](write-ups/02-outpost.md) |
| [b14](batch-reports/2026-10-18-1403-b14.md) | 18 Oct | `outpost` | scripted | 3 of 3 | [outpost](write-ups/02-outpost.md) |
| [trio1](batch-reports/2026-10-18-1900-trio1.md) | 18 Oct | `team-camp` | Haiku, Sonnet, qwen3 4B together | the team, 1 of 1 | [next steps](../next-steps.md) |
| [trio2](batch-reports/2026-10-18-2133-trio2.md) | 18 Oct | `team-camp` | Haiku, Sonnet, qwen3 4B together | 0 of 1 | [next steps](../next-steps.md) |
| [trio3](batch-reports/2026-10-18-2207-trio3.md) | 18 Oct | `team-camp` | Haiku, Sonnet, qwen3 4B together | the team, 1 of 1 | [next steps](../next-steps.md) |
| [quad1](batch-reports/2026-10-18-2256-quad1.md) | 18 Oct | `team-camp` | Haiku, Sonnet, Luna, qwen3 4B together | the team, 1 of 1 | [next steps](../next-steps.md) |
| [b15](batch-reports/2026-10-18-2314-b15.md) | 18 Oct | `outpost` | qwen3 4B | 0 of 6 | [outpost](write-ups/02-outpost.md) |
| [b16](batch-reports/2026-10-19-0322-b16.md) | 19 Oct | `outpost` | qwen3 4B | 0 of 3 | [outpost](write-ups/02-outpost.md) |
| [p2](batch-reports/2026-10-19-1650-p2.md) | 19 Oct | `outpost` | Haiku, Sonnet, Opus, Luna | 3 of 4 | [outpost](write-ups/02-outpost.md) |
| [p3](batch-reports/2026-10-19-1923-p3.md) | 19 Oct | `outpost` | Haiku, Sonnet, Opus, Luna | stopped early | [outpost](write-ups/02-outpost.md) |
| [p5](batch-reports/2026-10-19-2207-p5.md) | 19–20 Oct | `outpost` | Haiku, Sonnet, Opus, Luna | 4 of 12 | [outpost](write-ups/02-outpost.md) |
| [p6](batch-reports/2026-10-20-0428-p6.md) | 20 Oct | `outpost` | Haiku, Sonnet, Opus, Luna | 12 of 12 | [p6](write-ups/04-p6-outpost-after-fixes.md) |
| [thome1](batch-reports/2026-10-20-0930-thome1.md) | 20 Oct | `team-homestead` | Opus, Sonnet, Luna together | 0 of 3 teams | [team homestead](write-ups/05-team-homestead.md) |
| [tbase1](batch-reports/2026-10-20-2133-tbase1.md) | 20 Oct | `team-base` | Opus, Sonnet, Luna together | 0 of 3 teams | [team base](write-ups/06-team-base.md) |
| [tbase2](batch-reports/2026-10-21-0441-tbase2.md) | 21 Oct | `team-base` | Opus, Sonnet, Luna together | 0 of 1 team | [team base](write-ups/06-team-base.md) |
| [tbase3](batch-reports/2026-10-21-0552-tbase3.md) | 21 Oct | `team-base` | Opus, Sonnet, Luna together | 0 of 1 team | [team base](write-ups/06-team-base.md) |

## Batch names

A batch (see [Terms](#terms)) is started with one command, `scripts/batch.sh <name> …` or
`scripts/team.sh <name> …`. Its name is only a label, so that a
write-up, the logs and `npm run report -- --batch <name>` can refer to the same runs. The letter
says roughly what was being run:

| Prefix | What | Example |
|---|---|---|
| `b` | The free local model (qwen) and the scripted baseline | b12, b16 |
| `p` | Paid models (Claude, GPT) | p2, p5 |
| `poc` | A proof run: one or a few runs to check a change works before a batch | poc1, poc6 |
| `t`, `trio`, `quad` | Several agents in one world (`team.sh`) | trio1 |

Numbers go up with time. The code changed between batches (each write-up says what changed), so
compare batches only where the write-up says they are comparable.

## Why the logs are not here

Each write-up is the record: the date, the conditions, the code it ran on (a commit, for the later
batches; what changed since the last batch, for the earlier ones), the numbers and what
was read in the logs to explain them. The logs themselves (`runs/`) are kept out of git:

- **Size.** About 130 MB for the 275 runs so far, growing by about 11 MB for a paid batch of 12 runs.
- **What they hold.** Every observation, every full prompt and every model reply. Nothing secret
  (API keys never reach them, and none are in them), but it is the bulk of the work, not its result,
  and it would make the public history heavy for anyone who clones it.
- **Not needed to check a claim.** A batch can be run again from the code it ran on, on any
  machine, with the same command and seed. Wall-clock and model answers will differ, which is
  why results are given as rates with intervals rather than single runs.

Logs on earlier machines were not kept. If a set of logs ever needs sharing, a release archive
outside the git history (or a private bucket) is the place, not the repository.
