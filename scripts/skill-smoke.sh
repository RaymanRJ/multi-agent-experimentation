#!/usr/bin/env bash
# Drives each underground skill once against a throwaway server, handing the bot what it needs
# over RCON, and prints every result. A check that the skills work in the real game, not a
# benchmark: no model is involved.
#
#   scripts/skill-smoke.sh [PORT]
set -euo pipefail
cd "$(dirname "$0")/.."

port="${1:-25620}"
server="skills-smoke"
bot="smoke_bot"
container="mae-test-$server"

scripts/test-server.sh reset "$server" "$port"
rcon() { docker exec "$container" rcon-cli "$@" >/dev/null; }
try() {
  echo
  echo "==> $1 $2"
  local out
  out="$(MC_PORT="$port" npx tsx src/try.ts --name "$bot" --skill "$1" --args "$2" 2>&1 || true)"
  grep -E '^(result|before|after):|could not' <<<"$out" || tail -5 <<<"$out"
  sleep 5   # the server refuses a second login from one address within 4s
}
# Server commands only reach a player who is online, so hold the bot in the world while sending them.
online() {
  MC_PORT="$port" npx tsx src/try.ts --name "$bot" --skill wait --args '{"seconds":12}' >/dev/null 2>&1 &
  local pid=$!
  sleep 8
  for command in "$@"; do rcon $command; done
  wait "$pid" || true
  sleep 5
}
give() { local commands=(); for item in "$@"; do commands+=("give $bot $item"); done; online "${commands[@]}"; }

try wait '{"seconds":1}'   # first join creates the player
rcon gamerule doDaylightCycle false
rcon time set 1000
# Spawn sits over a flooded cave; start on the surface somewhere else, away from it.
online "spreadplayers ${SMOKE_X:-300} ${SMOKE_Z:-300} 0 16 false $bot"
give "stone_pickaxe 2"
try descend '{"y":16}'
try mine_ore '{"ore":"iron","count":2}'
try tunnel '{"length":16}'
try mine_ore '{"ore":"iron","count":2}'
try mine_ore '{"ore":"coal","count":1}'
give "raw_iron 3" "oak_log 4" "cobblestone 8"
try smelt '{"item":"iron_ingot","count":3}'
try craft '{"item":"iron_pickaxe","count":1}'
give "stone_pickaxe 3"   # spares: the staircase to diamond depth wears out more than one
try descend '{"y":-58}'
try descend '{"y":-58}'
try tunnel '{"length":32}'
try mine_ore '{"ore":"diamond","count":1}'

scripts/test-server.sh down "$server" >/dev/null
