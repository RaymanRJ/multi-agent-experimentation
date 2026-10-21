#!/usr/bin/env bash
# A throwaway Minecraft server for developing against, separate from the main
# world, so parallel work can change world settings without colliding.
# Same image, version and seed as the `mc` service in compose.yaml — keep them in sync.
#
#   scripts/test-server.sh up NAME PORT     # start (RCON on PORT+10), wait until healthy
#   scripts/test-server.sh reset NAME PORT  # regenerate from seed
#   scripts/test-server.sh down NAME        # stop and delete it
#
# Point bots at it with MC_PORT=PORT RCON_PORT=PORT+10.
set -euo pipefail
cd "$(dirname "$0")/.."

cmd="${1:?usage: test-server.sh up|reset|down NAME [PORT]}"
name="${2:?missing NAME}"
container="mae-test-$name"
data="$PWD/test-worlds/$name"

up() {
  local port="${1:?missing PORT}"
  mkdir -p "$data"
  docker run -d --name "$container" \
    -p "$port:25565" -p "$((port + 10)):25575" \
    -e EULA=TRUE -e TYPE=PAPER -e VERSION=1.21.1 -e MEMORY=1G \
    -e ONLINE_MODE=FALSE -e MODE=survival -e DIFFICULTY=peaceful \
    -e SEED=multiagent -e VIEW_DISTANCE=6 -e SIMULATION_DISTANCE=4 \
    -e SPAWN_PROTECTION=0 -e MAX_PLAYERS=10 \
    -e ENABLE_RCON=TRUE -e RCON_PASSWORD=devpassword -e OVERRIDE_SERVER_PROPERTIES=TRUE \
    -v "$data:/data" itzg/minecraft-server >/dev/null
  for _ in $(seq 1 60); do
    [ "$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null)" = healthy ] \
      && { echo "$container healthy: MC_PORT=$port RCON_PORT=$((port + 10))"; return 0; }
    sleep 5
  done
  echo "ERROR: $container did not become healthy. See:  docker logs $container" >&2; return 1
}

down() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -rf "$data"
}

case "$cmd" in
  up)    up "${3:-}" ;;
  reset) docker rm -f "$container" >/dev/null 2>&1 || true
         rm -rf "$data/world" "$data/world_nether" "$data/world_the_end"
         up "${3:-}" ;;
  down)  down; echo "$container removed." ;;
  *)     echo "unknown command: $cmd" >&2; exit 1 ;;
esac
