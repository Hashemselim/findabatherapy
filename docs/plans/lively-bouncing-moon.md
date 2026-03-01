# Pricing Model Restructure: Free Preview Mode + Pro ($79/mo) + Add-ons

## Context

We're restructuring the pricing model from 3 tiers (Free/Pro/Enterprise) to 2 tiers (Free/Pro) with usage-based add-ons. The free tier transforms from "features hidden behind locks" to a **permanent interactive demo** — every page is visible with the agency's real branding, but non-functional with demo data and prominent preview banners. The goal is to let free users experience the full platform so thoroughly that upgrading feels like "flipping a switch" rather than "buying unknown software."

**Current state:** `PlanTier = "free" | "pro" | "enterprise"` referenced across 51+ files. Free hides features. Enterprise at $199/mo is rarely used and overcomplicates the pricing story.

**Target state:** `PlanTier = "free" | "pro"`. One plan, one price ($79/mo), add-ons for scale. Free = full visibility, zero functionality. Every surface says "Go Live."

---

## Pricing Summary

| | Free | Pro ($79/mo) |
|---|---|---|
| Platform | Full, preview mode | Full, live |
| Branded Forms | Real content, preview banner, NOT submittable | Live, clean, submittable |
| Branded Pages | Real content, preview banner | Clean, active |
| Clients | Demo examples, view only | Unlimited |
| Employees | Demo examples, view only | Unlimited |
| Leads | — (forms not submittable) | Unlimited |
| CRM/Pipeline | Demo data, view only | Active |
| Communications | Preview only, can't send | Active |
| Tasks | Demo data, view only | Active |
| FindABATherapy.org | Listed, up to 3 locations | Listed |
| FindABAJobs.org | Demo examples only | Included |
| Locations | 3 (directory only) | 10 |
| Jobs | 0 (demo only) | 10 |
| Users | 1 | 1 |
| Storage | — | 5 GB |

**Add-ons (Pro only):** $20/user, $10/5 locations, $5/5 jobs, $5/10GB storage

---

## Phase 1: Core Type System — Remove Enterprise

Remove `"enterprise"` from `PlanTier` union and cascade through all 51+ files. TypeScript compiler is the safety net — changing the type surfaces every reference.

### 1.1 Update `src/lib/plans/features.ts`
- Change `PlanTier` to `"free" | "pro"`
- Delete entire `enterprise` key from `PLAN_CONFIGS`
- Update Pro limits: `maxLocations: 10`, `maxJobPostings: 10`, `maxClients: -1` (unlimited)
- Set `hasHomepagePlacement: false` on Pro (becomes add-on)
- Simplify `getNextUpgradeTier()`: pro returns `null`
- Remove `"enterprise"` from `comparePlanTiers` order map
- Update Pro `highlights` array

### 1.2 Update `src/lib/plans/guards.ts`
- All guards with `requiredPlan: "enterprise"` → `requiredPlan: "pro"`
- Simplify `guardAddLocation`/`guardAddClient` (no more enterprise branch)
- `getCurrentPlanTier()` return type narrows automatically

### 1.3 Update `src/lib/stripe/config.ts`
- Remove `enterprise` from `STRIPE_PLANS`
- Remove enterprise env vars
- Add add-on price config block:
```typescript
export const ADDON_PRICE_IDS = {
  extra_users: process.env.STRIPE_ADDON_EXTRA_USERS_PRICE_ID,
  location_pack: process.env.STRIPE_ADDON_LOCATION_PACK_PRICE_ID,
  job_pack: process.env.STRIPE_ADDON_JOB_PACK_PRICE_ID,
  storage_pack: process.env.STRIPE_ADDON_STORAGE_PACK_PRICE_ID,
  homepage_placement: process.env.STRIPE_ADDON_HOMEPAGE_PLACEMENT_PRICE_ID,
};
```

### 1.4 Fix all downstream references (let `tsc --noEmit` guide)

Key files grouped by change type:

**Type annotations** (remove `| "enterprise"`):
- `src/contexts/auth-context.tsx`
- `src/lib/actions/billing.ts`
- `src/lib/actions/onboarding.ts`
- `src/lib/utils/location-utils.ts`
- `src/lib/posthog/events.ts`
- `src/components/dashboard/dashboard-sidebar.tsx`

**Zod schemas** (remove `"enterprise"` from enum):
- `src/lib/validations/onboarding.ts`
- `src/lib/validations/jobs.ts`

**Valid plan arrays** (remove `"enterprise"`):
- `src/lib/auth/actions.ts`
- `src/app/auth/callback/route.ts`

**Tier order maps** (remove enterprise: 2):
- `src/components/billing/upgrade-modal.tsx`
- `src/components/ui/feature-gate.tsx`

**Stripe checkout** (simplify to `"pro"` only):
- `src/lib/stripe/actions.ts`
- `src/app/(dashboard)/dashboard/billing/checkout/page.tsx`

**Plan display UI** (remove enterprise cases):
- `src/components/dashboard/dashboard-sidebar.tsx`
- `src/app/(dashboard)/admin/customer-analytics/page.tsx`
- `src/lib/storage/config.ts` — `PHOTO_LIMITS`
- `src/lib/actions/locations.ts` — `LOCATION_LIMITS`

**Search queries**:
- `src/lib/queries/search.ts` — `getHomepageFeaturedListings` changes to query `profile_addons` table; `getPriorityListings` simplifies to `.eq("profiles.plan_tier", "pro")`

**Marketing components** (remove enterprise column/card):
- `src/content/behaviorwork.ts`
- `src/components/marketing/unified-pricing-table.tsx`
- `src/components/marketing/bw-pricing-cards.tsx`
- `src/components/marketing/bw-feature-matrix.tsx`
- `src/components/marketing/bw-faq.tsx`
- `src/app/(site)/get-listed/page.tsx`
- `src/app/(jobs)/employers/post/page.tsx`

**Components to DELETE**:
- `src/components/billing/enterprise-upgrade-card.tsx`

**Onboarding**:
- `src/components/onboarding/plan-selector.tsx` — 2-column: "Start Preview" vs "Go Live Now"
- `src/components/onboarding/upgrade-banner.tsx`

**Dashboard pages** (remove enterprise limit references):
- `src/app/(dashboard)/dashboard/locations/page.tsx`
- `src/app/(dashboard)/dashboard/jobs/page.tsx`
- `src/app/(dashboard)/dashboard/jobs/new/page.tsx`
- `src/app/(dashboard)/dashboard/billing/page.tsx`
- `src/app/(dashboard)/dashboard/account/page.tsx`
- `src/app/(dashboard)/dashboard/intake-pages/branded-page/page.tsx`
- `src/components/dashboard/locations-header-wrapper.tsx`

**Remaining** (misc enterprise references):
- `src/lib/email/notifications.ts`
- `src/app/api/test-email/route.ts`
- `src/lib/actions/admin.ts`
- `src/lib/queries/search.test.ts`
- `src/components/demo/demo-layout-client.tsx`
- `src/components/analytics/get-listed-tracker.tsx`

---

## Phase 2: Database Migration

### 2.1 Create `supabase/migrations/055_add_profile_addons_and_migrate_enterprise.sql`

```sql
-- profile_addons table
CREATE TABLE IF NOT EXISTS profile_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addon_type TEXT NOT NULL CHECK (addon_type IN (
    'extra_users','location_pack','job_pack','storage_pack','homepage_placement'
  )),
  quantity INTEGER NOT NULL DEFAULT 1,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  cancel_at_period_end BOOLEAN DEFAULT false,
  current_period_end TIMESTAMPTZ,
  grandfathered_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes + RLS
CREATE INDEX idx_profile_addons_profile_id ON profile_addons(profile_id);
ALTER TABLE profile_addons ENABLE ROW LEVEL SECURITY;
-- (policies for user select + service_role manage)

-- Migration columns on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS migrated_from_enterprise_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enterprise_grandfathered_until TIMESTAMPTZ;

-- Migrate enterprise → pro
UPDATE profiles SET
  plan_tier = 'pro',
  migrated_from_enterprise_at = now(),
  enterprise_grandfathered_until = now() + interval '6 months'
WHERE plan_tier = 'enterprise';

-- Auto-provision homepage_placement addon for former enterprise
INSERT INTO profile_addons (profile_id, addon_type, quantity, status, grandfathered_until)
SELECT id, 'homepage_placement', 1, 'active', now() + interval '6 months'
FROM profiles WHERE migrated_from_enterprise_at IS NOT NULL;
```

---

## Phase 3: Expanded Demo Data

### 3.1 Expand `src/lib/demo/data.ts`

Add new exports with realistic ABA-industry data:
- `DEMO_CLIENTS` — 8 clients across pipeline stages (inquiry → active → discharged)
- `DEMO_LEADS` — 5 demo inquiry submissions showing the lead intake flow
- `DEMO_PIPELINE_STATS` — Stage counts + attention items
- `DEMO_TASKS` — 6 tasks (overdue, due today, upcoming)
- `DEMO_EMPLOYEES` — 4 employees (BCBA, 2 RBTs, admin) with credentials
- `DEMO_JOBS` — 3 job postings (BCBA, RBT, admin) with demo applicants
- `DEMO_COMMUNICATIONS` — 5 sent communication history entries
- `DEMO_REFERRAL_SOURCES` — Referral analytics breakdown

### 3.2 Create `src/hooks/use-preview-data.ts`

```typescript
export function usePreviewMode(): { isPreview: boolean }
export function usePreviewData<T>(realData: T | null, demoData: T): { data: T; isPreview: boolean }
```

Server-side equivalent for RSC pages:
```typescript
export async function getPreviewData<T>(realData: T | null, demoData: T): Promise<{ data: T; isPreview: boolean }>
```

---

## Phase 4: Preview Banner Component

### 4.1 Create `src/components/ui/preview-banner.tsx`

Two variants:

**Inline** (top of dashboard pages):
- Full-width amber/yellow bar
- "PREVIEW" badge + contextual message + "Go Live — $79/mo" CTA
- Pushes content down (not overlay)

**Public page** (on branded forms/pages for free users):
- Full-width bar at top of public page
- "This page is in preview mode. Activate your account to go live."
- Visually distinct from agency branding
- Form submit button shows lock icon + disabled state

### 4.2 Create `src/components/ui/preview-overlay.tsx`

For wrapping interactive elements (tables, forms) in preview mode:
- Semi-transparent overlay on interaction areas
- "Example data" label on demo content
- Action buttons (Add, Send, Delete) show lock icon + tooltip "Go Live to use this feature"

---

## Phase 5: Dashboard Pages — Preview Mode Conversion

Convert each dashboard page from "hidden/locked" to "visible with demo data + preview banner":

| Page | File | Demo Data Source |
|---|---|---|
| Pipeline | `dashboard/clients/pipeline/page.tsx` | `DEMO_PIPELINE_STATS`, `DEMO_ATTENTION_ITEMS` |
| Clients | `dashboard/clients/page.tsx` | `DEMO_CLIENTS` |
| Leads | `dashboard/clients/leads/page.tsx` | `DEMO_LEADS` — demo inquiry submissions showing what the lead flow looks like |
| Tasks | `dashboard/tasks/page.tsx` | `DEMO_TASKS` |
| Communications | `dashboard/clients/communications/page.tsx` | `DEMO_COMMUNICATIONS` |
| Analytics | `dashboard/settings/analytics/page.tsx` | `DEMO_ANALYTICS` (existing) |
| Employees | `dashboard/team/employees/page.tsx` | `DEMO_EMPLOYEES` |
| Jobs | `dashboard/team/jobs/page.tsx` | `DEMO_JOBS` + banner: _"FindABAJobs.org is included with Pro. Go Live to post real jobs and recruit BCBAs and RBTs."_ |
| Forms (contact, intake, etc.) | `dashboard/forms/*/page.tsx` | Real user content + preview banner on public view |

### 5.1 Update nav config `src/components/dashboard/nav-config.ts`
- Remove `proBadge: true` from Communications item
- All nav items accessible and clickable for all users

### 5.2 Update sidebar `src/components/dashboard/dashboard-sidebar.tsx`
- Add "Preview Mode" badge below agency name for free users
- Remove enterprise label/badge logic
- No lock icons or "Pro" badges on nav items — all items are clean and fully accessible. The demo data labels and preview banners inside each page handle the conversion messaging. Sidebar just needs the single "Preview Mode" badge at the top.
- Lead counter area shows "—" for free users

### 5.3 Post-Upgrade Empty States

When a Pro user has no data yet (just upgraded, demo data cleared), each section shows a purposeful empty state:

- **Leads:** "No submissions yet. Share your contact form to start receiving leads." → [Copy Form Link]
- **Clients:** "No clients yet. Add your first client or wait for form submissions." → [Add Client]
- **Employees:** "No employees yet. Add your first team member." → [Add Employee]
- **Jobs:** "No jobs posted yet. Create your first job listing." → [Post a Job]

Create `src/components/ui/empty-state-cta.tsx` — reusable empty state card with icon, message, and CTA button.

---

## Phase 6: Upgrade Modal Redesign

### 6.1 Redesign `src/components/billing/upgrade-modal.tsx`

Replace multi-plan comparison with single "Go Live" modal:
1. "Go Live with Pro" header
2. Monthly/Annual toggle
3. Price: "$79/mo" or "$47/mo billed annually"
4. 6-8 feature bullets
5. "Subscribe & Go Live" button → `createCheckoutSession("pro", interval)`
6. Redirects to Stripe Checkout, then back to success page

### 6.2 Update billing success page
- Add confetti animation on upgrade success
- Show "You're live!" message with next-steps checklist (copy form link, add first client, post a job)
- Revalidate all dashboard paths to clear demo data

### 6.3 Update billing page `dashboard/billing/page.tsx`
- Remove enterprise upgrade card
- Free users: single Pro card with "Go Live" CTA
- Pro users: plan status + add-on management section

---

## Phase 7: Add-on System

### 7.1 Create `src/lib/actions/addons.ts`
- `getActiveAddons(profileId)` — fetch from `profile_addons`
- `createAddonCheckout(addonType, quantity)` — Stripe checkout for add-on
- `cancelAddon(addonId)` — cancel at period end
- `getEffectiveLimits(profileId)` — Pro base + add-on quantities

### 7.2 Update webhook handler `src/app/api/stripe/webhooks/route.ts`
- Add `metadata.type === "addon"` routing
- Handle addon checkout completed, subscription updated/deleted

### 7.3 Create `src/components/billing/addon-manager.tsx`
- Card on billing page showing active add-ons
- "Add more users/locations/jobs" buttons with inline checkout

### 7.4 Update guards to check add-ons
- `guardAddLocation` checks Pro base (10) + active location_pack add-ons
- `guardAddJob` checks Pro base (10) + active job_pack add-ons
- New `guardAddUser` for user limits

---

## Phase 8: Marketing Pages & Onboarding

### 8.1 Pricing tables — remove enterprise column
- `src/components/marketing/unified-pricing-table.tsx`
- `src/components/marketing/bw-pricing-cards.tsx`
- `src/components/marketing/bw-feature-matrix.tsx`
- `src/content/behaviorwork.ts`

Show Free vs Pro comparison + Add-ons section below.

**Landing page messaging** (from strategy doc):
> Branded intake forms. Client CRM. Automated emails. Task management. Job board. All connected. All yours. Set up in 10 minutes.
> Sign up free. Build your pages. Go Live when you're ready. One plan. $79/month. Everything included.

### 8.2 Onboarding wizard redesign

**Signup form** — simplify to: Email, Password, Agency Name. No credit card. No other fields.

**Onboarding wizard** — `src/components/onboarding/` — 4-step guided flow:
1. **"Upload your logo"** — instant personalization
2. **"Set your brand colors"** — pages now look like theirs
3. **"Add your first location"** — populates FindABATherapy.org
4. **"Preview your pages"** — show branded contact form, intake form, website, brochure — all with preview banner

Onboarding ends with a choice:
> Your pages are ready. You're currently in preview mode. Go Live to start accepting submissions and managing clients.
> → **Go Live — $79/mo**  |  → **Continue exploring in preview mode**

Update `src/components/onboarding/plan-selector.tsx` — 2-option layout: "Start with Preview (Free)" vs "Go Live Now ($79/mo)"

### 8.3 Get Listed / Employer pages
- Remove enterprise plan option

### 8.4 Signup flow simplification
- Verify/update signup form at `src/app/auth/` to be email + password + agency name only
- Remove any extra fields that add friction

---

## Phase 9: Email Drip Sequence (Post-Signup Nurture)

### 9.1 Create drip email templates

5-email nurture series for free users who haven't upgraded:

| Day | Subject / Theme | Key Message |
|---|---|---|
| 0 | Welcome | "Your branded pages are ready to preview." |
| 2 | Feature highlight | "Your contact form can be embedded on any website. Go Live to activate it." |
| 5 | Social proof / directory | "Your FindABATherapy.org listing is live. Parents can find you. Go Live to start receiving their submissions." |
| 10 | Before/after | "Here's what your pages look like live vs preview mode." (Visual comparison) |
| 14 | Urgency nudge | "Still in preview mode? Most agencies go live within their first week." |

### 9.2 Implementation

- Create email templates in `src/lib/email/drip/` using existing `emailWrapper()` pattern
- Create `src/lib/actions/drip-emails.ts` — server action to queue/send drip emails
- Add `drip_email_last_sent` and `drip_email_step` columns to profiles (or a separate `email_drip_state` table)
- Trigger via cron job or Supabase Edge Function that checks signup date and sends appropriate email
- Stop drip when user upgrades to Pro

---

## Phase 10: Conversion Analytics Events

### 10.1 Add PostHog tracking events

Track these conversion metrics (using existing PostHog integration at `src/lib/posthog/events.ts`):

| Event | What it measures |
|---|---|
| `signup_completed` | Signup → first login |
| `onboarding_step_completed` | Each onboarding step (logo, colors, location, preview) |
| `onboarding_completed` | Full setup completion |
| `preview_page_viewed` | Free user viewing their branded pages |
| `upgrade_modal_opened` | Any "Go Live" CTA clicked (track which CTA via property) |
| `upgrade_checkout_started` | Modal → Stripe redirect |
| `upgrade_completed` | Successful subscription activation |
| `addon_purchased` | Add-on checkout completed |
| `limit_reached_prompt_shown` | User hit a limit (locations, jobs, users) |

### 10.2 Limit-reached prompt UX

When a Pro user hits an add-on limit, show an inline prompt:
- "You've used 10 of 10 locations. Add 5 more for $10/mo." → [Add Locations]
- "Invite a team member? $20/mo per additional user." → [Add User]

Create `src/components/billing/limit-reached-prompt.tsx` — reusable prompt component used by guards when limit is hit.

---

## Phase 11: Enterprise Stripe Migration (Production Only)

### 11.1 Create `src/lib/scripts/migrate-enterprise-subscriptions.ts`

Admin script (run via `npx tsx`) that:
1. Queries profiles with `migrated_from_enterprise_at IS NOT NULL`
2. Updates each Stripe subscription to Pro pricing
3. Uses `proration_behavior: "none"` (new price starts next billing cycle)
4. Logs results

**Run LAST, after all code changes are deployed.**

---

## Implementation Order

```
Phase 1 (types) → Phase 2 (migration)
                        ↓
              Phase 3 (demo data) + Phase 4 (preview banner)  [parallel]
                        ↓
              Phase 5 (dashboard page conversions)
                        ↓
              Phase 6 (upgrade modal) + Phase 7 (add-ons) + Phase 8 (marketing/onboarding)  [parallel]
                        ↓
              Phase 9 (email drip) + Phase 10 (analytics events)  [parallel]
                        ↓
              Phase 11 (Stripe migration script — production deploy step)
```

---

## Verification

After each phase:
1. `npx tsc --noEmit` — zero type errors
2. `npm run lint` — no unused imports from removed enterprise code
3. `npm run build 2>&1 | tail -100` — clean build

Full QA checklist:
- [ ] Free user sees all dashboard pages with demo data (except Leads — empty state CTA)
- [ ] Free user sees preview banners on all branded pages (contact, intake, resources, brochure, website, careers)
- [ ] Free user cannot submit forms (button locked with lock icon, tooltip on click)
- [ ] Free user can manage up to 3 FindABATherapy locations (live, real)
- [ ] Free user sees "Go Live" CTAs throughout
- [ ] Free user sidebar shows "Preview Mode" badge, no lock icons or Pro badges on nav items
- [ ] Upgrade modal opens from any "Go Live" CTA
- [ ] Stripe checkout creates Pro subscription
- [ ] Success page shows confetti + "You're live!" + next-steps (copy form link, add client, post job)
- [ ] Pro user sees clean pages, no banners, no demo data
- [ ] Pro user sees purposeful empty states when no data exists yet
- [ ] Pro user can add add-ons from billing page
- [ ] Add-on limits enforced with inline "add more" prompts when hit
- [ ] Existing enterprise customers migrated to Pro with grandfathered add-ons
- [ ] Marketing/pricing pages show 2-tier model with correct landing page copy
- [ ] Onboarding wizard: logo → colors → location → preview pages → Go Live choice
- [ ] Signup form is email + password + agency name only
- [ ] Email drip sends on schedule (Day 0, 2, 5, 10, 14), stops on upgrade
- [ ] PostHog events fire for all conversion metrics
- [ ] No remaining references to "enterprise" in codebase
