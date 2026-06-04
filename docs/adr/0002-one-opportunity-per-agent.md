# 0002 — One opportunity per agent

Each discovery agent is responsible for finding exactly one opportunity per run, rather than surfacing K candidates and picking the strongest.

**Decision:** Agents search until they find one non-duplicate company that meets their criteria, backfill it, and promote it directly. No candidate pool, no comparative selection step.

**Rationale:** The pool of relevant undiscovered companies in SFBA is ~1000+. With a pool this large, inter-agent deduplication waste is negligible (<8% at N=15), and a well-targeted search reliably surfaces a good match on the first or second attempt. The marginal quality gain from comparing K candidates before promoting does not justify the added complexity (K×backfill searches, selection logic, pool management). A max-retry bound (default 5) handles the rare case where the first find is a duplicate or below quality threshold.

**Rejected alternative:** Surface K=5 candidates per agent, pick the strongest, move the rest to `/data/candidates/`. This adds selection quality at the cost of 5× more candidate searches per agent and more complex agent logic. Revisit if empirical run quality is poor.
