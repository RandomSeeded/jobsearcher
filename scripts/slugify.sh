#!/usr/bin/env bash
# Aggressive, deterministic slug from a company name.
# Both discovery agents call this so their atomic claims collide on the same slug.
set -euo pipefail

name="${1-}"

# Trailing corporate/AI suffixes to strip. Only stripped when trailing, never
# when leading/internal (so "AI21 Labs" -> "ai21", "Scale AI Systems" keeps "ai").
STOPWORDS=" ai inc llc ltd labs lab co corp hq io "

# lowercase -> non-alnum to spaces -> collapse + trim, leaving space-separated tokens
read -r -a tokens <<<"$(printf '%s' "$name" \
  | tr '[:upper:]' '[:lower:]' \
  | tr -cs 'a-z0-9' ' ' \
  | sed 's/^ *//; s/ *$//')"

# Drop trailing stopword tokens, but never reduce to nothing.
# Explicit indexing (no negative subscripts) for bash 3.2 on macOS.
n=${#tokens[@]}
while [[ $n -gt 1 && "$STOPWORDS" == *" ${tokens[$((n-1))]} "* ]]; do
  unset "tokens[$((n-1))]"
  n=$((n-1))
done

# hyphenate
slug="$(IFS=-; printf '%s\n' "${tokens[*]}")"

printf '%s\n' "$slug"
