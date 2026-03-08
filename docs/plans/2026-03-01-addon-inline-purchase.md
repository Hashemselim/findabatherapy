# Add-on Inline Purchase & Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Stripe Checkout redirect for add-on purchases with inline charging (using saved payment method), add success/error modals, simplify active add-on display to read-only with portal management link.

**Architecture:** Server action `createAddonSubscription` tries `stripe.subscriptions.create()` with the customer's saved payment method (same 3-step lookup pattern as Featured Location flow in `src/lib/stripe/actions.ts:787-850`). Falls back to Stripe Checkout if no payment method. Client shows result via Dialog modals (success or error), never toasts.

**Tech Stack:** Next.js 15 server actions, Stripe API (`subscriptions.create`, `checkout.sessions.create`, `billingPortal.sessions.create`), shadcn/ui Dialog, Supabase.

**Design doc:** `docs/plans/2026-03-01-addon-inline-purchase-design.md`

---

### Task 1: Create `AddonResultModal` component

**Files:**
- Create: `src/components/billing/addon-result-modal.tsx`

**Step 1: Create the modal component**

This component handles both success and error states for add-on purchases. Uses shadcn Dialog (same pattern as `src/components/billing/upgrade-modal.tsx`).

```tsx
"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BillingPortalButton } from "@/components/billing/billing-portal-button";

interface AddonResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: {
    type: "success" | "error";
    title: string;
    description: string;
  } | null;
}

export function AddonResultModal({
  open,
  onOpenChange,
  result,
}: AddonResultModalProps) {
  if (!result) return null;

  const isSuccess = result.type === "success";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-opacity-10"
            style={{ backgroundColor: isSuccess ? "rgb(16 185 129 / 0.1)" : "rgb(239 68 68 / 0.1)" }}
          >
            {isSuccess ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-500" />
            )}
          </div>
          <DialogTitle>{result.title}</DialogTitle>
          <DialogDescription>{result.description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          {isSuccess ? (
            <Button onClick={() => onOpenChange(false)}>Got it</Button>
          ) : (
            <>
              <BillingPortalButton variant="default" className="w-full">
                Update Payment Method
              </BillingPortalButton>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | grep -E "addon-result-modal|error TS" | head -20`
Expected: No errors related to this file.

**Step 3: Commit**

```bash
git add src/components/billing/addon-result-modal.tsx
git commit -m "feat: add AddonResultModal for purchase success/error feedback"
```

---

### Task 2: Replace `createAddonCheckout` with `createAddonSubscription`

**Files:**
- Modify: `src/lib/actions/addons.ts:80-193` (replace `createAddonCheckout`)

**Step 1: Replace the server action**

Replace `createAddonCheckout` (lines 80-193) with `createAddonSubscription`. This follows the Featured Location pattern from `src/lib/stripe/actions.ts:787-850`.

Key differences from old `createAddonCheckout`:
- Tries inline `stripe.subscriptions.create()` first using saved payment method
- Falls back to Checkout only when no payment method exists
- Returns `directCharge: true/false` so the client knows which path was taken

```typescript
/**
 * Create an add-on subscription — charges saved payment method inline,
 * falls back to Stripe Checkout if no payment method on file.
 */
export async function createAddonSubscription(
  addonType: AddonType,
  quantity: number = 1
): Promise<
  ActionResult<{
    directCharge: boolean;
    url?: string;
    subscriptionId?: string;
    addonType?: AddonType;
    quantity?: number;
  }>
> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Only Pro users can buy add-ons
  const tier = await resolveCurrentPlanTier();
  if (tier !== "pro") {
    return { success: false, error: "Add-ons require a Pro plan" };
  }

  const priceId = ADDON_PRICE_IDS[addonType];
  if (!priceId) {
    return {
      success: false,
      error: `No price configured for add-on: ${addonType}`,
    };
  }

  const supabase = await createClient();

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
      error: "ALREADY_EXISTS",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, stripe_customer_id, stripe_subscription_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  const headersList = await headers();
  const origin = getValidatedOrigin(headersList.get("origin"));
  const info = ADDON_INFO[addonType];

  try {
    // Create or retrieve Stripe customer
    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { profile_id: profile.id },
      });
      customerId = customer.id;

      const adminClient = await createAdminClient();
      await adminClient
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", profile.id);
    }

    // --- Payment method lookup (same pattern as Featured Location) ---
    let paymentMethodId: string | null = null;

    // 1. Check customer's default payment method
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return { success: false, error: "Customer not found" };
    }

    if (customer.invoice_settings?.default_payment_method) {
      paymentMethodId = customer.invoice_settings.default_payment_method as string;
    }

    // 2. Check existing Pro subscription's payment method
    if (!paymentMethodId && profile.stripe_subscription_id) {
      try {
        const existingSubscription = await stripe.subscriptions.retrieve(
          profile.stripe_subscription_id
        );
        if (existingSubscription.default_payment_method) {
          paymentMethodId = existingSubscription.default_payment_method as string;
        }
      } catch {
        // Subscription might not exist, continue
      }
    }

    // 3. Check customer's payment methods list
    if (!paymentMethodId) {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      });
      if (paymentMethods.data.length > 0) {
        paymentMethodId = paymentMethods.data[0].id;
      }
    }

    // --- Charge inline or fall back to Checkout ---
    if (paymentMethodId) {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId, quantity }],
        default_payment_method: paymentMethodId,
        metadata: {
          type: "addon",
          addon_type: addonType,
          profile_id: profile.id,
          quantity: String(quantity),
        },
        description: `${info.label} (x${quantity})`,
      });

      // Webhook will create the profile_addons row
      revalidatePath("/dashboard/billing");
      return {
        success: true,
        data: {
          directCharge: true,
          subscriptionId: subscription.id,
          addonType,
          quantity,
        },
      };
    }

    // No payment method — fall back to Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity }],
      success_url: `${origin}${CHECKOUT_URLS.success}?addon=${addonType}&quantity=${quantity}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/billing`,
      metadata: {
        type: "addon",
        addon_type: addonType,
        profile_id: profile.id,
        quantity: String(quantity),
      },
      subscription_data: {
        metadata: {
          type: "addon",
          addon_type: addonType,
          profile_id: profile.id,
          quantity: String(quantity),
        },
        description: `${info.label} (x${quantity})`,
      },
    });

    if (!session.url) {
      return { success: false, error: "Failed to create checkout session" };
    }

    return { success: true, data: { directCharge: false, url: session.url } };
  } catch (error) {
    console.error("Addon subscription error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create add-on subscription",
    };
  }
}
```

Also remove `updateAddonQuantity` (lines 198-280) and `cancelAddon` (lines 285-354) — portal handles these now.

Remove the import of `updateAddonQuantity` and `cancelAddon` from `addon-card.tsx` (will be done in Task 3).

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | head -20`
Expected: May show errors in `addon-card.tsx` because it still imports removed functions — that's OK, Task 3 fixes it.

**Step 3: Commit**

```bash
git add src/lib/actions/addons.ts
git commit -m "feat: replace createAddonCheckout with inline createAddonSubscription"
```

---

### Task 3: Rewrite `AddonCard` UI

**Files:**
- Modify: `src/components/billing/addon-card.tsx` (full rewrite)

**Step 1: Rewrite the component**

Replace the entire file. Key changes:
- `AddonRow` becomes read-only (no edit/cancel buttons, no QuantityStepper in rows)
- `AddonPurchaseButton` calls `createAddonSubscription` instead of `createAddonCheckout`, handles inline success vs checkout redirect
- Success/error shown via `AddonResultModal`
- "Manage Add-ons" button links to Stripe Billing Portal
- Keep `QuantityStepper` for the purchase flow quantity selector
- Keep `items-start` on the grid

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Plus, ShieldCheck, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type ActiveAddon, type AddonType, ADDON_INFO } from "@/lib/plans/addon-config";
import { createAddonSubscription } from "@/lib/actions/addons";
import { createBillingPortalSession } from "@/lib/stripe/actions";
import { AddonResultModal } from "@/components/billing/addon-result-modal";

interface AddonCardProps {
  addons: ActiveAddon[];
}

export function AddonCard({ addons }: AddonCardProps) {
  const [modalResult, setModalResult] = useState<{
    type: "success" | "error";
    title: string;
    description: string;
  } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  function showResult(result: { type: "success" | "error"; title: string; description: string }) {
    setModalResult(result);
    setModalOpen(true);
  }

  function handleModalClose(open: boolean) {
    setModalOpen(open);
    if (!open) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {/* My Add-ons */}
      {addons.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-700">My Add-ons</h3>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {addons.map((addon) => (
              <AddonRow key={addon.id} addon={addon} />
            ))}
          </div>
          <ManageAddonsButton />
        </div>
      )}

      {/* Available Add-ons / Add More Capacity */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-700">
          {addons.length > 0 ? "Add More Capacity" : "Available Add-ons"}
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 items-start">
          {(["location_pack", "job_pack", "extra_users", "storage_pack"] as const).map(
            (type) => {
              const existing = addons.find(
                (a) => a.addonType === type && !a.cancelAtPeriodEnd
              );
              return (
                <AddonPurchaseButton
                  key={type}
                  addonType={type}
                  existingAddon={existing ?? null}
                  onResult={showResult}
                />
              );
            }
          )}
        </div>
      </div>

      <AddonResultModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        result={modalResult}
      />
    </div>
  );
}

/** Read-only row showing an active add-on */
function AddonRow({ addon }: { addon: ActiveAddon }) {
  const info = ADDON_INFO[addon.addonType];
  const isGrandfathered = !!addon.grandfatheredUntil;
  const totalUnits = addon.quantity * info.unitsPerPack;

  return (
    <div className="flex items-center gap-3 p-3">
      <div className="rounded-lg bg-slate-100 p-2">
        <Package className="h-4 w-4 text-slate-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-900">
            {info.label}
            {addon.quantity > 1 && ` \u00d7 ${addon.quantity}`}
          </p>
          {isGrandfathered && (
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 text-amber-700 text-xs px-1.5 py-0"
            >
              <ShieldCheck className="mr-1 h-3 w-3" />
              Grandfathered
            </Badge>
          )}
          {addon.cancelAtPeriodEnd && (
            <Badge
              variant="outline"
              className="border-orange-300 bg-orange-50 text-orange-700 text-xs px-1.5 py-0"
            >
              Cancelling
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-500">
          +{totalUnits} {info.unitLabel}
          {totalUnits !== 1 ? "s" : ""}
          {!isGrandfathered && (
            <span className="ml-1">
              &middot; ${addon.quantity * info.pricePerPack}/mo
            </span>
          )}
          {isGrandfathered && addon.grandfatheredUntil && (
            <span className="ml-1">
              &middot; Free until{" "}
              {new Date(addon.grandfatheredUntil).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
          {!isGrandfathered && addon.currentPeriodEnd && (
            <span className="ml-1">
              &middot; Renews{" "}
              {new Date(addon.currentPeriodEnd).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

/** Button to open Stripe Billing Portal for add-on management */
function ManageAddonsButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await createBillingPortalSession();
    if (result.success && result.data?.url) {
      window.location.href = result.data.url;
    }
    setLoading(false);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full border-slate-200 text-slate-600 hover:bg-slate-50"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
      ) : null}
      Manage Add-ons
    </Button>
  );
}

/** Purchase button for a single add-on type */
function AddonPurchaseButton({
  addonType,
  existingAddon,
  onResult,
}: {
  addonType: AddonType;
  existingAddon: ActiveAddon | null;
  onResult: (result: { type: "success" | "error"; title: string; description: string }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showQuantity, setShowQuantity] = useState(false);
  const info = ADDON_INFO[addonType];
  const isHomepage = addonType === "homepage_placement";
  const totalPrice = quantity * info.pricePerPack;
  const totalUnits = quantity * info.unitsPerPack;

  async function handlePurchase() {
    setLoading(true);
    const result = await createAddonSubscription(addonType, quantity);

    if (result.success && result.data) {
      if (result.data.directCharge) {
        // Inline success — show modal
        onResult({
          type: "success",
          title: `${info.label} Added!`,
          description: `+${totalUnits} ${info.unitLabel}${totalUnits !== 1 ? "s" : ""} added to your plan. Your card was charged $${totalPrice}/mo.`,
        });
        setShowQuantity(false);
        setQuantity(1);
      } else if (result.data.url) {
        // No payment method — redirect to Checkout
        window.location.href = result.data.url;
        return; // Don't setLoading(false), page is navigating
      }
    } else if (!result.success) {
      if (result.error === "ALREADY_EXISTS" && existingAddon) {
        // Already have this type — show portal link
        onResult({
          type: "error",
          title: "Add-on Already Active",
          description: `You already have a ${info.label}. Use the billing portal to change your quantity.`,
        });
      } else {
        onResult({
          type: "error",
          title: "Payment Failed",
          description: result.error || "Something went wrong. Please update your payment method and try again.",
        });
      }
    }
    setLoading(false);
  }

  // If they already have this add-on active, show "Add more" variant
  if (existingAddon) {
    return (
      <button
        onClick={() => {
          onResult({
            type: "error",
            title: "Add-on Already Active",
            description: `You already have a ${info.label}. Use the billing portal to change your quantity or add more.`,
          });
        }}
        className="flex items-center gap-3 rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
      >
        <div className="rounded-lg bg-blue-100 p-2">
          <Plus className="h-4 w-4 text-blue-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            Add more {info.unitLabel}s
          </p>
          <p className="text-xs text-slate-500">
            Manage in billing portal
          </p>
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white transition-colors hover:border-slate-400 hover:bg-slate-50">
      <button
        onClick={() => {
          if (isHomepage) {
            handlePurchase();
          } else {
            setShowQuantity(!showQuantity);
          }
        }}
        disabled={loading}
        className="flex w-full items-center gap-3 p-3 text-left disabled:opacity-50"
      >
        <div className="rounded-lg bg-blue-50 p-2">
          {loading ? (
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 text-blue-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 truncate">{info.label}</p>
          <p className="text-xs text-slate-500">{info.priceLabel}</p>
        </div>
      </button>

      {showQuantity && !isHomepage && (
        <div className="border-t border-slate-200 px-3 pb-3 pt-2 space-y-2">
          <div className="flex items-center gap-3">
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              min={1}
              max={10}
            />
            <span className="text-xs text-slate-500">
              {quantity} &times; ${info.pricePerPack} ={" "}
              <span className="font-medium text-slate-700">${totalPrice}/mo</span>
              <span className="ml-1 text-slate-400">
                ({totalUnits} {info.unitLabel}
                {totalUnits !== 1 ? "s" : ""})
              </span>
            </span>
          </div>
          <Button
            size="sm"
            className="w-full h-8 text-xs"
            onClick={handlePurchase}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Processing...
              </>
            ) : (
              `Purchase \u2014 $${totalPrice}/mo`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 10,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-slate-200">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-7 w-7 items-center justify-center text-slate-500 hover:text-slate-700 disabled:opacity-30"
      >
        <span className="text-sm font-medium">&minus;</span>
      </button>
      <span className="flex h-7 w-8 items-center justify-center border-x border-slate-200 text-xs font-medium text-slate-700">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-7 w-7 items-center justify-center text-slate-500 hover:text-slate-700 disabled:opacity-30"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
```

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | head -20`
Expected: Clean (no errors).

**Step 3: Commit**

```bash
git add src/components/billing/addon-card.tsx
git commit -m "feat: rewrite AddonCard with inline purchase and result modals"
```

---

### Task 4: Update success page for checkout-fallback add-on purchases

**Files:**
- Modify: `src/app/(dashboard)/dashboard/billing/success/page.tsx`

**Step 1: Add add-on handling**

Update the `searchParams` type to include `addon` and `quantity`. Add an add-on branch to the title/description logic.

In the `BillingSuccessPageProps` interface (line 13), add `addon` and `quantity`:

```typescript
interface BillingSuccessPageProps {
  searchParams: Promise<{
    return_to?: string;
    session_id?: string;
    upgraded?: string;
    downgraded?: string;
    addon?: string;
    quantity?: string;
  }>;
}
```

After the existing `isDowngrade` check (line 46), add the add-on detection. Import `ADDON_INFO` and `AddonType` at the top:

```typescript
import { ADDON_INFO, type AddonType } from "@/lib/plans/addon-config";
```

Add after line 46 (`const isDowngrade = ...`):

```typescript
const isAddon = !!params.addon;
const addonType = params.addon as AddonType | undefined;
const addonQuantity = parseInt(params.quantity || "1", 10);
const addonInfo = addonType && addonType in ADDON_INFO ? ADDON_INFO[addonType] : null;
```

Update the title/description logic — add an `isAddon` branch before the existing checks:

```typescript
if (isAddon && addonInfo) {
  const totalUnits = addonQuantity * addonInfo.unitsPerPack;
  title = `${addonInfo.label} Added!`;
  description = `+${totalUnits} ${addonInfo.unitLabel}${totalUnits !== 1 ? "s" : ""} added to your plan at $${addonQuantity * addonInfo.pricePerPack}/mo.`;
} else if (isUpgrade) {
  // ... existing code
```

Update the `checkoutType` to include addon:

```typescript
const checkoutType = isAddon ? "addon" : isUpgrade ? "upgrade" : isDowngrade ? "downgrade" : "new";
```

In the JSX next-steps list, add an add-on variant. Replace the existing `<ul>` block (lines 85-98) with:

```tsx
<ul className="mt-2 space-y-2 text-sm text-emerald-800 dark:text-emerald-200">
  {isAddon ? (
    <>
      <li className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        Your add-on is now active
      </li>
      <li className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        Updated limits are available immediately
      </li>
      <li className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        Manage add-ons anytime from the billing page
      </li>
    </>
  ) : (
    <>
      <li className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        Your listing is now published and searchable
      </li>
      <li className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        All Pro features are unlocked — branded pages, CRM, communications
      </li>
      <li className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        Families can contact you directly through your listing
      </li>
    </>
  )}
</ul>
```

For the add-on case, change the primary CTA to go to billing instead of dashboard:

Replace the button section (lines 101-115) with:

```tsx
<div className="flex flex-col gap-3 sm:flex-row">
  <Button asChild className="flex-1">
    <Link href={isAddon ? "/dashboard/billing" : "/dashboard"}>
      {isAddon ? "Back to Billing" : "Go to Dashboard"}
      <ArrowRight className="ml-2 h-4 w-4" />
    </Link>
  </Button>
  {!isAddon && listing && (
    <Button variant="outline" asChild className="flex-1">
      <Link href={`/provider/${listing.slug}`} target="_blank">
        View Live Listing
        <ExternalLink className="ml-2 h-4 w-4" />
      </Link>
    </Button>
  )}
</div>
```

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | head -20`
Expected: Clean.

**Step 3: Commit**

```bash
git add src/app/(dashboard)/dashboard/billing/success/page.tsx
git commit -m "feat: handle add-on purchases on billing success page"
```

---

### Task 5: Clean up removed server action references

**Files:**
- Modify: `src/lib/actions/addons.ts` (remove dead code if any references remain)

**Step 1: Verify no remaining references to removed functions**

Run:
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | head -20
```

Check for any other files importing the removed functions:

```bash
grep -r "updateAddonQuantity\|cancelAddon\|createAddonCheckout" src/ --include="*.ts" --include="*.tsx" -l
```

If any files still import these, update their imports. The only expected consumer is `addon-card.tsx` which was already rewritten in Task 3.

**Step 2: Full build verification**

Run:
```bash
npm run lint 2>&1 | tail -20
NEXT_PUBLIC_SITE_URL=https://www.findabatherapy.org npm run build 2>&1 | tail -100
```

Expected: Clean build, no errors.

**Step 3: Commit (if any cleanup was needed)**

```bash
git add -A
git commit -m "chore: clean up removed addon action references"
```

---

### Task 6: Visual verification

**Step 1: Start dev server and verify**

Start the dev server with `preview_start`. Log in as the Pro test account (`e2e-test@test.findabatherapy.com` / `E2eTestPass123!`). Navigate to `/dashboard/billing`.

Verify:
1. "Available Add-ons" section shows 4 add-on cards with correct prices
2. Clicking a card expands the quantity selector (except homepage)
3. Clicking "Purchase" shows a loading spinner, then a success modal (if test Stripe keys allow inline charge) or redirects to Checkout
4. If there are active add-ons, "My Add-ons" section shows read-only rows with a "Manage Add-ons" button
5. "Manage Add-ons" opens the Stripe Billing Portal
6. No console errors

Take a screenshot to confirm.

---

## Verification Commands

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "e2e/"
npm run lint 2>&1 | tail -20
NEXT_PUBLIC_SITE_URL=https://www.findabatherapy.org npm run build 2>&1 | tail -100
```
