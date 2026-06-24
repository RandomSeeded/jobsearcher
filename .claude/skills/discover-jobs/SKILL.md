---
name: discover-jobs
description: Discovers new job opportunities by searching the web for companies the user may find interesting, collecting preference votes (dislike/like/love), and persisting results to /data/*.yaml. Use when user invokes /discover-jobs or wants to find new companies to consider joining.
---

# discover-jobs

Orchestrate discovery agents **in parallel** to find N new opportunities. Each agent finds exactly one company, backfills it, and promotes it to `/data/opportunities/`. Agents run concurrently in a single wave; they avoid picking the same company by **atomically claiming** it on the filesystem (`scripts/claim.sh`) before doing any expensive work — the first agent to claim a slug wins, the rest move on.

## Folder layout

- `/data/opportunities/` — promoted companies ready for user voting
- `/data/candidates/` — researched companies not selected as opportunities (bench)
- `/data/run/{run_id}/{agent_id}/` — agent working directories (persist indefinitely for audit)
- `/data/run/{run_id}/claims/{slug}/` — atomic claim markers; first agent to `mkdir` a slug owns it (empty dirs, kept for audit)

## Arguments

```
/discover-jobs [count=5] [max_discovery_searches=5] [max_backfill_searches=3]
```

- `count` — number of opportunities to find (= number of agents spawned, default: 5)
- `max_discovery_searches` — per-agent search budget for finding a candidate (default: 5)
- `max_backfill_searches` — per-agent search budget for backfilling (default: 3)

## Workflow

### 1. Load preference profile

Read `/data/preferences.md`. If the file does not exist, stop immediately:

> `/data/preferences.md` not found — run `/distill-preferences` first, then retry.

### 2. Generate run ID

```bash
python3 -c "import uuid; print(uuid.uuid4())"
```

Store as `run_id`.

### 3. Snapshot existing opportunities

Record the set of slugs already in `/data/opportunities/` before the run. This
is the baseline used to compute what *this* run actually added:

```bash
ls data/opportunities/*.yaml 2>/dev/null | xargs -n1 basename | sed 's/\.yaml$//' | sort > data/run/{run_id}/_baseline.txt
```

### 4. Compute the agent roster

```
n_explore = floor(count / 3)
n_pref    = count - n_explore
```

Build the roster of `count` agents up front: `n_pref` preference agents plus
`n_explore` exploratory agents. Assign each a unique `agent_id`
(`preference-1` … `preference-{n_pref}`, `explore-1` … `explore-{n_explore}`).
Example: count=5 → `[preference-1, preference-2, preference-3, preference-4, explore-1]`.

Each agent fills exactly one slot. There is **no top-up loop and no `2 × count`
attempt cap** — every agent is mandated to surface one company (its discovery
budget is a soft target, see the agent skills), so a single wave of `count`
agents lands ≈ `count` opportunities. If an agent genuinely strikes out or is
truncated mid-claim, the run lands `count − 1`; the manifest (step 7) reports the
honest actual.

### 5. Spawn all agents in **one parallel wave**

Issue **all `count` Agent tool calls together in a single message** (`model: "sonnet"`)
and wait for the whole batch to return. Do **not** run them one at a time.

Parallel agents would otherwise race to the same company, so dedup is enforced on
the filesystem: each agent computes a deterministic slug (`scripts/slugify.sh`) and
atomically claims it (`scripts/claim.sh "data/run/{run_id}/claims" <slug>`) before
persisting or backfilling. `mkdir` is atomic, so exactly one agent wins a contested
slug; losers skip it and search again. You (the orchestrator) do not coordinate
dedup — the claim directory does.

Each agent prompt must be **fully self-contained** — agents start cold with no
conversation history.

**Preference agent prompt template:**
```
You are a discovery agent for a job search tool.

Run: /preference-agent run_id={run_id} agent_id={agent_id} max_discovery_searches={max_discovery_searches} max_backfill_searches={max_backfill_searches}

Working directory for this run is data/run/{run_id}/{agent_id}/. Create it with mkdir -p if it doesn't exist.
```

**Exploratory agent prompt template:**
```
You are a discovery agent for a job search tool.

Run: /exploratory-agent run_id={run_id} agent_id={agent_id} max_discovery_searches={max_discovery_searches} max_backfill_searches={max_backfill_searches}

Working directory for this run is data/run/{run_id}/{agent_id}/. Create it with mkdir -p if it doesn't exist.
```

### 6. Salvage stranded YAMLs, then derive the result from the filesystem

The manifest is built from what actually landed in `/data/opportunities/`, **not**
from what agents claim to return — an agent can find + backfill a company but get
truncated before its promote step, leaving the YAML stranded in its working dir.

After the wave returns, salvage any stranded file:

```bash
# Promote any backfilled-but-unpromoted YAML the agents left behind this run.
for f in data/run/{run_id}/*/*.yaml; do
  [ -e "$f" ] || continue
  slug=$(basename "$f" .yaml)
  # validate: has a company field AND looks backfilled (details populated)
  if grep -q '^company:' "$f" && grep -Eq '^details: *[^ ]' "$f" && [ ! -f "data/opportunities/$slug.yaml" ]; then
    mv "$f" "data/opportunities/$slug.yaml"
  fi
done
```

Compute **new opportunities** = current `/data/opportunities/` slugs minus the
step-3 baseline:

```bash
ls data/opportunities/*.yaml 2>/dev/null | xargs -n1 basename | sed 's/\.yaml$//' | sort \
  | comm -13 data/run/{run_id}/_baseline.txt - > data/run/{run_id}/_new.txt
```

### 7. Write discovery manifest (from the filesystem)

Write the new slugs from `_new.txt` — never agent return values:

```bash
python3 -c "import json,sys; print(json.dumps({'promoted':[l.strip() for l in open('data/run/{run_id}/_new.txt') if l.strip()]}))" > data/discover-manifest.json
```

### 8. Finish

If running interactively (stdin is a TTY), suggest:

> Found {N} new opportunities. Run `/vote-jobs` to rate them.

If running non-interactively (invoked via `-p`), exit immediately after writing the manifest.
