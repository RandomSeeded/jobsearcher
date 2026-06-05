# Revote from company detail pane (Triage)

Status: done
Category: bug

## What to build

In `Triage.tsx`, the `DetailPane` component hides vote buttons when `alreadyVoted` is true
(the company was voted before the session loaded). A user viewing a session-voted company
or navigating back to a previously-voted company has no way to change their vote.

Replace the "Voted: emoji vote" read-only display with full vote buttons that also show the
current vote as selected/highlighted — identical UX to `CompanyDetailPane.tsx`. Keyboard
shortcuts (1–5, S) should still only fire on NYR companies to avoid accidental revotes.

## Acceptance criteria

- [ ] Detail pane always shows all five vote buttons, regardless of whether the company already has a vote
- [ ] Current vote is highlighted (matches existing selected-button style)
- [ ] Clicking a vote button on an already-voted company PATCHes the new vote and updates local state
- [ ] Keyboard shortcuts 1–5 still only fire when the selected company has no prior vote (NYR guard unchanged)
- [ ] "Voted: …" read-only display is removed

## Blocked by

None
