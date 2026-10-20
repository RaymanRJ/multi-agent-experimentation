# Results

What the batches measured, written up so they can be read without the logs.

| Write-up | Question |
|---|---|
| [2026-10-outpost.md](2026-10-outpost.md) | Can an agent make four stone tools and a shelter before dark, and survive the night? The local model, the scripted baseline, then the paid models. |
| [2026-10-p6.md](2026-10-p6.md) | The paid models on the outpost goal again, after the p5 fixes: 12 of 12 met. |
| [2026-10-team-homestead.md](2026-10-team-homestead.md) | Can three models together build, sleep, mine iron and store food over three days? 0 of 3 teams. |
| [2026-10-iron.md](2026-10-iron.md) | Can the local model mine, smelt and craft an iron pickaxe in a day? |
| [2026-10-local-model-memory.md](2026-10-local-model-memory.md) | What does memory (none, plan, full) do for a small local model? |

## Skill usage

[skills.md](skills.md) counts, for every real batch and team run since p5, how many runs chose
each skill, how often it worked, its share of game time, and how common it was in goal-met runs
against the rest; then the same per goal. Each batch's comparison (`batches/<name>/README.md`) has
the table for its own runs. Rebuild it with the command at its top after a new batch.

Read it with the skills' own rules in mind:
- **`sleep` counts as failed** whenever the night did not pass, though the agent did sleep. The
  goal check counts the sleep.
- **`mine_ore` counts as failed** when it got fewer ore than asked.
- **`wait` is most of `outpost`'s game time:** sitting in the shelter is the goal there.

As of thome1:
- **Every run needs `craft`, `gather_wood` and `mine_stone`.**
- **`build_shelter` and `wait` carried `outpost`.** Every goal-met run used both.
- **The team goal leans on more of the library:** `flee`, `go_to`, `smelt`, `pick_up`, `hunt`,
  `give`, `eat` and `sleep` appear in 7–9 of 9 team runs.
- **`take` and `shear` have never been chosen.** No one took from a chest, and wool came from
  `hunt`ing sheep.
- **`tell_agent` was used once**, against 13 `ask_agent` questions.

## Generated reports

`batches/<name>/` holds the reports built from each real batch's logs: the batch comparison
(`README.md`, including which skills were used), success per condition with intervals
(`conditions.md`) and every run's behaviour report, step by step. They carry no prompts.
`scripts/publish-reports.sh <name>` builds them from `runs/`; for a team run each agent's report is
`<agent>-<rep>.md`.

Batches before p5 were rebuilt on 20 October from the logs kept on this machine, with that day's
report code. Each report says which code built it. Where a number differs from its write-up, the
write-up was made at the time and the report code has been fixed since. Proof runs (`poc`) and dev
runs that no write-up uses are not published.

| Run | Date | Goal | Who | Met | Written up in |
|---|---|---|---|---|---|
| [b1](batches/b1/) | 16 Oct | `tools-guided`, `shelter-guided` | qwen3 4B, scripted | 18 of 24 | [local-model memory](2026-10-local-model-memory.md) |
| [b4](batches/b4/) | 17 Oct | `tools-guided` | qwen3 4B, scripted | 11 of 12 | [local-model memory](2026-10-local-model-memory.md) |
| [b5](batches/b5/) | 17 Oct | `tools`, `shelter`, `shelter-guided` | qwen3 4B, scripted | 32 of 36 | [local-model memory](2026-10-local-model-memory.md) |
| [b6](batches/b6/) | 17 Oct | `tools`, `shelter` | qwen3 4B | 6 of 12 | [local-model memory](2026-10-local-model-memory.md) |
| [b7](batches/b7/) | 17 Oct | `tools`, `shelter` | qwen3 4B | 9 of 12 | [local-model memory](2026-10-local-model-memory.md) |
| [b8](batches/b8/) | 17 Oct | `outpost` | qwen3 4B, scripted | 1 of 12 | [outpost](2026-10-outpost.md) |
| [b9](batches/b9/) | 17 Oct | `outpost` | qwen3 4B, scripted | 3 of 12 | [outpost](2026-10-outpost.md) |
| [b10](batches/b10/) | 17 Oct | `outpost` | scripted | 3 of 3 | [outpost](2026-10-outpost.md) |
| [b11](batches/b11/) | 17 Oct | `iron` | qwen3 4B, scripted | 0 of 2 | [iron](2026-10-iron.md) |
| [b12](batches/b12/) | 17 Oct | `outpost` | qwen3 4B, scripted | 4 of 21 | [outpost](2026-10-outpost.md) |
| [b13](batches/b13/) | 17 Oct | `iron` | qwen3 4B, scripted | 2 of 9 | [iron](2026-10-iron.md) |
| [b14](batches/b14/) | 18 Oct | `outpost` | scripted | 3 of 3 | [outpost](2026-10-outpost.md) |
| [b15](batches/b15/) | 18 Oct | `outpost` | qwen3 4B | 0 of 6 | [outpost](2026-10-outpost.md) |
| [trio1](batches/trio1/) | 18 Oct | `team-camp` | Haiku, Sonnet, qwen3 4B together | the team, 1 of 1 | [next steps](../next-steps.md) |
| [trio2](batches/trio2/) | 18 Oct | `team-camp` | Haiku, Sonnet, qwen3 4B together | 0 of 1 | [next steps](../next-steps.md) |
| [trio3](batches/trio3/) | 18 Oct | `team-camp` | Haiku, Sonnet, qwen3 4B together | the team, 1 of 1 | [next steps](../next-steps.md) |
| [quad1](batches/quad1/) | 18 Oct | `team-camp` | Haiku, Sonnet, Luna, qwen3 4B together | the team, 1 of 1 | [next steps](../next-steps.md) |
| [b16](batches/b16/) | 19 Oct | `outpost` | qwen3 4B | 0 of 3 | [outpost](2026-10-outpost.md) |
| [p2](batches/p2/) | 19 Oct | `outpost` | Haiku, Sonnet, Opus, Luna | 3 of 4 | [outpost](2026-10-outpost.md) |
| [p3](batches/p3/) | 19 Oct | `outpost` | Haiku, Sonnet, Opus, Luna | stopped early | [outpost](2026-10-outpost.md) |
| [p5](batches/p5/) | 19–20 Oct | `outpost` | Haiku, Sonnet, Opus, Luna | 4 of 12 | [outpost](2026-10-outpost.md) |
| [p6](batches/p6/) | 20 Oct | `outpost` | Haiku, Sonnet, Opus, Luna | 12 of 12 | [p6](2026-10-p6.md) |
| [thome1](batches/thome1/) | 20 Oct | `team-homestead` | Opus, Sonnet, Luna together | 0 of 3 teams | [team homestead](2026-10-team-homestead.md) |

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
