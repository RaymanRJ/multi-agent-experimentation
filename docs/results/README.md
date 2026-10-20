# Results

What the batches measured, written up so they can be read without the logs.

| Write-up | Question |
|---|---|
| [2026-10-outpost.md](2026-10-outpost.md) | Can an agent make four stone tools and a shelter before dark, and survive the night? The local model, the scripted baseline, then the paid models. |
| [2026-10-p6.md](2026-10-p6.md) | The paid models on the outpost goal again, after the p5 fixes: 12 of 12 met. |
| [2026-10-iron.md](2026-10-iron.md) | Can the local model mine, smelt and craft an iron pickaxe in a day? |
| [2026-10-local-model-memory.md](2026-10-local-model-memory.md) | What does memory (none, plan, full) do for a small local model? |

## Generated reports

`batches/<name>/` holds what the code wrote at the end of each real batch (from p5 on): the batch
comparison (`README.md`), success per condition with intervals (`conditions.md`) and every run's
behaviour report, step by step. They carry no prompts. `scripts/publish-reports.sh <name>` copies
them out of `runs/`.

## Batch names

A batch is a set of runs started together, on one version of the code, with one command
(`scripts/batch.sh <name> …` or `scripts/team.sh <name> …`). Its name is only a label, so that a
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
