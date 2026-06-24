# Job Hunt — Domain Glossary

## Company Quality
A 1–5 rating assigned by an LLM. Judges a company on three axes: founder quality, investor quality, and growth trajectory. Not a subjective personal preference (that is `vote`) — an attempt at an objective signal about the company's caliber.

## Vote
The user's personal preference for a company. One of: `love`, `like`, `neutral`, `not_sure_yet`, `dislike`, or absent (not yet rated / NYR). `neutral` = aware but unexcited. `not_sure_yet` = needs more research before deciding. Absent = never evaluated. Distinct from [[Company Quality]].

## AI Category
A freeform string classifying where a company sits in the AI stack. Known values: `none`, `ai application layer`, `ai tooling layer`, `ai data layer`, `ai model companies`. Not a strict enum — new values can be added as the landscape evolves.

## Preference Profile
A derived summary of the user's tastes inferred from their [[Vote]] history. Persisted in `/data/preferences.md` and generated on demand by the `distill-preferences` skill. Contains two lists — Likes and Dislikes — each entry atomic, independently actionable, and confidence-scored (0.0–1.0). Signals appearing in both liked and disliked companies are netted rather than listed in both. Neutral-voted companies suppress confidence for traits they share with either list.

## Decision Queue
A focused UI for evaluating unrated contenders. Contains all companies whose [[Vote]] is absent (NYR) at session start. Skipping a company sets its vote to `not_sure_yet`, removing it from future queues. Companies voted on during a session remain visible in the queue list for that session so the user can revise decisions, but pre-existing votes are never surfaced. Session state is client-side only.

## Fundraising
A freeform string capturing a company's funding status — either total raised, latest round size, valuation, or a combination (e.g. `$80M Series A at $800M val`). Optional; populate when known. Not duplicated from `notes` — if the value is only buried in prose, leave this null and surface it here when it becomes a comparison signal.

## Candidate
A company surfaced by a discovery agent but not yet promoted. Persisted in `/data/candidates/`. May have incomplete fields. Distinguished from [[Opportunity]] by lacking the promotion step.

## Opportunity
A company selected by a discovery agent as the strongest candidate from its run, backfilled to completeness, and promoted from `/data/run/` to `/data/opportunities/`. Ready for user [[Vote]].

## Backfill
The process of performing follow-up web searches to fill in missing fields on a [[Candidate]] before [[Promotion]]. Executed after a candidate is selected as the strongest from a run. Bounded by a configurable max-search limit.

## Promotion
The act of moving a company from `/data/run/{run-id}/{agent-id}/` to `/data/opportunities/`. Only the strongest candidate per agent run is promoted; the rest move to `/data/candidates/`.

## Run
One invocation of the discover-jobs skill. Produces N [[Opportunity|Opportunities]] via N parallel agents. All agent working directories live under `/data/run/{run-uuid}/`. Each agent subdirectory is named `{type}-{N}` (e.g., `preference-1`, `explore-1`).

## Discovery Agent
A sonnet-model subagent responsible for finding exactly one [[Opportunity]] per run. Two types: [[Preference-Based Agent]] and [[Exploratory Agent]].

## Claim
An empty marker directory `/data/run/{run-uuid}/claims/{slug}/` a [[Discovery Agent]] atomically creates (`mkdir`) the instant it accepts a candidate, before backfilling. Because `mkdir` is atomic, exactly one agent wins a contested slug when agents run in parallel — this is what prevents two agents promoting the same company. Slugs are produced by an aggressive deterministic slugify so the same company name always yields the same claim.

## Preference-Based Agent
A [[Discovery Agent]] that targets companies matching known positive signals in the [[Preference Profile]], weighted by confidence score, and avoids known negative signals. 2/3 of agents in a run are this type.

## Exploratory Agent
A [[Discovery Agent]] that surfaces companies from top-tier investor portfolios which do NOT match any known positive preferences or high-confidence negative preferences. 1/3 of agents in a run are this type.

## Stage
The current status of the user's job application process with a company. One of: `Outreach`, `Recruiter Call`, `Hiring Manager Interview`, `Technical Interview`, `System Design`, `Takehome`, `ONSITE`, `OFFER`, `Rejected Offer`, `Rejected me`, `Rejected them`, `On Hold`, `BLOCKED ME`, `BLOCKED THEM`. Null means no active process. Fundraising stage (e.g. "Series B") belongs in `notes`, not here.
