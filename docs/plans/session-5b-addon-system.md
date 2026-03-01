# Session 5b: Add-on System

## Why This Exists
With enterprise gone, the old "unlimited everything" tier is replaced by a flat Pro plan ($79/mo) with sensible base limits (10 locations, 10 jobs, etc). When Pro users outgrow these limits, they buy add-on packs instead of upgrading to a higher tier. This keeps pricing simple (one plan) while allowing large agencies to scale. Add-ons are metered Stripe subscriptions on top of the Pro subscription.

## How to Work

Start by reading `src/lib/stripe/config.ts` to find `ADDON_PRICE_IDS` and `STRIPE_PLANS`. Then read `src/lib/plans/guards.ts` to understand the guard pattern. Work through tasks sequentially, reading each relevant file only when you get to that task.

To find the `profile_addons` table schema:
```bash
grep -l "profile_addons" supabase/migrations/*.sql
```
Read that migration file to know exact columns and types.

## Context
ABA therapy SaaS (Next.js 15 + Supabase + Stripe + shadcn/ui). Pro plan is $79/mo. The `profile_addons` table was created in Session 2. Add-on types: `extra_users` ($20/user), `location_pack` ($10/5 locations), `job_pack` ($5/5 jobs), `storage_pack` ($5/10GB), `homepage_placement`. Stripe price IDs come from env vars in `ADDON_PRICE_IDS`.

## What To Do

### 1. Create addon server actions
Create a new file following the existing `ActionResult<T>` pattern (check `src/lib/actions/billing.ts` for the pattern):
- `getActiveAddons(profileId)` — fetch from `profile_addons` where status = 'active'
- `createAddonCheckout(addonType, quantity)` — create Stripe checkout session for add-on, with metadata to identify it as addon in webhook
- `cancelAddon(addonId)` — cancel at period end
- `getEffectiveLimits(profileId)` — Pro base limits + add-on quantities (e.g., base 10 locations + location_pack quantity * 5)

### 2. Update webhook handler
Read `src/app/api/stripe/webhooks/route.ts`, then:
- Handle addon checkout completions: when `metadata.type === "addon"`, insert into `profile_addons`
- Handle subscription.updated / subscription.deleted for addon subscriptions
- Follow existing patterns in the file

### 3. Create addon management UI
- Card component for billing page showing active add-ons with usage
- Purchase buttons for more capacity
- Show grandfathered add-ons (from enterprise migration) with expiry date

### 4. Update guards to check add-ons
Read `src/lib/plans/guards.ts`, then:
- `guardAddLocation` should check Pro base limit + active location_pack add-ons
- Same for `guardAddJob` and other guards with hard limits
- When limit is reached, return info the UI can use for a "buy more" prompt

### 5. Create limit-reached prompt component
Inline prompt shown when a Pro user hits a limit:
- "You've used 10 of 10 locations. Add 5 more for $10/mo." → [Add Locations]

## Notes
- Add-ons are only for Pro users — free users never see add-on UI (they see preview mode)
- Follow existing patterns exactly — ActionResult, webhook handlers, Stripe SDK usage

## Verification
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "e2e/"
npm run lint 2>&1 | tail -20
```

Commit: "feat: add-on system with checkout, management, and limit enforcement"
