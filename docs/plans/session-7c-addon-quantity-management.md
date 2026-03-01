# Session 7c: Add-on Quantity Management

## Why This Exists

Session 5b built the add-on system (buy, cancel, enforce limits), but it only supports buying one pack at a time with no way to change quantity after purchase. Agencies that need 20 extra locations would have to check out 4 separate times and manage 4 separate subscriptions. This session adds quantity selection on purchase AND quantity changes on existing add-ons — so everything stays on a single clean subscription per add-on type.

## How to Work

Read these files first to understand the existing system:
- `src/lib/actions/addons.ts` — existing server actions (`createAddonCheckout`, `cancelAddon`, `getActiveAddons`, `getEffectiveLimits`)
- `src/components/billing/addon-card.tsx` — existing UI (`AddonCard`, `AddonRow`, `AddonPurchaseButton`)
- `src/app/api/stripe/webhooks/route.ts` — find `handleAddonSubscriptionUpdated` (search for it)
- `src/lib/plans/addon-config.ts` — `ADDON_INFO` with labels and pricing display strings

## Context

ABA therapy SaaS (Next.js 15 + Supabase + Stripe + shadcn/ui). Pro plan is $79/mo. Add-on types with updated pricing: `extra_users` ($20/user), `location_pack` ($15/5 locations), `job_pack` ($15/5 jobs), `storage_pack` ($5/10GB), `homepage_placement` ($149/mo). The `profile_addons` table has a `quantity` column that already works with `getEffectiveLimits()` — it multiplies `quantity * unitsPerPack` to compute effective limits.

## What To Do

### 1. Update add-on price labels in `src/lib/plans/addon-config.ts`

Update the `ADDON_INFO` object to reflect the final pricing:
- `location_pack.priceLabel` → `"$15/mo for 5 locations"`
- `job_pack.priceLabel` → `"$15/mo for 5 jobs"`
- `storage_pack.priceLabel` → `"$5/mo for 10GB"`
- `extra_users.priceLabel` → `"$20/user/mo"`
- `homepage_placement.priceLabel` → `"$149/mo"`

### 2. Create `updateAddonQuantity` server action

Add to `src/lib/actions/addons.ts`:

```typescript
export async function updateAddonQuantity(
  addonId: string,
  newQuantity: number
): Promise<ActionResult>
```

Logic:
1. Auth check — get current user
2. Fetch the add-on row from `profile_addons`, verify `profile_id` matches user
3. Validate `newQuantity >= 1`
4. If add-on has a `stripe_subscription_id`:
   - Fetch the Stripe subscription
   - Get the first subscription item ID (`subscription.items.data[0].id`)
   - Call `stripe.subscriptions.update(subscriptionId, { items: [{ id: itemId, quantity: newQuantity }], proration_behavior: "create_prorations" })`
5. Update `profile_addons` row: set `quantity = newQuantity`, `updated_at = now()`
6. `revalidatePath("/dashboard/billing")`
7. If add-on is grandfathered (no `stripe_subscription_id`), just update the quantity locally

### 3. Update webhook to sync quantity changes

In `handleAddonSubscriptionUpdated` inside `src/app/api/stripe/webhooks/route.ts`:

After the existing status/period update, also sync the quantity:

```typescript
// Existing code updates status, cancel_at_period_end, current_period_end
// ADD: sync quantity from Stripe subscription
const quantity = subscriptionItem?.quantity ?? 1;

const { error } = await supabase
  .from("profile_addons")
  .update({
    status,
    quantity, // <-- ADD THIS
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  })
  .eq("stripe_subscription_id", subscription.id);
```

### 4. Add quantity selector to purchase flow

Update `AddonPurchaseButton` in `src/components/billing/addon-card.tsx`:

Currently hardcodes `createAddonCheckout(addonType, 1)`. Change to:
- Add a small quantity selector (1-10 range, default 1)
- Could be a simple dropdown or +/- stepper inline
- Show calculated total: "2 packs × $15/mo = $30/mo (10 locations)"
- Purchase button label updates with total

### 5. Add quantity change UI to existing add-ons

Update `AddonRow` in `src/components/billing/addon-card.tsx`:

Add a `[Change]` button next to the cancel button that:
- Opens an inline quantity editor (stepper or dropdown)
- Shows current quantity and new total price
- "Save" calls `updateAddonQuantity(addon.id, newQuantity)`
- Shows loading state during update
- Router refresh on success

The row should display like:
```
Location Pack × 2    +10 locations    $30/mo    [Change] [Cancel]
```

### 6. Handle edge case: buying an add-on type you already have

Update `createAddonCheckout` in `src/lib/actions/addons.ts`:

Before creating a new checkout, check if the user already has an active add-on of that type. If so, redirect them to the quantity change flow instead of creating a duplicate subscription:

```typescript
// Check for existing active addon of this type
const { data: existing } = await supabase
  .from("profile_addons")
  .select("id, quantity, stripe_subscription_id")
  .eq("profile_id", user.id)
  .eq("addon_type", addonType)
  .eq("status", "active")
  .maybeSingle();

if (existing) {
  return {
    success: false,
    error: "ALREADY_EXISTS", // UI can catch this and show quantity change instead
  };
}
```

Then in `AddonPurchaseButton`, handle this error by showing the quantity change UI for the existing add-on instead.

## Notes

- Add-ons are only for Pro users — free users never see add-on UI
- Use `proration_behavior: "create_prorations"` when changing quantity mid-cycle so the customer pays the prorated difference immediately
- Follow existing patterns exactly — ActionResult, revalidatePath, router.refresh()
- The homepage_placement add-on doesn't need quantity support (it's always 1) — can hide the quantity selector for that type

## Verification

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "e2e/"
npm run lint 2>&1 | tail -20
npm run build 2>&1 | tail -100
```

Commit: "feat: add-on quantity selection and management"
