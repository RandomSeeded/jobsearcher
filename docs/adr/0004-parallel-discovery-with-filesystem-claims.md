# 0004 — Parallel discovery with filesystem claims

Discovery agents run concurrently again; duplicate companies are prevented by an atomic filesystem claim rather than by serialization.

**Decision:** The `discover-jobs` orchestrator spawns all `count` agents in a single parallel wave (no top-up loop, no `2 × count` cap). Before persisting or backfilling, each agent computes a deterministic slug (`scripts/slugify.sh`, aggressive — trailing corporate/AI suffixes stripped) and atomically claims it via `mkdir data/run/{run_id}/claims/{slug}` (`scripts/claim.sh`). `mkdir` is atomic, so exactly one agent wins a contested slug; losers skip and search again. The discovery budget becomes a *soft* target — agents relax their quality bar past it and only give up at a `3 × max_discovery_searches` hard ceiling — so a single wave reliably lands ≈ `count`. The filesystem-truth manifest from ADR 0003 is retained unchanged.

**Rationale:** ADR 0003's accepted cost ("~N× wall-clock latency, acceptable for a background run") was wrong. Serial agents summed to >30 min and tripped the orchestrator's hard timeout (`discover-queue.ts`), which SIGTERM'd the run mid-agent — a `count=6` run was killed with its last agent one minute in, landing fewer than `count` *and* wasting the credits already spent. Parallelism restores wall-clock ≈ one agent's duration. The race that 0003 avoided is real but narrow (two agents picking the same company before either writes its YAML); an atomic `mkdir` closes it without any orchestrator-side coordination.

**Why the rejected alternative is now chosen:** ADR 0003 rejected atomic file-claims because they "depend on LLM agents reliably following a multi-step protocol." We accept that risk now because (a) the claim is a single deterministic shell call, not a multi-step judgment, and (b) the filesystem-truth manifest already tolerates partial-protocol failures — a stranded backfilled YAML is salvaged, and an unclaimed slot simply lands `count − 1` rather than corrupting the count. The downside is bounded and honest; the serial timeout was neither.

**Rejected alternatives:**
- *Keep sequential, just raise the 30-min timeout.* Trades a hard failure for an unbounded-latency background job; does nothing about the wasted-credits-on-kill problem and scales worse with `count`.
- *Wave + sequential top-up to guarantee exactly `count`.* Re-introduces serial latency for the shortfall and extra coordination; the soft-cap mandate makes a single wave hit `count` often enough that strict exactness isn't worth it.

**Cost accepted:** `count` isn't strictly guaranteed — a struck-out or truncated agent yields `count − 1`. Aggressive slugify can in principle false-merge two distinct companies that share a root name after suffix stripping (e.g. `Sierra AI` / `Sierra Labs` → `sierra`); the denylist is kept minimal to bound this.
