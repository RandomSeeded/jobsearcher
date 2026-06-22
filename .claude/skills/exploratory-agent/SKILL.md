---
name: exploratory-agent
description: Discovery agent that finds one opportunity from top-tier investor portfolios, specifically targeting companies outside the user's known preference space. Used internally by discover-jobs.
---

# exploratory-agent

Find one opportunity from elite investor portfolios that sits outside the user's known preference space. Promote it to `/data/opportunities/`.

## Arguments

```
/exploratory-agent run_id=<uuid> agent_id=<label> [max_discovery_searches=5] [max_backfill_searches=3]
```

## Logging

Append directly to the run log. Batch multiple lines into one Bash call to minimise turn count:

```bash
LOG="data/run/{run_id}/{agent_id}/run.log"
{
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] message one"
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] message two"
} >> "$LOG"
```

Never write one line per Bash call — each Bash call is a full turn.

## Investor tiers

**Tier 1 (prefer):** Sequoia, a16z, Benchmark, Founders Fund

**Tier 2 (include if strong):** Khosla Ventures, General Catalyst, Accel, Lightspeed — only with multiple strong signals.

## Workflow

### 1. Setup + load preferences

```bash
LOG="data/run/{run_id}/{agent_id}/run.log"
mkdir -p "data/run/{run_id}/{agent_id}"
{
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] starting exploratory-agent"
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] loaded preferences: avoiding N positive signals, M high-confidence negatives"
} >> "$LOG"
```

Read `/data/preferences.md`. Extract positive signals (must avoid) and negative signals with confidence ≥ 0.80 (must avoid).

### 2. Search and evaluate

For each search (up to `max_discovery_searches`): log query, run WebSearch, log all outcomes in one Bash call:

```bash
LOG="data/run/{run_id}/{agent_id}/run.log"
{
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] search N/max: \"<query>\""
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] skip duplicate: <company>"        # per duplicate
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] skip weak investor: <company>"    # per weak investor
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] skip preference match: <company>" # per preference hit
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] found candidate: <company> (investor: <investor>)"
} >> "$LOG"
```

Skip criteria (check in order):
a. **Duplicate** — already in `/data/candidates/`, `/data/opportunities/`, or `/data/run/{run_id}/*/`
b. **Weak investor** — lacks Tier 1 or qualifying Tier 2 backing
c. **Positive preference match** — matches ANY known positive preference signal
d. **High-confidence negative** — matches any negative signal with confidence ≥ 0.80
e. **Accept** — passes all checks; stop searching

If `max_discovery_searches` exhausted:
```bash
echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] exhausted search budget — no candidate found" >> "$LOG"
```
Return empty string and exit.

### 3. Persist candidate

```bash
make persist-company \
  DEST_DIR="data/run/{run_id}/{agent_id}" \
  SLUG="<slug>" \
  COMPANY="<company name>"
```

Overwrite skeleton with known field values using the Write tool.

```bash
echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] persisted: <slug>.yaml" >> "data/run/{run_id}/{agent_id}/run.log"
```

### 4. Backfill

```
/backfill data/run/{run_id}/{agent_id}/{slug}.yaml {max_backfill_searches}
```

### 5. Promote + shelve + log (one Bash call)

```bash
LOG="data/run/{run_id}/{agent_id}/run.log"
make promote RUN_DIR="data/run/{run_id}/{agent_id}" SLUG="<slug>" && \
make shelve RUN_DIR="data/run/{run_id}/{agent_id}" && \
{
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] promoted: {slug} → data/opportunities/"
  echo "[$(date -u +%FT%TZ)] [{run_id}/{agent_id}] shelved remaining candidates"
} >> "$LOG"
```

### 6. Return

Return the promoted slug.

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
