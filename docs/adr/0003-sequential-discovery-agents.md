# 0003 — Sequential discovery agents

Discovery agents run one at a time, not in parallel.

**Decision:** The `discover-jobs` orchestrator runs each agent sequentially, looping until `count` new opportunities land in `/data/opportunities/` or a `2 × count` attempt cap is hit. The manifest is derived from a filesystem diff (opportunities added since a run-start snapshot), not from agent return values. Stranded but backfilled YAMLs are salvaged before counting.

**Rationale:** ADR 0002 assumed inter-agent duplication was negligible (<8%) because the company pool is large. In practice parallel agents converge on the same "hot" companies — they run near-identical high-signal searches rather than sampling the pool uniformly — so a `count=5` run routinely yielded 3 unique. The agent dedup check already reads `/data/opportunities/`; running serially makes that check effective (agent K sees what agents 1…K-1 promoted), eliminating collisions with zero coordination machinery. Deriving the manifest from the filesystem fixes a parallel cousin bug where an agent that returned a slug but never completed its promote inflated the count above what triage could surface.

**Rejected alternatives:**
- *Keep parallel + atomic file-claim / partitioned search / wave + sequential top-up.* All add coordination complexity to claw back the uniqueness that parallelism discards, and the claim-based ones depend on LLM agents reliably following a multi-step protocol — the same discipline whose failure (a skipped promote) caused the original bug.
- *Trust agent return values for the manifest.* This is the status quo that produced "found N, surfaced fewer."

**Cost accepted:** ~N× wall-clock latency. Acceptable for a background run that already takes minutes, and typically cheaper on credits than parallel (no wasted colliding agents).
