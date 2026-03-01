# Session 5c: Marketing Pages & Onboarding

## Why This Exists
The pricing story changed from "3 confusing tiers" to "one simple plan." Marketing pages and onboarding need to reflect this. Core message: sign up free, build your pages, go live when ready. One plan, $79/month, everything included. The onboarding wizard should get users to a branded preview as fast as possible (logo → colors → location → preview) so they see what they're getting before paying.

## How to Work

**Do NOT read all marketing files upfront.** Work through sections sequentially:

1. Start with pricing: read `src/lib/stripe/config.ts` for Pro pricing data, then find and update pricing components one at a time.
2. Then move to get-listed/employer pages.
3. Then onboarding.
4. Then signup.

To discover marketing components:
```bash
ls src/components/marketing/
ls src/components/onboarding/
ls src/app/auth/
```

## Context
ABA therapy SaaS (Next.js 15 + Supabase + Stripe + shadcn/ui). Now `"free" | "pro"` only. Free = preview mode. Pro = $79/mo ($47/mo annual). Enterprise already removed (Session 1).

## What To Do

### 1. Pricing tables — Free vs Pro + Add-ons

Find and update pricing components. Start by reading `src/content/behaviorwork.ts` for plan data, then update each marketing component that renders pricing:

```bash
grep -rl "pricing\|PlanCard\|FeatureMatrix\|planOrder" src/components/marketing/ --include="*.tsx"
```

Update each to show 2-column Free vs Pro comparison. Add an "Add-ons" section below: extra users ($20), location packs ($10/5), job packs ($5/5), storage ($5/10GB).

**Messaging:**
- Free: "Set up in 10 minutes. Preview everything. Go Live when ready."
- Pro: "One plan. $79/month. Everything included."

### 2. Get Listed / Employer pages

Find and simplify to Free vs Pro:
```bash
grep -rl "enterprise\|plan.*selector\|pricing" src/app/\(site\)/get-listed/ src/app/\(jobs\)/employers/ --include="*.tsx"
```

### 3. Onboarding wizard

Explore the onboarding directory:
```bash
ls src/components/onboarding/
```

Update to a streamlined 4-step flow:
1. Upload your logo
2. Set your brand colors
3. Add your first location
4. Preview your pages (show branded contact form with preview banner)

End with: "Go Live — $79/mo" vs "Continue exploring in preview mode"

The plan selector should become 2 options: "Start with Preview (Free)" vs "Go Live Now ($79/mo)"

### 4. Signup flow simplification

Check auth pages and onboarding:
```bash
ls src/app/auth/
ls src/app/\(dashboard\)/dashboard/onboarding/
```

Signup should be: Email + Password + Agency Name. Remove extra friction fields.

## Notes
- Marketing pages may be partially cleaned up from Session 1. Focus on content/messaging.
- Keep existing analytics tracking on pricing pages.
- Free users still get 3 real FindABATherapy.org locations.

## Verification
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "e2e/"
npm run lint 2>&1 | tail -20
npm run build 2>&1 | tail -100
```

Commit: "feat: update marketing pages and onboarding for free preview + pro model"
