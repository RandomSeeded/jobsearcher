Status: done

# Progress indicator & done state

## What to build

Add a live progress count to the list pane header showing how many NYR companies remain. When the last NYR company is voted on or skipped, replace the detail pane with a "done" state.

## Acceptance criteria

- [ ] List pane header shows "X of Y remaining" where X = NYR companies left, Y = NYR companies at session start
- [ ] Count updates immediately after each vote or skip
- [ ] When queue is exhausted, detail pane shows a done message: "All caught up. X companies decided this session."
- [ ] Done state includes a link back to `/` (the browser)

## Blocked by

- `.scratch/decision-queue/issues/02-vote-and-skip.md`
