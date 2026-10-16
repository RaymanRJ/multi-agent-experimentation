#!/usr/bin/env bash
# Runs a comparison batch: every combination of goal x brain-condition, REPS times, each on a
# freshly regenerated world, one at a time (agents sharing one Ollama would slow each other's
# decisions, and slow decisions cost game time). Conditions are interleaved so drift over a
# long session doesn't favour any one of them. Prints the report at the end.
#
#   scripts/batch.sh NAME [REPS] [TICKS] [SCENARIO]
#   CONDITIONS="scripted ollama:none ollama:plan ollama:full" GOALS="shelter tools" scripts/batch.sh b1
#
# Uses its own throwaway server (never the main world). Logs: runs/; the list: runs/batch-NAME.txt
set -euo pipefail
cd "$(dirname "$0")/.."

name="${1:?usage: batch.sh NAME [REPS] [TICKS] [SCENARIO]}"
reps="${2:-3}"
ticks="${3:-12000}"
scenario="${4:-sandbox}"
conditions="${CONDITIONS:-scripted ollama:none ollama:plan ollama:full}"
goals="${GOALS:-shelter tools}"
port="${BATCH_PORT:-25590}"
list="runs/batch-$name.txt"
mkdir -p runs
: > "$list"

total=$(( reps * $(wc -w <<<"$goals") * $(wc -w <<<"$conditions") ))
n=0
for rep in $(seq 1 "$reps"); do
  for goal in $goals; do
    for condition in $conditions; do
      n=$((n + 1))
      brain="${condition%%:*}"
      memory="${condition#*:}"; [ "$memory" = "$condition" ] && memory=plan
      # Minecraft usernames max out at 16 characters: base_tools_1, qplan_shelter_3, ...
      if [ "$brain" = scripted ]; then tag=base; else tag="${brain:0:1}${memory}"; [ "$brain" = ollama ] && tag="q${memory}"; fi
      agent="$(printf '%s_%s_%s' "$tag" "$goal" "$rep" | cut -c1-16)"
      echo "==> [$n/$total] $agent ($scenario, $ticks ticks)"
      scripts/test-server.sh reset "batch-$name" "$port" >/dev/null
      out="$(MC_PORT="$port" RCON_PORT=$((port + 10)) npx tsx src/agent.ts \
        --brain "$brain" --memory "$memory" --comms off --goal "$goal" --scenario "$scenario" \
        --ticks "$ticks" --name "$agent" --episode "batch-$name-$n" 2>&1)" || true
      file="$(grep -oE 'runs/[^ ]+\.jsonl' <<<"$out" | head -1)"
      if grep -q 'ended:' <<<"$out"; then
        echo "    $(grep -E 'ended:' <<<"$out" | tail -1 | sed 's/^\[[^]]*\] //')"
      else
        echo "    DID NOT FINISH:"; grep -iE 'error|kicked|not usable' <<<"$out" | head -3 | sed 's/^/      /'
      fi
      [ -n "$file" ] && [ -s "$file" ] && echo "$file" >> "$list"
    done
  done
done

scripts/test-server.sh down "batch-$name" >/dev/null
echo
npm run --silent report -- --last 1000 $(cat "$list")
