# Worker Prompt: Billing, Add-ons, Featured Locations, and Stripe Webhooks

You are working on the Supabase-to-Clerk-and-Convex migration in `/Users/hashemselim/Code/findabatherapy`.

You are not alone in the codebase. Stay inside your owned paths.

## Mission

Finish the billing and Stripe cutover:

- billing page reads
- checkout and portal actions
- addon purchase and management
- featured-location billing
- Stripe webhook writes and reconciliation

## Branch

Shared-worktree mode:
- Stay on `codex/clerk-convex-cutover`
- Do not switch branches

Separate-worktree mode only:
- Use `codex/migrate-billing-stripe`
- Base branch: `codex/clerk-convex-cutover`

## Owned Paths

- `src/lib/actions/billing.ts`
- `src/lib/actions/addons.ts`
- `src/lib/stripe/**`
- `src/app/(dashboard)/dashboard/billing/**`
- `src/app/api/stripe/**`
- `convex/billing.ts`

## Avoid Paths

- `src/lib/actions/clients.ts`
- `src/lib/actions/onboarding.ts`
- `src/lib/queries/search.ts`

## Required Outcomes

- Billing dashboard reads and actions are fully Convex-backed in Convex mode.
- Add-ons and featured-location purchase/update/cancel flows no longer depend on Supabase in Convex mode.
- Stripe webhooks mutate Convex only and remain idempotent.
- Stripe customer and subscription linkage remains preserved.

## Acceptance Criteria

- No Convex-mode billing flow depends on Supabase profile reads or `location_featured_subscriptions`.
- Webhooks stop writing to Supabase tables.
- Billing success/cancel/portal flows still preserve current UX.

## Validation

```bash
npx tsc --noEmit
node scripts/generate-cutover-inventory.mjs
```

## Deliverable

Return:

- files changed
- what billing and webhook surfaces are fully migrated
- any reconciliation tasks left for tooling cleanup
