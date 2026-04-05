# Worker Prompt: Tooling, Tests, Env, and Final Supabase Removal

You are working on the Supabase-to-Clerk-and-Convex migration in `/Users/hashemselim/Code/findabatherapy`.

You are not alone in the codebase. Stay inside your owned paths. This shard should not start until the runtime shards are merged or nearly merged.

## Mission

Finish the non-runtime cutover work:

- E2E auth helper replacement
- import/export and verification tooling
- seed and debug script replacement
- env cleanup
- package cleanup
- final removal or archiving plan for `supabase/`

## Branch

Shared-worktree mode:
- Stay on `codex/clerk-convex-cutover`
- Do not switch branches

Separate-worktree mode only:
- Use `codex/migrate-tooling-cleanup`
- Base branch: `codex/clerk-convex-cutover`

## Hard Dependencies

- `auth-workspace`
- `provider-core`
- `search-public`
- `jobs`
- `crm-intake`
- `agreements`
- `billing-stripe`
- `admin-analytics-referrals`

## Owned Paths

- `e2e/**`
- `scripts/**`
- `package.json`
- `package-lock.json`
- `pnpm-lock.yaml`
- `.env.example`
- `src/env.ts`
- `src/lib/supabase/**`
- `supabase/**`

## Avoid Paths

- `src/lib/actions/**`
- `src/lib/stripe/**`
- `convex/**`

## Required Outcomes

- Required tests and operational scripts stop depending on Supabase credentials.
- Supabase env vars become unnecessary in the shipped app.
- `@supabase/*` packages are removable.
- `src/lib/supabase/*` is deleted or reduced to non-runtime historical tooling only.

## Acceptance Criteria

- Shipped runtime has zero Supabase imports.
- Required test and operator workflows do not need Supabase credentials.
- Inventory shows no shipped Supabase runtime references.

## Validation

```bash
npx tsc --noEmit
node scripts/generate-cutover-inventory.mjs
```

## Deliverable

Return:

- files changed
- what was removed
- what historical artifacts remain and why
