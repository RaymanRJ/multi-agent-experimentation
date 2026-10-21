---
name: triage-batch
description: Read a finished batch's logs, find why each run failed, sort each cause into our code, the game or the model, fix what is ours, and write the batch up. Use after a batch or team run ends, or when asked what happened in one.
---

# Triage a batch

The owner's rule: **read the logs before believing a result**, and say what was measured, not what
was hoped. A failure is one of three things, and each is handled differently:

| Cause | Example | What to do |
|---|---|---|
| **Our code** | a skill hangs, a message misleads, a shelter that lets mobs in | Fix it (in a worktree if a batch is running), check it live (`live-check` skill), commit |
| **The game** | no animals near spawn, terrain, a server quirk | Change the world setting if it is ours to set; otherwise document it in `docs/limitations.md` |
| **The model** | leaves its shelter at night, loops, gives up | Document it. Don't fix it in code or the prompt: loops are the model's to break, and the comparison is the point |

## Steps

1. **Overview.**
   ```bash
   npm run report -- --by condition --batch <name>     # success per model, 95% Wilson interval, cost
   npm run report -- --batch <name>                    # one row per run: ended, valid, deaths, night
   node .claude/skills/triage-batch/runs.mjs table <name>    # craft timeouts, shelter, first damage after it, leaving at night
   node .claude/skills/triage-batch/runs.mjs skills <name>   # which skills each run chose
   ```
   Runs marked not valid (lost connection) are left out of the comparison; say how many.
2. **Each failed run, one by one.** Read its `runs/<log>.summary.md` (verdict, obstacles, step list),
   then the steps around what went wrong:
   ```bash
   node .claude/skills/triage-batch/runs.mjs steps runs/<log>.jsonl 20 30
   ```
   Questions that found real bugs before: was it hurt *inside* its shelter (distance from shelter
   under 2)? Did the same failure repeat with an unchanged inventory (a stale or hung skill)? Does
   the failure message say what really happened (an interrupt reported as a blocked block)? Did
   the agent see what it needed (`animals`, ore)?
3. **Look across runs** for the same failure in several: `grep -l "<reason>" runs/*.jsonl` finds
   it in older logs too, which tells how long it has been there.
4. **Reproduce before fixing** our-code failures, on a throwaway server (`live-check` skill). If it
   won't reproduce, guard against it and say the cause is unknown; don't claim one.
5. **Don't change `src/` under a running batch.** Worktree, then fast-forward `main` after.

## Writing up

**A write-up is about how the agents behaved on their own, not about the models or the game.** The
owner's question is: what did the agents do toward the goal and what moved away from it, how did
they handle the unexpected while keeping the goal in mind, and how did they work together or hinder
one another? Model with `write-ups/06-team-base.md`, the owner's chosen style ("not perfect, but
better than before": keep improving it):

- **Headings are behaviours.** For example: how they organised; keeping the goal in view; meeting
  the unexpected; working together, and in each other's way. For a single agent, drop the last.
- **Findings are stated as behaviours**, such as "roles became silos" or "they trusted what they
  were told over what they could see". Game events are the evidence, in a phrase and in plain
  words: "a monster got into the shared home", not skill names, coordinates or ticks.
- **The models' own rationales are the best evidence** of whether the goal was in mind. Quote them
  (`decision.rationale` in the logs).
- **Use the generated report's goal sections** for the numbers: the goal at the end, share of time
  by kind of work, what broke work off and how soon the agent was back at it, and help and hindrance
  (`src/goalWork.ts`).
- **Our code's bugs get a short plain list near the end** ("where our code, not the agents, decided
  the outcome"), one line each. The per-model table comes last.
- **The frame:**
  - `docs/results/write-ups/`: a new topic gets the next number and a row in
    `docs/results/README.md`; a new batch on an old topic gets a section in that topic's write-up.
  - In italics: batch, dates, models and conditions, **the commit it ran on**, total cost, and
    whether it is comparable with earlier batches.
- **Every claim is checked against the logs before committing.** Numbers come from the reports and
  logs, never from memory; re-read each sentence against them, as counts and causes drift in
  rewriting.
- `scripts/publish-reports.sh <name>` for real batches and team runs (not `poc` or dev runs), and
  commit the page it writes, `docs/results/batch-reports/<date>-<time>-<name>.md`; add the run's row to
  the table in `docs/results/README.md`, in start order.
- `docs/next-steps.md`: one paragraph under the open item, with the result and what is next.
- `docs/limitations.md`: add what is newly known, and **remove or correct what the batch made
  out of date** (it fell behind once; check every entry the batch touched).
- If the owner asked for a report file, write it as markdown in `docs/results/write-ups/` and say where.
- Commit locally, one sentence per commit message. Don't push.
