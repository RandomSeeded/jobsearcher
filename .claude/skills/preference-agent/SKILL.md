---
name: preference-agent
description: Discovery agent that finds one opportunity matching the user's known preference signals. Used internally by discover-jobs. Each invocation finds and promotes exactly one company.
---

# preference-agent

Find one opportunity that matches the user's preference profile. Promote it to `/data/opportunities/`. Shelve any other companies found along the way to `/data/candidates/`.

## Arguments

```
/preference-agent run_id=<uuid> agent_id=<label> [max_discovery_searches=5] [max_backfill_searches=3]
```

- `run_id` — UUID for this discover-jobs run (e.g. `a3f9b2c1-...`)
- `agent_id` — label for this agent (e.g. `preference-1`, `preference-2`)
- `max_discovery_searches` — max searches to find a valid candidate (default: 5)
- `max_backfill_searches` — max searches passed to `/backfill` (default: 3)

## Logging

Write logs by appending directly to the run log file. Batch multiple log lines into a single Bash call wherever possible to minimise turn count:

```bash
LOG="data/run/{run_id}/{agent_id}/run.log"
{
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] message one"
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] message two"
} >> "$LOG"
```

Never call `make log` once per line — it costs a full turn each time. Batch at natural checkpoints: setup, post-search, post-persist, post-promote.

## Workflow

### 1. Setup + load preferences

Create the working directory, then read `/data/preferences.md`. Extract positive signals (weighted by confidence) and negative signals. Batch both log lines into one Bash call:

```bash
LOG="data/run/{run_id}/{agent_id}/run.log"
mkdir -p "data/run/{run_id}/{agent_id}"
{
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] starting preference-agent"
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] loaded preferences: N likes, M dislikes"
} >> "$LOG"
```

### 2. Search and evaluate

`max_discovery_searches` (default 5) is a **soft target, not a hard stop**. Aim to
claim a company within that many searches. If you cross it with nothing claimed, stop
gold-plating — **relax your bar** (accept lower `company_quality`, looser matches) and
keep going. Only give up at the **hard ceiling of `3 × max_discovery_searches`** searches.
You are one slot in a parallel run; the run needs your slot filled, so returning empty
is a last resort.

For each search, log the query, run WebSearch, then log all outcomes in one Bash call:

```bash
LOG="data/run/{run_id}/{agent_id}/run.log"
{
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] search N/max: \"<query>\""
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] skip duplicate: <company>"   # repeat per skip
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] found candidate: <company> (matches: <signals>)"
} >> "$LOG"
```

Skip criteria (check in order):
a. **Duplicate** — already in `/data/candidates/`, `/data/opportunities/`, or `/data/run/{run_id}/*/` (cheap pre-filter)
b. **Negative signal match** — matches any negative preference signal
c. **Accept** — passes all checks

On **accept**, atomically claim the company *before* persisting or backfilling — other
agents search the same space in parallel, and this claim is the only thing that stops
two of them promoting the same company. Derive the slug with `slugify.sh` so every
agent computes the identical slug for a given name:

```bash
LOG="data/run/{run_id}/{agent_id}/run.log"
slug="$(scripts/slugify.sh "<company name>")"
if scripts/claim.sh "data/run/{run_id}/claims" "$slug"; then
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] claimed: $slug — proceeding" >> "$LOG"
  # won the claim → continue to step 3 using this $slug everywhere downstream
else
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] skip claimed: $slug (another agent won it)" >> "$LOG"
  # lost the claim → do NOT persist/backfill; keep searching for a different company
fi
```

Use the `slug` from `slugify.sh` as the `SLUG` in every downstream step (persist,
backfill, promote) so it matches the claim.

If you reach the hard ceiling with nothing claimed (rare):
```bash
echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] exhausted search budget — no candidate found" >> "$LOG"
```
Return empty string and exit.

### 3. Persist candidate to working dir

```bash
make persist-company \
  DEST_DIR="data/run/{run_id}/{agent_id}" \
  SLUG="<slug>" \
  COMPANY="<company name>"
```

Then overwrite the skeleton with all known field values using the Write tool. Log in the same Bash call as the next operation where possible.

### 5. Backfill

```
/backfill data/run/{run_id}/{agent_id}/{slug}.yaml {max_backfill_searches}
```

### 6. Promote + shelve + log (one Bash call)

```bash
LOG="data/run/{run_id}/{agent_id}/run.log"
make promote RUN_DIR="data/run/{run_id}/{agent_id}" SLUG="<slug>" && \
make shelve RUN_DIR="data/run/{run_id}/{agent_id}" && \
{
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] promoted: {slug} → data/opportunities/"
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] shelved remaining candidates"
} >> "$LOG"
```

### 8. Return

Return the promoted slug (filename without `.yaml`).

## YAML schema

```yaml
company: "Name"
terse: "..."         # ≤5 words: what the company does
role: null
stage: null
location: "..."
employees: "..."
compensation: null
excitement: null
company_quality: X   # 1–5: founder quality, investor quality, growth trajectory
recruiter_type: null
contact: null
link: "https://..."
last_outreach: null
notes: >
  Funding round, key investors, product in one sentence, why surfaced.
details: >
  Rich summary: founding story, product depth, business model, team background,
  tech stack, growth trajectory, competitive landscape, any red flags.
vote: null
ai_category: "..."   # none | ai application layer | ai tooling layer | ai data layer | ai infrastructure | ai model companies
fundraising: null    # e.g. "$80M Series A at $800M val"
```
