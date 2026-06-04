#!/usr/bin/env bash
# Triggered by launchd at midnight. Runs all pending discover-queue jobs.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
PORT=3002

# Give Wi-Fi time to reconnect after wake
sleep 10

# Fetch pending runs and trigger each
PENDING=$(curl -sf "http://localhost:$PORT/api/discover-queue" | \
  python3 -c "
import json, sys
runs = json.load(sys.stdin)
for r in runs:
    if r['status'] == 'pending':
        print(r['id'])
")

for ID in $PENDING; do
  echo "$(date -u +%FT%TZ) triggering run $ID"
  curl -sf -X POST "http://localhost:$PORT/api/discover-queue/$ID/run" > /dev/null
  # Wait for it to finish before starting the next (server enforces one-at-a-time too)
  while true; do
    STATUS=$(curl -sf "http://localhost:$PORT/api/discover-queue" | \
      python3 -c "
import json, sys
runs = json.load(sys.stdin)
r = next((r for r in runs if r['id'] == '$ID'), None)
print(r['status'] if r else 'unknown')
")
    if [[ "$STATUS" == "done" || "$STATUS" == "failed" ]]; then
      echo "$(date -u +%FT%TZ) run $ID finished: $STATUS"
      break
    fi
    sleep 15
  done
done

echo "$(date -u +%FT%TZ) drain complete"
