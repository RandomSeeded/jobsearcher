---
name: backfill
description: Fills in missing fields on a company YAML file via targeted web searches. Use when a company file has null fields that should be populated before promotion.
---

# backfill

Fill in missing fields on a company YAML via web searches, then write the result back to disk.

## Arguments

```
/backfill <path-to-yaml> [max_searches=3]
```

- `path-to-yaml` — absolute or repo-relative path to the company YAML file
- `max_searches` — maximum web searches to perform (default: 3)

## Workflow

### 1. Read the file

Read the YAML at the given path. Identify which of the following fields are null or missing:

- `terse` — ≤5 words: what the company does
- `location` — city, state/country
- `employees` — headcount or range (e.g. "50–200")
- `company_quality` — 1–5 score (founder quality, investor quality, growth trajectory)
- `link` — company homepage URL
- `notes` — funding round, key investors, product, why surfaced (1 sentence)
- `details` — rich summary: founding story, product depth, business model, team, tech, growth, competitors
- `ai_category` — one of: `none`, `ai application layer`, `ai tooling layer`, `ai data layer`, `ai infrastructure`, `ai model companies`
- `fundraising` — funding status string (e.g. `$80M Series A at $800M val`)

If all fields are populated, log `[backfill] <path>: all fields present, nothing to do` and return the path immediately.

### 2. Plan searches

Before searching, decide which fields to target and draft 1–3 search queries that will cover the most gaps. Prioritise:
1. A general company search (covers most fields at once)
2. A funding/investor-specific search if `fundraising`, `notes`, or `company_quality` are missing
3. A team/founder search if `details` needs depth

Log each planned query as: `[backfill] <path>: will search "<query>"`

### 3. Search and fill

Run each planned query (up to `max_searches` total). After each search:
- Extract values for any null fields from the results
- Log findings: `[backfill] <path>: found <field>=<value>`
- Stop early if all target fields are now filled

### 4. Write the updated file

Once searches are exhausted or all fields filled, write the updated YAML back using:

```bash
make persist-company \
  DEST_DIR="<directory of the file>" \
  SLUG="<filename without .yaml>" \
  COMPANY="<company name>"
```

Then immediately patch the written skeleton with the actual field values by overwriting the file with the complete YAML content using the Write tool.

Log: `[backfill] <path>: wrote updated file`

### 5. Return

Return the path to the updated file.

## Notes

- `details` is write-once-and-append: if the field already has content, preserve it and append new findings below a `---` separator with today's date.
- Do not fabricate values — only write what you found in search results.
- If a field genuinely cannot be found after searching, leave it null.
