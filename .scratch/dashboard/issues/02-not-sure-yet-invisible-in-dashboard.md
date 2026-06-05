# not_sure_yet companies invisible in dashboard

Status: done
Category: bug

## Root cause

`Dashboard.tsx` buckets companies into three groups:

```ts
const loved       = companies.filter(c => c.vote === 'love' || c.vote === 'like')
const disliked    = companies.filter(c => c.vote === 'dislike' || c.vote === 'neutral')
const uncategorized = companies.filter(c => !c.vote)
```

Companies with `vote === 'not_sure_yet'` match none of these (truthy vote, not love/like,
not dislike/neutral). They are silently dropped — not rendered in any section.

## What to build

Add `not_sure_yet` companies to the dashboard. Either:
- Merge them into the "Uncategorized" bucket (simplest — they haven't been decided), OR
- Give them their own "Not sure yet" section

Recommended: merge into Uncategorized (rename to "Needs review" or keep as-is). They're
undecided companies; showing them alongside unvoted ones is correct semantics.

## Acceptance criteria

- [ ] Every company returned by `GET /api/companies` appears in exactly one dashboard section
- [ ] Companies with `vote === 'not_sure_yet'` are visible in the dashboard
- [ ] No existing section loses any companies it previously showed

## Blocked by

None
