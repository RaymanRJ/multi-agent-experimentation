#!/usr/bin/env bash
# Copy a batch's generated reports into docs/results/batches/NAME/, for committing. Logs stay in
# runs/ (see docs/results/README.md); these reports carry no prompts, only what the logs showed.
#
#   scripts/publish-reports.sh p5
#
# Writes README.md (the batch comparison), conditions.md (success per condition with intervals)
# and one <agent>.md per run (its behaviour report). Local log paths become links between them.
# For real batches only, not proof or dev runs.
set -euo pipefail
cd "$(dirname "$0")/.."

name="${1:?usage: publish-reports.sh BATCH}"
list="runs/batch-$name.txt"
compare="runs/compare-batch-$name.md"
dest="docs/results/batches/$name"
[ -s "$list" ] || { echo "ERROR: no run list at $list" >&2; exit 1; }
[ -s "$compare" ] || { echo "ERROR: no comparison at $compare (npm run compare -- --batch $name)" >&2; exit 1; }

mkdir -p "$dest"
# runs/<timestamp>-<agent>.jsonl -> [<agent>](<agent>.md); a run's own "log `runs/...`" -> not published.
unlink_logs='s#`runs/[0-9TZ-]+-([A-Za-z0-9_]+)\.jsonl`#[\1](\1.md)#g'

sed -E -e "$unlink_logs" \
  -e 's/^Logs:$/Runs:/' \
  -e 's#Each agent.s full report is beside its log: `<log>\.summary\.md`\.#Each agent'"'"'s full report is in this folder, linked below.#' \
  "$compare" > "$dest/README.md"

while read -r log; do
  summary="${log%.jsonl}.summary.md"
  agent="$(basename "$log" .jsonl | sed -E 's/^[0-9TZ-]+-//')"
  [ -s "$summary" ] || { echo "warning: no report for $log (npm run summary -- --batch $name)" >&2; continue; }
  sed -E 's#log `runs/[^`]+\.jsonl`#log not published (see ../../README.md)#' "$summary" > "$dest/$agent.md"
done < "$list"

{
  echo "# Batch $name: success per condition"
  echo
  echo '```'
  npm run --silent report -- --by condition --batch "$name"
  echo '```'
} > "$dest/conditions.md"

echo "wrote $(ls "$dest" | wc -l | tr -d ' ') files to $dest"
