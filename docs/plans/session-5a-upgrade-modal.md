# Session 5a: Upgrade Modal Redesign

## Why This Exists
The old upgrade modal showed a multi-plan comparison (Free vs Pro vs Enterprise). Now there's only one paid plan: Pro at $79/mo ($47/mo annual). Free users see a full interactive preview with demo data. The upgrade modal should be a single focused "Go Live with Pro" flow — no plan comparison needed. Every "Go Live" button, every LockedButton, every preview banner opens this modal via `useUpgradeModal()`.

## How to Work

Start by reading `src/components/billing/upgrade-modal.tsx` — this is the main file you're rewriting. Note the `useUpgradeModal()` hook interface carefully. Then work through the tasks below sequentially, reading each file only when you get to it.

## Context
ABA therapy SaaS (Next.js 15 + Supabase + Stripe + shadcn/ui). Plan tiers: `"free" | "pro"`. Pro = $79/mo ($47/mo annual, 40% savings). `STRIPE_PLANS` in `src/lib/stripe/config.ts` has pricing data.

## What To Do

### 1. Redesign the upgrade modal
Rewrite `src/components/billing/upgrade-modal.tsx`:
- Monthly/Annual toggle ($79/mo vs $47/mo billed annually, 40% savings)
- Feature bullets (branded forms, CRM, pipeline, communications, jobs, analytics, unlimited clients)
- Primary CTA → `/dashboard/billing/checkout?plan=pro&interval={month|year}`
- "Continue in Preview Mode" secondary button to close
- **Keep `useUpgradeModal()` hook API identical** — same function signature, same return type. This is critical — dozens of places call it.

### 2. Update billing page
Read `src/app/(dashboard)/dashboard/billing/page.tsx`, then:
- Free users: single Pro card with "Go Live" CTA
- Pro users: plan status + renewal info + placeholder section for add-on management (Session 5b fills this in)
- Remove any enterprise UI that survived Session 1

### 3. Update checkout page
Read `src/app/(dashboard)/dashboard/billing/checkout/page.tsx`, then:
- Only accept `"pro"` (remove `"enterprise"` from validation if still present)
- Keep PostHog tracking and error handling

### 4. Optional: billing success enhancement
- "You're live!" message + next-steps after successful upgrade
- `revalidatePath("/dashboard")` to flush cached demo data

## Notes
- Don't change `useUpgradeModal()` interface — it's the glue between preview mode and billing
- Search `grep -rl "useUpgradeModal" src/` to confirm all callers still work after your changes
- Delete enterprise upgrade card component if one exists as a separate file

## Verification
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "e2e/"
npm run lint 2>&1 | tail -20
```

Commit: "feat: redesign upgrade modal as single Go Live flow"
