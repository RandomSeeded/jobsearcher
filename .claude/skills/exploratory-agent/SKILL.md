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

`max_discovery_searches` (default 5) is a **soft target, not a hard stop**. Aim to claim
a company within that many searches. If you cross it with nothing claimed, stop
gold-plating — **relax your bar** (accept qualifying Tier 2 backing, looser matches) and
keep going. Only give up at the **hard ceiling of `3 × max_discovery_searches`** searches.
You are one slot in a parallel run; the run needs your slot filled, so returning empty
is a last resort.

For each search: log query, run WebSearch, log all outcomes in one Bash call:

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
a. **Duplicate** — already in `/data/candidates/`, `/data/opportunities/`, or `/data/run/{run_id}/*/` (cheap pre-filter)
b. **Weak investor** — lacks Tier 1 or qualifying Tier 2 backing
c. **Positive preference match** — matches ANY known positive preference signal
d. **High-confidence negative** — matches any negative signal with confidence ≥ 0.80
e. **Accept** — passes all checks

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
