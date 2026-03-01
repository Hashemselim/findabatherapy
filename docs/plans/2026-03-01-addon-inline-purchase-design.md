# Add-on Inline Purchase & Management Redesign

## Problem

Current add-on purchase flow redirects Pro users to Stripe Checkout even though they already have a card on file. After purchase, the success page shows generic "You're Live!" messaging unrelated to add-ons. Add-on management (quantity change, cancel) is done with inline buttons that bypass Stripe's portal, and feedback uses toasts that disappear too quickly.

## Design

### Purchase Flow: Inline Charge + Checkout Fallback

Follow the Featured Location pattern already in the codebase (`src/lib/stripe/actions.ts` ~line 787-860).

1. User clicks "Purchase" → button shows spinner ("Processing...")
2. New server action `createAddonSubscription()` runs:
   - Looks up saved payment method (3-step: customer default → existing subscription → payment methods list)
   - **Has payment method →** `stripe.subscriptions.create()` with quantity, returns `{ directCharge: true, subscriptionId, addonType, quantity }`
   - **No payment method →** Falls back to `stripe.checkout.sessions.create()`, returns `{ directCharge: false, url }`
3. Client handles result:
   - **Inline success →** Show success modal, `router.refresh()` on dismiss
   - **Checkout redirect →** `window.location.href = url` (existing flow, success page updated for add-ons)
   - **Error →** Show error modal with actionable next step

### Feedback: Always Modals, Never Toasts

**Success modal** (shadcn Dialog, same pattern as `upgrade-modal.tsx`):
```
┌──────────────────────────────────┐
│          ✓ (green circle)        │
│                                  │
│     Location Pack Added!         │
│                                  │
│   +10 locations added to your    │
│   plan. Your card was charged    │
│   $30/mo.                        │
│                                  │
│           [ Got it ]             │
└──────────────────────────────────┘
```
Shows: add-on name, what was added (units), price charged. "Got it" dismisses and refreshes.

**Error modal**:
```
┌──────────────────────────────────┐
│          ⚠ (red/orange)          │
│                                  │
│      Payment Failed              │
│                                  │
│   Your card was declined.        │
│   Please update your payment     │
│   method and try again.          │
│                                  │
│  [ Update Payment ]   [ Close ]  │
└──────────────────────────────────┘
```
"Update Payment" opens Stripe Billing Portal. Actionable, not informational.

### Active Add-ons Display ("My Add-ons")

Inside the existing Add-on Packs card, above the purchase grid. Read-only rows showing what the user has, with one "Manage Add-ons" portal link:

```
┌─────────────────────────────────────────────┐
│ 📦 Add-on Packs                             │
│ Expand your limits with additional packs    │
│                                             │
│ ── My Add-ons ──────────────────────────────│
│ ┌─────────────────────────────────────────┐ │
│ │ 📦 Location Pack × 2  +10 locations     │ │
│ │    $30/mo · Renews Mar 15               │ │
│ ├─────────────────────────────────────────┤ │
│ │ 📦 Extra Users × 1    +1 user           │ │
│ │    $20/mo · Renews Mar 15               │ │
│ └─────────────────────────────────────────┘ │
│ [Manage Add-ons →]  (opens Billing Portal)  │
│                                             │
│ ── Add More Capacity ───────────────────────│
│ ┌──────────────────┐ ┌──────────────────┐   │
│ │ + Location Pack  │ │ + Job Pack       │   │
│ │   $15/5 locs     │ │   $15/5 jobs     │   │
│ └──────────────────┘ └──────────────────┘   │
│ ┌──────────────────┐ ┌──────────────────┐   │
│ │ + Extra Users    │ │ + Storage Pack   │   │
│ └──────────────────┘ └──────────────────┘   │
└─────────────────────────────────────────────┘
```

### Management via Stripe Billing Portal

Quantity changes and cancellation happen in Stripe's Billing Portal, not inline. The portal already shows all subscriptions for the customer. Remove inline edit (pencil) and cancel (X) buttons from `AddonRow`.

### Success Page (Checkout Fallback)

Update `/dashboard/billing/success/page.tsx` to detect `addon` query param and show add-on-specific messaging instead of "You're Live!".

## Files to Change

| File | Change |
|------|--------|
| `src/lib/actions/addons.ts` | Replace `createAddonCheckout` with `createAddonSubscription` (inline charge + checkout fallback). Remove `updateAddonQuantity` and `cancelAddon` (portal handles these). Keep `getActiveAddons` and `getEffectiveLimits`. |
| `src/components/billing/addon-card.tsx` | Simplify `AddonRow` to read-only (no edit/cancel). Update `AddonPurchaseButton` to call inline action. Add "Manage Add-ons" billing portal button. Remove `QuantityStepper` from rows (keep for purchase quantity selection). |
| `src/components/billing/addon-result-modal.tsx` | New component: success/error modal for add-on purchase results. |
| `src/app/(dashboard)/dashboard/billing/success/page.tsx` | Handle `addon` query param for checkout-fallback success. |

## Notes

- Only Pro users see add-on UI (existing guard)
- `proration_behavior: "create_prorations"` for mid-cycle charges
- Homepage placement add-on skips quantity selector (always 1)
- Webhook already handles addon subscription creation — no webhook changes needed
