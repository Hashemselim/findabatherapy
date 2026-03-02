# Implementation Audit: Behavior Work Strategy & Engineering Spec

**Audit Date:** February 8, 2026
**Branch:** `feat/behavior-work-lifecycle-engine`
**Documents Audited Against:**
- `Behavior-Work-Strategy.md` (v2.0, Feb 7, 2026)
- `Behavior-Work-Engineering-Spec.md` (v1.0, Feb 7, 2026)

---

## Executive Summary

| Phase | Description | Score | Critical Issues |
|-------|------------|-------|-----------------|
| 1 | Dashboard Reorganization | **98%** | Tasks badge shows 0 (TODO) |
| 2 | Communication Templates | **97%** | Missing parent email validation |
| 3 | Client Pipeline Dashboard | **90%** | Stage colors swapped, no status change activity |
| 4 | Automated Tasks + Credentials | **65%** | 14-day window (should be 30), **no credential UI** |
| 5 | Referral Source Tracking | **85%** | **No `?ref=findabatherapy` on directory links** |
| 6 | Branded Agency Page + Onboarding + Free/Paid | **95%** | Minor content model inconsistency |

**Overall:** ~88% complete. Most phases are solid. The biggest gaps are the missing team management UI (Phase 4) and the missing directory auto-tagging (Phase 5).

---

## Phase 1: Dashboard Reorganization

**Spec Goal:** Restructure from 3 workspaces (Client Growth / Hiring / Operations) to section-based layout with always-visible Tasks and Inbox.

### Findings

| Requirement | Status | File(s) | Notes |
|-------------|--------|---------|-------|
| Replace 3 workspaces with section groups | PASS | `dashboard-sidebar.tsx` | Sections: clients, intake_pages, team, settings |
| Always-visible Inbox with badge | PASS | `dashboard-sidebar.tsx:380` | Combines unread inquiries + new applications |
| Always-visible Tasks with badge | BUG | `dashboard-sidebar.tsx:385` | Hardcoded to `0` with TODO comment — query not implemented |
| Clients section default expanded | PASS | `dashboard-sidebar.tsx` | `getDefaultOpenState()` returns clients: true |
| Section expand/collapse with localStorage | PASS | `dashboard-sidebar.tsx` | Key: `dashboard_sections_v2` |
| Mobile nav mirrors sidebar | PASS | `dashboard-mobile-nav.tsx` | Same section structure, persistent items |
| Topbar quick access | PASS | `dashboard-topbar.tsx` | Horizontal scroll with Inbox, Tasks, Pipeline, etc. |
| Default landing = Pipeline | PASS | `middleware.ts:269` | Redirects to `/dashboard/clients/pipeline` |
| Backward-compatible route aliases | PASS | `dashboard-sidebar.tsx` | All old workspace paths aliased |
| `inferWorkspaceFromPath()` rewritten | PASS | `dashboard-sidebar.tsx:237` | Now `inferActiveSectionFromPath()` |
| New route pages created | PASS | Multiple | Pipeline, Communications, Intake Pages, Team, Settings all exist |
| Update all internal links | PASS | Multiple | No stale references to old workspace paths found |

### Action Items
- **[BUG]** Implement Tasks badge query — count overdue + due-today tasks

---

## Phase 2: Communication Templates

**Spec Goal:** Build email template system with 22 lifecycle-stage templates, send-from-client-profile flow, and communication dashboard.

### Findings

| Requirement | Status | File(s) | Notes |
|-------------|--------|---------|-------|
| `communication_templates` table | PASS | `043_create_communication_templates.sql` | All columns match spec, RLS policies, indexes |
| `client_communications` table | PASS | `043_create_communication_templates.sql` | Status check constraint, proper indexes |
| 22 system templates seeded | PASS | `043_create_communication_templates.sql:86-240` | All templates present with professional content |
| `getTemplates()` action | PASS | `communications.ts` | Returns system + user templates |
| `getTemplate(slug)` action | PASS | `communications.ts` | Single template by slug |
| `getClientCommunications()` action | PASS | `communications.ts` | Client-specific history |
| `getAllCommunications()` action | PASS | `communications.ts` | All communications with pagination |
| `sendCommunication()` action | PASS | `communications.ts:314` | Feature gate + Resend integration + logging |
| `populateMergeFields()` action | PASS | `communications.ts:216-291` | Queries clients, parents, insurance, profiles, listings |
| Send Communication modal | PASS | `send-communication-dialog.tsx` | Template selector, subject/body, preview toggle, send button |
| Communication History component | PASS | `communication-history.tsx` | Timeline, expandable entries, status icons |
| Communications dashboard page | PASS | `clients/communications/page.tsx` | Table with filters, stat cards, pagination |
| Email wrapper used | PASS | `email-helpers.ts` | Branded HTML with logo, colors, footer |
| `hasCommunications` feature flag | PASS | `features.ts:34` | Free=false, Pro=true, Enterprise=true |
| `guardCommunications()` guard | PASS | `guards.ts:200-213` | Proper plan check |
| Missing parent email handling | DEVIATION | `communications.ts:270` | Falls back to "there" but doesn't block send with empty email |
| Email sanitization | PASS | `communications.ts:330-332` | Strips script tags and event handlers |
| Merge field fallbacks | PASS | `communications.ts` | parent_name→"there", agency info from profile |

### Action Items
- **[DEVIATION]** Add validation to block send when `recipientEmail` is empty/invalid

---

## Phase 3: Client Pipeline Dashboard

**Spec Goal:** Visual pipeline view as daily command center — stage cards, attention items, activity feed.

### Findings

| Requirement | Status | File(s) | Notes |
|-------------|--------|---------|-------|
| Pipeline page exists | PASS | `clients/pipeline/page.tsx` | Server component with data fetching |
| Stage cards (7 stages) | PASS | `pipeline/page.tsx:33-41` | All 7 lifecycle stages with counts |
| Click-through to filtered list | PASS | `pipeline/page.tsx:216-234` | Links to `/dashboard/clients?status={key}` |
| Horizontal scroll on mobile | PASS | `pipeline/page.tsx` | `overflow-x-auto` with `sm:grid sm:grid-cols-7` |
| Stage colors match spec | DEVIATION | `pipeline/page.tsx:33-41` | Intake Pending=purple (should be amber), Waitlist=amber (should be purple), On Hold=yellow (should be gray) |
| Overdue task alerts | PASS | `pipeline.ts:130-155` | Queries tasks with due_date < today |
| Expiring authorization alerts | PASS | `pipeline.ts:159-188` | 30-day window, excludes expired/exhausted |
| Stale inquiry alerts (>7 days) | PASS | `pipeline.ts:191-232` | Checks for no recent communications |
| Stale waitlist alerts (>30 days) | PASS | `pipeline.ts:235-274` | Checks for no recent communications |
| New inquiries in activity feed | PASS | `pipeline.ts:326-335` | Recent new clients shown |
| Status change events in activity | MISSING | `pipeline.ts` | Activity type defined but never populated |
| Communications sent in activity | PASS | `pipeline.ts:338-348` | Queries `client_communications` |
| Tasks completed in activity | PASS | `pipeline.ts:351-361` | Queries completed tasks |
| Empty state | PASS | `pipeline/page.tsx:143-185` | "Welcome to Your Pipeline" with CTAs |
| Default landing page | PASS | `middleware.ts:269` | Confirmed redirect to pipeline |
| Quick actions (change stage, send comm) | MISSING | `pipeline/page.tsx` | Only "View" links — SKIPPED per user decision |
| Task automation integration | PASS | `pipeline/page.tsx:131-135` | Non-blocking, feature-gated |

### Action Items
- **[DEVIATION]** Fix stage colors to match spec
- **[MISSING]** Add client status change event logging for activity feed

---

## Phase 4: Automated Task Creation + Credential Tracking

**Spec Goal:** Automated task creation from credential/authorization expiration dates. Credential tracking on employee profiles.

### Findings

| Requirement | Status | File(s) | Notes |
|-------------|--------|---------|-------|
| `employee_credentials` table | PASS | `044_add_task_automation_and_credentials.sql` | Has profile_id, employee_name (text, not FK), credential_name, expiration_date, notes |
| `auto_generated` column on `client_tasks` | PASS | `044_add_task_automation_and_credentials.sql` | Boolean default false, with indexes |
| `runTaskAutomation()` entry point | PASS | `task-automation.ts:31` | Parallel auth + credential checks |
| Authorization expiration check | BUG | `task-automation.ts:69` | Uses **14-day** window — spec says **30 days** |
| Credential expiration check | PASS | `task-automation.ts:179` | Correctly uses 30-day window |
| Duplicate prevention | PASS | `task-automation.ts:259-291` | Checks title + client_id + due_date |
| Auto-generated flag set | PASS | `task-automation.ts:144,233` | Set to true for both task types |
| Called from pipeline page | PASS | `pipeline/page.tsx:131-135` | Non-blocking, feature-gated |
| `hasTaskAutomation` feature flag | PASS | `features.ts:106` | Free=false, Pro=true |
| `guardTaskAutomation()` guard | PASS | `guards.ts:236-249` | Proper plan check |
| `hasCredentialTracking` feature flag | PASS | `features.ts:107` | Free=false, Pro=true |
| `guardCredentialTracking()` guard | PASS | `guards.ts:254-267` | Proper plan check |
| Employee credential UI | MISSING | `employees/page.tsx` | Shows "Team Management Coming Soon" |
| Credential CRUD operations | MISSING | — | No server actions for credential management |
| Credential expiration status badges | MISSING | — | No UI for Current/Expiring/Expired indicators |
| `client_tasks.client_id` nullable | PASS | Migration 040 | No NOT NULL constraint, allows credential tasks |
| Task titles match spec | DEVIATION | `task-automation.ts` | "Renew credential" vs spec's "Review expiring credential" |
| Due date = expiration date | PASS | `task-automation.ts:143,232` | Correct |
| Tasks created as 'pending' | PASS | `task-automation.ts:142,230` | Correct |
| Credential update lifecycle | MISSING | — | No resolution of old tasks when credential updated |
| Tasks view handles null client_id | NOT VERIFIED | — | Credential tasks have null client_id |

### Action Items
- **[BUG]** Change authorization lead time from 14 to 30 days
- **[MISSING]** Build full team management feature with employee CRUD, credential CRUD, tasks, and documents
- **[MISSING]** Credential update lifecycle (resolve old tasks on date change)

---

## Phase 5: Referral Source Tracking + Analytics Enhancement

**Spec Goal:** Add referral source to clients/inquiries, "How did you hear about us?" on forms, auto-tag from directory, analytics breakdown.

### Findings

| Requirement | Status | File(s) | Notes |
|-------------|--------|---------|-------|
| `referral_source` on `clients` table | PASS | `045_add_referral_source_tracking.sql` | Column added |
| `referral_source_other` on `clients` | PASS | `045_add_referral_source_tracking.sql` | Column added |
| `referral_source` on `inquiries` table | PASS | `045_add_referral_source_tracking.sql:25-26` | Both columns added |
| Index on `(profile_id, referral_source)` | PASS | `045_add_referral_source_tracking.sql:16-18` | For analytics queries |
| Client form has referral dropdown | PASS | `client-form.tsx:71,480-505` | Full dropdown with "Other" text input |
| Client validation schemas updated | PASS | `validations/clients.ts:141-153,448-449` | `REFERRAL_SOURCE_OPTIONS` with 11 options |
| Intake form has "How did you hear about us?" | PASS | `client-intake-form.tsx:45-47,84` | Uses `PUBLIC_REFERRAL_SOURCE_OPTIONS` |
| Contact form has referral field | PASS | `contact-form-fields.tsx:31,78-79,111` | With `PUBLIC_REFERRAL_SOURCE_OPTIONS` |
| Contact validation updated | PASS | `validations/contact.ts:28-29` | `referralSource` and `referralSourceOther` |
| `?ref=findabatherapy` on directory links | MISSING | — | NOT found anywhere in source code. Only branded agency page has referral tracking in CTA links |
| `convertInquiryToClient()` carries source | PASS | `clients.ts:1961-1962` | Defaults to "findabatherapy" if not set |
| `getReferralAnalytics()` action | PASS | `referral-analytics.ts` | Returns breakdown with counts, percentages |
| FindABATherapy attribution callout | PASS | `analytics/page.tsx:213-232` | Prominent card with count and percentage |
| Referral breakdown chart | PASS | `analytics/page.tsx:240-260` | Bar chart with source labels |
| Analytics gated to Pro | PASS | `analytics/page.tsx` | Checks plan features before showing |
| Client detail shows referral source | PASS | `client-full-detail.tsx:1133` | Field displayed in client info |

### Action Items
- **[MISSING]** Add `?ref=findabatherapy` to ALL CTA links on directory listing/provider profile pages

---

## Phase 6: Branded Agency Page + Onboarding Rework + Free/Paid Restructuring

**Spec Goal:** Build branded agency page, rework onboarding, restructure free/paid tiers, update pricing displays, update marketing messaging.

### 6A: Free/Paid Restructuring

| Requirement | Status | File(s) | Notes |
|-------------|--------|---------|-------|
| `maxLocations`: 1→3 (free) | PASS | `features.ts` | Set to 3 |
| `maxPhotos`: 0→3 (free) | PASS | `features.ts` | Set to 3 |
| `hasAgeRange`: false→true (free) | PASS | `features.ts` | Set to true |
| `hasLanguages`: false→true (free) | PASS | `features.ts` | Set to true |
| `hasDiagnoses`: false→true (free) | PASS | `features.ts` | Set to true |
| `hasSpecialties`: false→true (free) | PASS | `features.ts` | Set to true |
| `maxJobPostings`: 0→1 (free) | PASS | `features.ts` | Set to 1 |
| `maxClients`: new field (10/250/999) | PASS | `features.ts` | All tiers set |
| `hasCommunications` | PASS | `features.ts` | Free=false, Pro/Ent=true |
| `hasBrandedPages` | PASS | `features.ts` | Free=false, Pro/Ent=true |
| `hasInsuranceTracking` | PASS | `features.ts` | Free=false, Pro/Ent=true |
| `hasAuthTracking` | PASS | `features.ts` | Free=false, Pro/Ent=true |
| `hasDocuments` | PASS | `features.ts` | Free=false, Pro/Ent=true |
| `hasAutoTasks` (hasTaskAutomation) | PASS | `features.ts` | Free=false, Pro/Ent=true |
| `hasReferralTracking` | PASS | `features.ts` | Free=false, Pro/Ent=true |
| `guardAddClient()` | PASS | `guards.ts:272-287` | Checks maxClients |
| `guardBrandedPages()` | PASS | `guards.ts:292-305` | Checks hasBrandedPages |
| Services attributes ungated | PASS | `services-attributes-card.tsx:26` | Comment confirms no longer gated |
| Locked feature messaging updated | PASS | `locked-feature.tsx` | Contextual upgrade messages |

### 6B: Branded Agency Page

| Requirement | Status | File(s) | Notes |
|-------------|--------|---------|-------|
| Page at `/p/[slug]` | PASS | `src/app/p/[slug]/page.tsx` | Server-rendered, ISR 300s |
| `noindex` meta tag | PASS | `p/[slug]/page.tsx:70-74` | Robots noindex, nofollow |
| Open Graph tags | PASS | `p/[slug]/page.tsx:75-86` | Title, description, image |
| Hero component | PASS | `branded/agency-page-hero.tsx` | Logo, name, headline |
| Locations component | PASS | `branded/agency-page-locations.tsx` | Location cards grid |
| Services component | PASS | `branded/agency-page-services.tsx` | Tags/badges for attributes |
| Insurance component | PASS | `branded/agency-page-insurance.tsx` | Insurance list |
| Gallery component | PASS | `branded/agency-page-gallery.tsx` | Photo grid |
| CTA component (free/Pro gating) | PASS | `branded/agency-page-cta.tsx` | Free shows contact info, Pro shows form links |
| Footer component | PASS | `branded/agency-page-footer.tsx` | Contact info, branding |
| Dashboard management page | PASS | `intake-pages/branded-page/page.tsx` | Shareable link, copy button, preview |
| View tracking | PASS | `p/[slug]/page.tsx:138-145` | ViewTracker component |
| CTA referral tracking | PASS | `agency-page-cta.tsx:25` | Adds `refParam` to links |

### 6C: Onboarding Rework

| Requirement | Status | File(s) | Notes |
|-------------|--------|---------|-------|
| Intent selection removed | PASS | `onboarding/page.tsx:18` | Defaults to "both" |
| Welcome messaging updated | PASS | `onboarding/page.tsx:27` | "Let's set up your agency" |
| All fields free in enhanced step | PASS | `onboarding/enhanced/page.tsx:53-61` | No plan gating |
| Branded preview step exists | PASS | `onboarding/branded-preview/page.tsx` | Star card + 4 supporting cards |
| Stripe checkout integration | PASS | `branded-preview/page.tsx:47` | `createCheckoutSession("pro", "month", "onboarding")` |
| "Continue with Free" button | PASS | `branded-preview/page.tsx:237-246` | Routes to review step |
| Step progression updated | PASS | `onboarding-progress.tsx:20-27` | 6 steps: welcome→details→location→enhanced→branded-preview→review |
| Success page plan-differentiated | PASS | `onboarding/success/page.tsx:36-37` | Pro vs Free messaging |

### 6D: Pricing Display Updates

| Requirement | Status | File(s) | Notes |
|-------------|--------|---------|-------|
| Get-listed page updated | PASS | `get-listed/page.tsx:72-120` | Free: 3 locations, 3 photos, all details, 1 job, 10 clients |
| Unified pricing table updated | PASS | `unified-pricing-table.tsx` | Feature matrix reflects new tiers |
| Billing page updated | PASS | `billing/page.tsx` | Plan comparison with new features |
| Stripe config updated | PASS | `stripe/config.ts` | Feature strings for Pro/Enterprise |

### 6E: Marketing Site Messaging

| Requirement | Status | File(s) | Notes |
|-------------|--------|---------|-------|
| "Fill your caseload" hero | PASS | `behaviorwork/page.tsx:87` | Exact spec language used |
| "First contact to active services" | PASS | `behaviorwork/page.tsx:195` | Lifecycle narrative present |
| BehaviorWork landing page | PASS | `behaviorwork/page.tsx` | Full marketing page with pricing |
| BehaviorWork get-started page | PASS | `behaviorwork/get-started/page.tsx` | Onboarding-focused |
| `behaviorwork.ts` content model | DEVIATION | `content/behaviorwork.ts:36-60` | Still uses "Client Growth / Hiring Growth / Operations" three-pillar model |

### Action Items
- **[DEVIATION]** Update `behaviorwork.ts` content to match client lifecycle narrative

---

## Cross-Cutting Concerns

### Data Integrity
- All new tables have RLS policies ✅
- All new tables have proper indexes ✅
- Soft deletes used consistently ✅
- Zod validation on new form inputs ✅

### Feature Gating Consistency
- All new features gated in both UI and server ✅
- Free users see locked states with upgrade prompts ✅
- Upgrade prompts are specific and contextual ✅

### Navigation
- All new pages accessible from sidebar ✅
- Old routes work via aliases ✅
- Mobile navigation matches desktop ✅
- Active state highlighting works ✅

### Email System
- Communications use `emailWrapper()` ✅
- Agency branding included ✅
- Sanitization applied ✅

### Performance
- Pipeline uses JS-based counting (Supabase doesn't support GROUP BY) — acceptable ✅
- Task automation is idempotent ✅
- Branded agency page is server-rendered with ISR ✅

---

## Remediation Plan

### Priority 1: Critical
1. Fix authorization task lead time (14→30 days) — `task-automation.ts:69`
2. Implement Tasks badge query — `dashboard-sidebar.tsx:385`
3. Add `?ref=findabatherapy` to directory listing CTA links

### Priority 2: Significant
4. Build full team management feature (employees, credentials, tasks, documents)
5. Fix pipeline stage colors to match spec

### Priority 3: UX Improvements
6. Add client status change activity logging
7. Add parent email validation before sending communications
8. Update `behaviorwork.ts` content model

### Priority 4: Testing
9. Full build verification (tsc, lint, build)
10. End-to-end flow testing (onboarding, client lifecycle, referral tracking, task automation)
