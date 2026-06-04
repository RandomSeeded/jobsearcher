# Job Hunt — Domain Glossary

## Company Quality
A 1–5 rating assigned by an LLM. Judges a company on three axes: founder quality, investor quality, and growth trajectory. Not a subjective personal preference (that is `vote`) — an attempt at an objective signal about the company's caliber.

## Vote
The user's personal preference for a company. One of: `love`, `like`, `neutral`, `not_sure_yet`, `dislike`, or absent (not yet rated / NYR). `neutral` = aware but unexcited. `not_sure_yet` = needs more research before deciding. Absent = never evaluated. Distinct from [[Company Quality]].

## AI Category
A freeform string classifying where a company sits in the AI stack. Known values: `none`, `ai application layer`, `ai tooling layer`, `ai data layer`, `ai model companies`. Not a strict enum — new values can be added as the landscape evolves.

## Preference Profile
A derived summary of the user's tastes inferred from their [[Vote]] history. Currently computed at runtime from love/like companies (weighted: love=2, like=1) across [[AI Category]], location, and employee count. Will be persisted in a future iteration.

## Decision Queue
A focused UI for evaluating unrated contenders. Contains all companies whose [[Vote]] is absent (NYR) at session start. Skipping a company sets its vote to `not_sure_yet`, removing it from future queues. Companies voted on during a session remain visible in the queue list for that session so the user can revise decisions, but pre-existing votes are never surfaced. Session state is client-side only.

## Fundraising
A freeform string capturing a company's funding status — either total raised, latest round size, valuation, or a combination (e.g. `$80M Series A at $800M val`). Optional; populate when known. Not duplicated from `notes` — if the value is only buried in prose, leave this null and surface it here when it becomes a comparison signal.

## Stage
The current status of the user's job application process with a company. One of: `Outreach`, `Recruiter Call`, `Hiring Manager Interview`, `Technical Interview`, `System Design`, `Takehome`, `ONSITE`, `OFFER`, `Rejected Offer`, `Rejected me`, `Rejected them`, `On Hold`, `BLOCKED ME`, `BLOCKED THEM`. Null means no active process. Fundraising stage (e.g. "Series B") belongs in `notes`, not here.
