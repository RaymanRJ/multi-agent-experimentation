#!/usr/bin/env bash
# Copy a batch's generated reports into docs/results/batches/NAME/, for committing. Logs stay in
# runs/ (see docs/results/README.md); these reports carry no prompts, only what the logs showed.
#
#   scripts/publish-reports.sh p5
#   scripts/publish-reports.sh thome1      # a team run (scripts/team.sh): found by runs/team-NAME.txt
#
# Writes README.md (the batch comparison), conditions.md (success per condition with intervals)
# and one <agent>.md per run (its behaviour report; <agent>-<rep>.md for a team run, whose reps
# reuse agent names). Local log paths become links between them. For real runs only, not proof or
# dev runs.
set -euo pipefail
cd "$(dirname "$0")/.."

name="${1:?usage: publish-reports.sh BATCH}"
if [ -s "runs/team-$name.txt" ]; then kind=team; else kind=batch; fi
list="runs/$kind-$name.txt"
compare="runs/compare-$kind-$name.md"
dest="docs/results/batches/$name"
[ -s "$list" ] || { echo "ERROR: no run list at $list" >&2; exit 1; }
[ -s "$compare" ] || { echo "ERROR: no comparison at $compare (npm run compare -- --$kind $name)" >&2; exit 1; }

mkdir -p "$dest"
# Each run's published name: its agent, plus the rep for a team run.
page() {
  local agent rep
  agent="$(basename "$1" .jsonl | sed -E 's/^[0-9TZ-]+-//')"
  rep="$(head -1 "$1" | grep -oE '"episode":"[^"]*-[0-9]+"' | grep -oE '[0-9]+"$' | tr -d '"' || true)"
  if [ "$kind" = team ] && [ -n "$rep" ]; then echo "$agent-$rep"; else echo "$agent"; fi
}
# `runs/<log>.jsonl` -> [<page>](<page>.md); a run's own "log `runs/...`" -> not published.
links=()
while read -r log; do
  p="$(page "$log")"
  links+=(-e "s#\`$log\`#[$p]($p.md)#g")
done < "$list"

sed -E "${links[@]}" \
  -e 's/^Logs:$/Runs:/' \
  -e 's#Each agent.s full report is beside its log: `<log>\.summary\.md`\.#Each agent'"'"'s full report is in this folder, linked below.#' \
  "$compare" > "$dest/README.md"

while read -r log; do
  summary="${log%.jsonl}.summary.md"
  [ -s "$summary" ] || { echo "warning: no report for $log (npm run summary)" >&2; continue; }
  sed -E 's#log `runs/[^`]+\.jsonl`#log not published (see ../../README.md)#' "$summary" > "$dest/$(page "$log").md"
done < "$list"

{
  if [ "$kind" = team ]; then echo "# Team run $name: success per condition"; else echo "# Batch $name: success per condition"; fi
  echo
  echo '```'
  if [ "$kind" = team ]; then
    npm run --silent report -- --by condition --last 1000 $(cat "$list")
  else
    npm run --silent report -- --by condition --batch "$name"
  fi
  echo '```'
} > "$dest/conditions.md"

echo "wrote $(ls "$dest" | wc -l | tr -d ' ') files to $dest"
