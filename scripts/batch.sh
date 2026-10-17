#!/usr/bin/env bash
# Runs a comparison batch: every combination of goal x brain-condition, REPS times, each on a
# freshly regenerated world, one at a time (agents sharing one Ollama would slow each other's
# decisions, and slow decisions cost game time). Conditions are interleaved so drift over a
# long session doesn't favour any one of them. Prints the report at the end.
#
#   scripts/batch.sh NAME [REPS] [TICKS] [SCENARIO]
#   CONDITIONS="scripted ollama:none ollama:plan ollama:full" GOALS="shelter tools" scripts/batch.sh b1
#   GOALS="tools tools-guided" scripts/batch.sh b5     # bare goal vs the step-by-step one
#   CONDITIONS="ollama:none ollama:none+progress" scripts/batch.sh b6   # +progress: told what the goal still lacks
#   BUDGET_USD=15 CONDITIONS="claude:full@claude-sonnet-5-5 claude:full@claude-opus-5-5" scripts/batch.sh p1
#     a condition is brain[:memory][+progress][@model]; BUDGET_USD caps each paid run (default 1.00)
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
budget="${BUDGET_USD:-1.00}"   # per-run spending cap for paid models; raise it for long goals
stance="${STANCE:-neutral}"   # one agent per world, so this only changes the prompt text
port="${BATCH_PORT:-25590}"
list="runs/batch-$name.txt"
mkdir -p runs
: > "$list"

# The environment variable that picks each brain's model, for brain@model conditions.
model_var() {
  case "$1" in
    claude) echo ANTHROPIC_MODEL ;; gpt) echo OPENAI_MODEL ;; grok) echo XAI_MODEL ;;
    gemini) echo GEMINI_MODEL ;; groq) echo GROQ_MODEL ;; openrouter) echo OPENROUTER_MODEL ;;
    ollama) echo OLLAMA_MODEL ;; *) echo "" ;;
  esac
}

total=$(( reps * $(wc -w <<<"$goals") * $(wc -w <<<"$conditions") ))
n=0
for rep in $(seq 1 "$reps"); do
  for goal in $goals; do
    for condition in $conditions; do
      n=$((n + 1))
      model=""; spec="$condition"
      [[ "$spec" == *@* ]] && { model="${spec#*@}"; spec="${spec%%@*}"; }
      progress=off; base="$spec"
      [ "${spec%+progress}" != "$spec" ] && { progress=on; base="${spec%+progress}"; }
      brain="${base%%:*}"
      memory="${base#*:}"; [ "$memory" = "$base" ] && memory=plan
      # Minecraft usernames max out at 16 characters: base_tools_1, qplan_shelter_3, ...
      if [ "$brain" = scripted ]; then tag=base; else tag="${brain:0:1}${memory}"; [ "$brain" = ollama ] && tag="q${memory}"; [ "$progress" = on ] && tag="${tag}p"; fi
      if [ -n "$model" ]; then
        # Two letters of the model's name word (claude-sonnet-5-5 -> so), memory's initial: csof, copfp, ghan...
        hint="$(tr '-' '\n' <<<"$model" | grep -E '^[a-z]+$' | tail -1 | cut -c1-2)"
        tag="${brain:0:1}${hint}${memory:0:1}"; [ "$progress" = on ] && tag="${tag}p"
      fi
      short="${goal/-guided/g}"   # tools-guided -> toolsg, to fit the name limit
      agent="$(printf '%s_%s_%s' "$tag" "$short" "$rep" | cut -c1-16)"
      echo "==> [$n/$total] $agent ($scenario, $ticks ticks)"
      scripts/test-server.sh reset "batch-$name" "$port" >/dev/null
      var="$(model_var "$brain")"
      out="$( [ -n "$model" ] && [ -n "$var" ] && export "$var=$model"
        MC_PORT="$port" RCON_PORT=$((port + 10)) npx tsx src/agent.ts \
        --brain "$brain" --memory "$memory" --comms off --stance "$stance" --progress "$progress" --budget-usd "$budget" --goal "$goal" --scenario "$scenario" \
        --ticks "$ticks" --name "$agent" --episode "batch-$name-$n" 2>&1)" || true
      file="$(grep -oE 'runs/[^ ]+\.jsonl' <<<"$out" | head -1 || true)"   # none if the agent never started
      if grep -q 'ended:' <<<"$out"; then
        echo "    $(grep -E 'ended:' <<<"$out" | tail -1 | sed 's/^\[[^]]*\] //')"
      else
        echo "    DID NOT FINISH:"; grep -iE 'error|kicked|not usable' <<<"$out" | head -3 | sed 's/^/      /'
      fi
      [ -n "$file" ] && [ -s "$file" ] && echo "$file" >> "$list"
      # The server is regenerated for the next run, so keep its log beside the run's.
      [ -n "$file" ] && docker logs "mae-test-batch-$name" > "${file%.jsonl}.server.log" 2>&1 || true
    done
  done
done

scripts/test-server.sh down "batch-$name" >/dev/null
echo
npm run --silent report -- --last 1000 $(cat "$list")
