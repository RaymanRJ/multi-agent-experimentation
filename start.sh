#!/usr/bin/env bash
# One command to run the whole experiment:
#   ./start.sh [--scenario sandbox|survival] [--ticks N] [--memory none|plan|full] [--comms on|off] [--goal shelter|tools|gather|explore|"any sentence"]
# Starts Minecraft + the minds panel + one agent per available brain.
set -euo pipefail
cd "$(dirname "$0")"

usage() {
  cat <<'HELP'
Start the experiment: Minecraft, the minds panel, and one AI agent per available brain.

Usage:  ./start.sh [options]

Options:
  --scenario NAME   World rules. One of:
                      sandbox   peaceful: no mobs, no hunger (default)
                      survival  normal difficulty: mobs at night, hunger
  --goal GOAL       What the agents try to do. A preset name, or any sentence in quotes:
                      shelter   gather wood, make planks, build a shelter
                      tools     work up to a stone pickaxe
                      gather    collect as much wood and stone as possible
                      explore   travel far, picking up useful things
                    Without --goal, each scenario uses its own goal.
  --ticks N         In-game time budget per run, in ticks (default 24000 = one full day, ~20 min).
                    A run also ends when its goal is met or the model says it is done.
  --budget-usd N    Stop a paid agent once its model calls cost this much (default 1.00)
  --steps N         Safety cap on decisions per agent (default 200)
  --check           Only check this machine's setup (Docker, Ollama, the model); start nothing
  --memory MODE     How much of its own past a model agent sees:
                      none   the current observation only
                      plan   also the plan it wrote last decision (default)
                      full   the whole exchange, trimmed to fit
  --comms on|off    Whether agents can message each other in chat (default on)
  -h, --help        Show this help

Each launch gets one episode ID shared by all agents, so their logs merge into one run.
Scripted agents ignore --memory and --comms but still log them.

Brains: the free local model always runs. Claude and GPT also run when
ANTHROPIC_API_KEY / OPENAI_API_KEY are set (in the environment or .env).

Examples:
  ./start.sh
  ./start.sh --scenario survival --goal shelter
  ./start.sh --goal "Mine 10 stone, then build a shelter" --ticks 12000

Watch:  minds panel http://localhost:3010 · 3D views http://localhost:3007 (local), 3008 (Claude), 3009 (GPT)
Stop:   ./stop.sh          (agents and panel; Minecraft keeps running)
        ./stop.sh --all    (everything)
HELP
}

SCENARIO="${SCENARIO:-sandbox}"
STEPS="${STEPS:-200}"
TICKS="${TICKS:-24000}"
BUDGET_USD="${BUDGET_USD:-1.00}"
GOAL="${GOAL:-}"
AGENT_MEMORY="${AGENT_MEMORY:-plan}"
AGENT_COMMS="${AGENT_COMMS:-on}"
CHECK_ONLY=false
while [ $# -gt 0 ]; do
  case "$1" in
    --scenario) SCENARIO="${2:?--scenario needs a value}"; shift 2 ;;
    --steps)    STEPS="${2:?--steps needs a value}"; shift 2 ;;
    --ticks)    TICKS="${2:?--ticks needs a value}"; shift 2 ;;
    --budget-usd) BUDGET_USD="${2:?--budget-usd needs a value}"; shift 2 ;;
    --goal)     GOAL="${2:?--goal needs a value}"; shift 2 ;;
    --check)    CHECK_ONLY=true; shift ;;
    --memory)   AGENT_MEMORY="${2:?--memory needs a value}"; shift 2 ;;
    --comms)    AGENT_COMMS="${2:?--comms needs a value}"; shift 2 ;;
    -h|--help)  usage; exit 0 ;;
    *) echo "unknown option: $1 (try --help)" >&2; exit 1 ;;
  esac
done
case "$AGENT_MEMORY" in none|plan|full) ;; *) echo "--memory must be none, plan or full" >&2; exit 1 ;; esac
case "$AGENT_COMMS" in on|off) ;; *) echo "--comms must be on or off" >&2; exit 1 ;; esac
EPISODE="ep-$(date -u +%Y%m%dT%H%M%SZ)"   # one per launch, shared by every agent
export SCENARIO STEPS TICKS BUDGET_USD GOAL AGENT_MEMORY AGENT_COMMS EPISODE

say()  { printf '\n==> %s\n' "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

# Read one KEY from the environment or .env. Used only to test for presence or
# to read the model name; this script never prints a key value.
get_var() {
  local key="$1" val="${!1:-}"
  if [ -z "$val" ] && [ -f .env ]; then
    val="$(grep -E "^[[:space:]]*${key}=" .env | tail -n1 | cut -d= -f2- | tr -d '[:space:]"'"'" || true)"
  fi
  printf '%s' "$val"
}

# Which machine are we on? The install hints and one Linux-only check depend on it.
case "$(uname -s)" in
  Darwin) PLATFORM=mac ;;
  Linux)  if grep -qi microsoft /proc/version 2>/dev/null; then PLATFORM=wsl; else PLATFORM=linux; fi ;;
  MINGW*|MSYS*|CYGWIN*) PLATFORM=gitbash ;;
  *) PLATFORM=other ;;
esac

docker_hint() {
  case "$PLATFORM" in
    linux) echo "Install Docker Engine: https://docs.docker.com/engine/install/ (then: sudo systemctl start docker)" ;;
    *)     echo "Install Docker Desktop: https://www.docker.com/products/docker-desktop/" ;;
  esac
}
ollama_install_hint() {
  case "$PLATFORM" in
    mac)   echo "brew install ollama && brew services start ollama" ;;
    linux) echo "curl -fsSL https://ollama.com/install.sh | sh   (it starts as a background service)" ;;
    wsl)   echo "install Ollama on Windows from https://ollama.com/download, start it, and enable WSL mirrored networking so this shell can reach it at localhost:11434" ;;
    *)     echo "install Ollama from https://ollama.com/download and start it" ;;
  esac
}

OLLAMA_API="http://localhost:11434"

say "Checking Docker"
command -v docker >/dev/null 2>&1 || fail "Docker is not installed. $(docker_hint)"
docker info >/dev/null 2>&1 || fail "Docker is installed but not running. Start it and re-run."
echo "Docker is running."
[ "$PLATFORM" = gitbash ] && echo "Note: Git Bash is untested. If anything misbehaves, run this from WSL2 instead."

say "Checking Ollama (the free local brain; it runs on this machine, not in Docker)"
# Talk to Ollama's API rather than its CLI, so this also works when Ollama runs
# where this shell can't see the command (e.g. on the Windows side of WSL).
curl -fsS --max-time 3 "$OLLAMA_API/api/tags" >/dev/null 2>&1 \
  || fail "Ollama is not answering on $OLLAMA_API. To install and start it:  $(ollama_install_hint)"

if [ "$PLATFORM" = linux ]; then
  # On Linux, Ollama listens on 127.0.0.1 only by default. The agents run in
  # containers, which are not "localhost" to the host, so every decision fails.
  if command -v ss >/dev/null 2>&1; then
    listen="$(ss -ltnH 'sport = :11434' 2>/dev/null | awk '{print $4}')"
    if [ -n "$listen" ] && ! printf '%s\n' "$listen" | grep -qvE '^(127\.0\.0\.1|\[::1\]):'; then
      fail "Ollama only accepts connections from this machine, so the agents (in Docker) can't reach it.
Make it listen for containers too, then re-run:
  sudo systemctl edit ollama     # add these two lines, save:
      [Service]
      Environment=\"OLLAMA_HOST=0.0.0.0\"
  sudo systemctl restart ollama
This also exposes Ollama to your network; block port 11434 in your firewall if that matters."
    fi
  else
    echo "Note: could not check which address Ollama listens on ('ss' not found)."
  fi
fi

MODEL="$(get_var OLLAMA_MODEL)"; MODEL="${MODEL:-qwen3:4b-instruct}"
if curl -fsS --max-time 5 "$OLLAMA_API/api/tags" | grep -qE "\"name\":\"$MODEL(:latest)?\""; then
  echo "Model $MODEL is already downloaded."
elif [ "$CHECK_ONLY" = true ]; then
  echo "Model $MODEL is not downloaded yet; ./start.sh will download it (a few GB, one time)."
else
  echo "Downloading model $MODEL (one time, a few GB)..."
  curl -fsS -X POST "$OLLAMA_API/api/pull" -d "{\"model\":\"$MODEL\",\"stream\":false}" >/dev/null \
    || fail "Downloading $MODEL failed. Check the model name and your connection."
  echo "Downloaded $MODEL."
fi
export OLLAMA_MODEL="$MODEL"

if [ "$CHECK_ONLY" = true ]; then
  say "Setup looks good ($PLATFORM). Run ./start.sh to begin."
  exit 0
fi

say "Starting the Minecraft server (first start can take a couple of minutes)"
docker compose up -d mc
status=missing
for _ in $(seq 1 60); do
  status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' mae-mc 2>/dev/null || echo missing)"
  [ "$status" = "healthy" ] && break
  printf '.'; sleep 5
done
echo
[ "$status" = "healthy" ] || fail "Minecraft did not become healthy. See:  docker compose logs mc"
echo "Minecraft server is healthy."

say "Choosing brains"
SERVICES=(agent-ollama)
echo "  ollama  : yes ($MODEL, local, free)"
if [ -n "$(get_var ANTHROPIC_API_KEY)" ]; then
  SERVICES+=(agent-claude); echo "  claude  : yes (key found)"
else
  echo "  claude  : skipped (no ANTHROPIC_API_KEY)"
fi
if [ -n "$(get_var OPENAI_API_KEY)" ]; then
  SERVICES+=(agent-gpt); echo "  gpt     : yes (key found)"
else
  echo "  gpt     : skipped (no OPENAI_API_KEY)"
fi

say "Starting minds panel and agents (scenario=$SCENARIO, ticks=$TICKS, memory=$AGENT_MEMORY, comms=$AGENT_COMMS, episode=$EPISODE, goal=${GOAL:-scenario default})"
docker compose --profile agents up -d --build --no-deps --force-recreate minds "${SERVICES[@]}"

say "Ready"
echo "  Minds panel (what each agent is thinking):  http://localhost:3010"
for s in "${SERVICES[@]}"; do
  case "$s" in
    agent-ollama) echo "  Watch the ollama agent:  http://localhost:3007" ;;
    agent-claude) echo "  Watch the claude agent:  http://localhost:3008" ;;
    agent-gpt)    echo "  Watch the gpt agent:     http://localhost:3009" ;;
  esac
done
echo "  Join the world yourself: Minecraft Java Edition 1.21.1, server address  localhost"
echo "  (Tip: avoid running the Minecraft client and a large model together on a 16GB Mac.)"
echo
echo "Each agent runs one episode, then stops. Logs:  docker compose logs -f ${SERVICES[*]}"
echo "Stop everything with  ./stop.sh   (add --all to stop Minecraft too)."
