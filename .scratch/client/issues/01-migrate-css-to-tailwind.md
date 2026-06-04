# Migrate CSS to Tailwind

Status: ready-for-agent
Category: refactor

## Summary

Replace all inline `style={{...}}` props and `index.css` global styles across the client with Tailwind utility classes. Currently every component (Browser.tsx, DiscoverQueuePane.tsx, Triage.tsx) uses verbose inline styles. Tailwind would reduce boilerplate and make the design consistent.

## Scope

- Install `tailwindcss` + `@tailwindcss/vite` (or postcss plugin), configure `vite.config.ts`
- Convert `client/src/index.css` — keep CSS variables for color tokens, replace structural rules with Tailwind base/reset
- Convert all inline styles in:
  - `client/src/Browser.tsx`
  - `client/src/DiscoverQueuePane.tsx`
  - `client/src/Triage.tsx`
- Remove `client/src/App.css` if unused after migration

## Acceptance criteria

- `npm run build` passes with no type errors
- Visual output is equivalent to current state
- No inline `style={{}}` props remain (except truly dynamic values like computed widths/colors)
