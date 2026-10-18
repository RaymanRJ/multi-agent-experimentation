# multi-agent-experimentation

What do AI agents do when they are given a goal, a set of tools, and then left alone?

This is a testbed for running autonomous agents **hands-off**. Each agent gets an outcome to reach
and a fixed set of tools to act with, and nothing else: no step-by-step instructions, no human
stepping in when it gets stuck. Several agents can share one environment, each driven by a
different model, including one that runs locally for free. We measure whether they reach the goal,
how they plan, how they recover when something fails, whether they work together, and what it all
costs.

**Minecraft is only the environment, and a convenient one.** It is free to run, it can be watched
as it happens, it is rich enough that goals take real planning, it keeps running while a model
thinks, and a fixed seed makes runs repeatable. None of that is the subject. The agents, their
tools, the control loop, the logs and the reports would stay the same if the environment were a
codebase, a ticket queue or a data pipeline.

## The control loop

The rule the whole repo follows: **the model decides, the code does.**

The environment moves on in real time (20 ticks a second); a model takes seconds to answer. So the
model is never in the control loop. It chooses a **goal**, a tool call such as `gather_wood(10)`
or `build_shelter()`, and deterministic code carries it out: it finds its own targets, retries,
gives up cleanly, and reports back in plain words ("need 2 more planks: gather wood first"). The
model is consulted again only when that goal succeeds, fails, or something important happens.

```mermaid
sequenceDiagram
    participant W as Environment
    participant Body as Agent body
    participant Brain as Model

    W->>Body: state (position, inventory, health, time, threats)
    Body->>Body: compress to a short briefing
    Body->>Brain: "what should I do next?"
    Brain-->>Body: goal: e.g. gather_wood(10)
    loop deterministic, no model involved
        Body->>W: low-level actions until the goal completes or fails
    end
    Body->>Brain: only on completion, failure, or a significant event
```

This is the most important design decision here. Put the model in the control loop and the agent
is slow, expensive, and overtaken by events before it finishes thinking. Keep it out, and the
same agent can work through a whole in-game day on a few dozen decisions. When an agent needs a new
ability, the answer is a new tool (deterministic code), not more consulting of the model.

## What an agent is given

- **A goal, stated as an outcome:** "Make a stone pickaxe, axe, sword and shovel, build a shelter,
  then survive the night." Never the steps. (Step-by-step `-guided` versions exist only to measure
  how much a model needs that help.)
- **Tools, and only tools.** A fixed list of skills, each with a plain description of what it
  does and how it fails. Nothing happens outside that list. See [docs/skills.md](docs/skills.md).
- **Observations:** a short summary of its situation (what it holds, what is nearby, its health,
  the time, who else is around), not a dump of the environment.
- **Feedback:** every tool reports success or failure in words the model can replan against.
- **Optionally, other agents:** it can see them, talk to them, ask them questions, ask them to do
  things and hand them items. See [docs/communication.md](docs/communication.md).

What it is *not* given: advice. The harness adds facts, never suggestions: it says when the agent
has made the same decision several times running, refuses a premature "done" and says what is still
missing (a false claim of success is itself a result worth counting), and, as its own experimental
condition, can list what the goal still lacks. A few reflexes are code, not the model's choice: an
agent under water swims out before it is asked anything.

## What gets measured

Every decision is logged with the exact prompt and answer, so any run can be replayed and costed
afterwards without calling a model again. From the logs:

- **Outcome:** goal met or not, and how long it took.
- **Behaviour:** how many decisions worked, whether the agent changed course after a failure, how
  long it looped, how often it falsely claimed to be done.
- **Teamwork:** who did what, what was handed over, who asked whom for what, and whether they did it.
- **Cost:** tokens in and out, dollars, and time spent waiting on the model.

Each run writes its own report, and every batch or team run ends with one readable comparison
across all of its agents (`npm run compare`).

## Quick start

You need Docker and [Ollama](https://ollama.com/) running, and Node 25+. No Minecraft purchase and
no API key are needed: the free local model runs on its own.

```bash
./start.sh --check          # says what's missing, starts nothing
./start.sh                  # the environment, the minds panel and one agent per available model
```

A run lasts one in-game day (about 20 minutes) and then the agent stops by itself. For a
two-minute try, use `./start.sh --ticks 2400`. `./start.sh --help` lists every option.

Then watch:
- **What the agent sees:** http://localhost:3007, a 3D view of the environment around it.
- **What it decides:** http://localhost:3010 (the minds panel): for every step, what it saw, what
  it chose and why.

```bash
npm install                   # once, for the report and experiment scripts
npm run report                # how each run went: outcome, decisions, tokens, cost
npm run summary               # rebuild the newest run's report on how the agent behaved (every run writes one)
npm run compare -- --team t1  # one readable report comparing a team run's or batch's agents (written at the end)
./stop.sh                     # stop the agents (./stop.sh --all also stops the environment)
```

To add Claude or GPT, put their keys in `.env` (`cp .env.example .env`). They start only when a
key is set. Set a monthly spend limit in each provider's console as well.

## Status

**Working, and being measured.** Agents run hands-off on preset goals checked by code (tools,
shelter, an outpost that has to last the night, iron, diamond, and a team goal), alone or several
to a shared environment, with memory, stance and communication settings, comparison batches on
fresh worlds, reports with confidence intervals, and a panel showing every decision.

The models that have run: a free local model (Qwen3 4B), Claude Haiku 4.5, Sonnet 5.5 and Opus
5.5, and GPT-6 Luna. Only the local model has been through repeated comparison batches so far.

**What we've found so far** (details in [docs/results/](docs/results/)):
- **Fixing the tools mattered more than anything about the model.** The biggest improvements came
  from making skills find better targets, fail more clearly and avoid hazards.
- **Memory helps a small model, a self-written plan can hurt it.** Full conversation memory worked
  best for the local model; a plan it wrote itself led it to follow that stale plan into loops.
- **Small models claim success they haven't reached.** The harness now refuses a premature "done"
  and says what is missing.
- **Small models loop.** The local model repeats a failing decision dozens of times, even when told
  exactly what is wrong: in the team runs it changed course after about one failure in ten, the
  Claude models after about half or more.
- **Long goals are hard for a small model.** On the outpost goal (tools, shelter, survive the night)
  the local model met it in 3 of 18 runs in its latest batch; it usually makes the tools, then
  fails to build the shelter or loses its tools to threats.
- **Hands-off teams can work.** In one run (one run, not yet a comparison), four agents on four
  models met a shared goal in under five minutes of game time for $0.28: one made every tool and
  handed them out, another built the shelter.

What isn't done or isn't tested is listed in [docs/limitations.md](docs/limitations.md).

## Documentation

| Read | For |
|---|---|
| [docs/skills.md](docs/skills.md) | Every tool (skill) an agent can use, how it works and how it fails |
| [docs/communication.md](docs/communication.md) | How agents see, talk to and ask things of each other, and the three stances |
| [docs/experiments.md](docs/experiments.md) | Running a fair comparison and reading the reports |
| [docs/results/](docs/results/) | What the experiments so far have found |
| [docs/limitations.md](docs/limitations.md) | What is untested, missing or rough |
| [docs/next-steps.md](docs/next-steps.md) | Where things stand, what's open, and setting up a new machine |
| [CLAUDE.md](CLAUDE.md) | Conventions for changing the code |

## Running experiments

```bash
CONDITIONS="scripted ollama:none ollama:full" GOALS="tools shelter" scripts/batch.sh b10 3 12000 sandbox
STANCE=collaborative GOAL=team-camp scripts/team.sh t2 "haiku=claude@claude-haiku-4-5 qwen=ollama"
npm run compare -- --batch b10
```

The first line runs one agent per environment across several conditions. The second puts several
agents in one environment with a shared goal. The third writes a readable comparison of a batch:
by goal, by model and condition, with success rates and 95% intervals. Everything is explained in
[docs/experiments.md](docs/experiments.md).

---

## Details

### Architecture

```mermaid
flowchart TB
    subgraph WORLD["THE ENVIRONMENT — free"]
        PAPER["<b>Paper Minecraft Server</b><br/>itzg/minecraft-server · Docker<br/>owns world state &amp; rules"]
        RCON["<b>RCON</b><br/>runtime scenario toggle"]
    end

    subgraph BODIES["THE BODIES — deterministic, free, does the actual work"]
        direction LR
        A["<b>Agent A</b><br/>Node.js + mineflayer"]
        B["<b>Agent B</b><br/>Node.js + mineflayer"]
        C["<b>Agent C</b><br/>Node.js + mineflayer"]
    end

    subgraph ACTION["HOW AN AGENT ACTS — two distinct layers"]
        SKILLS["<b>Skill Library</b> — our code<br/>gather_wood(10) · build_shelter() · flee_from(mob)<br/>goal-level · fallible · returns a structured result"]
        MF["<b>mineflayer</b> + <b>mineflayer-pathfinder</b> — third-party<br/>bot.dig() · bot.placeBlock() · bot.craft() · goto(x,y,z)<br/>single mechanical operations"]
        SKILLS -->|"composed from"| MF
    end

    subgraph BRAINS["THE BRAINS — metered, consulted rarely"]
        direction LR
        CLAUDE["<b>Claude</b><br/>Anthropic API<br/>paid"]
        GPT["<b>GPT</b><br/>OpenAI API<br/>paid"]
        LOCAL["<b>Local model</b><br/>Ollama · on-device<br/><b>free</b>"]
    end

    VIEW["<b>Observers</b><br/>prismarine-viewer (browser, free)<br/>Minecraft Java client (optional, paid)"]

    A --> SKILLS
    B --> SKILLS
    C --> SKILLS

    MF <-->|"Minecraft protocol"| PAPER
    RCON -.->|"difficulty / gamerules"| PAPER

    A -.->|"what should I do next?"| CLAUDE
    B -.->|"what should I do next?"| GPT
    C -.->|"what should I do next?"| LOCAL

    PAPER --> VIEW

    classDef free fill:#ecfdf5,stroke:#0e9f6e,color:#064e3b
    classDef paid fill:#eff6ff,stroke:#2563eb,color:#1e3a8a
    classDef world fill:#f8fafc,stroke:#475569,color:#0f172a
    class LOCAL free
    class CLAUDE,GPT paid
    classDef ours fill:#fef3c7,stroke:#b45309,color:#78350f
    class PAPER,RCON,VIEW,MF world
    class SKILLS ours
```

**Only the dotted lines cost money.** Everything else runs locally for free.

The amber box is the part we write. Mineflayer supplies *primitives* — break one block, place one
block, walk to a coordinate. A **skill** is a goal: `gather_wood(10)` must find a reachable tree,
break every log in the trunk, collect the drops, widen its search if there are none, give up
cleanly if a mob interrupts, and report back `{status, reason}` so the model can replan. That gap
is where the engineering lives, and it is what lets the model say "gather wood" instead of
issuing four hundred individual dig commands.

Every skill, what it does, and how it fails is listed in [docs/skills.md](docs/skills.md). How agents
talk to each other is in [docs/communication.md](docs/communication.md).

---

### Scenarios

The same environment runs in two modes, flipped with one setting. They are not difficulty levels:
they test different things.

| Scenario | Conditions | Question it answers |
|---|---|---|
| `sandbox` | No threats, no deadline. | Can agents direct themselves, and stay coordinated, with nothing forcing their hand? |
| `survival` | Threats, hunger, a hard deadline (nightfall). | Can agents plan under pressure and recover when the plan fails? |

The two differ only in the environment's settings and the goal text, so runs stay comparable.

#### What is held fixed, and what is not

- **Terrain is fixed.** The world is generated from a fixed seed (`SEED` in `compose.yaml`), and
  `scripts/batch.sh` gives every run a freshly regenerated copy, so no run inherits another's
  felled trees, holes or inventory.
- **The start point varies a little.** New players appear at a random spot within
  `spawnRadius` (Minecraft's default, 10) of the world spawn. Across batches b1–b5 (78 runs)
  every agent started inside one 20 × 21 block area (x −8…11, z 23…43). That is close enough to
  share the same surroundings, but not identical: some starts are next to oak trees and others
  next to dark oak. Treat small differences between conditions with that in mind.
- **The game does not pause while a model thinks.** The world keeps ticking during every model
  call, so ticks-to-goal measures decision quality and response speed together, which is
  deliberate. Each call's duration is logged (`calls[].ms`), each decision's time including
  retries (`decisionMs`), and `npm run report` shows the median, P90 and retry count per run.

---

### Software

Most of this stack is the environment. The parts that matter to the experiment are the agent
processes, the skill library and the model adapters; everything Minecraft-specific could be
replaced without touching them.


| Component | What it does | Cost |
|---|---|---|
| [Docker](https://www.docker.com/) + Compose | Runs the server; keeps Java off the host | free |
| [itzg/minecraft-server](https://github.com/itzg/docker-minecraft-server) | Container image — EULA, version pinning, RCON, config via env | free |
| [PaperMC](https://papermc.io/) 1.21.x | The Minecraft server itself. Chosen over vanilla for chunk/entity performance — every bot is a chunk-loading epicentre | free |
| Java 21 | Runs Paper — **inside the container only** | free |
| [Node.js](https://nodejs.org/) 25 + TypeScript | The agent processes | free |
| [mineflayer](https://github.com/PrismarineJS/mineflayer) | Independent implementation of the Minecraft protocol. Not Minecraft — no client, no licence needed | free |
| [mineflayer-pathfinder](https://github.com/PrismarineJS/mineflayer-pathfinder) | Navigation, so the model never steers | free |
| [prismarine-viewer](https://github.com/PrismarineJS/prismarine-viewer) | Renders a bot's world model in a browser tab | free |
| [Ollama](https://ollama.com/) | Runs an open model on-device. OpenAI-compatible API, so it shares an adapter with GPT | free |
| [Anthropic API](https://docs.claude.com/) | Claude as a brain | usage-based |
| [OpenAI API](https://platform.openai.com/) | GPT as a brain | usage-based |
| Minecraft Java Edition | **Optional.** Only needed to walk around the world yourself | ~$30 one-time |

#### About the environment: why no Minecraft purchase is required

"Minecraft" is two separate pieces of software. The **server** is free and always has been. The
**client** — the graphical game — is the part that costs money. Bots need neither: mineflayer
speaks the protocol directly and contains no Mojang code. With `ONLINE_MODE=FALSE` the server
skips the ownership check, which is a supported setting intended for LAN and development use.

Buy the client only when you want your own eyes in the world. `prismarine-viewer` covers watching
until then.

---

### What start.sh does

```bash
./start.sh --scenario survival --goal shelter --ticks 12000   # options: ./start.sh --help
```

It checks Docker and Ollama, pulls the model if missing, starts the server, then the minds panel
(http://localhost:3010) and one agent per available brain (viewers on :3007 ollama, :3008 claude,
:3009 gpt). Claude and GPT start only if their key is set. Ollama stays on the host (Metal GPU);
containers reach it at `host.docker.internal:11434`. To join yourself, use Minecraft Java 1.21.1
at `localhost`.

#### On Linux, Windows, or an Intel Mac

Developed on an Apple Silicon Mac; other platforms are expected to work but are less tested.
Run `./start.sh --check` first; it checks the setup without starting anything.

| | Docker | Ollama (local model) | Notes |
|---|---|---|---|
| **Apple Silicon Mac** | Docker Desktop | `brew install ollama && brew services start ollama` | Fast (GPU via Metal) |
| **Linux** | Docker Engine | `curl -fsSL https://ollama.com/install.sh \| sh` | Fast with an NVIDIA/AMD GPU, slow on CPU only. **Ollama must listen beyond localhost** so containers can reach it: `start.sh` detects this and prints the fix (`OLLAMA_HOST=0.0.0.0`) |
| **Windows** | Docker Desktop (WSL2 backend) | Windows installer from ollama.com | Run `./start.sh` from a **WSL2** shell, not PowerShell. Enable WSL mirrored networking so WSL can reach Ollama at `localhost` |
| **Intel Mac** | Docker Desktop | as Apple Silicon | Slow: no GPU acceleration for the model |

Without a GPU, expect several seconds to half a minute per decision from the local model. Use a
non-thinking model (the default `qwen3:4b-instruct`): reasoning models are too slow for the
120-second decision timeout on CPU. Linux machines with an NVIDIA GPU can instead run Ollama in a
container: `docker compose --profile ollama-docker up -d ollama` (untested).

Manual path:

```bash
cp .env.example .env        # API keys optional — the local agent needs none
docker compose up -d        # Paper server on :25565
npm install
npm run agent -- --scenario sandbox --brain scripted   # no model; proves the loop
```

Never commit `.env`. This repo is public.

**Paid brains and credits.** `--budget-usd` (default $1.00) stops one run before it overspends, but
the real guard against a surprise bill is a monthly spend limit in the Anthropic and OpenAI
consoles — set one when you create a key. Each model agent makes one tiny call before joining the
world, so a bad key or an empty account stops it at startup with the provider's message. If credits
run out mid-run, the run ends as `brain unavailable` (no retries) and `npm run report` marks it, and
every other agent in that episode, as not comparable. Rate limits and overloads are retried with
backoff instead.

## Licence

MIT
