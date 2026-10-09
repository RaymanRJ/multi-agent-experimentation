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
- **Scenario parity.** `sandbox` and `survival` must differ only in world settings and the goal
  text. If a code path checks the scenario name for anything else, that is a bug.
- `ScriptedPolicy` is not throwaway scaffolding. It is the control baseline — without it there is
  no way to tell whether a model is adding value. Keep it working.

## Commands

```bash
./start.sh [--scenario survival --steps 20]   # everything: mc + minds :3010 + agents (ollama stays on host)
./stop.sh [--all]               # stop agents + minds; --all also stops mc

docker compose up -d            # Paper server on :25565
docker compose logs -f mc       # server console
docker compose exec mc rcon-cli difficulty peaceful   # live scenario toggle

npm install
npm run agent -- --scenario sandbox --brain scripted  # no model in the loop
npm run agent -- --scenario survival --brain ollama   # free local brain
npm run agent -- --brain ollama --view                # watch in a browser at localhost:3007
npm run agent -- --brain claude --view 3008           # one port per agent to watch several
```

## Hard constraints

- **Never commit secrets.** This repository is intended to be public. `.env` is ignored;
  `.env.example` carries empty placeholders. API keys come from the environment only — never from
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
- Client and server versions must match the pinned `VERSION` in `compose.yaml`.

## When in doubt

Prefer deterministic code over another model call. Prefer fewer, larger goals over many small
ones. Prefer measuring over asserting — every claim about cost or capability in this repo should
trace back to a logged run.
