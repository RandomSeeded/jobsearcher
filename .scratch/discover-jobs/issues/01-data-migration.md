# Data migration + server path update

Status: done
Category: chore

## What to build

Rename `/data/contenders` → `/data/opportunities` and `/data/raw` → `/data/candidates`. Update the server's `DATA_DIR` default from `../data/contenders` to `../data/opportunities`. No data is deleted — pure renames.

**Prompt the user before executing any mv commands.**

After renaming, the server's companies endpoint should serve from `/data/opportunities` and the discover-queue manifest lookup should resolve company names from the same directory.

## Acceptance criteria

- [ ] `/data/opportunities/` exists and contains all former contenders YAML files
- [ ] `/data/candidates/` exists and contains all former raw YAML files
- [ ] `/data/contenders/` and `/data/raw/` no longer exist
- [ ] Server `DATA_DIR` default updated to `../data/opportunities` in `server/src/index.ts`
- [ ] `npm run build` (server) passes with no type errors
- [ ] Server starts and `GET /api/companies` returns companies from the new path

## Blocked by

None — can start immediately
