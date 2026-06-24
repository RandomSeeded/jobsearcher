#!/usr/bin/env bash
# Atomically claim a slug for a discovery run.
#
#   scripts/claim.sh <claims_dir> <slug>
#
# Exit 0 -> this caller won the claim (it created the dir).
# Exit 1 -> another agent already holds it; the caller must pick a different one.
#
# The win/lose decision rides on plain `mkdir` of the leaf, which POSIX guarantees
# is atomic: when N agents race the same slug, exactly one mkdir succeeds. Do NOT
# use `mkdir -p` on the leaf — it succeeds even when the dir already exists, which
# would let every racer "win".
set -euo pipefail

claims_dir="${1:?claims_dir required}"
slug="${2:?slug required}"

mkdir -p "$claims_dir"

if mkdir "$claims_dir/$slug" 2>/dev/null; then
  exit 0
fi
exit 1
