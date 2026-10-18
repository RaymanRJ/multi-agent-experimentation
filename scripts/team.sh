#!/usr/bin/env bash
# Runs several agents together in one freshly regenerated world: the multi-agent counterpart of
# batch.sh. Every agent in a rep shares one episode ID, so the report can score teams (stance
# collaborative) and races (stance competitive). Repeats REPS times, each on a fresh world.
#
#   scripts/team.sh NAME "AGENT AGENT..." [REPS] [TICKS] [SCENARIO]
#   AGENT is  name=brain[:memory][@model]   (name at most 16 characters; memory defaults to plan)
#
#   STANCE=competitive scripts/team.sh t1 "qa=ollama qb=ollama"
#   STANCE=collaborative GOAL=team-camp scripts/team.sh t3 "haiku=claude@claude-haiku-4-5 qwen=ollama"
#   STANCE=collaborative COMMS=on GOAL=shelter scripts/team.sh t2 "opus=claude:full@claude-opus-5-5 sol=gpt@gpt-6.1-sol"
#
# STANCE (neutral), COMMS (on), PROGRESS (off), BUDGET_USD (1.00 per agent) and GOAL (tools) apply to every agent.
# VIEW=on serves each agent's view in a browser, the first at localhost:3007, the next at 3008, and so on. @model sets the brain's
# model variable for that agent only, so two models from one provider can play together.
# Uses its own throwaway server (never the main world). Logs: runs/; the list: runs/team-NAME.txt
set -euo pipefail
cd "$(dirname "$0")/.."

name="${1:?usage: team.sh NAME \"AGENT AGENT...\" [REPS] [TICKS] [SCENARIO]}"
agents="${2:?missing the agent list, e.g. \"qa=ollama qb=ollama:full\"}"
reps="${3:-1}"
ticks="${4:-12000}"
scenario="${5:-sandbox}"
stance="${STANCE:-neutral}"
comms="${COMMS:-on}"
progress="${PROGRESS:-off}"
budget="${BUDGET_USD:-1.00}"
goal="${GOAL:-tools}"
view="${VIEW:-off}"
port="${TEAM_PORT:-25600}"
list="runs/team-$name.txt"
mkdir -p runs
: > "$list"

model_var() {
  case "$1" in
    claude) echo ANTHROPIC_MODEL ;; gpt) echo OPENAI_MODEL ;; grok) echo XAI_MODEL ;;
    gemini) echo GEMINI_MODEL ;; groq) echo GROQ_MODEL ;; openrouter) echo OPENROUTER_MODEL ;;
    ollama) echo OLLAMA_MODEL ;; *) echo "" ;;
  esac
}

for rep in $(seq 1 "$reps"); do
  episode="team-$name-$rep"
  echo "==> rep $rep/$reps: $agents (stance=$stance, comms=$comms, goal=$goal, $scenario, $ticks ticks)"
  scripts/test-server.sh reset "team-$name" "$port" >/dev/null
  rm -rf "runs/.teams/$episode"   # the shared team state from an earlier run of this episode name
  members="$(for spec in $agents; do printf '%s,' "${spec%%=*}"; done)"
  pids=()
  outs=()
  viewport=3007
  for spec in $agents; do
    agent="${spec%%=*}"
    rest="${spec#*=}"
    model=""; [[ "$rest" == *@* ]] && { model="${rest#*@}"; rest="${rest%%@*}"; }
    brain="${rest%%:*}"
    memory="${rest#*:}"; [ "$memory" = "$rest" ] && memory=plan
    [ "${#agent}" -le 16 ] || { echo "agent name '$agent' is longer than 16 characters" >&2; exit 1; }
    out="runs/.team-$name-$rep-$agent.out"
    outs+=("$out")
    var="$(model_var "$brain")"
    viewargs=()
    if [ "$view" = on ]; then viewargs=(--view "$viewport"); echo "    $agent: watch at http://localhost:$viewport"; viewport=$((viewport + 1)); [ "$viewport" = 3010 ] && viewport=3011; fi   # 3010 is the minds panel
    (
      [ -n "$model" ] && [ -n "$var" ] && export "$var=$model"
      MC_PORT="$port" RCON_PORT=$((port + 10)) npx tsx src/agent.ts \
        --brain "$brain" --memory "$memory" --comms "$comms" --stance "$stance" --progress "$progress" --budget-usd "$budget" --goal "$goal" \
        --scenario "$scenario" --ticks "$ticks" --name "$agent" --episode "$episode" --team "${members%,}" ${viewargs[@]+"${viewargs[@]}"} > "$out" 2>&1 || true
    ) &
    pids+=($!)
    sleep 5   # join one at a time: the server refuses a second login from one address within 4s
  done
  for pid in "${pids[@]}"; do wait "$pid" || true; done
  # The server is regenerated for the next rep, so keep its log.
  docker logs "mae-test-team-$name" > "runs/team-$name-$rep.server.log" 2>&1 || true
  for out in "${outs[@]}"; do
    agent="$(basename "$out" .out)"; agent="${agent#.team-$name-$rep-}"
    if grep -q 'ended:' "$out"; then
      echo "    $agent: $(grep -E 'ended:' "$out" | tail -1 | sed 's/^\[[^]]*\] //')"
    else
      echo "    $agent: DID NOT FINISH"; grep -iE 'error|kicked|not usable' "$out" | head -3 | sed 's/^/      /'
    fi
    file="$(grep -oE 'runs/[^ ]+\.jsonl' "$out" | head -1 || true)"
    [ -n "$file" ] && [ -s "$file" ] && echo "$file" >> "$list"
    rm -f "$out"
  done
done

scripts/test-server.sh down "team-$name" >/dev/null
echo
npm run --silent report -- --last 1000 $(cat "$list")
# The readable comparison: by goal and model, and for teams who did what (src/compare.ts).
echo
echo "Comparison: $(npm run --silent compare -- --team "$name")"
