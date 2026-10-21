#!/usr/bin/env bash
# Regenerates the main world from its seed so runs start from the same place.
# Deletes only the level folders (terrain, player inventories, positions);
# server config and the downloaded Paper jar are kept.
#   scripts/reset-world.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Stopping the Minecraft server"
docker compose stop mc

echo "==> Deleting the level folders (they regenerate from SEED)"
rm -rf world/world world/world_nether world/world_the_end

echo "==> Starting the Minecraft server"
docker compose up -d mc
for _ in $(seq 1 60); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' mae-mc 2>/dev/null)" = healthy ] && { echo "World reset from seed; server is healthy."; exit 0; }
  printf '.'; sleep 5
done
echo; echo "ERROR: Minecraft did not become healthy. See:  docker compose logs mc" >&2; exit 1
