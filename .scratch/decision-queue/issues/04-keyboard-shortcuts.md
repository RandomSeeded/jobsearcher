Status: done

# Keyboard shortcuts

## What to build

Add keyboard shortcuts to the decision queue. Keys 1–5 trigger votes in order (1=love, 2=like, 3=neutral, 4=not_sure_yet, 5=dislike). Key S triggers skip. Each vote button and the skip button should display its binding.

Shortcuts should be inactive when the queue is exhausted (done state) or when no company is selected.

## Acceptance criteria

- [ ] Keys 1–5 trigger the corresponding vote action on the currently selected company
- [ ] Key S triggers skip on the currently selected company
- [ ] Each button label shows its key binding (e.g. "❤️ love [1]", "Skip [S]")
- [ ] Shortcuts do nothing when the queue is exhausted or no company is selected

## Blocked by

- `.scratch/decision-queue/issues/02-vote-and-skip.md`
