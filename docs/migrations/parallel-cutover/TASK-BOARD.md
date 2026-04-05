# Parallel Migration Task Board

Operator-owned board. Do not assign this file to worker write scopes.

## Runtime Shards

| Shard | Priority | Status | Hard deps | Main owned areas |
| --- | --- | --- | --- | --- |
| `auth-workspace` | P0 | ready | none | auth routes, middleware, platform auth/workspace, settings users |
| `provider-core` | P0 | ready | `auth-workspace` soft | onboarding, attributes, provider settings, Google integrations, social assets |
| `jobs` | P0 | ready | `auth-workspace` soft | jobs, applications, resumes, public employer/jobs surfaces |
| `billing-stripe` | P0 | active | `auth-workspace` soft | billing page, billing actions, Stripe actions, Stripe webhooks |
| `search-public` | P1 | ready | `provider-core`, `jobs` soft | therapy search, public projections, sitemaps, provider public pages |
| `crm-intake` | P1 | ready | `auth-workspace` soft | clients, intake, pipeline, communications, notifications, CRM docs |
| `agreements` | P1 | ready | `auth-workspace` soft | agreements, artifacts, preview/download routes |
| `admin-analytics-referrals` | P2 | ready | `auth-workspace` soft | analytics, admin, feedback, referrals, support surfaces |

## Cleanup Shard

| Shard | Priority | Status | Hard deps | Main owned areas |
| --- | --- | --- | --- | --- |
| `tooling-cleanup` | P3 | hold until runtime shards merge | all runtime shards | packages, env, E2E auth helper, scripts, final Supabase removal |

## Merge Checklist

For each merged shard:

1. Merge into `codex/clerk-convex-cutover`.
2. Run `npx tsc --noEmit`.
3. Run `node scripts/generate-cutover-inventory.mjs`.
4. Confirm the shard stayed inside its write scope.
5. Note any follow-up contract drift before launching the next merge.
