#!/usr/bin/env bash
# Tests for discovery helpers: slugify (aggressive, deterministic) + claim (atomic).
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
PASS=0; FAIL=0

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

ok()   { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1 (got: '${2-}')"; FAIL=$((FAIL+1)); }

slugify() { "$REPO/scripts/slugify.sh" "$1"; }

# ── slugify ────────────────────────────────────────────────────────────────────
echo "slugify:"

got="$(slugify "General Compute")"
[[ "$got" == "general-compute" ]] && ok "basic: spaces to hyphens" || fail "basic: spaces to hyphens" "$got"

got="$(slugify "Positron AI")"
[[ "$got" == "positron" ]] && ok "trailing stopword stripped" || fail "trailing stopword stripped" "$got"

got="$(slugify "Positron, Inc.")"
[[ "$got" == "positron" ]] && ok "punctuation dropped" || fail "punctuation dropped" "$got"

got="$(slugify "Foo AI Labs")"
[[ "$got" == "foo" ]] && ok "multiple trailing stopwords stripped" || fail "multiple trailing stopwords stripped" "$got"

got="$(slugify "Scale AI Systems")"
[[ "$got" == "scale-ai-systems" ]] && ok "internal stopword preserved" || fail "internal stopword preserved" "$got"

got="$(slugify "AI21 Labs")"
[[ "$got" == "ai21" ]] && ok "non-stopword token survives" || fail "non-stopword token survives" "$got"

got="$(slugify "Labs")"
[[ "$got" == "labs" ]] && ok "never reduce to empty" || fail "never reduce to empty" "$got"

# ── claim ────────────────────────────────────────────────────────────────────────
echo "claim:"
claim() { "$REPO/scripts/claim.sh" "$1" "$2"; }

CLAIMS="$TMP/claims"

if claim "$CLAIMS" "positron" >/dev/null 2>&1; then
  ok "first claim wins (exit 0)"
else
  fail "first claim wins (exit 0)" "nonzero"
fi

if claim "$CLAIMS" "positron" >/dev/null 2>&1; then
  fail "second claim on same slug loses" "exit 0"
else
  ok "second claim on same slug loses (exit 1)"
fi

# Concurrency: N agents race the same fresh slug; exactly one must win.
RACE="$TMP/race"
WINS="$TMP/wins"
: > "$WINS"
for i in $(seq 1 20); do
  ( claim "$RACE" "contested" >/dev/null 2>&1 && echo win >> "$WINS" ) &
done
wait
winners="$(grep -c win "$WINS" 2>/dev/null || echo 0)"
[[ "$winners" -eq 1 ]] && ok "20 concurrent racers -> exactly one wins" || fail "20 concurrent racers -> exactly one wins" "$winners winners"

# ── summary ─────────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]]
