#!/usr/bin/env bash
# Tests for Makefile file operation targets
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
PASS=0; FAIL=0

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

ok()   { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL+1)); }

# Set up fake data dirs inside tmp
mkdir -p "$TMP/data/opportunities" "$TMP/data/candidates"

# ── promote ──────────────────────────────────────────────────────────────────
# make promote RUN_DIR=... SLUG=... moves the file to /data/opportunities/
echo "promote:"
RUN_DIR="$TMP/data/run/test-run-1/preference-1"
mkdir -p "$RUN_DIR"
echo "company: TestCo" > "$RUN_DIR/testco.yaml"

make -C "$REPO" promote \
  REPO_ROOT="$TMP" \
  RUN_DIR="$RUN_DIR" \
  SLUG="testco" \
  > /dev/null 2>&1

if [[ -f "$TMP/data/opportunities/testco.yaml" ]]; then
  ok "file moved to opportunities/"
else
  fail "file not found in opportunities/"
fi

if [[ ! -f "$RUN_DIR/testco.yaml" ]]; then
  ok "file removed from run dir"
else
  fail "file still in run dir after promote"
fi

# ── shelve ───────────────────────────────────────────────────────────────────
# make shelve RUN_DIR=... moves all yamls to /data/candidates/
echo "shelve:"
RUN_DIR2="$TMP/data/run/test-run-2/preference-1"
mkdir -p "$RUN_DIR2"
echo "company: Alpha" > "$RUN_DIR2/alpha.yaml"
echo "company: Beta"  > "$RUN_DIR2/beta.yaml"

make -C "$REPO" shelve \
  REPO_ROOT="$TMP" \
  RUN_DIR="$RUN_DIR2" \
  > /dev/null 2>&1

if [[ -f "$TMP/data/candidates/alpha.yaml" && -f "$TMP/data/candidates/beta.yaml" ]]; then
  ok "all yamls moved to candidates/"
else
  fail "yamls not found in candidates/"
fi

if [[ -z "$(ls -A "$RUN_DIR2" 2>/dev/null)" ]]; then
  ok "run dir empty after shelve"
else
  fail "run dir not empty after shelve"
fi

# ── persist-company ───────────────────────────────────────────────────────────
# make persist-company DEST_DIR=... SLUG=... writes a yaml skeleton
echo "persist-company:"
DEST="$TMP/data/run/test-run-3/preference-1"
mkdir -p "$DEST"

make -C "$REPO" persist-company \
  DEST_DIR="$DEST" \
  SLUG="newco" \
  COMPANY="NewCo" \
  > /dev/null 2>&1

if [[ -f "$DEST/newco.yaml" ]]; then
  ok "yaml file created"
else
  fail "yaml file not created"
fi

if grep -q "company:" "$DEST/newco.yaml"; then
  ok "yaml contains company field"
else
  fail "yaml missing company field"
fi

# ── summary ───────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]]
