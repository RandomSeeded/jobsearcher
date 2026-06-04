---
name: distill-preferences
description: Synthesizes a preference profile from voted company YAMLs and writes it to /data/preferences.md. Produces two lists — Likes and Dislikes — each entry atomic and confidence-scored (0.0–1.0). Use when the user invokes /distill-preferences or wants to regenerate their preference profile before running /discover-jobs.
---

# distill-preferences

Reads all voted company YAMLs, reasons over the full content of each, and writes a confidence-weighted preference profile to `/data/preferences.md`.

## Workflow

### 1. Load and bucket companies

Read all `/data/contenders/*.yaml` and `/data/raw/*.yaml` files. If the same company slug appears in both directories, use the contenders/ copy (it's more likely to have updated vote/fields). Split by `vote`:

| Bucket | Vote values |
|--------|-------------|
| **Liked** | `love`, `like` |
| **Disliked** | `dislike` |
| **Neutral** | `neutral` |
| Excluded | `not_sure_yet`, absent |

### 2. Synthesize preferences

Reason over all fields for each company — `company`, `terse`, `notes`, `details`, `ai_category`, `stage`, `location`, `employees`, `company_quality`, `vote`.

Produce two lists: **Likes** and **Dislikes**. Rules:

- Each entry must be **atomic and independently actionable** — answerable as "does company X have this trait?" If a signal bundles multiple dimensions, split it.
- Assign each entry a **confidence score 0.0–1.0**. Be expansive — uncertain signals and small-sample signals still belong, just with lower confidence.
- **Balancing**: if a trait appears in both liked and disliked companies, net the signal. Do not list it in both — assign it to whichever direction dominates, with reduced confidence proportional to the conflict. If perfectly balanced, omit.
- **Neutral as suppressor**: consistent neutrality on a trait across neutral-bucket companies suppresses confidence for any like/dislike entry that touches that trait.

### 3. Write output

Overwrite `/data/preferences.md`:

```markdown
# Preference Profile
_Generated {YYYY-MM-DD} from {N} liked, {M} disliked, {K} neutral companies._

## Likes
- **{short label}**: {atomic signal} (confidence: {0.0–1.0})

## Dislikes
- **{short label}**: {atomic signal} (confidence: {0.0–1.0})
```

Sort each list by confidence descending.

`short label` is a 2–5 word noun phrase suitable for a UI tag — no sentence fragments, no trailing punctuation. Example: "AI tooling layer", "Tier-1 investors", "Developer-facing products".
