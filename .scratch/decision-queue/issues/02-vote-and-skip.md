Status: ready-for-agent

# Vote & skip flow

## What to build

Wire up voting and skipping in the decision queue detail pane. Clicking a vote button PATCHes the company via `/api/companies/:name` with the chosen vote value. Clicking skip PATCHes the company with `vote: not_sure_yet`. After either action, the queue auto-advances: the selected company moves to "voted this session" and the next NYR company is selected.

Session tracking: companies voted on during this session remain visible in the left list (so the user can go back and revise), but companies that already had a vote before the session loaded are never shown.

## Acceptance criteria

- [ ] Detail pane has vote buttons for all 5 vote values (love/like/neutral/not_sure_yet/dislike) and a skip button
- [ ] Voting PATCHes the correct vote to the API and updates local state
- [ ] Skip PATCHes `vote: not_sure_yet` to the API
- [ ] After vote or skip, focus auto-advances to the next NYR company in the list
- [ ] Session-voted companies remain in the list with their vote shown; selecting them shows their detail
- [ ] Pre-session-voted companies are never shown in the list

## Blocked by

- `.scratch/decision-queue/issues/01-triage-shell.md`
