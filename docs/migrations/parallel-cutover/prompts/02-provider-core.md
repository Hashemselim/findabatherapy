# Worker Prompt: Provider Core and Dashboard Settings

You are working on the Supabase-to-Clerk-and-Convex migration in `/Users/hashemselim/Code/findabatherapy`.

You are not alone in the codebase. Do not revert others. Stay inside your owned paths.

## Mission

Move the provider dashboard mutation and settings surfaces fully off Supabase:

- onboarding
- listing attributes
- listing and location dashboard CRUD
- provider website settings
- forms pages
- Google Business linkage and review sync runtime
- social assets and storage assumptions

## Branch

Shared-worktree mode:
- Stay on `codex/clerk-convex-cutover`
- Do not switch branches

Separate-worktree mode only:
- Use `codex/migrate-provider-core`
- Base branch: `codex/clerk-convex-cutover`

## Owned Paths

- `src/lib/actions/onboarding.ts`
- `src/lib/actions/attributes.ts`
- `src/lib/actions/listings.ts`
- `src/lib/actions/locations.ts`
- `src/lib/actions/provider-website.ts`
- `src/lib/actions/google-business.ts`
- `src/lib/actions/google-places.ts`
- `src/lib/actions/social.ts`
- `src/lib/storage/actions.ts`
- `src/lib/storage/config.ts`
- `src/app/(dashboard)/dashboard/company/**`
- `src/app/(dashboard)/dashboard/branding/**`
- `src/app/(dashboard)/dashboard/forms/**`
- `src/app/(dashboard)/dashboard/locations/**`
- `convex/listings.ts`
- `convex/locations.ts`
- `convex/files.ts`

## Avoid Paths

- `src/lib/queries/search.ts`
- `src/lib/queries/jobs.ts`
- `src/lib/stripe/**`
- `src/app/api/stripe/**`

## Required Outcomes

- Dashboard listing and location operations run through Convex in Convex mode.
- Onboarding no longer requires Supabase in Convex mode.
- Attribute and provider website settings are persisted through Convex.
- No Convex-mode provider media or social path relies on Supabase public URL conventions.
- Google linkage runtime is migrated or clearly isolated behind new Convex-backed server actions.

## Acceptance Criteria

- `src/lib/actions/onboarding.ts` is Convex-aware and removes live Convex-mode Supabase calls.
- `src/lib/actions/attributes.ts` and residual listing/location action paths are Convex-backed.
- `src/lib/actions/social.ts` and `src/lib/storage/config.ts` stop assuming Supabase storage URLs in Convex mode.

## Validation

```bash
npx tsc --noEmit
node scripts/generate-cutover-inventory.mjs
```

## Deliverable

Return:

- files changed
- what provider-core surfaces are fully migrated
- any public-read dependencies that must be picked up by `search-public`
