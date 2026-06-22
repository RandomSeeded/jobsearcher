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

For each search (up to `max_discovery_searches`), log the query, run WebSearch, then log all outcomes in one Bash call:

```bash
LOG="data/run/{run_id}/{agent_id}/run.log"
{
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] search N/max: \"<query>\""
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] skip duplicate: <company>"   # repeat per skip
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] found candidate: <company> (matches: <signals>)"
} >> "$LOG"
```

Skip criteria (check in order):
a. **Duplicate** — already in `/data/candidates/`, `/data/opportunities/`, or `/data/run/{run_id}/*/`
b. **Negative signal match** — matches any negative preference signal
c. **Accept** — passes all checks; stop searching

If `max_discovery_searches` exhausted:
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
