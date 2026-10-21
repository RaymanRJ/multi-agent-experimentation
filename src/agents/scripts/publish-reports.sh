#!/usr/bin/env bash
# Write a batch's generated report to docs/results/batch-reports/<date>-<time>-NAME.md, for committing. Logs stay in
# runs/ (see docs/results/README.md); the report carries no prompts, only what the logs showed.
#
#   scripts/publish-reports.sh p5
#   scripts/publish-reports.sh thome1      # a team run (scripts/team.sh): found by runs/team-NAME.txt
#
# One page: the batch comparison, then success per condition with intervals. Each run's own behaviour
# report stays in runs/ beside its log; the page names runs by agent (<agent>-<rep> for a team run, whose
# reps reuse agent names). For real runs only, not proof or dev runs.
set -euo pipefail
cd "$(dirname "$0")/.."
# The experiment lives in src/agents/; the published pages go in the repository's docs/.
pages="../../docs/results/batch-reports"

name="${1:?usage: publish-reports.sh BATCH}"
if [ -s "runs/team-$name.txt" ]; then kind=team; else kind=batch; fi
list="runs/$kind-$name.txt"
compare="runs/compare-$kind-$name.md"
# Pages are named by when the first run started, so they sort in the order the runs happened
# (batch names don't: b13 ran before b12). A batch published before keeps its name.
dest="$(ls "$pages"/*-"$name".md 2>/dev/null | head -1 || true)"
if [ -z "$dest" ]; then
  started="$(head -1 "$list" | grep -oE '20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}' | head -1 | sed -E 's/T([0-9]{2})-([0-9]{2})/-\1\2/')"
  dest="$pages/${started:-undated}-$name.md"
fi
[ -s "$list" ] || { echo "ERROR: no run list at $list" >&2; exit 1; }
[ -s "$compare" ] || { echo "ERROR: no comparison at $compare (npm run compare -- --$kind $name)" >&2; exit 1; }

mkdir -p "$(dirname "$dest")"
# Each run's published name: its agent, plus the rep for a team run.
page() {
  local agent rep
  agent="$(basename "$1" .jsonl | sed -E 's/^[0-9TZ-]+-//')"
  rep="$(head -1 "$1" | grep -oE '"episode":"[^"]*-[0-9]+"' | grep -oE '[0-9]+"$' | tr -d '"' || true)"
  if [ "$kind" = team ] && [ -n "$rep" ]; then echo "$agent-$rep"; else echo "$agent"; fi
}
# `runs/<log>.jsonl` -> its published name.
names=()
while read -r log; do
  names+=(-e "s#\`$log\`#$(page "$log")#g")
done < "$list"

# Say what made it: the reports are rebuilt from the logs, so an old batch's numbers come from today's
# report code, and can differ from its write-up where that code has been fixed since.
stamp="*Built from the run logs on $(date -u +%Y-%m-%d) by the report code at $(git rev-parse --short HEAD) (\`src/agents/scripts/publish-reports.sh $name\`). Where this differs from the write-up in \`docs/results/\`, the write-up was made at the time, and the report code has been fixed since.*"
{
  sed -E "${names[@]}" \
    -e 's/^Logs:$/Runs:/' \
    -e 's#Each agent.s full report is beside its log: `<log>\.summary\.md`\.#Each run'"'"'s step-by-step report is built from its log (`npm run summary`); the logs are not published (see [the results README](../README.md)).#' \
    "$compare" | awk -v stamp="$stamp" 'NR == 1 { print; print ""; print stamp; next } { print }'
  echo
  echo "## Success per condition"
  echo
  echo '```'
  if [ "$kind" = team ]; then
    npm run --silent report -- --by condition --last 1000 $(cat "$list")
  else
    npm run --silent report -- --by condition --batch "$name"
  fi
  echo '```'
} > "$dest"

echo "wrote $dest"
