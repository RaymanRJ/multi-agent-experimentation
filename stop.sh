#!/usr/bin/env bash
# Stops agents and the minds panel. Add --all to stop the Minecraft server too.
set -euo pipefail
cd "$(dirname "$0")"

command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker is not installed." >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "ERROR: Docker is not running." >&2; exit 1; }

echo "==> Stopping agents and minds panel"
docker compose --profile agents stop agent-ollama agent-claude agent-gpt minds
docker compose --profile agents rm -f agent-ollama agent-claude agent-gpt minds >/dev/null

if [ "${1:-}" = "--all" ]; then
  echo "==> Stopping the Minecraft server"
  docker compose stop mc
  echo "Everything is stopped. World data is kept in ./world."
else
  echo "Minecraft is still running. Use  ./stop.sh --all  to stop it too."
fi
