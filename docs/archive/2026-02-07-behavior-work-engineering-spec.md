# BEHAVIOR WORK — Engineering Specification

**Phase-by-Phase Implementation Guide for Coding Agents**

Version 1.0 — February 7, 2026
Companion document to: Behavior-Work-Strategy.md

---

## How to Use This Document

This spec is designed to be consumed by a coding agent one phase at a time. Each phase is self-contained with everything the agent needs: what to change, which files to touch, how the pieces connect, what not to forget, and design/copy guidance. Phases build on each other — complete them in order.

**What this doc IS:** A roadmap of changes, connections, constraints, and design intent. It tells you WHAT to build, WHERE it goes, HOW it connects, and WHY it matters.

**What this doc is NOT:** Line-by-line code. You'll explore the codebase, read the actual files, and write the implementation. This doc ensures you change the right things and don't miss anything.

**Before starting any phase:** Read the relevant source files listed. Understand the existing patterns. Match them. The codebase uses Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui, Supabase (PostgreSQL + Auth + Storage), Stripe, Resend, and PostHog.

---

## Codebase Patterns to Follow

Before writing any code, internalize these patterns from the existing codebase. Every new feature should match these conventions exactly.

### Server Actions Pattern
All data operations use Next.js server actions in `src/lib/actions/*.ts`. They follow this signature:
```
async function doSomething(params): Promise<ActionResult<T>>
```
Where `ActionResult` is either `{ success: true; data: T }` or `{ success: false; error: string }`. Always use this pattern for new actions.

### Zod Validation Pattern
Form inputs are validated with Zod schemas in `src/lib/validations/*.ts`. Every new form should have a corresponding Zod schema. Check `src/lib/validations/clients.ts` for the exact pattern — it exports both the schema and the inferred TypeScript type.

### Feature Gating Pattern (Client-Side)
The `FeatureGate` component wraps UI elements that require a specific plan. It checks `usePlanFeatures()` and either renders children or shows a locked state. Use this for all new Pro/Enterprise features.

### Feature Gating Pattern (Server-Side)
Guard functions in `src/lib/plans/guards.ts` are called from server actions and page components. They return `{ allowed: true }` or `{ allowed: false; reason; requiredPlan }`. Every server action that touches a gated feature must call the relevant guard.

### Database Query Pattern
Queries use Supabase client from `createClient()` (server-side). Check any existing action file for the pattern: create client → query with `.select()` → handle error → return ActionResult. All queries should filter by `profile_id` for multi-tenancy and `deleted_at IS NULL` for soft deletes.

### Email Sending Pattern
All emails go through Resend via helper functions in `src/lib/email/notifications.ts`. The pattern: compose HTML using `emailWrapper()` + content helpers → call `resend.emails.send()` with from/to/subject/html. New emails should follow this exact pattern.

### Component Pattern
Dashboard components use shadcn/ui primitives (Card, Button, Dialog, etc.) styled with Tailwind. Check any existing dashboard page for the layout pattern: server component fetches data → passes to client components → client components handle interaction.

### Error Handling Pattern
Server actions catch errors and return `{ success: false, error: message }`. Client components show toast notifications on error using the existing toast system. Never throw unhandled errors from server actions.

### Merge Field Fallback Convention
When populating merge fields in templates (Phase 2), use this fallback strategy:
- If a field value is NULL or empty, replace the merge placeholder with an empty string (don't show `{field_name}` in the email).
- For `{parent_name}`: fall back to "there" (e.g., "Hi there" instead of "Hi {parent_name}").
- For `{agency_phone}` / `{agency_email}`: fall back to the `profiles.contact_email`. If that's also empty, omit the contact line entirely.
- For optional fields like `{assessment_date}`, `{assessment_time}`, `{assessment_location}`: if any are empty, omit the entire sentence/paragraph that references them rather than showing blanks.
- The `populateMergeFields()` function should query: `clients` (joined with `client_parents` for primary parent), `client_insurances` (primary), `profiles`, `listings`, `locations` (primary), and `media_assets` (logo).

---

## Codebase Architecture Quick Reference

### Tech Stack
- **Framework:** Next.js 15 (App Router with route groups)
- **UI:** React 19 + TypeScript + Tailwind CSS + shadcn/ui components
- **Database:** Supabase (PostgreSQL with RLS, 42+ migrations)
- **Auth:** Supabase Auth (email/password)
- **Billing:** Stripe (Free $0 / Pro $79mo / Enterprise $199mo)
- **Email:** Resend with branded HTML templates
- **Analytics:** PostHog (self-hosted proxy at /ingest)

### Route Groups
- `(dashboard)` — Authenticated dashboard at /dashboard/*
- `(site)` — Public marketing site, directory, provider profiles
- `(intake)` — Branded forms: /contact/[slug], /intake/[slug]/client, /resources/[slug]
- `(auth)` — Sign in, sign up, password reset
- `(jobs)` — Job board: /jobs/*, /job/[slug], /employers/*

### Key Files You'll Touch Repeatedly
- `src/components/dashboard/dashboard-sidebar.tsx` — Sidebar navigation (WorkspaceKey type, workspaceTabs, workspaceNav)
- `src/lib/plans/features.ts` — PlanFeatures interface and tier configs
- `src/lib/plans/guards.ts` — Server-side feature guard functions
- `src/components/ui/feature-gate.tsx` — Client-side feature gating component
- `src/lib/actions/clients.ts` — Client CRUD server actions
- `src/lib/email/notifications.ts` — All email templates and sending logic
- `src/middleware.ts` — Multi-domain routing, auth checks, redirects
- `src/lib/stripe/config.ts` — Stripe plan configs and price IDs
- `src/components/onboarding/onboarding-progress.tsx` — Onboarding step definitions

### Current Dashboard Navigation Structure (What You're Changing)
```
WorkspaceKey = "client_growth" | "hiring" | "operations"

client_growth → Overview, Notifications (badge), Profile, Locations, Analytics
hiring → Jobs, Applicants (badge), Employees, Careers Page
operations → Overview, Clients, Tasks, Branded Forms, Resources
```

### Current Database Tables (Relevant)
- `profiles` — Account, plan_tier, stripe fields, onboarding_completed_at
- `listings` — Provider directory listing, slug, status, service data
- `locations` — Service locations per listing
- `media_assets` — Photos, videos, logos
- `listing_attribute_definitions` / `listing_attribute_values` — Searchable attributes
- `inquiries` — Contact form submissions (status: unread/read/replied/archived/converted)
- `clients` — Client records with lifecycle status enum
- `client_parents`, `client_locations`, `client_insurances`, `client_authorizations`, `client_documents`, `client_tasks`, `client_contacts` — Related client data
- `job_postings`, `job_applications` — Jobs system
- `featured_orders` — Featured placement subscriptions

---

## PHASE 1: Reorganize the Dashboard

**Goal:** Restructure existing functionality from three workspaces (Client Growth / Hiring / Operations) into a client-lifecycle-centered layout. No new features — pure reorganization.

**Why first:** Every subsequent phase adds features to the new navigation structure. Get the foundation right before building on it.

### What Changes

The three-workspace model fragments the client journey. Client CRM lives in Operations while intake tools live in Client Growth. The new structure unifies everything around the client lifecycle.

**New navigation structure:**

```
ALWAYS VISIBLE (persistent, with badges):
  📥 Inbox — Unread badge (inquiry messages + job applications)
  ✅ Tasks — Count badge (overdue + due today)

CLIENTS (primary section — default landing):
  Pipeline — Visual stage overview with counts
  All Clients — Full CRM list
  Communications — (placeholder for Phase 2)

INTAKE & PAGES:
  Intake Form — Branded intake form setup
  Contact Form — Branded contact form setup
  Resources — Parent resource center
  Directory Listing — FindABATherapy profile

TEAM:
  Employees — Staff directory
  Jobs — Job posting management
  Applicants — Application tracking
  Careers Page — Branded careers page

COMPANY & SETTINGS:
  Profile & Branding — Agency info, logo
  Locations — Service locations
  Analytics — Listing and pipeline metrics
  Billing — Subscription management
  Account — User settings
```

### Files to Touch

#### 1. Dashboard Sidebar (`src/components/dashboard/dashboard-sidebar.tsx`)

This is the primary file. Currently defines:
- `WorkspaceKey` type as `"client_growth" | "hiring" | "operations"`
- `workspaceTabs` array with three workspace tab objects
- `workspaceNav` Record mapping each workspace to nav items
- Badge functions: `getUnreadInquiryCount()`, `getNewApplicationCount()`

**Changes:**
- Replace the `WorkspaceKey` type and workspace-based architecture with a section-based architecture. The new model has no workspace selector — instead, it has persistent top-level items (Inbox, Tasks) and collapsible section groups (Clients, Intake & Pages, Team, Company & Settings).
- Remove the workspace tab selector UI entirely. Replace with section headers that can collapse/expand.
- Move the badge logic for Inbox to combine both `getUnreadInquiryCount()` and `getNewApplicationCount()` into one count.
- Add a Tasks badge that queries `client_tasks` for items where `status != 'completed'` AND (`due_date <= today` OR `due_date IS NULL`). The query for this doesn't exist yet — create a new server action or inline query.
- Update the `workspaceNav` Record into a new `sectionNav` structure matching the layout above.
- The Clients section should be expanded by default when the user lands on the dashboard.
- Store the expanded/collapsed state of each section in localStorage (similar to how `dashboard_workspace_v1` currently stores the active workspace).

**Nav item mapping (old → new):**

| Old Location | New Location |
|---|---|
| client_growth → Notifications | **Top-level → Inbox** (combine inquiry + application badges) |
| operations → Tasks | **Top-level → Tasks** (add badge) |
| operations → Clients | **Clients → All Clients** |
| NEW | **Clients → Pipeline** (placeholder page for Phase 3) |
| NEW | **Clients → Communications** (placeholder for Phase 2) |
| operations → Branded Forms | Split into **Intake & Pages → Intake Form** and **Intake & Pages → Contact Form** |
| operations → Resources | **Intake & Pages → Resources** |
| client_growth → Profile | **Company & Settings → Profile & Branding** |
| client_growth → Locations | **Company & Settings → Locations** |
| client_growth → Analytics | **Company & Settings → Analytics** |
| hiring → Jobs | **Team → Jobs** |
| hiring → Applicants | **Team → Applicants** |
| hiring → Employees | **Team → Employees** |
| hiring → Careers Page | **Team → Careers Page** |
| NEW (from billing page) | **Company & Settings → Billing** |
| NEW (from account/settings) | **Company & Settings → Account** |

#### 2. Mobile Navigation (`src/components/dashboard/dashboard-mobile-nav.tsx`)

Mirror the sidebar changes. Inbox and Tasks should be the first two items visible when the mobile nav opens, with their badges. Below them, the section groups.

#### 3. Dashboard Topbar (`src/components/dashboard/dashboard-topbar.tsx`)

Optionally add small icon buttons for Inbox and Tasks in the topbar for quick access. Not required but improves UX when the sidebar is collapsed on smaller screens.

#### 4. Route Files — Create New Route Aliases

The goal is to keep existing routes working (backward compatibility) while establishing the new canonical routes. The codebase already uses an `aliases` array pattern in nav items — leverage this.

**New route pages to create (can be simple re-exports or redirects to existing pages):**

| New Route | Points To (Existing Page) |
|---|---|
| `/dashboard/clients` | Current `/dashboard/operations/clients` page |
| `/dashboard/clients/pipeline` | New placeholder page (Phase 3) |
| `/dashboard/clients/communications` | New placeholder page (Phase 2) |
| `/dashboard/intake-pages/intake-form` | Current `/dashboard/operations/forms` (intake section) |
| `/dashboard/intake-pages/contact-form` | Current `/dashboard/operations/forms` (contact section) |
| `/dashboard/intake-pages/resources` | Current `/dashboard/operations/resources` |
| `/dashboard/intake-pages/directory` | Current `/dashboard/client-growth/company` (or a new focused page) |
| `/dashboard/team/employees` | Current `/dashboard/hiring/employees` |
| `/dashboard/team/jobs` | Current `/dashboard/hiring/jobs` |
| `/dashboard/team/applicants` | Current `/dashboard/hiring/applicants` |
| `/dashboard/team/careers` | Current `/dashboard/hiring/careers` |
| `/dashboard/settings/profile` | Current `/dashboard/company` or `/dashboard/branding` |
| `/dashboard/settings/locations` | Current `/dashboard/locations` |
| `/dashboard/settings/analytics` | Current `/dashboard/analytics` |
| `/dashboard/settings/billing` | Current `/dashboard/billing` |
| `/dashboard/settings/account` | Current `/dashboard/account` or `/dashboard/settings` |

**Implementation approach:** You can either create new route directories with `page.tsx` files that re-export the existing page components, OR you can create redirect files. The first approach is cleaner because it lets the URLs update. Keep the old routes working via the `aliases` pattern or Next.js redirects in `next.config.js`.

#### 5. Default Landing Page

Currently, authenticated users are redirected to `/dashboard/client-growth` after login (see middleware.ts). Change this to redirect to `/dashboard/clients/pipeline` (or `/dashboard/clients` if pipeline isn't ready yet). Update the middleware redirect target.

#### 6. Layout Files

Check all `layout.tsx` files under `(dashboard)` route groups. The current workspace layouts (client-growth, hiring, operations) may apply workspace-specific layout wrappers. Ensure the new section-based routes share a common dashboard layout that includes the updated sidebar.

### How Things Connect

- **Sidebar → Routes:** The sidebar nav items have `href` properties that must match the new route paths. The `aliases` array handles backward compatibility.
- **Middleware → Default route:** The auth redirect in `middleware.ts` determines where users land after login. Must point to the new Clients section.
- **Badge queries → Sidebar:** The badge count functions are called from the sidebar component. The Inbox badge combines two existing queries. The Tasks badge needs a new query.
- **Mobile nav → Sidebar:** Mobile nav must stay in sync. They should share the same nav config data structure.
- **Onboarding → Post-onboarding redirect:** After onboarding completes, where does the user go? Currently goes to `/dashboard/client-growth`. Update to go to `/dashboard/clients`.

### Don't Forget

- [ ] Update ALL internal `<Link>` components and `router.push()` calls that reference old workspace routes. Search the entire codebase for strings like `/dashboard/client-growth`, `/dashboard/operations`, `/dashboard/hiring`.
- [ ] Update breadcrumb components if they exist. Check for breadcrumb logic that infers section from URL path.
- [ ] The `inferWorkspaceFromPath()` function in the sidebar derives the active workspace from the current pathname. This logic needs to be rewritten for the section-based model.
- [ ] localStorage key `dashboard_workspace_v1` stores the selected workspace. Either migrate this to track expanded sections, or remove it.
- [ ] Test that the demo mode still works (check for `isDemo` prop usage in the sidebar).
- [ ] Test that the onboarding gate still works — the `onboarding-gate.tsx` component prevents dashboard access before onboarding is complete.
- [ ] Check for any PostHog events that track workspace navigation. Update event names/properties.

### Design Guidance

**Section headers:** Use the same font weight as current workspace tab labels. Add a subtle chevron icon for expand/collapse. When collapsed, only the section header shows. When expanded, the nav items appear indented slightly below.

**Badge design:** Match the existing red circle badge style used for Notifications. The Tasks badge should use the same component but could use a different accent color (amber/orange for urgency) or the same red.

**Active state:** The currently active nav item should have the same visual treatment as today (background highlight, bold text, accent color bar on the left).

**Default expanded state:** On first visit (no localStorage), expand the Clients section and collapse the rest. This directs attention to the primary section.

**Spacing:** Keep the persistent items (Inbox, Tasks) visually separated from the section groups. A subtle divider line or extra spacing works.

**Icons:** Use Lucide icons consistent with the existing set. Suggested:
- Inbox: `Inbox` or `Bell`
- Tasks: `CheckSquare` or `ListTodo`
- Clients section: `Users`
- Pipeline: `Kanban` or `LayoutDashboard`
- All Clients: `UserCircle`
- Communications: `Mail` or `MessageSquare`
- Intake & Pages: `FileInput` or `Globe`
- Team: `Briefcase`
- Company & Settings: `Settings`

---

## PHASE 2: Communication Templates System

**Goal:** Build the email template system that transforms passive client records into active lifecycle management. This is the single most important new feature.

**Why second:** The dashboard reorganization (Phase 1) gives us the Clients section with a Communications sub-page. This phase fills that page and adds the "Send Communication" action to every client profile.

### What to Build

Three things: (1) a database layer for templates and sent communications, (2) a send-from-client-profile flow, and (3) a Communications dashboard page.

### Database Changes

**New table: `communication_templates`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| profile_id | uuid FK → profiles | NULL for system defaults, set for agency-customized |
| name | text NOT NULL | Display name (e.g., "Inquiry Received") |
| slug | text NOT NULL UNIQUE | Machine name (e.g., "inquiry-received") |
| lifecycle_stage | text | Maps to client status enum values or "any" |
| subject | text NOT NULL | Email subject with merge field placeholders |
| body | text NOT NULL | HTML body with merge field placeholders |
| merge_fields | text[] | List of merge field keys used in this template |
| sort_order | integer | Display ordering |
| is_active | boolean DEFAULT true | Soft enable/disable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Seed data:** 22 templates as defined in the strategy doc Section 7.1. Each template needs professionally written default subject lines and body content. The body should be clean HTML that works inside the existing `emailWrapper()` from `src/lib/email/notifications.ts`.

**New table: `client_communications`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| client_id | uuid FK → clients | |
| profile_id | uuid FK → profiles | Who sent it |
| template_slug | text | Which template was used (NULL if freeform) |
| subject | text NOT NULL | Actual subject sent |
| body | text NOT NULL | Actual body sent (after merge field population) |
| recipient_email | text NOT NULL | |
| recipient_name | text | |
| status | text DEFAULT 'sent' | 'sent', 'failed', 'bounced' |
| sent_at | timestamptz | |
| sent_by | uuid FK → auth.users | |
| created_at | timestamptz | |

**RLS policies:** Both tables need RLS. Templates: users see system defaults plus their own custom templates. Communications: users see only communications belonging to their profile_id.

**Migration:** Create as a new Supabase migration file following the existing naming pattern (check the latest migration number in `/supabase/migrations/`).

### Files to Create

#### 1. Template Seed Data

Create a seed file or include INSERT statements in the migration. Each of the 22 templates needs:

**Subject line format:** Clear, professional, includes `{agency_name}` where appropriate.

**Body content guidance:** Each template body should follow this structure:
1. Greeting with `{parent_name}`
2. Core message (1-2 paragraphs, warm and professional)
3. Next steps or action items (if applicable)
4. Closing with agency contact info
5. All wrapped in the existing `emailWrapper()` pattern from the email system

**Merge fields available:**
```
{client_name} — Child's first + last name
{parent_name} — Primary parent's first + last name
{parent_email} — Primary parent's email
{agency_name} — From profiles.agency_name
{agency_phone} — From locations (primary) phone
{agency_email} — From profiles.contact_email
{agency_logo} — From media_assets where type = 'logo'
{insurance_name} — From client's primary insurance
{assessment_date} — Manual entry or from notes
{assessment_time} — Manual entry
{assessment_location} — Manual entry
{resources_link} — /resources/[slug]
{intake_link} — /intake/[slug]/client
{contact_link} — /contact/[slug]
```

#### 2. Server Actions (`src/lib/actions/communications.ts`)

New file with:

```
getTemplates() — Returns all active templates (system defaults + agency customs)
getTemplate(slug) — Returns single template with merge fields
getClientCommunications(clientId) — Returns sent communication history for a client
getAllCommunications(filters) — Returns all communications for the agency (for dashboard page)
sendCommunication(clientId, templateSlug, subject, body, recipientEmail) — Populates merge fields, sends via Resend, logs to client_communications
populateMergeFields(templateBody, clientId) — Queries client data and replaces all {field} placeholders
```

**How sending works:**
1. User clicks "Send Communication" on a client profile
2. Modal opens with template selector dropdown
3. Selecting a template auto-populates subject and body with merge fields resolved
4. User can preview, edit subject and body freely
5. User clicks Send
6. Server action: validate, send via Resend using the existing email infrastructure, log to client_communications
7. Toast confirmation on success

#### 3. Send Communication Modal Component

Create a reusable modal component that can be triggered from the client profile page. It needs:
- Template selector dropdown (grouped by lifecycle stage)
- Subject line input (pre-populated, editable)
- Rich text body area (pre-populated, editable) — start with a plain textarea, can upgrade to rich editor later
- Preview toggle that shows the email as it would render in the `emailWrapper()` formatting
- Recipient display (auto-set from primary parent email, not editable unless no parent email exists)
- Send button with loading state
- Cancel button

#### 4. Client Profile Integration

The client profile page (find it under the operations/clients route group) needs a "Send Communication" button prominently placed. Also add a "Communication History" section/tab that shows all previously sent communications with timestamp, template used, subject, and a way to view the full content.

#### 5. Communications Dashboard Page

This is the new page at `/dashboard/clients/communications` (or the route you established in Phase 1). It shows:
- A table/list of all communications sent across all clients
- Columns: Date, Client Name, Template, Subject, Status (sent/failed)
- Filter by: date range, template, client
- Click to view full communication details

#### 6. Email Rendering

Leverage the existing `emailWrapper()` function from `src/lib/email/notifications.ts`. This function already produces branded HTML emails with the therapy blue header, logo placement, and footer. Your communication templates should render their body content INSIDE this wrapper.

**Read the existing email functions carefully.** The patterns for `emailWrapper()`, `primaryButton()`, `infoCard()` are all defined there. Your template bodies should use these same helper functions for consistent styling.

**Brand colors (already defined):**
- Primary: `#5788FF` (therapy blue)
- Text dark: `#1e293b`
- Text medium: `#475569`
- Background: `#f8fafc`

### How Things Connect

- **Client profile → Modal → Resend:** The send flow goes from UI through a server action that calls Resend's API using the existing integration pattern. Look at `sendProviderInquiryNotification()` for the exact Resend API call pattern.
- **Templates → Merge fields → Client data:** Template bodies contain `{field}` placeholders. The `populateMergeFields()` function queries the client record, primary parent, primary insurance, listing, and profile to resolve all fields.
- **Communication log → Client profile:** Every sent email is logged in `client_communications`. This log appears on the client profile as a history section. It also feeds the Communications dashboard page.
- **Feature gating:** Communications are gated to Pro/Enterprise. Use the existing `canAccessFeature()` guard pattern. Add a new feature flag like `hasCommunications` to the PlanFeatures interface (true for Pro/Enterprise, false for Free).

### Don't Forget

- [ ] Add `hasCommunications` to the `PlanFeatures` interface in `features.ts`. Set false for free, true for pro/enterprise.
- [ ] Add a `guardCommunications()` function to `guards.ts`.
- [ ] The template body is stored as HTML in the database. Sanitize user-edited content before sending to prevent XSS in emails.
- [ ] Handle the case where a client has no primary parent (no recipient email). Show a warning and prompt the user to add parent contact info first.
- [ ] Handle Resend send failures gracefully. Log the failure status in client_communications. Show user-friendly error.
- [ ] Consider email "from" address. Currently the system uses a Behavior Work sending address. The same pattern should apply here.
- [ ] Index `client_communications` on `client_id` and `profile_id` for query performance.
- [ ] The template selector should group templates by lifecycle stage for easy navigation (e.g., "Inquiry", "Intake", "Assessment", "Active", etc.).

### Design Guidance

**Send Communication Modal:** Full-screen on mobile, centered modal (max-width 640px) on desktop. Clean, minimal. Template selector at the top with a label like "Choose a template or start from scratch." The body editor should feel like composing an email — not like filling out a form.

**Communication History on Client Profile:** Show as a timeline — most recent at top. Each entry shows: icon (envelope), date/time, subject line (clickable to expand), template name in a subtle badge. When expanded, show the full body content in a card. Design reference: think of how Stripe shows event logs — clean, chronological, expandable.

**Communications Dashboard Page:** Standard data table with filters. Match the existing table patterns used in the Clients list and Applicants list. Don't over-build — this is a reference/audit view, not a daily workspace.

### Copy Guidance for Template Content

All 22 templates should feel warm, professional, and parent-friendly. ABA therapy is a sensitive topic — parents are often stressed, worried, and navigating an overwhelming system. The tone should be:

- **Reassuring:** "We received your information and we're reviewing it now."
- **Clear:** "Here's what happens next: [specific steps]."
- **Human:** Use "we" and "your family" — not clinical jargon.
- **Action-oriented:** Every email should tell the parent what to do next (or explicitly say "no action needed from you right now").
- **Brief:** 3-5 short paragraphs max. Parents are busy.

**Example — Template #1: Inquiry Received**

Subject: `We received your message, {parent_name}`

Body concept:
> Hi {parent_name},
>
> Thank you for reaching out to {agency_name}. We've received your message and a member of our team will be in touch within [timeframe].
>
> In the meantime, if you have any questions about our services or would like to learn more about ABA therapy, feel free to visit our resource page: {resources_link}
>
> We look forward to connecting with your family.
>
> Warm regards,
> The {agency_name} Team
> {agency_phone} | {agency_email}

---

## PHASE 3: Client Pipeline Dashboard

**Goal:** Build the visual pipeline view that becomes the agency's daily command center — the first thing they see when they open the dashboard.

**Why third:** Phase 1 created the route placeholder for Pipeline. Phase 2 added communications. Now we build the view that ties it all together.

### What to Build

A single page at `/dashboard/clients/pipeline` (the default landing page) that shows the agency's entire caseload organized by lifecycle stage.

### Page Structure

**Top section — Stage cards (horizontal row, scrollable on mobile):**

One card per lifecycle stage. Each card shows:
- Stage name with color-coded accent (match existing client status badge colors from the CRM)
- Client count in that stage
- Click to filter the client list below (or navigate to All Clients with a stage filter applied)

Stages in order: Inquiry → Intake Pending → Waitlist → Assessment → Active → On Hold → Discharged

**Middle section — Alerts/attention items:**

A condensed list of items that need attention RIGHT NOW:
- Clients with overdue tasks (task due_date < today, status != completed)
- Authorizations expiring within 30 days (from client_authorizations.end_date)
- Clients in Inquiry or Intake Pending for more than 7 days without a communication sent
- Clients on Waitlist for more than 30 days without a communication sent

Each alert item shows: client name, alert type, and a quick action button (e.g., "View" goes to client profile, "Send Update" opens the communication modal).

**Bottom section — Recent activity:**

A simple timeline of recent client events:
- New inquiries received
- Client status changes
- Communications sent
- Tasks completed

This data can be assembled from: `clients.created_at`, `clients.updated_at` (for status changes), `client_communications.sent_at`, `client_tasks.completed_at`.

### Files to Create/Modify

#### 1. Pipeline Page (`src/app/(dashboard)/dashboard/clients/pipeline/page.tsx`)

Server component that queries:
- Client counts by status (already available via `getClients()` which returns `ClientCounts`)
- Overdue tasks (new query against `client_tasks`)
- Expiring authorizations (new query against `client_authorizations`)
- Communication gaps (join clients → client_communications, check for recent sends)
- Recent activity (union query or multiple queries combined)

#### 2. Pipeline Components

- `StageCard` — The summary card for each lifecycle stage
- `AlertList` — The attention items section
- `ActivityFeed` — The recent activity timeline

#### 3. Server Actions

Add to `src/lib/actions/clients.ts` or create `src/lib/actions/pipeline.ts`:

```
getPipelineData() — Returns stage counts, alerts, and recent activity in one call
getAttentionItems() — Returns overdue tasks, expiring auths, stale clients
getRecentActivity(limit) — Returns recent events across clients
```

### How Things Connect

- **Pipeline → Client list:** Clicking a stage card navigates to `/dashboard/clients?status=inquiry` (or whatever filter mechanism exists). Check how the current client list handles URL-based filtering.
- **Pipeline → Client profile:** Alert items and activity items link to specific client profiles.
- **Pipeline → Communication modal:** "Send Update" on stale-client alerts should open the communication modal pre-targeted to that client.
- **Badge data:** The alert count on the Pipeline could also feed into the sidebar to show a notification dot on the Clients section header.

### Don't Forget

- [ ] The pipeline page must be the DEFAULT landing page for the dashboard. Verify the middleware redirect and any `router.push()` calls that redirect after login.
- [ ] Gate this page appropriately. Free users can see the pipeline but may have limited client records (10 max). Show their data — don't hide the page.
- [ ] Performance: If an agency has hundreds of clients, the pipeline queries need to be efficient. Use database-level aggregation (COUNT with GROUP BY) rather than fetching all clients and counting in JS.
- [ ] The "communication gap" alert is the trickiest query — it needs to LEFT JOIN clients with client_communications and find clients where the most recent communication is older than X days (or NULL). Consider a database view or a well-indexed query.
- [ ] Empty state: When an agency has zero clients, show a welcoming empty state with a CTA to "Add your first client" or "Share your intake form to start receiving inquiries."

### Design Guidance

**Stage cards:** Horizontal row, equal width, with the stage name, a large count number, and a subtle color bar on top matching the status color. Think of a kanban board header but simpler — cards, not columns. On mobile, these scroll horizontally.

**Color coding for stages (suggested):**
- Inquiry: Blue (`#3B82F6`)
- Intake Pending: Yellow/Amber (`#F59E0B`)
- Waitlist: Purple (`#8B5CF6`)
- Assessment: Orange (`#F97316`)
- Active: Green (`#10B981`)
- On Hold: Gray (`#6B7280`)
- Discharged: Slate (`#94A3B8`)

Check the existing client status badge colors in the CRM and match those exactly for consistency.

**Alerts section:** Use a clean card with a yellow/amber left border. Each item is a single row with: icon (warning triangle or clock), client name (linked), brief description, and action button on the right. No more than 5-10 items visible — show a "View all" link if there are more.

**Activity feed:** Simple vertical timeline. Each entry has a small dot icon, timestamp, and one-line description. "New inquiry from Sarah Johnson" / "Client moved to Assessment: James Wilson" / "Communication sent to Maria Garcia: Assessment Authorized". Keep it minimal. No more than 10 items, with a "View all" link.

**Design reference:** Think of the Stripe dashboard overview page or the Linear project overview — clean metrics at top, actionable items in the middle, activity at the bottom. Not a complex analytics page — a daily command center.

---

## PHASE 4: Automated Task Creation + Credential Tracking

**Goal:** Introduce automated task creation triggered by dates (credential expiration, authorization end dates) and add credential tracking to employee profiles.

**Why fourth:** The task system already exists. This phase makes it smart by adding automation. The pipeline (Phase 3) already surfaces overdue tasks — this phase ensures more tasks are created automatically.

### What to Build

Three things: (1) a generalized task automation engine, (2) credential tracking on employee profiles, (3) authorization expiration task triggers.

### Database Changes

**New table: `employee_credentials`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| profile_id | uuid FK → profiles | The agency |
| employee_id | uuid | FK to employee record (find the employees table/system) |
| credential_name | text NOT NULL | e.g., "RBT Certification", "BCBA License" |
| expiration_date | date | |
| notes | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz | Soft delete |

**New table: `task_automation_rules`** (optional — for future extensibility)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| profile_id | uuid FK → profiles | |
| rule_type | text | 'credential_expiry', 'auth_expiry', 'waitlist_followup' |
| lead_days | integer DEFAULT 30 | Days before trigger date |
| is_active | boolean DEFAULT true | |
| created_at | timestamptz | |

For now, you can hardcode the automation rules (30 days for credentials, 30 days for authorizations) and add the table later if customization is needed. The important thing is the automation engine pattern.

### Task Automation Engine

**How it works:**

1. A scheduled check runs daily (or on dashboard load — see implementation options below).
2. The check scans for upcoming dates:
   - `employee_credentials.expiration_date` within 30 days of today
   - `client_authorizations.end_date` within 30 days of today
3. For each match, check if a task already exists (prevent duplicates). Match on: related record ID + task title pattern.
4. If no existing task, create one in `client_tasks` (for authorization tasks) or a general tasks system (for credential tasks).

**Implementation decision: On-dashboard-load check (Option A).**

Run the automation check as a server action called from the pipeline page's server component (Phase 3). When the dashboard loads, `runTaskAutomation(profileId)` fires, scans for upcoming dates, and creates any missing tasks. This is the correct choice for now because:
- It requires no external infrastructure (no Edge Function, no cron config)
- It runs frequently enough for the use case (agencies log in daily)
- It can be migrated to a cron-based Edge Function later without changing the core logic

**Call site:** Add `await runTaskAutomation(profileId)` in the pipeline page's server component, AFTER the main data queries. Wrap in try/catch so automation failures don't break the page load. The function should complete quickly (<500ms) since it's just scanning dates and conditionally inserting rows.

**Future migration to cron:** When ready, create a Supabase Edge Function that calls the same `runTaskAutomation()` logic for all active profiles on a daily schedule. The function signature doesn't change — only the trigger does.

**Duplicate prevention:** Before creating a task, query for existing tasks that match. The pattern:

```sql
-- Credential expiration task check
SELECT id FROM client_tasks
WHERE profile_id = $1
  AND title ILIKE '%Review expiring credential%' || $credential_name || '%'
  AND due_date = $expiration_date
  AND deleted_at IS NULL
LIMIT 1;

-- Authorization expiration task check
SELECT id FROM client_tasks
WHERE client_id = $1
  AND title ILIKE '%Submit reauthorization%'
  AND due_date = $auth_end_date
  AND deleted_at IS NULL
LIMIT 1;
```

If the query returns a row, skip creation. If no row, insert the new task. This is idempotent — running the check multiple times on the same day produces the same result.

**Add an `auto_generated` boolean column to `client_tasks`** (default false). Set to true for automation-created tasks. This lets the UI show an "Auto" badge and prevents users from being confused about where a task came from.

### Files to Create/Modify

#### 1. Employee Credentials

Find the employee management pages (under `/dashboard/hiring/employees`). Add a "Credentials" section to the employee detail/edit page. This is a simple CRUD list: credential name, expiration date, notes. Each credential shows a status badge: Current (green, >30 days), Expiring Soon (amber, ≤30 days), Expired (red, past date).

Create server actions for credential CRUD in a new `src/lib/actions/credentials.ts` or add to the existing employee actions file.

#### 2. Task Automation Check

Create `src/lib/actions/task-automation.ts`:

```
runTaskAutomation(profileId) — Main entry point
  → checkCredentialExpirations(profileId)
  → checkAuthorizationExpirations(profileId)
  → (future: checkWaitlistFollowups, etc.)

checkCredentialExpirations(profileId) — Scans employee_credentials, creates tasks
checkAuthorizationExpirations(profileId) — Scans client_authorizations, creates tasks
```

#### 3. Integration Points

- Call `runTaskAutomation()` from the dashboard layout or the pipeline page's server component on load.
- The created tasks should appear in the Tasks view (top-level) and on the pipeline alerts.
- For authorization tasks: link the task to the relevant client via `client_tasks.client_id`.
- For credential tasks: the current `client_tasks` table has a `client_id` FK which doesn't fit employee tasks. You have two options:
  - Option A: Make `client_id` nullable in `client_tasks` and add an `employee_id` column (FK to employees).
  - Option B: Create a separate `employee_tasks` table with the same structure.
  - **Recommended:** Option A — keeping one tasks table is simpler and feeds into the unified Tasks view.

### How Things Connect

- **Credential dates → Task automation → Tasks view:** Expiring credentials automatically create tasks that appear in the unified Tasks list and on the pipeline alerts.
- **Authorization dates → Task automation → Client profile:** Expiring authorizations create tasks linked to specific clients. These appear on the client profile's task list AND in the global Tasks view.
- **Employee profile → Credentials section:** The credential list lives on the employee detail page with visual expiration indicators.
- **Pipeline alerts → Tasks:** The pipeline's "attention items" section (Phase 3) already queries for overdue tasks. Automated tasks will automatically surface there.

### Don't Forget

- [ ] The `client_tasks` table currently has statuses: `'pending', 'completed', 'in_progress'`. Auto-created tasks should start as `'pending'`.
- [ ] Auto-created task titles should be human-readable and include the relevant name: "Review expiring credential: RBT Certification for Sarah Johnson" / "Submit reauthorization for client: James Wilson".
- [ ] Set the task due_date to the expiration date itself (not 30 days before). The task is CREATED 30 days before, but it's DUE on the expiration date.
- [ ] Gate credential tracking to Pro/Enterprise (same as full employee management).
- [ ] When a credential is updated (new expiration date), the old auto-created task should be resolved or a new one created for the new date. Handle this in the credential update logic.
- [ ] Consider adding `auto_generated` boolean flag to `client_tasks` to distinguish manual from automated tasks.
- [ ] If `client_tasks.client_id` is made nullable for employee tasks, update the Tasks view UI to handle tasks without a client (show employee name instead).

### Design Guidance

**Credential section on employee profile:** Simple table or card list. Each row: credential name (text), expiration date (date with relative label like "in 45 days" or "3 days ago"), status badge (Current/Expiring/Expired), notes (truncated with expand), edit/delete actions. Add credential button at the top.

**Expiration badge colors:**
- Current (>30 days): Green badge
- Expiring Soon (≤30 days): Amber badge with subtle pulse or attention indicator
- Expired: Red badge

**Auto-generated task indicator:** When a task is auto-generated, show a small "Auto" badge or lightning bolt icon next to the task title in the Tasks view. This helps users understand which tasks were created by the system vs manually.

---

## PHASE 5: Referral Source Tracking + Analytics Enhancement

**Goal:** Add referral source tracking to clients and intake/contact forms, then surface the data in analytics.

**Why fifth:** This is a smaller phase that builds on the existing client and forms infrastructure. It provides data that validates the platform's value (especially FindABATherapy's contribution to client acquisition).

### What to Build

Three things: (1) a referral_source field on client records, (2) "How did you hear about us?" on intake/contact forms, (3) referral source breakdown on the analytics page.

### Database Changes

**Modify `clients` table:**

Add column: `referral_source text` — values like "findabatherapy", "website", "pediatrician", "school", "insurance", "word_of_mouth", "social_media", "google", "other"

Add column: `referral_source_other text` — free text when "other" is selected

**Migration:** Simple ALTER TABLE with two new nullable columns.

### Files to Modify

#### 1. Client Form/Creation

Find the client creation form (the component used when manually adding a client or when converting an inquiry). Add a "Referral Source" dropdown field with these options:
- FindABATherapy Directory
- Agency Website
- Pediatrician Referral
- School Referral
- Insurance Provider
- Word of Mouth
- Social Media
- Google Search
- Other (shows a text input for details)

Also add this field to the client edit form so it can be populated after the fact.

#### 2. Intake Form (`/intake/[slug]/client`)

Add an optional "How did you hear about us?" dropdown at the end of the intake form. Same options as above. When the intake form creates a client record, populate `referral_source` from this field.

#### 3. Contact Form (`/contact/[slug]`)

Add an optional "How did you hear about us?" field. When the inquiry is submitted, store it on the inquiry record (you may need to add a `referral_source` column to the `inquiries` table as well). When the inquiry is later converted to a client, carry the referral source forward.

#### 4. Auto-Tagging from FindABATherapy

When a family navigates to a contact or intake form FROM the FindABATherapy directory (i.e., they clicked a link on the provider's listing page), automatically set the referral source to "findabatherapy". You can detect this via:
- A URL parameter: `/contact/[slug]?ref=findabatherapy` — add this parameter to all CTA links on listing pages
- Or a referrer header check

The URL parameter approach is more reliable. Add `?ref=findabatherapy` to all contact form and intake form links rendered on the directory listing pages and provider profiles.

#### 5. Analytics Page Enhancement

On the analytics dashboard page (currently under Company & Settings per the Phase 1 reorganization), add a "Client Sources" section:

- **Referral source breakdown:** Bar chart or pie chart showing the distribution of clients by referral source
- **Referral source table:** Source name, client count, percentage of total
- **FindABATherapy attribution:** Prominent callout showing how many clients came from FindABATherapy specifically. "X clients found you through FindABATherapy" — this reinforces the platform's value.

### How Things Connect

- **Directory listing → URL parameter → Intake/contact form → Client record:** The referral source flows from the discovery point all the way into the client record.
- **Inquiry → Client conversion:** When `convertInquiryToClient()` is called, it should carry the referral_source from the inquiry to the new client record.
- **Analytics → Referral data:** The analytics page queries client records grouped by referral_source.

### Don't Forget

- [ ] Add `referral_source` to the `inquiries` table too, not just `clients`. This way the data is captured even if the inquiry is never converted.
- [ ] Update the client validation schemas (`src/lib/validations/clients.ts`) to include the new fields.
- [ ] Update the `createClient` and `updateClient` server actions to handle the new fields.
- [ ] Update the inquiry-to-client conversion logic to map referral_source.
- [ ] The `?ref=findabatherapy` URL parameter should be added to EVERY link from the directory to a provider's forms. Search for all places where contact form and intake form URLs are constructed (listing pages, provider profile pages, directory search results).
- [ ] The inquiry-to-client conversion function is `convertInquiryToClient()` in `src/lib/actions/clients.ts`. This function creates a client record from an inquiry. Update it to also copy the `referral_source` field from the inquiry to the new client record. If the inquiry has no `referral_source` but was submitted from FindABATherapy (check for referral_source on the inquiry or the `?ref=` param stored during submission), set it to "findabatherapy".
- [ ] Gate the analytics referral breakdown to Pro/Enterprise (since analytics is already gated).
- [ ] If a client's referral source is not set, show "Unknown" in the analytics rather than excluding them.

### Design Guidance

**Referral source field on forms:** Simple dropdown with a clean label. On the public-facing intake/contact forms, make it optional and place it near the end. Don't let it feel like a required marketing question — keep it casual: "How did you hear about us? (Optional)"

**Analytics referral breakdown:** Horizontal bar chart works best (Recharts is available in the codebase). Each bar shows the source name and count. Sort by count descending. Use the stage colors from Phase 3 for visual variety, or use a single brand-adjacent blue palette.

**FindABATherapy attribution callout:** Make this a highlighted card at the top of the referral section. Something like a metric card with the FindABATherapy logo, the count, and a brief message. This subtly reinforces the platform's value and justifies the subscription.

---

## PHASE 6: Branded Agency Page + Onboarding Rework + Free/Paid Restructuring

**Goal:** Build the branded agency page, rework the onboarding flow, restructure what's free vs. paid, and update all pricing/marketing. This is the biggest phase — it's saved for last because it touches the most files and benefits from all previous phases being complete.

**Why last:** This phase changes the free/paid boundary (which affects everything), reworks onboarding (which needs the new dashboard structure and communications to exist as post-onboarding destinations), and adds the branded agency page (which is shown during onboarding as the star preview).

### Sub-Phase 6A: Free/Paid Restructuring

#### What Changes

The free tier becomes more generous with profile attributes. The paid gating shifts from "data fields" to "workflow tools."

**PlanFeatures changes for FREE tier:**

| Property | Old → New | Why |
|---|---|---|
| maxLocations | 1 → 3 | Small agencies serve multiple areas |
| maxPhotos | 0 → 3 | Bare listings hurt directory quality |
| hasAgeRange | false → true | Enriches directory search |
| hasLanguages | false → true | Enriches directory search |
| hasDiagnoses | false → true | Enriches directory search |
| hasSpecialties | false → true | Enriches directory search |
| maxJobPostings | 0 → 1 | Lets free users try hiring |

**NEW property to add to PlanFeatures interface:**

| Property | Free | Pro | Enterprise |
|---|---|---|---|
| maxClients | 10 | 250 | 999 |
| hasCommunications | false | true | true |
| hasBrandedPages | false | true | true |
| hasInsuranceTracking | false | true | true |
| hasAuthTracking | false | true | true |
| hasDocuments | false | true | true |
| hasAutoTasks | false | true | true |
| hasReferralTracking | false | true | true |

#### Files to Modify

**`src/lib/plans/features.ts`** — Update the PlanFeatures interface to add new boolean flags listed above. Update the free tier config object. Pro and Enterprise gain the new flags set to true.

**`src/lib/plans/guards.ts`** — Add new guard functions:
- `guardAddClient(currentCount)` — checks maxClients
- `guardCommunications()` — checks hasCommunications
- `guardBrandedPages()` — checks hasBrandedPages
- `guardInsuranceTracking()` — checks hasInsuranceTracking
- (Similar for other new flags)

Update existing guards:
- `guardAddLocation()` — now allows up to 3 for free
- `guardUploadPhoto()` — now allows up to 3 for free

**`src/components/ui/feature-gate.tsx`** — Search all usages across the codebase. Remove gates on: ages, languages, diagnoses, specialties (these are now free). Keep gates on: contact form, intake form, analytics, communications, branded pages, insurance tracking, auth tracking, documents.

**`src/components/dashboard/services-attributes-card.tsx`** — Remove Pro-gating on the age range, languages, diagnoses, and specialties editing fields. These should now be editable by all users.

**Photo gallery manager component** — Update limit enforcement: 3 for free, 10 for Pro/Enterprise.

**Locations manager component** — Update limit enforcement: 3 for free, 5 for Pro, 999 for Enterprise.

**Client management pages** — Add limit check when creating a new client. When approaching the limit (e.g., 8/10), show a subtle banner. When at the limit, show an upgrade prompt instead of the "Add Client" button.

**`src/components/ui/locked-feature.tsx`** — Update the messaging. Old message probably says something like "Upgrade to add more details." New message should say: "Upgrade to Pro for branded pages, client management tools, and communication templates."

### Sub-Phase 6B: Branded Agency Page

#### What to Build

A public-facing, server-rendered page at `/p/[slug]` that displays the agency's complete profile in a polished layout. It pulls from existing data — no new data entry needed.

#### Route and Page

**Create:** `src/app/(site)/p/[slug]/page.tsx`

This is a server component that:
1. Queries the `listings` table by slug to get the provider
2. Queries `profiles` for agency details (name, contact_email, plan_tier)
3. Queries `locations` for all service locations
4. Queries `listing_attribute_values` for ages, languages, diagnoses, specialties, insurances
5. Queries `media_assets` for logo, photos, video
6. Renders everything in a professional layout

**Meta tags:**
- `<meta name="robots" content="noindex, nofollow">` — Not discoverable via search engines
- Dynamic title: `{agency_name} | ABA Therapy Services`
- Open Graph tags for social sharing (when someone shares the link, it shows the agency name and description)

**Gating logic:**
- **Free tier:** Page renders fully but the CTA buttons show basic contact info instead of linking to branded forms. Fallback priority for contact info: (1) primary location phone, (2) `profiles.contact_email`, (3) if neither exists, show "Visit our FindABATherapy listing" with a link to `/provider/[slug]`. Text like: "Contact {agency_name} at {phone} or {email}"
- **Pro/Enterprise:** Live CTA buttons: "Contact Us" → `/contact/[slug]`, "Start Intake" → `/intake/[slug]/client`

#### Page Layout

**Hero section:**
- Agency logo (large, centered or left-aligned)
- Agency name (h1)
- Headline text (h2, lighter weight)
- Accepting new clients badge (if true)

**Description section:**
- Full description text
- Clean typography, generous line height

**Locations section:**
- Grid of location cards (1 column mobile, 2-3 columns desktop)
- Each card: location label, full address, service modes (badges: In-Home, Center, Telehealth, School), accepting new clients status
- If location has phone/website, show those

**Services & Specialties section:**
- Grouped badges/tags for: ages served, languages spoken, diagnoses supported, clinical specialties
- Clean tag layout, grouped by category with section labels

**Insurance section:**
- List or grid of accepted insurance carriers
- Simple text list or badge layout

**Photo gallery (if photos exist):**
- Grid of photos (2-3 columns)
- Lightbox on click (or simple enlarged view)

**Video embed (if video exists):**
- Embedded video player

**CTA section (prominent, near bottom):**
- Two large buttons side by side: "Contact Us" and "Start Intake"
- (Or combined messaging if only one form is active)
- Free tier: Replace buttons with contact info card

**Footer:**
- Agency contact info (phone, email, website if set)
- "Powered by Behavior Work" subtle branding
- Link to FindABATherapy listing (optional)

#### Dashboard Management Page

**Create:** A page in the Intake & Pages section for managing the branded agency page.

This page shows:
- Live preview (thumbnail or iframe)
- Shareable URL with copy-to-clipboard button
- QR code generation (optional, nice-to-have)
- View count (if analytics tracking is added)
- "Your branded page is automatically generated from your profile. Update your profile to change what appears."

#### Component Architecture

Create reusable components in `src/components/branded/`:
- `agency-page-hero.tsx` — Logo, name, headline
- `agency-page-locations.tsx` — Location cards grid
- `agency-page-services.tsx` — Tags/badges for attributes
- `agency-page-insurance.tsx` — Insurance list
- `agency-page-gallery.tsx` — Photo grid
- `agency-page-cta.tsx` — CTA buttons with plan-aware rendering
- `agency-page-footer.tsx` — Contact info and branding

These can also be reused in the onboarding preview (Sub-Phase 6C).

### Sub-Phase 6C: Onboarding Rework

#### Current Onboarding Steps (to change)

```
1. Welcome — Intent selection (Find ABA / Hire / Both)
2. Company Details — Name, email, logo
3. Location — Address, service modes, accepting clients
4. Premium Features (Enhanced) — Ages, languages, diagnoses, specialties (ALL PRO-GATED)
5. Go Live (Review) — Preview and publish listing
```

#### New Onboarding Steps

```
1. Sign Up — Email/password (unchanged, handled by auth)
2. Company Profile — Agency name, contact email, upload logo (unchanged)
3. Location — Primary address, service modes, accepting clients (unchanged)
4. Details — Headline, description, ages, languages, diagnoses, specialties (ALL FREE NOW)
5. Branded Pages Preview (NEW) — Shows auto-generated preview cards
6. Go Live on Directory — Preview and publish listing (unchanged)
7. Success — Celebration with plan-differentiated next actions
```

#### Files to Modify

**Welcome step** (`/dashboard/onboarding/page.tsx`): Remove the intent selection (Find ABA Therapy / Hire Staff / Both). Replace with a simpler welcome that says something like: "Let's set up your agency in under 5 minutes. You'll get a professional listing, branded pages, and tools to manage your clients."

**Enhanced step** (`/dashboard/onboarding/enhanced/page.tsx`): This step currently gates ages, languages, diagnoses, specialties behind Pro. Remove ALL gating. Every field should be editable. Remove `PremiumFieldCard` wrappers, `UpgradeBanner`, and any `canAccessPremiumFields` conditional logic. Rename this step from "Premium Features" to "Details" in the progress indicator.

**NEW: Branded Preview step** (`/dashboard/onboarding/branded-preview/page.tsx`):

This is the key conversion moment. The page shows:

1. **Star card: Branded Agency Page preview** — A card showing a miniature preview of what the agency's branded page will look like with their name, logo, and location data. Clicking it could open a full preview. Below it: "Your professional agency page — share it with doctors, schools, and families as a referral sheet and intake funnel."

2. **Supporting cards:** Smaller preview cards for:
   - Branded Contact Form
   - Branded Intake Form
   - Branded Careers Page
   - Parent Resources Hub

3. **Upgrade CTA:** Below the previews: "Upgrade to Pro to activate branded pages, client lifecycle management, communication templates, analytics, and hiring tools."

4. **Two buttons:**
   - "Upgrade to Pro — $79/mo" → Goes to Stripe checkout with return URL to the next onboarding step
   - "Continue with Free" → Skips to Go Live step

**Onboarding step progression** (`src/lib/actions/onboarding.ts` and `onboarding-progress.tsx`): Update the ONBOARDING_STEPS array to include the new step order. Update the progress indicators. Update the next/back navigation logic.

**Onboarding step wiring detail:**

The current `ONBOARDING_STEPS` array in `onboarding-progress.tsx` defines:
```
[welcome, details, location, enhanced, review]
```

Change to:
```
[welcome, details, location, enhanced, branded-preview, review, success]
```

Each step's `path` property determines routing. The Next/Back buttons use array index to navigate. The `branded-preview` step's "Upgrade to Pro" button should:
1. Call the existing Stripe checkout flow (look at how `src/app/(dashboard)/dashboard/billing/checkout/` works)
2. Pass `success_url` as the next onboarding step: `/dashboard/onboarding/review`
3. Pass `cancel_url` as the current step: `/dashboard/onboarding/branded-preview`

The "Continue with Free" button simply navigates to the next step (`/dashboard/onboarding/review`) via `router.push()`.

After Stripe checkout completes successfully, the user returns to the `success_url` which is the review step. The webhook will have already updated their `plan_tier` in the `profiles` table, so the review step and success step can check `plan_tier` to show plan-differentiated content.

**Success step** (`/dashboard/onboarding/success/page.tsx`): Differentiate the success screen:
- **Free users:** "Your listing is live on FindABATherapy!" Primary actions: "Share your listing", "Upgrade to activate branded pages"
- **Pro users:** "You're all set!" Primary actions: "Share your branded agency page", "Add your first client", "Post your first job"

### Sub-Phase 6D: Pricing Display Updates

Update all pages that show plan features and pricing to reflect the new free/paid boundary.

#### Files to Modify

**`src/app/(site)/get-listed/page.tsx`** — Update free tier features: "3 locations, 3 photos, all profile details, 1 job posting, 10 client records." Update Pro tier value proposition: "Branded pages, full client CRM, communication templates, analytics, hiring tools."

**`src/components/marketing/unified-pricing-table.tsx`** — Update the feature comparison matrix. Free column shows checkmarks for all profile attributes. Pro column emphasizes branded pages and lifecycle tools.

**`src/app/(dashboard)/dashboard/billing/page.tsx`** — Update upgrade messaging for free users. Focus on workflow tools, not data fields.

**`src/content/behaviorwork.ts`** — Update marketing content strings.

**`src/lib/stripe/config.ts`** — Update the feature string arrays that describe each plan tier. These strings may appear in Stripe checkout or billing portal.

### Sub-Phase 6E: Marketing Site Messaging

Update the marketing site to lead with the client lifecycle story.

**Hero section messaging:**
- Primary: "Fill your caseload. Manage every family's journey from first contact to active services — with one platform built for ABA agencies."
- Sub: "A professional agency page and branded intake forms that make your practice look polished and capture families from any source."

**Feature sections:**
- Capture: "A professional agency page and branded intake forms that make your practice look polished and capture families from any source — shareable with parents, doctors, and referral partners."
- Nurture: "Lifecycle email templates that keep families informed and engaged through insurance verification, assessment, and onboarding."
- Manage: "Track every client's insurance, authorizations, documents, and tasks in one organized dashboard."
- Grow: "Get discovered by families on FindABATherapy — our growing directory of ABA providers, automatically included with your account."

**Tertiary (footer/secondary):** "And when you're ready to hire, post jobs, manage applicants, and build a branded careers page — all built in."

Find and update these messaging areas:
- Homepage hero section
- Get-listed page
- Get-started page
- BehaviorWork parent brand page
- Any email marketing templates that reference features

### How Things Connect (Phase 6 — All Sub-Phases)

- **PlanFeatures changes → Everything:** Changing what's free vs. paid ripples through every feature gate, every guard function, every pricing display, and every marketing message. Do Sub-Phase 6A first and test thoroughly.
- **Branded agency page → Onboarding preview:** The onboarding preview card for the agency page should render a scaled-down version of the actual page component. Reuse components.
- **Branded agency page → Intake forms:** The CTA buttons on the agency page link to the existing `/contact/[slug]` and `/intake/[slug]/client` routes. These already exist and work.
- **Onboarding → Stripe checkout → Return:** If a user upgrades during onboarding, they go through Stripe checkout and need to return to the onboarding flow (next step: Go Live). The return URL in the Stripe checkout must point back to the onboarding.
- **Marketing messaging → Everywhere:** The new messaging needs to be consistent across the marketing site, get-listed page, onboarding, billing page, and email templates. Use the strategy document Section 6.3 as the messaging bible.

### Don't Forget

- [ ] **Test the full onboarding flow end-to-end** for both paths: Free (skip upgrade → go live → success) and Pro (upgrade → Stripe checkout → return → go live → success).
- [ ] **Test plan downgrades.** If a Pro user downgrades to Free, they shouldn't lose data, but they should see locked-feature indicators on branded pages, communications, etc.
- [ ] **Existing free users.** Current free users may have been limited to 1 location and 0 photos. After this change, they get 3 of each. No migration needed — the limits are enforced at the application layer, not the database layer.
- [ ] **SEO for the branded agency page.** The page must have `noindex` to avoid competing with the FindABATherapy directory listing. Both pages show the same data, but the directory listing should be the one Google indexes.
- [ ] **Branded agency page URL structure.** Using `/p/[slug]` keeps it short and clean. The slug should come from the `listings.slug` field. Verify that slugs are unique and URL-safe.
- [ ] **Open Graph tags on the agency page.** When someone shares the agency page URL on social media or in a message, the preview should show: agency name as title, headline as description, logo as image. This makes the page truly shareable.
- [ ] **Mobile responsiveness of the agency page.** Many parents will receive this link via text message and open it on their phone. The page must be fully mobile-optimized.
- [ ] **Update the `?ref=` parameter handling** (from Phase 5) to also work on the branded agency page CTA links.
- [ ] **Sign-up flow:** If `?plan=` and `?interval=` URL parameters exist on sign-up, they should still route users to Stripe checkout after sign-up. This preserves the existing marketing-to-checkout pipeline.
- [ ] **Update the onboarding gate.** The `onboarding-gate.tsx` component prevents dashboard access before onboarding completes. Make sure the new branded-preview step is included in the completion check.

### Design Guidance for the Branded Agency Page

This page is the single most visible piece of the platform to people OUTSIDE the agency (parents, doctors, referral partners). It must look world-class.

**Design principles:**
- **Clean, professional, trustworthy.** Think of a modern healthcare provider's website. Not flashy — polished.
- **Mobile-first.** Most parents will see this on their phone via a text link.
- **Fast loading.** Server-rendered, minimal JS, optimized images.
- **Branded.** Use the agency's brand color (stored in the profile, or the default therapy blue `#5788FF`) as the accent color for buttons, section dividers, and the hero background.

**Typography:** Use the same font stack as the marketing site. Large, readable body text (16-18px). Clear hierarchy: agency name (28-32px), section headers (20-24px), body text (16-18px).

**Hero:** Full-width section with agency brand color as a subtle background gradient or solid. Logo centered (or left with name to the right). Headline below. Optional "Accepting New Clients" green badge.

**Sections:** Each section (locations, services, insurance, gallery, CTA) should have clear visual separation. Use white backgrounds with generous padding. Section headers should be clean and consistent.

**CTA section:** This is the most important part. Two large, full-width (on mobile) buttons. The primary button (Contact Us or Start Intake) should use the agency's brand color with white text. The secondary button should be outlined. Below the buttons, a reassuring message: "We typically respond within [X] hours."

**Design references:**
- ZocDoc provider profiles (clean, medical, trustworthy)
- Calm.com landing page (simple, focused, one clear CTA)
- Stripe's product pages (professional, clear hierarchy, generous whitespace)
- Modern physical therapy clinic websites

**Colors:** Use the agency's brand color as primary accent. Fall back to therapy blue `#5788FF` if no brand color is set. Keep the overall palette light and clean — white backgrounds, dark text, brand color for accents and buttons.

### Copy Guidance for the Branded Agency Page

The page should feel like a warm, professional introduction to the agency. Not salesy. Not clinical. Human.

**Default headline (if the agency hasn't set one):** "Compassionate ABA Therapy for Your Family"

**Section labels:**
- "Our Locations" (not "Service Locations")
- "Who We Serve" (for ages, languages, diagnoses)
- "Our Specialties"
- "Insurance We Accept"
- "See Our Space" (for photos)
- "Get Started" (for CTA section)

**CTA copy:**
- Pro: "Contact Us" / "Start Intake" / "Get Started Today"
- Free fallback: "Reach Out to {agency_name}" with phone/email displayed directly

**Footer:** "{agency_name} is a registered ABA therapy provider. Powered by Behavior Work."

---

## Cross-Phase Checklist

After completing all phases, verify these cross-cutting concerns:

### Data Integrity
- [ ] All new tables have RLS policies matching the existing pattern (profile_id-based access)
- [ ] All new tables have proper indexes on foreign keys and frequently queried columns
- [ ] Soft deletes (deleted_at) are used consistently with existing patterns
- [ ] All new form inputs have proper validation (Zod schemas)

### Feature Gating Consistency
- [ ] Every new feature is properly gated in BOTH the UI (FeatureGate component) AND the server (guard functions)
- [ ] Free users can see what they're missing but can't access it (preview, not paywall)
- [ ] Upgrade prompts are specific and contextual, not generic

### Navigation
- [ ] All new pages are accessible from the sidebar navigation
- [ ] All old routes either redirect or work via aliases
- [ ] Mobile navigation matches desktop navigation exactly
- [ ] Active state highlighting works for all new routes

### Email System
- [ ] All new emails use the existing `emailWrapper()` pattern
- [ ] All emails render correctly in major email clients (test with Resend's preview)
- [ ] All emails include agency branding (logo, name) when available
- [ ] Unsubscribe links are included where legally required

### Performance
- [ ] Pipeline queries use database-level aggregation, not client-side counting
- [ ] Task automation queries are idempotent and don't create duplicates
- [ ] The branded agency page is server-rendered and fast-loading
- [ ] Image optimization is applied to photos on the agency page

### Analytics
- [ ] PostHog events track: communication sends, pipeline stage changes, agency page views, referral source captures
- [ ] Dashboard analytics page shows referral source breakdown (Phase 5)
- [ ] Agency page views are trackable (if analytics is gated, store the data but display only for Pro+)

### Testing
- [ ] Full onboarding flow: sign up → company profile → location → details → branded preview → upgrade/skip → go live → success → dashboard
- [ ] Full client lifecycle: inquiry received → convert to client → send communications → track insurance → track authorization → move through stages → discharge
- [ ] Stripe checkout integration: upgrade during onboarding, upgrade from billing page, downgrade
- [ ] Mobile responsive: sidebar, pipeline, agency page, intake forms, all new pages
