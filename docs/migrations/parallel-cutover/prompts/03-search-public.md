# Worker Prompt: Search, Public Read Models, and Sitemaps

You are working on the Supabase-to-Clerk-and-Convex migration in `/Users/hashemselim/Code/findabatherapy`.

You are not alone in the codebase. Stay inside your owned paths and do not refactor dashboard mutation code outside this shard.

## Mission

Replace Supabase-backed public reads with Convex-backed projections:

- therapy search
- public provider pages
- careers and branded public routes
- sitemap generation
- inquiry public-read integration

## Branch

Shared-worktree mode:
- Stay on `codex/clerk-convex-cutover`
- Do not switch branches

Separate-worktree mode only:
- Use `codex/migrate-search-public`
- Base branch: `codex/clerk-convex-cutover`

## Owned Paths

- `src/lib/queries/search.ts`
- `src/lib/actions/inquiries.ts`
- `src/app/sitemap.ts`
- `src/app/(jobs)/**/sitemap.ts`
- `src/app/(website)/**`
- `src/app/(careers)/**`
- `src/app/provider/**`
- `src/app/jobs/**`
- `convex/publicReadModels.ts`
- `convex/inquiries.ts`

## Avoid Paths

- `src/lib/actions/onboarding.ts`
- `src/lib/actions/clients.ts`
- `src/lib/stripe/**`

## Required Outcomes

- Therapy search no longer queries Supabase in Convex mode.
- Provider public pages and branded/site routes resolve through Convex projections or direct Convex reads.
- Sitemap generation is fed by Convex models only.
- Inquiry submission and public-read paths are Convex-backed in Convex mode.

## Acceptance Criteria

- No Convex-mode `src/lib/queries/search.ts` path calls Supabase.
- `src/app/sitemap.ts` and jobs/provider sitemaps no longer read legacy tables in Convex mode.
- Public pages preserve existing URL shapes and output contracts.

## Validation

```bash
npx tsc --noEmit
node scripts/generate-cutover-inventory.mjs
```

## Deliverable

Return:

- files changed
- what public surfaces are now Convex-backed
- any remaining projection gaps that depend on provider-core or jobs data shape
