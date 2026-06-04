---
name: vote-jobs
description: Presents unvoted companies from /data/contenders/*.yaml and collects preference votes (dislike/neutral/like/love/not_sure_yet), updating each file in place. "not_sure_yet" persists the vote so companies don't re-queue — prompts for reason if not given. Use when user invokes /vote-jobs or wants to rate companies that haven't been voted on yet.
---

# vote-jobs

Collect votes on any companies in `/data/contenders/` with `vote: null`.

## Vote values

| Value | Meaning |
|---|---|
| `dislike` | Not interested |
| `neutral` | No strong feelings either way |
| `like` | Interested |
| `love` | Very excited |
| `not_sure_yet` | Need more info before deciding — will NOT re-appear automatically |

## Workflow

### 1. Find unvoted companies
Read all `/data/contenders/*.yaml` files. Collect those where `vote: null`.

If none found, tell the user and stop.

### 2. Present unvoted companies
Write a summary for each:

```
**N. Company Name** — {ai_category} | ~{employees} employees | {location}
What they do: {terse}
Quality: {company_quality}/5
```

### 3. Collect votes
Batch into groups of 4 for `AskUserQuestion`. Each question: company name as header, options `dislike / neutral / like / love / not sure yet`.

### 4. Follow up on "not sure yet" votes
For each company the user voted "not sure yet":
- If the user already gave a reason in notes or the Other text field, skip this step for that company.
- Otherwise, use `AskUserQuestion` to ask: "What's making you unsure about {Company}?" with options like "Need to research them more", "Unclear role fit", "Waiting to hear back from them", "Other" — and save their answer as context.

### 5. Update files
For each company:
- If the user selected a defined vote option: write that value to `vote:` in `/data/contenders/<slug>.yaml`
- If the user voted "not sure yet": write `vote: not_sure_yet` and append their reason (if any) to the `notes:` field with a `Not sure yet:` prefix. These companies will NOT re-appear in future `/vote-jobs` sessions unless the user explicitly runs `/discover-jobs` or resets the vote.
