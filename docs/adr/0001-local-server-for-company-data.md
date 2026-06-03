# 0001 — Local server for company data

The UI needs to read and write company YAML files. Two options existed: convert YAMLs to JSON at build time (read-only), or run a thin local server that serves and mutates files at runtime.

**Decision:** thin local Express server (`GET /companies`, `PATCH /companies/:name`).

**Rationale:** the company browser has vote buttons in the detail drawer. A read-only UI where those buttons don't persist is misleading. A ~20-line server makes the UI fully functional with no meaningful operational cost for a single-user local tool.

**Rejected:** build-time YAML→JSON conversion. Would require a CLI round-trip (running the `vote-jobs` skill) to change a vote, splitting the interaction across two surfaces.
