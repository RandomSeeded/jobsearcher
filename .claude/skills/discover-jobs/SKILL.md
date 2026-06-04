---
name: discover-jobs
description: Discovers new job opportunities by searching the web for companies the user may find interesting, collecting preference votes (dislike/like/love), and persisting results to /data/*.yaml. Use when user invokes /discover-jobs or wants to find new companies to consider joining.
---

# discover-jobs

One round of job discovery: search → present top 5 + bench → persist all.

## Folder layout

- `/data/contenders/` — top 5 selected companies, active voting pipeline
- `/data/raw/` — all other well-researched companies from searches (bench)

## Workflow

### 1. Load preference profile
Read `/data/preferences.md`. If the file does not exist, stop immediately and tell the user:

> `/data/preferences.md` not found — run `/distill-preferences` first, then retry.

Do not attempt to infer preferences inline.

### 2. Run parallel searches via fan-out
Use the `fan-out` skill to run **3 searches** in parallel:
- **2 exploit:** target known preference signals
- **1 explore:** surface companies with elite investor signal, unconstrained by category, size, or location

  The explore agent must search specifically for portfolio companies of top-tier investors. Use this tiered list:
  - **Tier 1 (prefer):** Sequoia, a16z, Benchmark, Founders Fund
  - **Tier 2 (include if strong):** Khosla Ventures, General Catalyst, Accel, Lightspeed

  Prefer Tier 1 portfolio companies. Include Tier 2 only if the company has multiple strong signals: Tier 2 investor + exceptional traction, or two Tier 2 investors. No constraint on AI category, location, stage, or size — the goal is to surface companies you'd never have considered that have elite backing.

Keep the count low — each agent is expensive. Queries should improve each run as preference signal accumulates, but never collapse entirely to confirmation — always include a genuine unknown.

Spawn each subagent with **`model: "haiku"`** — these are extraction tasks, not reasoning tasks.

Each subagent must:
1. Search the web for companies matching the query
2. For each well-researched company found, **write a `/data/raw/<slug>.yaml` file directly** (see schema below) — skip companies already in `/data/contenders/` or `/data/raw/`
3. **Return only a list of filenames written** — no prose summaries, no citations in the response body

This keeps subagent result payloads tiny and avoids dumping research into the conversation context.

### 3. Select top 5
Read the newly written `/data/raw/` files (identified by the filenames each subagent returned). From the deduplicated pool pick:
- **3 exploit:** best matches to known preferences
- **2 explore:** most interesting unknowns

Use the structured fields (`company_quality`, `ai_category`, `employees`, `location`, `terse`, `notes`) for selection — not `details`.

### 4. Present top 5
Write a rich-text summary for the selected 5 before promoting:

```
**N. Company Name** — {ai_category} | ~{employees} employees | {location}
Funding: {funding summary}
What they do: {terse}
Why surfaced: {one line — what preference signal or unknown territory}
Quality: {X}/5
```

### 5. Promote top 5 to contenders
Move the 5 selected files from `/data/raw/` to `/data/contenders/`. All other files written by subagents remain in `/data/raw/` as bench.

If running interactively, suggest the user run `/vote-jobs` to rate the new contenders. If running non-interactively (stdin is not a TTY / invoked via `-p`), skip any prompting and exit immediately after promoting — do not wait for user input.

### 6. Write discovery manifest

After promoting, write `/data/discover-manifest.json` with the list of slugs that were promoted:

```json
{ "promoted": ["slug1", "slug2", "slug3", "slug4", "slug5"] }
```

Slugs are filenames without the `.yaml` extension. This file is read by the server to determine what was discovered. Always overwrite it — runs are serial and there is no concurrent access.

---

## YAML schema (for subagents writing `/data/raw/<slug>.yaml`)

```yaml
company: "Name"
terse: "..."         # ≤5 words: what the company does (e.g. "fast inference API for LLMs")
role: null
stage: null
location: "..."
employees: "..."
compensation: null
excitement: null
company_quality: X   # 1-5: founder quality, investor quality, growth trajectory
recruiter_type: null
contact: null
link: "https://..."
last_outreach: null
notes: >
  Funding round, key investors, product in one sentence, why surfaced.
details: >
  Rich summary: founding story, product depth, business model, team background,
  tech stack, growth trajectory, competitive landscape, any red flags.
  NOT used as search context — for human reading only.
vote: null
ai_category: "..."   # none | ai application layer | ai tooling layer | ai data layer | ai infrastructure | ai model companies
```

`details` is write-once-and-append: if the file already exists, preserve existing content and append new findings below a `---` separator with the date.
