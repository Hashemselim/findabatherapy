# Claude Code Project Guidelines

## Pre-Push Checklist (MANDATORY)

Before committing and pushing ANY changes, run these checks in order:

### 1. TypeScript Type Check
```bash
npx tsc --noEmit
```
This catches type errors that `npm run build` might miss or truncate. Common issues:
- `readonly` arrays from `as const` configs not assignable to mutable array types (use spread: `[...config.array]`)
- Missing type exports when adding new props to components

### 2. Lint Check
```bash
npm run lint
```
Check for unused imports/variables in files you modified.

### 3. Full Build (no truncation)
```bash
npm run build 2>&1 | tail -100
```
Don't truncate build output - type errors appear at the end after "Linting and checking validity of types".

## Deployment

- When user says "push", push directly to main: `git push origin <branch>:main`
- This repo auto-deploys to Vercel on push to main

## Common Gotchas

### Next.js Metadata Types
- Config files with `as const` produce readonly arrays
- Next.js `Metadata` type expects mutable arrays for `keywords`, etc.
- Fix: Spread the array `[...config.keywords]` to create mutable copy

### Multi-Brand Architecture
This is a multi-brand platform:
- `findabatherapy.org` - Provider directory (therapy brand)
- `findabajobs.org` - Job board (jobs brand)
- `behaviorwork.com` - Parent platform

Key files:
- `/src/config/site.ts` - Therapy config
- `/src/config/jobs.ts` - Jobs config
- `/src/lib/utils/domains.ts` - Brand detection utilities

### Route Groups
- `(jobs)` - Jobs site routes, uses emerald/green theme
- `(site)` - Therapy site routes, uses purple/blue theme
- `(dashboard)` - Unified dashboard for both brands
- `(careers)` - Career pages

### Dynamic Icons
Next.js supports `icon.tsx` and `apple-icon.tsx` in route groups for dynamic favicon generation per-brand.
