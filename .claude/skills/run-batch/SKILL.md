---
name: run-batch
description: Start, watch and stop a comparison batch (scripts/batch.sh) or team run (scripts/team.sh) in this repo, paid or free. Use when asked to run a batch, a proof run (poc), a team run, or "the long one", and when checking on or stopping one.
---

# Running a batch

A batch is the expensive, slow part of this project (hours, dollars). Most of what goes wrong is
in starting and watching it, not in the batch itself.

## Before starting

1. **Ask before any paid run**, unless the owner already said to start this one. Say the cost
   first: p5 (Haiku, Sonnet, Opus, Luna, 3 runs each, `outpost`, 27,000 ticks) cost $2.75 in all;
   per run, Luna $0.01–0.03, Sonnet and Opus $0.15–0.48, Haiku $0.27–0.40 (it never caches). Always
   set `BUDGET_USD` (per agent, per run).
2. **`main` is what runs.** Commit first; never change `src/` while a batch is running (use a
   worktree under `.claude/worktrees/`, see CLAUDE.md). Note the commit hash for the write-up.
3. **Smoke-test the real agent with the free scripted brain** after any change to `src/agent.ts`,
   observations or scenario setup. Unit tests and standalone scripts don't load the agent the
   way a batch does (a listener on `bot.inventory` before spawn crashed every p6 run at start):
   ```bash
   npm test && npm run typecheck
   MC_PORT=25565 timeout 200 npm run agent -- --scenario sandbox --brain scripted --goal tools --name smoke --ticks 3000
   rm -f runs/*-smoke.*        # the smoke run's logs are not results
   ```
4. **Ports.** A batch's own server takes 25590 (game) and 25600 (RCON); `mae-mc` has 25565/25575.
   Throwaway servers go elsewhere (25620 and up).
5. **For a change that matters, do a proof run first** (`poc<n>`, one Luna run, about 2 cents),
   and look at the thing the change is for before starting the full batch.

## Starting

```bash
VIEW=on BUDGET_USD=1.50 \
  CONDITIONS="claude:plan@claude-haiku-4-5 claude:plan@claude-sonnet-5-5 claude:plan@claude-opus-5-5 gpt:plan@gpt-6-luna" \
  GOALS=outpost nohup scripts/batch.sh p6 3 27000 survival > runs/batch-p6.out 2>&1 &
echo $!          # keep this PID
```

The run order is fixed (every condition's run 1, then run 2…), not shuffled. Each run gets a fresh
world from the seed. `VIEW=on` lets the owner watch at http://localhost:3007; the minds panel is
:3010.

If the permission classifier blocks the start, don't work around it: give the owner the command to
run with `!` in front.

## Watching

- **Confirm it is really running** a minute in: `cat runs/batch-<name>.out` should show `==> [1/N]`
  and no `DID NOT FINISH`, and the newest `runs/*.live.json` should show a decision. A run that
  ends within seconds is a crash, not a result: stop the batch and fix it.
- **Wait on the PID**, in the background, never with `pgrep -f` (it matches its own command line):
  ```bash
  while kill -0 <PID> 2>/dev/null; do sleep 60; done; grep -E '==>|ended|DID NOT' runs/batch-<name>.out
  ```
  Background commands stop at two hours; a 12-run batch takes about four. When the wait stops,
  check `kill -0 <PID>` and start a new wait if the batch is still going. **The wait stopping is
  not the batch stopping**, and the owner stopping the wait (from the task list) does not stop
  the batch either: check before saying either.
- Read finished runs while the rest go: `runs/<log>.summary.md` is written at the end of each.
- Don't nag about pushing; the owner pushes when they choose.

## Stopping

Kill the batch script and its agent processes, then remove its server, and set aside the partial
run so reports don't count it:

```bash
ps aux | grep -E "batch.sh|src/agent.ts" | grep -v grep     # find them
kill <pids>
docker rm -f mae-test-batch-<name>; rm -rf test-worlds/batch-<name>
mkdir -p runs/.killed && mv runs/<partial run files> runs/batch-<name>.* runs/.killed/
```

## After

Use the `triage-batch` skill: read every log, sort failures into code, game and model, then write up.
