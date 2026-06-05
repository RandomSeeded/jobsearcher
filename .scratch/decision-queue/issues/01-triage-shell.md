Status: done

# Triage shell — two-pane layout + detail display

## What to build

Replace the `Triage` placeholder component with a working two-pane layout. Left pane lists all contenders whose `vote` is absent (NYR) at session load. Right pane shows full detail for the selected company — all fields, full notes prose, link, recruiter_type, contact, last_outreach, notion_url, stars for quality. First NYR company is selected by default.

No voting, skipping, or session tracking yet — just layout and display.

## Acceptance criteria

- [ ] `/triage` renders two-pane layout (list left, detail right)
- [ ] List contains only NYR (absent vote) contenders fetched from `/api/companies`
- [ ] Clicking a list item populates the detail pane
- [ ] Detail pane shows all Company fields; empty fields omitted or shown as `—`
- [ ] First NYR company is auto-selected on load
- [ ] Back link to `/` (browser) present

## Blocked by

None — can start immediately
