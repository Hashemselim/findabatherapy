# Session 8: Enterprise Stripe Subscription Migration (Phase 11)

## Why This Exists
Session 2's database migration moved enterprise users to "pro" in our database, but their Stripe subscriptions are still billing at the old enterprise price ($199/mo). This script bridges the gap — it updates each former enterprise user's Stripe subscription to the Pro price ($79/mo) starting at their next billing cycle (no proration, no surprise charges). This is a one-time admin script run after all code is deployed.

## Read These Files First
Before making changes, read these to understand the Stripe setup:
- `src/lib/stripe/config.ts` — `STRIPE_PLANS` object with Pro price IDs (monthly and annual)
- Check the profiles table schema (look at migration files in `supabase/migrations/`) for `migrated_from_enterprise_at`, `stripe_subscription_id`, and `stripe_customer_id` columns
- `src/lib/actions/billing.ts` — existing Stripe SDK usage patterns (how the app initializes Stripe, error handling)

## Context
ABA therapy SaaS. We've restructured from 3 tiers to 2 (free/pro). The database migration (Session 2) already changed `plan_tier` from "enterprise" to "pro" for existing enterprise users and set `migrated_from_enterprise_at` and `enterprise_grandfathered_until` timestamps.

But their **Stripe subscriptions** are still on the old enterprise price. We need a script to migrate those to the Pro price in Stripe.

## What To Do

Create an admin script at `src/lib/scripts/migrate-enterprise-subscriptions.ts` (run via `npx tsx`) that:

1. Queries profiles where `migrated_from_enterprise_at IS NOT NULL`
2. For each, fetches their Stripe subscription via `stripe_subscription_id`
3. Updates the subscription to the Pro price ID (from `STRIPE_PLANS.pro`)
4. Uses `proration_behavior: "none"` so the new price starts at next billing cycle
5. Logs results (success/failure for each)

This should be safe to run multiple times (idempotent — skip if already on Pro price).

**Run this LAST, after all code changes are deployed to production.**

## Notes
- Use the Stripe Node SDK (already a dependency)
- Reference `STRIPE_PLANS` from `src/lib/stripe/config.ts` for the Pro price IDs
- This is a one-time migration script, not a permanent feature

## Verification
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "e2e/"
```

Commit: "feat: add enterprise-to-pro Stripe subscription migration script"
