# Worker Prompt: Admin, Analytics, Feedback, Referrals, and Support

You are working on the Supabase-to-Clerk-and-Convex migration in `/Users/hashemselim/Code/findabatherapy`.

You are not alone in the codebase. Stay inside your owned paths.

## Mission

Migrate the internal and reporting surfaces off Supabase:

- analytics event storage and reads
- admin actions and dashboards
- feedback
- referrals and referral analytics
- support or removal-request style internals

## Branch

Shared-worktree mode:
- Stay on `codex/clerk-convex-cutover`
- Do not switch branches

Separate-worktree mode only:
- Use `codex/migrate-admin-analytics-referrals`
- Base branch: `codex/clerk-convex-cutover`

## Owned Paths

- `src/lib/actions/admin.ts`
- `src/lib/actions/analytics.ts`
- `src/lib/actions/referrals.ts`
- `src/lib/actions/referral-analytics.ts`
- `src/lib/actions/feedback.ts`
- `src/lib/analytics/**`
- `src/app/(dashboard)/dashboard/analytics/**`
- `src/app/(dashboard)/dashboard/admin/**`
- `src/app/(dashboard)/dashboard/referrals/**`
- `convex/admin.ts`
- `convex/analytics.ts`
- `convex/referrals.ts`

## Avoid Paths

- `src/lib/stripe/**`
- `src/app/api/stripe/**`
- `src/lib/actions/clients.ts`

## Required Outcomes

- Analytics writes and reads are Convex-backed.
- Admin and support surfaces do not require Supabase.
- Referrals and referral analytics run from Convex.
- Feedback and removal/support records are stored in Convex.

## Acceptance Criteria

- No Convex-mode admin or referral path queries Supabase.
- Admin guard behavior is preserved.
- Analytics and reporting surfaces still render expected summaries.

## Validation

```bash
npx tsc --noEmit
node scripts/generate-cutover-inventory.mjs
```

## Deliverable

Return:

- files changed
- what internal/admin surfaces are migrated
- any residual reporting gaps
