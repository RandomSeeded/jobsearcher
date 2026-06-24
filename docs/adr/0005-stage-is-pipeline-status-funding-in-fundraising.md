# 5. `stage` is pipeline status; funding rounds live in `fundraising`

## Context

The `stage` field had been populated with two unrelated kinds of value: the
user's application **pipeline status** (`Outreach`, `OFFER`, `Rejected me`, …)
and the company's **funding round** (`Series B`, `Seed`, …). The card's
green/red border keys off `stage`, so the conflation made the border meaningless
for funding-stage rows. CONTEXT.md already defines `Stage` as pipeline status
only, and a separate `Fundraising` field already exists for funding — every one
of the 28 polluted rows already had its round captured (more completely) in
`fundraising`.

## Decision

Keep `stage` as the single pipeline-status field (the documented 14-value
vocabulary) and make it editable via a dropdown in the company detail pane.
Delete the redundant funding-round values from `stage` in the data; funding
already lives in `fundraising`. The border accent reads `stage`.

## Rejected alternative

Adding a new `status` field for pipeline state while leaving funding rounds in
`stage`. Rejected: it duplicates the purpose of the existing `Fundraising`
field, contradicts the documented meaning of `stage`, and would force every
discovery/backfill agent to learn a third overlapping field. Aligning to the
existing model deletes no real information (funding is preserved in
`fundraising`) and keeps the schema the agents already target.
