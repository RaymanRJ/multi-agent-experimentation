# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

A testbed for running several AI agents in one shared environment, each driven by a different
model (Claude, GPT, and a free local model via Ollama), to compare behaviour, coordination, and
cost. Minecraft is the environment because it makes agent behaviour observable; it is not the
subject. The deliverable is the **structure around the models**, not the game.

Read `README.md` for the architecture diagram and the full software list.

## The one rule

**The model decides. The code does.**

The world ticks 20× per second; a model call takes seconds. The model must never be in the
control loop. It selects a high-level goal (`gather_wood(10)`, `build_shelter()`); deterministic
code in the skill library executes it and reports back.

When adding behaviour, the default is a new **skill** (deterministic code), not a new thing the
model is asked to reason about. If you find yourself consulting the model more often to make
something work, that is a signal the skill layer is too thin.

## Architecture

Three layers. Only the third costs money.

| Layer | What it is | Where it runs |
|---|---|---|
| World | Paper Minecraft server | Docker container |
| Bodies | Node.js processes using mineflayer, plus the skill library | Host (or Docker) |
| Brains | Model backends behind one `Backend` interface | Ollama on host; Claude/OpenAI remote |

Key interfaces, which should be treated as contracts:

- `Skill` — the finite vocabulary of **goals** an agent may pursue. Nothing happens that isn't
  here. Skills are our code, composed from mineflayer primitives; mineflayer is not the skill
  layer. A skill is responsible for retries, giving up, and returning a structured result the
  model can replan against.
- `Observation` — what an agent is told about its situation. Deliberately compressed; see below.
- `Policy` — decides the next goal. `ScriptedPolicy` (no model) and `LLMPolicy` implement it.
- `Backend` — one model provider. Ollama is OpenAI-compatible, so it shares the OpenAI adapter
  with a different `baseURL`.

**Freeze interfaces before parallelising work.** Changing a contract mid-flight invalidates every
piece built against it simultaneously. This has already bitten this project's planning once.

## Conventions

- **Keep observations small.** Dumping raw world state will blow up prompts and cost. Send
  nearby blocks of interest, inventory, health, time of day, and recent events — not a block dump.
- **Replan on events, not on a timer.** Block broken, mob spotted, goal failed, nightfall. A bot
  that replans every two seconds will outrun a local model and fall behind the game.
- **Log every decision.** Persist each `(observation → goal)` pair. This gives episode replay
  without re-burning API calls, and it is the source of the cost numbers.
- **Seed runs.** Scenarios must be reproducible for comparisons between models to mean anything.
  Reset the world (`src/agents/scripts/reset-world.sh`) before comparison runs. The itzg image reads `SEED`,
  not `LEVEL_SEED` — the world was unseeded until that was fixed.
- **Runs end on a budget, not a step count.** A run stops when its preset goal is met, the model
  says done, or the in-game time budget runs out (`--ticks`, default one day); `--budget-usd` caps
  paid models; `--steps` is only a safety cap. Tokens and wall-clock are recorded, never limits —
  tokenizers differ between providers and wall-clock measures the hardware. With a preset goal, a
  "done" before the goal is met is refused once and told so; a second "done" in a row ends the run.
  The report counts refusals as "Done refused": a false claim of success is data, not noise.
  `give_up` (with a reason) is the other way out: the model saying it can't, which ends the run at
  once as "model gave up" and is flagged in the report and the minds panel. Like "done" it is not a
  skill, and the prompt describes it without saying when to use it. Loops are the model's to break:
  the code tells it it is repeating itself, and the report counts whether it kept on, but never
  stops the loop for it.
- **Goals state outcomes, not steps.** Preset goals (`tools`, `shelter`) say what to achieve; the
  `-guided` variants spell out the steps and exist to measure how much a model needs that help.
  What the game requires reaches the model through skill descriptions, failure messages and
  `canCraft` — the way it reaches a player — not through the goal text. `--progress on` adds the
  goal's remaining gaps to each observation as facts; it is off by default and is its own condition.
- **Stances differ by one paragraph.** `neutral` gives no motive toward other agents;
  `collaborative` and `competitive` each add one paragraph (`STANCE_TEXT` in `policy/llm.ts`) and
  are scored by the rule that paragraph states. How to see and talk to agents is identical in all three.
- **Scenario parity.** `sandbox` and `survival` must differ only in world settings and the goal
  text. If a code path checks the scenario name for anything else, that is a bug.
- **Teams share a tally, never shown to the model.** Agents launched together (`src/agents/scripts/team.sh`,
  `--team a,b`) each write what they hold to `runs/.teams/<episode>/` (`src/agents/src/team.ts`). A team goal
  (`team-camp`) is checked against all of it, and a collaborative agent's run ends only when the whole
  team is done. Teammates learn about each other only by looking (`otherAgents`) and by chat; agents
  act on each other through `give`, `pick_up` and `go_to`. They can ask things of each other with
  `tell_agent` (run this skill) and `ask_agent` (answer this); the recipient decides, and the log
  records whether its next decision complied (`responses`).
- `ScriptedPolicy` is not throwaway scaffolding. It is the control baseline — without it there is
  no way to tell whether a model is adding value. Keep it working.

## Commands

The experiment lives in `src/agents/` (moved there on 21 October; the repository root holds the
docs, README and repo plumbing). Every command below runs from `src/agents/`, and paths in the
rest of this file are relative to it unless they start `src/agents/` or `docs/`.

```bash
cd src/agents
./start.sh [--scenario survival --ticks 12000]  # everything: mc + minds :3010 + agents (ollama stays on host)
./stop.sh [--all]               # stop agents + minds; --all also stops mc

docker compose up -d            # Paper server on :25565
docker compose logs -f mc       # server console
docker compose exec mc rcon-cli difficulty peaceful   # live scenario toggle

npm install
npm run agent -- --scenario sandbox --brain scripted  # no model in the loop
npm run agent -- --scenario survival --brain ollama   # free local brain
./start.sh --check                                    # check Docker / Ollama / model setup, start nothing
npm run agent -- --brain ollama --view                # watch in a browser at localhost:3007
npm run agent -- --brain ollama --goal shelter        # preset goal: shelter | tools | gather | explore
npm run agent -- --brain ollama --goal tools-guided   # same task with the steps spelled out (shelter-guided too)
npm run agent -- --brain ollama --goal outpost --scenario survival --ticks 27000  # long goal: 4 stone tools + shelter, survive the night
npm run agent -- --brain ollama --goal "Mine 10 stone" # or any goal in quotes
npm run agent -- --brain claude --view 3008           # one port per agent to watch several
npm run agent -- --brain gemini                       # also grok, groq, openrouter: key + model in .env, price in pricing.ts
npm run agent -- --brain ollama --memory full --comms off  # memory: none | plan | full; comms: on | off
npm run agent -- --brain ollama --stance competitive  # stance: neutral (default) | collaborative | competitive
npm run agent -- --brain ollama --goal outpost --progress on  # list what the preset goal still lacks each step
npm test && npm run typecheck                         # unit tests + types; CI runs both on every PR
npm run report                                        # per-run outcomes, milestones, latency, tokens, cost
npm run report -- --by condition --batch b5           # one row per condition, success with 95% CI
npm run summary -- --batch b5                         # rebuild each run's behaviour report (written at run end)
npm run compare -- --team trio3                       # one readable report across runs: by goal, model, and who did what (written at run end)
npm run skills -- --batch p6 --team thome1             # which skills runs chose, how often they worked (docs/results/skill-usage.md)

scripts/batch.sh b6 3 12000 sandbox                    # single-agent comparison batch (CONDITIONS, GOALS env; VIEW=on to watch at :3007)
STANCE=competitive scripts/team.sh t1 "qa=ollama qb=ollama"  # several agents in one fresh world
STANCE=collaborative GOAL=team-camp VIEW=on scripts/team.sh t2 "haiku=claude@claude-haiku-4-5 qwen=ollama"  # a team goal; watch at :3007, :3008

scripts/reset-world.sh                                # regenerate the main world from its seed
scripts/test-server.sh up NAME PORT                   # throwaway server for dev work (RCON on PORT+10)
MC_PORT=PORT RCON_PORT=PORT+10 npm run agent -- ...   # run against it
```

## Tests

- `npm test` runs the unit tests (`src/agents/src/**/*.test.ts`); `.github/workflows/ci.yml` runs them, the
  typecheck and a parse of the shell scripts on every pull request. None of it needs Docker, a
  server, a model or a key.
- Skills are tested against `src/agents/src/testing/fakeBot.ts`: a fake bot with the real 1.21.1 game data
  (registry, recipes, foods), an inventory and a world of placed blocks. It covers a skill's checks
  and messages before it acts; movement, digging and the craft protocol are checked live by
  `src/agents/scripts/skill-smoke.sh`.
- Known bugs are kept as `todo` tests: they run and report, but don't fail the build.

## Working agreements

How the owner of this repo wants work done. A new machine has none of Claude's local memory from
earlier sessions; this section and `docs/next-steps.md` carry what it held.

- **Read `docs/next-steps.md` first.** It says where things stand and what is open. Keep it current
  when something finishes or a new ask comes in.
- **Commits are pre-approved; pushes are not.** Commit without asking; push only when asked. Commit
  messages are one sentence, plus the `Co-Authored-By` trailer.
- **The repo is public (since 18 October): work on a branch and open a pull request.** `main` is
  protected by the `protect-main` ruleset: no direct pushes, force pushes or deletion; a pull request
  with one approval, resolved conversations and a passing `test` check (CI). The owner is the only
  collaborator and can't approve their own pull request, so they merge with the admin bypass. Since
  19 October that bypass is "always": the admin (only the owner) can also push and force-push to
  `main` directly; everyone else is held to the rules. Claude still pushes only when asked, by a
  branch and a pull request unless told otherwise. Pushing a branch still needs asking. Pull requests from outside
  contributors run CI only after the owner approves them, and workflows may use only GitHub's own
  actions.
- **Never change `src/agents/src/` under a running batch or team run.** Work in a worktree under
  `.claude/worktrees/` (symlink `src/agents/node_modules` and `src/agents/runs` into the worktree's
  `src/agents/`, never commit them) and fast-forward `main` after the run ends.
- **Stay inside this folder.**
- **Ask before paid runs.** Say what they will cost first and cap them with `BUDGET_USD`.
- **Check skill changes in the real game, not only in tests.** The fake bot can't model physics: a
  `give` that passed every test overshot its receiver in four of five live tries. Use a throwaway
  server (`src/agents/scripts/test-server.sh`) with `src/agents/src/try.ts`, or a two-bot script for skills between agents.
- **Read the logs before believing a result**, and say what was measured, not what was hoped.
- **Results are about how the agents behaved, not the models or the game.** Write-ups and reports
  tell what agents did toward the goal and away from it, how they handled the unexpected while
  keeping the goal in mind, and how they helped or hindered each other. Game mechanics are brief
  examples; per-model numbers and our-code bugs come last. `docs/results/write-ups/06-team-base.md`
  is the model (the `triage-batch` skill has the details).
- **`runs/` is not in git.** Logs from earlier machines are not here; the numbers that matter are in
  `docs/results/`.

## Hard constraints

- **Never commit secrets.** This repository is intended to be public. `.env` is ignored;
  `src/agents/.env.example` carries empty placeholders. API keys come from the environment only — never from
  a config file, never from a default argument.
- **The slide deck is not in this repo.** Business material lives one level up in
  `ai-experiments/`, deliberately outside version control. Do not move it in, and do not
  reference it from committed files.
- **16GB machine.** M4, 16GB unified memory. Budget: ~2GB Paper, ~0.7GB for three bots, ~3GB for
  a 4B local model. Do not run the Minecraft Java client and a large local model at the same time
  — use `prismarine-viewer` instead. Prefer a 4B model over 8B unless there is a measured reason.
- **Ollama runs on the host, never in Docker.** Containers on macOS cannot reach Metal, so a
  containerised Ollama falls back to CPU and becomes unusably slow. Bots in containers reach it at
  `host.docker.internal:11434`.

## Environment gotchas

- `ONLINE_MODE=FALSE` is required or bots cannot join — the server would otherwise ask Mojang to
  verify each player owns the game. Consequence: **never expose this server to the internet.**
  LAN only.
- Java on the host is irrelevant — Paper runs Java 21 inside the container. The host has Java 17
  via jenv; leave it alone.
- Only **Minecraft Java Edition** can connect. The Microsoft Store / Xbox build is Bedrock and
  will not work without a bridge.
- Client and server versions must match the pinned `VERSION` in `src/agents/compose.yaml`.

## When in doubt

Prefer deterministic code over another model call. Prefer fewer, larger goals over many small
ones. Prefer measuring over asserting — every claim about cost or capability in this repo should
trace back to a logged run.
