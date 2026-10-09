#!/usr/bin/env bash
# One command to run the whole experiment:
#   ./start.sh [--scenario sandbox|survival] [--steps N] [--goal shelter|tools|gather|explore|"any sentence"]
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
  --steps N         Decisions each agent makes before stopping (default 12)
  -h, --help        Show this help

Brains: the free local model always runs. Claude and GPT also run when
ANTHROPIC_API_KEY / OPENAI_API_KEY are set (in the environment or .env).

Examples:
  ./start.sh
  ./start.sh --scenario survival --goal shelter
  ./start.sh --goal "Mine 10 stone, then build a shelter" --steps 20

Watch:  minds panel http://localhost:3010 · 3D views http://localhost:3007 (local), 3008 (Claude), 3009 (GPT)
Stop:   ./stop.sh          (agents and panel; Minecraft keeps running)
        ./stop.sh --all    (everything)
HELP
}

SCENARIO="${SCENARIO:-sandbox}"
STEPS="${STEPS:-12}"
GOAL="${GOAL:-}"
while [ $# -gt 0 ]; do
  case "$1" in
    --scenario) SCENARIO="${2:?--scenario needs a value}"; shift 2 ;;
    --steps)    STEPS="${2:?--steps needs a value}"; shift 2 ;;
    --goal)     GOAL="${2:?--goal needs a value}"; shift 2 ;;
    -h|--help)  usage; exit 0 ;;
    *) echo "unknown option: $1 (try --help)" >&2; exit 1 ;;
  esac
done
export SCENARIO STEPS GOAL

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

say "Checking Docker"
command -v docker >/dev/null 2>&1 || fail "Docker is not installed. Get Docker Desktop: https://www.docker.com/products/docker-desktop/"
docker info >/dev/null 2>&1 || fail "Docker is installed but not running. Start Docker Desktop and re-run."
echo "Docker is running."

say "Checking Ollama (the free local brain; it must run natively, not in Docker)"
command -v ollama >/dev/null 2>&1 || fail "Ollama is not installed. Run:  brew install ollama && brew services start ollama"
curl -fsS --max-time 3 http://localhost:11434/api/tags >/dev/null 2>&1 \
  || fail "Ollama is installed but not answering on :11434. Run:  brew services start ollama"
MODEL="$(get_var OLLAMA_MODEL)"; MODEL="${MODEL:-qwen3:4b-instruct}"
installed="$(ollama list | awk 'NR>1 {print $1}')"
if printf '%s\n' "$installed" | grep -qxF -e "$MODEL" -e "$MODEL:latest"; then
  echo "Model $MODEL is already downloaded."
else
  echo "Downloading model $MODEL (one time, a few GB)..."
  ollama pull "$MODEL"
fi
export OLLAMA_MODEL="$MODEL"

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

say "Starting minds panel and agents (scenario=$SCENARIO, steps=$STEPS, goal=${GOAL:-scenario default})"
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
