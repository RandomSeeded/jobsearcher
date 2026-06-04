---
name: discover-jobs
description: Discovers new job opportunities by searching the web for companies the user may find interesting, collecting preference votes (dislike/like/love), and persisting results to /data/*.yaml. Use when user invokes /discover-jobs or wants to find new companies to consider joining.
---

# discover-jobs

Orchestrate N parallel discovery agents to find N new opportunities. Each agent finds exactly one company, backfills it, and promotes it to `/data/opportunities/`.

## Folder layout

- `/data/opportunities/` — promoted companies ready for user voting
- `/data/candidates/` — researched companies not selected as opportunities (bench)
- `/data/run/{run_id}/{agent_id}/` — agent working directories (persist indefinitely for audit)

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

### 3. Compute agent split

```
n_explore = floor(count / 3)
n_pref    = count - n_explore
```

Example: count=5 → 4 preference agents + 1 exploratory agent.

### 4. Spawn agents in parallel

Send a **single response** containing one Agent tool call per agent. All agents run in parallel with `model: "haiku"`.

Agent IDs: `preference-1`, `preference-2`, … `preference-{n_pref}`, `explore-1`, … `explore-{n_explore}`

Each agent prompt must be **fully self-contained** — include run_id, agent_id, max_discovery_searches, max_backfill_searches, and the full skill invocation. Agents start cold with no conversation history.

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

### 5. Collect results

Wait for all agents to return. Each agent returns either a promoted slug or an empty string (failure).

Collect all non-empty slugs into `promoted`.

### 6. Write discovery manifest

```bash
echo '{"promoted": ["{slug1}", "{slug2}", ...]}' > data/discover-manifest.json
```

Or construct and write the JSON via the Write tool. Always overwrite — runs are serial.

### 7. Finish

If running interactively (stdin is a TTY), suggest:

> Found {N} new opportunities. Run `/vote-jobs` to rate them.

If running non-interactively (invoked via `-p`), exit immediately after writing the manifest.
