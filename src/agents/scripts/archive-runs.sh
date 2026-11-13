#!/usr/bin/env bash
# Copy the run logs (runs/) to the private logs bucket, so they outlive this machine: every number on the site traces
# back to them, and logs from an earlier machine were already lost. Adds and updates only; never deletes from the
# bucket (it is versioned besides). Safe to run again at any time; run it after each published batch.
#
#   LOGS_BUCKET=<name> scripts/archive-runs.sh            # upload what is new or changed
#   LOGS_BUCKET=<name> scripts/archive-runs.sh --dryrun   # list what would be uploaded, upload nothing
#
# The bucket is made by src/terraform (modules/run_archive); its name: `docker compose run --rm terraform output -raw
# logs_bucket_name` in src/terraform. AWS_PROFILE picks the credentials, as for Terraform.
set -euo pipefail
cd "$(dirname "$0")/.."

bucket="${LOGS_BUCKET:?set LOGS_BUCKET to the logs bucket (terraform output logs_bucket_name in src/terraform)}"
dryrun=""
[ "${1:-}" = "--dryrun" ] && dryrun="--dryrun"

[ -d runs ] || { echo "No runs/ folder here; nothing to archive." >&2; exit 1; }

# Scratch scripts and the minds panel's working file aren't results.
aws s3 sync runs/ "s3://$bucket/runs/" $dryrun \
  --exclude ".scratch/*" \
  --exclude ".minds.out" \
  --only-show-errors

files=$(find runs -type f ! -path "runs/.scratch/*" ! -name ".minds.out" | wc -l | tr -d ' ')
echo "${dryrun:+(dry run) }runs/ synced to s3://$bucket/runs/: $files files locally."
