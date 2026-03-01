# Session 6: Email Drip Sequence + Conversion Analytics

## Why This Exists
Free users get a beautiful interactive preview, but they still need a nudge to convert. The email drip sequence is the "slow burn" — 5 emails over 14 days reminding users what they've built and what going live unlocks. PostHog conversion events measure every funnel step (signup → onboarding → preview → upgrade modal → checkout → success) so we can see where users drop off and optimize.

## How to Work

Start by reading `src/lib/email/email-helpers.ts` to understand the `emailWrapper()` pattern. Then build the drip system. After that, read `src/lib/posthog/events.ts` to understand event tracking patterns, then wire in conversion events.

To find the drip columns added in Session 2:
```bash
grep -l "drip_email" supabase/migrations/*.sql
```
Read that file for exact column names.

## Context
ABA therapy SaaS (Next.js 15 + Supabase + Resend + PostHog). Free users are in "preview mode" with demo data. The `profiles` table has `drip_email_step` (integer, default 0) and `drip_email_last_sent` (timestamptz) from Session 2.

## Email Drip Sequence

Build a 5-email nurture series for free users who haven't upgraded:

| Day | Theme | Key Message |
|---|---|---|
| 0 | Welcome | "Your branded pages are ready to preview." |
| 2 | Feature highlight | "Your contact form can be embedded on any website. Go Live to activate it." |
| 5 | Social proof / directory | "Your FindABATherapy.org listing is live. Parents can find you. Go Live to start receiving submissions." |
| 10 | Before/after | "Here's what your pages look like live vs preview mode." |
| 14 | Urgency nudge | "Still in preview mode? Most agencies go live within their first week." |

Requirements:
- Create email templates using existing `emailWrapper()` pattern
- Create a server action or edge function to send drip emails based on `drip_email_step` and signup date
- Stop the drip when user upgrades to Pro
- Each email has a "Go Live" CTA button

## PostHog Conversion Events

Read `src/lib/posthog/events.ts` first, then add these tracking events:

- `signup_completed` — signup → first login
- `onboarding_step_completed` — each onboarding step (logo, colors, location, preview)
- `onboarding_completed` — full setup
- `preview_page_viewed` — free user viewing branded pages
- `upgrade_modal_opened` — any "Go Live" CTA clicked (track which CTA via property)
- `upgrade_checkout_started` — modal → Stripe redirect
- `upgrade_completed` — successful subscription
- `addon_purchased` — add-on checkout completed
- `limit_reached_prompt_shown` — user hit a limit

Wire events into appropriate places. Find them by searching:
```bash
grep -rl "useUpgradeModal\|openUpgradeModal\|redirectToCheckout\|checkout" src/ --include="*.tsx" --include="*.ts" | head -20
```

Read each file when you get to it, add the event, move on.

## Verification
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "e2e/"
npm run lint 2>&1 | tail -20
```

Commit: "feat: add email drip sequence and conversion analytics events"
