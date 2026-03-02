# The ABA Growth Toolkit — Complete Strategy Document

Version 3.0 — March 2026

---

## I. Industry Context & Market

### The ABA Market

Applied Behavior Analysis therapy is a high-growth, highly fragmented market. Thousands of small and mid-sized agencies provide in-home, center-based, school-based, and telehealth ABA services. The market is defined by structural realities that shape every agency's day-to-day:

- **Client acquisition is the #1 revenue driver.** A single new client represents $40,000–$80,000+ in annual revenue. Agencies live and die by their ability to fill their caseload.
- **The intake-to-active pipeline is long and complex.** A family's journey from first contact to receiving services involves insurance verification, authorization requests, assessments, report writing, and approval — often spanning weeks or months. Families drop off at every stage.
- **Communication gaps lose families.** When agencies don't proactively update families on their status, families assume they've been forgotten and seek services elsewhere.
- **Operations tooling is fragmented.** Clinical practice management tools handle session data and billing but don't address the business operations layer.
- **Staff hiring is a secondary but persistent constraint.** RBT turnover is 40–60% annually. Agencies always need staff, but only hire when they have or anticipate clients.

### The Gap We Fill

There is no dominant, ABA-specific platform that addresses the business operations layer — the space between a family's first contact and the clinical practice management system. That gap includes:

- How families discover the agency (directory, website, referral)
- How inquiries and intakes are captured and organized
- How families are communicated with throughout the intake process
- How insurance, authorization, and assessment workflows are tracked
- How client information is stored and accessed across the agency
- How tasks and follow-ups are managed per client

### Who We Serve

**Primary customer:** ABA agency owner or operations manager at a small to mid-sized practice (1–50 staff). This person is responsible for growing the caseload, managing the intake pipeline, coordinating with insurance companies, tracking what needs to happen for each client, and maintaining a professional presence for the agency.

**Secondary user:** BCBA or clinical director who needs to access client information, check authorization status, and coordinate care delivery.

### Value Hierarchy

The product's value is delivered in a clear hierarchy. This determines what leads in marketing, onboarding, and the dashboard:

1. **Client acquisition and lifecycle management** — this is why agencies sign up
2. **Branded presence and intake tools** — the mechanism that makes #1 possible
3. **Distribution via FindABATherapy** — the growth accelerator that adds unique value
4. **Team and hiring management** — supports #1 when agencies need to scale staff

---

## II. The Client Lifecycle Model

The core concept of the product is the client lifecycle — the full journey of a family from first contact through discharge. Every feature either feeds into, supports, or operates within this lifecycle.

### Lifecycle Stages

| Stage | What's Happening | Agency Needs at This Stage |
|-------|-----------------|---------------------------|
| **Inquiry** | Family submits a contact or intake form. They've expressed interest but haven't provided full details. | Respond quickly. Acknowledge receipt. Collect missing information. Build trust. |
| **Intake Pending** | Agency has the family's information and is collecting remaining details, verifying insurance, preparing documentation. | Request additional docs. Verify insurance eligibility. Keep family informed. |
| **Waitlist** | Agency cannot serve the family immediately (full caseload, scheduling constraints). | Keep family engaged. Share resources. Provide periodic updates. Prevent dropout. |
| **Assessment** | Insurance has authorized the initial assessment. Assessment may be scheduled or completed. | Request authorization. Schedule assessment. Confirm appointment. Prepare report. Submit to insurance. |
| **Active** | Family is receiving ABA services. Ongoing management of authorizations, reassessments, and team coordination. | Track authorizations. Monitor reauthorization dates. Manage team assignments. Share resources. |
| **On Hold** | Services are temporarily paused (family request, insurance issue, scheduling gap). | Track reason. Set follow-up reminders. Maintain relationship. |
| **Discharged** | Services have ended. Client record is retained for reference. | Document discharge. Retain records. Enable reactivation if needed. |

### How Features Map to the Lifecycle

| Feature | Stage(s) Served |
|---------|-----------------|
| Contact Form | Entry → Inquiry |
| Intake Form | Entry → Inquiry / Intake Pending |
| FindABATherapy Listing | Entry → Inquiry |
| Inquiry Inbox | Inquiry |
| Client Profiles (CRM) | All stages |
| Communication Templates | All stages |
| Task Management | All stages |
| Insurance Tracking | Intake Pending → Active |
| Authorization Tracking | Assessment → Active |
| Document Management | All stages |
| Parent Resources | Waitlist → Active |
| Branded Agency Page | Entry → Inquiry |
| Analytics | Measurement |

### The Client Journey

This is the agency's pipeline — how a family moves from first contact to active services. (This is distinct from the *platform conversion funnel* in Section VIII, which describes how an agency owner goes from discovering our product to becoming a paying user.)

> **Discovery** (FindABATherapy listing, website, referrals, word of mouth)
> → **Capture** (Contact form, Intake form → enters Inquiry Inbox)
> → **Nurture** (Communication templates, insurance verification, document collection)
> → **Convert** (Assessment authorization, assessment scheduled & completed)
> → **Serve** (Active client, ongoing authorization management, reassessments)
> → **Retain or Transition** (Reauthorization, on hold, or discharge)

Every feature accelerates movement through this pipeline.

---

## III. Positioning

### The Problem

Section I described the market gap from a structural perspective. Here's how it feels on the ground — what the agency owner actually deals with every day.

Right now, agencies cobble together:

- Google Forms for intake and contact
- Google Sheets for tracking leads and clients
- Google Drive for document storage
- Gmail for manual client communications
- Indeed for job postings ($250-500/mo)
- A basic website builder ($16-33/mo)
- Separate task managers
- Spreadsheets for employee tracking

None of it talks to each other. Everything is manual. Every new client means re-entering data across 6 different tools. Every new hire means toggling between Indeed, email, and a spreadsheet.

### The Solution

**One integrated platform that replaces all of it. Set up in 10 minutes.**

Branded forms and pages. CRM. Automated emails. Task management. Job board. Therapy directory. All connected. All branded to the agency. All working together.

### The One-Liner

> **The ABA Growth Toolkit — Everything between your first parent inquiry and your next hire. One platform. 10 minutes to set up.**

### What We Are NOT

- **Not a clinical practice management system.** We do not handle session notes, data collection, treatment plans, or clinical billing. We complement tools like CentralReach and Catalyst, not replace them.
- **Not a generic CRM.** Every feature is purpose-built for the ABA client lifecycle — insurance-specific fields, authorization tracking, ABA-specific communication templates.
- **Not just a directory.** FindABATherapy is a distribution channel that feeds into the platform, not the product itself.

---

## IV. What We've Built (Current State)

The platform already contains substantial functionality. Below is an inventory organized by the client lifecycle model.

### Client Acquisition & Capture

- **FindABATherapy directory** — Full public directory with state/city search, filtering by service type, insurance, age range, language, and proximity. Listings include detailed provider profiles with photos, video, Google ratings, and verified badges.
- **Branded contact form** — White-labeled contact form at `/contact/[slug]` with customizable background color and branding toggle. Submissions flow to the inquiry inbox.
- **Branded intake form** — Comprehensive multi-section intake form at `/intake/[slug]/client` collecting child demographics, parent info, insurance, authorization details, and diagnoses.
- **Inquiry inbox** — Dashboard inbox showing all incoming inquiries with messaging capability. Badge counters for unread items.

### Client Lifecycle Management

- **Client CRM** — Full client roster with lifecycle stage tracking (Inquiry, Intake Pending, Waitlist, Assessment, Active, On Hold, Discharged). Color-coded status badges. Search, filtering, and pagination.
- **Parent/guardian records** — Multiple parents per client with contact details, relationship type, and primary designation.
- **Insurance management** — Multiple policies per client with carrier details, member IDs, subscriber relationships, and status tracking.
- **Authorization tracking** — Full authorization records with source, status (draft, submitted, approved, denied, expired, exhausted), service lines, and hour/unit tracking.
- **Document management** — Upload and categorize insurance cards, assessments, IEPs, medical records, consents per client.
- **Communication templates** — 22 lifecycle-stage email templates with merge fields, send from client profiles, communication history logging.
- **Pipeline dashboard** — Visual overview of all clients by lifecycle stage with counts, quick actions, and attention alerts.
- **Referral source tracking** — Dropdown on client profiles and intake/contact forms with analytics breakdown.
- **Task automation** — Date-based and status-based task triggers for credential expirations, authorization renewals, and follow-ups.

### Branded Presence & Pages

- **Provider listing profile** — Rich public profile on FindABATherapy with headline, description, photos, video, locations, services, insurance, and contact form.
- **Branded agency page** — Standalone shareable landing page at `/p/[slug]` functioning as pseudo-website, referral sheet, and intake funnel.
- **Branded intake/contact pages** — Custom form pages at branded URLs.
- **Parent resource center** — Branded resource pages with FAQs, glossary, and guides.
- **Branded careers page** — Careers page with job listings.

### Team & Hiring

- **Job posting system** — Create, edit, and publish jobs with position types, salary, benefits, therapy settings, schedule types, and age groups.
- **FindABAJobs board** — Full job search with state/city/position filtering, employer profiles, and individual job pages.
- **Application tracking** — Applicant status workflow (New, Reviewed, Phone Screen, Interview, Offered, Hired/Rejected) with messaging.
- **Employee management** — Staff directory with credential tracking (name, expiration date, notes) and automated expiration alerts.

### Platform Infrastructure

- **Authentication** — Email/password auth via Supabase with password reset.
- **Stripe billing** — Two-tier plan system (Free, Pro at $79/mo) with add-ons, checkout, billing portal, and webhooks.
- **Email infrastructure** — Resend integration with branded HTML email templates for lifecycle communications and notifications.
- **Analytics** — PostHog integration with event tracking, plus dashboard analytics for listing views, inquiry conversion, and referral sources.
- **Multi-domain routing** — Middleware handling therapy, jobs, and parent domains from one codebase.
- **Onboarding flow** — Guided setup with branded page previews and upgrade prompt.

---

## V. Pricing Model

### Philosophy

One plan. One price. One decision.

No comparison tables. No "which tier am I." No feature differentiation between paid tiers. Every paying customer gets the same product. The only variable is scale, handled through simple add-ons.

### Structure

|                | Free                          | Pro                            |
| -------------- | ----------------------------- | ------------------------------ |
| **Price**      | $0/mo                         | **$79/mo** or **$47/mo annual** ($564/yr — 40% savings) |
| **What it is** | Full platform in preview mode | Full platform, live            |

### Add-ons (Pro only)

|Add-on|Price|
|---|---|
|Additional user|$20/mo each|
|Additional locations (5-pack)|$15/mo|
|Additional jobs (5-pack)|$15/mo|
|Additional storage (10 GB)|$5/mo|
|Homepage placement on FindABATherapy.org|$149/mo|

### Pricing Psychology

- **$79 clears the impulse-buy threshold** for any business owner. It's less than a phone bill. No committee approval needed. One person can say yes in one sitting.
- **Flat rate, not per-user.** Per-user pricing punishes growth and forces buyers to do math. "$79/month" is the entire conversation. Add-ons feel incremental, not like tier jumps.
- **No decoy tier needed.** The expensive anchor already exists in the buyer's mind — the $500-1,200/month they currently spend on disconnected tools. $79 looks like a steal against that without manufacturing a fake Enterprise tier.
- **Scale grows naturally.** Solo BCBA: $79. Agency with 5 users: $159. Agency with 15 users: $359. No migrations, no tier jumps, no "I'm outgrowing my plan" friction.

---

## VI. Complete Feature Breakdown

The features inventoried in Section IV are gated between Free and Pro as follows:

|Feature|Free|Pro ($79/mo)|
|---|---|---|
|**Platform Access**|Full, preview mode|Full, live|
||||
|**Branded Forms**|||
|Contact Form|Real content, preview banner, not submittable|Live, clean, submittable|
|Intake Form|Real content, preview banner, not submittable|Live, clean, submittable|
||||
|**Branded Pages**|||
|Parent Resources|Real content, preview banner|Clean, active|
|Brochure|Real content, preview banner|Clean, active|
|Website|Real content, preview banner|Clean, active|
|Careers Page|Real content, preview banner|Clean, active|
||||
|**Lead Management**|||
|Incoming Submissions|— (forms not submittable)|Unlimited, full access|
||||
|**CRM**|||
|Clients|Demo example profiles, view only|Unlimited|
|Pipeline Dashboard|Demo data, view only|Active|
|Client Profiles|Example profiles, view only|Full management|
||||
|**Employees**|Demo example profiles, view only|Unlimited|
||||
|**Communications**|||
|Email Templates|Preview only|Active, sendable|
|Auto-send Emails|Preview only|Active|
|Communication History|Demo examples|Full history|
||||
|**Operations**|||
|Task Management|Demo only|Active|
|Reminder System|Demo only|Active|
|Document Storage|—|5 GB|
||||
|**Distribution**|||
|FindABATherapy.org|Listed, up to 3 locations|Listed|
|FindABAJobs.org|—|Included|
||||
|**Scale**|||
|Locations|3 (FindABATherapy only)|10|
|Jobs|0 (demo examples visible)|10|
|Users|1|1|
||||
|**Add-ons**|—|Available (see pricing)|
||||
|**Support**|Help docs|Email support|

---

## VII. Free Tier Strategy

### Core Principle

The free tier is a **permanent interactive demo using the agency's own branding.** Every page is real. Every section has content. Nothing is hidden. But nothing is usable. The entire experience is designed to make the agency owner feel like they're standing in their finished office with the lights off. Everything is built. Everything is theirs. They just need to flip the switch.

### What "Preview Mode" Means

Every branded page and form displays the agency's real branding, real colors, real content. But a prominent, full-width banner sits at the top:

> 🔒 **This page is in preview mode.** Activate your account to go live and start accepting submissions. → **Go Live — $79/mo**

The banner is:

- **Visually unavoidable.** Full-width, fixed position, high contrast. Not a subtle toast — a fat bar that pushes content down.
- **Clearly not the agency's branding.** Different color scheme, different typography. Anyone visiting the page immediately knows this isn't something the agency chose to put there.
- **On every branded surface.** Contact form, intake form, parent resources, brochure, website, careers page.

Forms are visible but **not submittable.** The submit button is locked/disabled with a lock icon. The form fields may be interactive (to let the owner feel the experience) but submission is blocked.

### What "Demo Data" Means

Dashboard sections that require data — CRM, pipeline, employees, communications — are populated with **realistic example data:**

- **3-5 example client profiles** with realistic names, statuses, and notes. Clearly labeled as examples.
- **3-5 example employee profiles** with realistic roles (BCBA, RBT, Office Manager).
- **A populated pipeline** showing clients in various stages (New Lead → Intake Scheduled → Assessment → Active).
- **Example communication history** showing what branded emails look like when sent.
- **Example tasks and reminders** showing the operational workflow.

Every demo section has a subtle label: _"Example data — Go Live to manage your real clients"_ and an upgrade CTA.

### Why This Works

The free tier avoids the two failure modes:

1. **Not enough value to stay engaged** (user signs up, sees nothing, leaves) — Solved by real branded pages and demo data. The user sees a complete, working product from minute one.
    
2. **Too much value to ever upgrade** (user gets everything they need for free) — Solved by making nothing functional. Forms don't submit. Clients can't be added. Emails can't be sent. The platform is a museum, not a tool.
    

The one exception is **FindABATherapy.org listings** — up to 3 locations, live and real. This provides genuine ongoing value that keeps the user logging in, keeps them in the ecosystem, and benefits the directory itself.

---

## VIII. Platform Conversion Funnel

This section describes how an *agency owner* goes from discovering our platform to becoming a paying user. (This is distinct from the client journey in Section II, which describes how families move through the agency's intake pipeline.)

### The Funnel Stages

```
Awareness → Signup → Setup → Preview → Activation Trigger → Upgrade → Retention
```

### Stage 1: Awareness

Agency owner discovers the platform through:

- FindABATherapy.org (sees competitor listings, wants their own)
- Word of mouth from other BCBA owners
- Social media / content marketing
- Google search ("ABA intake forms," "ABA client management")

**Landing page message:**

> Branded intake forms. Client CRM. Automated emails. Job board. All connected. Set up in 10 minutes.
> 
> Your pages are ready the moment you sign up — free. Upgrade when you're ready to go live.
> 
> **$79/month. One plan. Everything included.**

### Stage 2: Signup

**No credit card required. Email + password only.**

Friction at signup kills conversion. The goal is to get them INTO the product as fast as possible. Every field you add to the signup form costs you 10-15% of signups.

Signup form:

- Email
- Password
- Agency name

That's it. Everything else (logo, branding, locations) happens during onboarding inside the product.

### Stage 3: Setup (Onboarding — 5-10 minutes)

Guided onboarding wizard:

1. **"Upload your logo"** — Instant personalization. The moment they see their logo on a branded page, emotional ownership kicks in.
2. **"Set your brand colors"** — Now the pages look like THEIRS.
3. **"Add your first location"** — Address, phone, service area. This populates FindABATherapy.org.
4. **"Preview your pages"** — Show them their contact form, intake form, website, brochure — all branded, all beautiful, all with the preview banner.

The onboarding ends with:

> **Your pages are ready.** You're currently in preview mode. Go Live to start accepting submissions and managing clients.
> 
> → **Go Live — $79/mo**
> 
> or
> 
> → **Continue exploring in preview mode**

Most users will click "Continue exploring." That's fine. The seed is planted.

### Stage 4: Preview (The Permanent Demo)

The user explores the dashboard. Every section has demo data. Every page has their branding. Every surface has a gentle but persistent upgrade prompt.

**Key dashboard elements in preview mode:**

- **Sidebar badge:** "Preview Mode" label, always visible
- **Lead management:** Empty state with message — _"Your leads will appear here once your forms are live. Go Live to start accepting submissions."_
- **CRM:** Demo client profiles with a banner — _"Example data. Go Live to add real clients."_
- **Employees:** Demo employee profiles — _"Example data. Go Live to manage your team."_
- **Email templates:** Beautiful branded previews with locked send button — _"Go Live to start sending."_
- **Communications:** Example sent/received history — _"Example data. Go Live to communicate with your clients."_
- **Tasks:** Demo task list — _"Example data. Go Live to manage your workflow."_
- **FindABAJobs:** Demo job postings with applicant examples — _"Included with Pro. Go Live to post jobs and recruit."_

### Stage 5: Activation Trigger

The user hits the moment where preview mode becomes intolerable. This happens through one or more triggers:

**Trigger 1: "I can't share this page."** They try to share their branded contact form with someone — a referral source, a parent, a website developer. They look at the URL preview. The banner is there. "This page is in preview mode." They can't send that to a real person.

**Trigger 2: "I need this to actually work."** They've been exploring for a few days. They have a real parent who needs to fill out an intake form. They have a real job opening. The demo data isn't enough anymore — they need real functionality.

**Trigger 3: "I've already set this up."** Sunk cost. They spent 10-30 minutes branding everything, exploring features, understanding the workflow. Starting over with another tool means losing all that work. $79/month to activate what they've already built feels like nothing.

**Trigger 4: Email nudges.** Drip sequence after signup:

- Day 0: "Welcome! Your branded pages are ready to preview."
- Day 2: "Did you know? Your contact form can be embedded on any website. Go Live to activate it."
- Day 5: "Your FindABATherapy.org listing is live. Parents can find you. Go Live to start receiving their submissions."
- Day 10: "You've built something great. Here's what it looks like when it's live." (Show before/after — with banner vs. clean)
- Day 14: "Still in preview mode? Most agencies go live within their first week."

### Stage 6: Upgrade

**The upgrade flow is instant and frictionless.**

From any upgrade CTA ("Go Live," "Activate," the banner button):

1. **Upgrade modal opens** — not a new page, not a pricing page. A modal right where they are.
2. Modal shows: "Go Live — $79/month. Everything you've built becomes active."
3. Brief bullet list of what activates:
    - ✓ Forms go live and start accepting submissions
    - ✓ CRM unlocks — manage real clients
    - ✓ Email automation activates
    - ✓ FindABAJobs.org included
    - ✓ Full task management and reminders
4. **Credit card entry** (Stripe)
5. **One click: "Go Live"**
6. Instant activation. Banner disappears. Forms become submittable. Demo data is replaced with empty states ready for real data. Confetti moment.

**The confirmation screen:**

> 🎉 **You're live!**
> 
> Your forms are now accepting submissions. Your CRM is ready. Here's what to do next:
> 
> 1. Share your contact form → [Copy Link]
> 2. Share your intake form → [Copy Link]
> 3. Add your first real client → [Go to CRM]
> 4. Post your first job → [Go to FindABAJobs]

### Stage 7: Retention

Once live, the platform's natural integration creates stickiness:

- Leads flow in through forms → populate the CRM → trigger automated emails → generate tasks and reminders
- Every new client deepens data in the system
- Every communication is logged
- Every document is stored
- Switching cost grows with every week of usage

**Add-on expansion:**

- "You've used 10 of 10 locations. Add 5 more for $15/mo." — simple in-app prompt
- "Invite a team member? $20/mo per additional user." — from settings
- No friction, no tier migration, no plan changes. Just add what you need.

---

## IX. UI Changes Required

### A. Global Preview Mode Banner (Free users)

A persistent, dismissible-but-returning top bar on the dashboard:

> 🔒 **Preview Mode** — Your platform is set up and ready. Go Live to start accepting real submissions. → **[Go Live — $79/mo]**

Color: distinct from brand (amber/gold or neutral gray). Not alarming, but clearly "not finished."

### B. Branded Page Preview Banner

On every public-facing branded page (contact, intake, parent resources, brochure, website, careers):

Full-width, fixed top banner:

> 🔒 **This page is in preview mode.** Activate your account to go live and start accepting submissions. → **[Go Live — $79/mo]**

- High contrast, impossible to miss
- Different visual language than the agency's branding
- Pushes page content down (not an overlay — it's part of the page)

### C. Form Submit Button Lock

On contact and intake forms for free users:

- All form fields are visible and may be interactive
- Submit button is visually locked — grayed out with a lock icon
- Clicking the locked button shows a tooltip or small modal: _"This form is in preview mode. The agency owner can activate it by upgrading to Pro."_

### D. Demo Data Labels

On every dashboard section with demo data:

A subtle but clear label on each demo item/card/row:

> 📋 _Example data — [Go Live to manage real clients]_

The "Go Live" text is a clickable link that opens the upgrade modal.

### E. Empty State CTAs (Post-Upgrade)

When a Pro user has no data yet (just upgraded, demo data cleared):

Each section shows a purposeful empty state:

- **Leads:** "No submissions yet. Share your contact form to start receiving leads." → [Copy Form Link]
- **Clients:** "No clients yet. Add your first client or wait for form submissions." → [Add Client]
- **Employees:** "No employees yet. Add your first team member." → [Add Employee]
- **Jobs:** "No jobs posted yet. Create your first job listing." → [Post a Job]

### F. Sidebar Changes

**Free user sidebar:**

- "Preview Mode" badge below logo/agency name
- All navigation items visible and accessible
- Small lock icon next to sections that are demo-only (Clients, Employees, Jobs)
- Lead counter area shows "—" or "Go Live to track"

**Pro user sidebar:**

- No badge (or a subtle "Pro" badge if desired)
- All navigation items active, no lock icons
- Lead counter shows real numbers

### G. Settings / Billing Page

**Free user:** Settings page includes a prominent "Go Live" card at the top with the $79/mo CTA and bullet points of what activates.

**Pro user:** Settings page includes:

- Current plan: Pro — $79/mo
- Billing details and payment method (Stripe)
- Add-ons section: manage additional users, locations, jobs, storage
- Usage display: "3 of 10 locations used," "1 of 1 users," etc.

### H. Upgrade Modal

Triggered from any "Go Live" button across the platform. Consistent experience everywhere:

- Modal overlay (not a page navigation)
- Clean, single-purpose: headline, bullet list, price, credit card, one button
- Stripe Elements for card input
- "Go Live" button (not "Subscribe" or "Purchase" — language matters)
- Success state with confetti/celebration and next-steps checklist

### I. FindABAJobs Preview in Dashboard

Free users see a FindABAJobs section in their dashboard:

- 2-3 demo job postings with demo applicant data
- Banner: _"FindABAJobs.org is included with Pro. Go Live to post real jobs and recruit BCBAs and RBTs."_
- Demo applicant profiles showing what the hiring workflow looks like

### J. FindABATherapy Free Listing Management

Free users can manage up to 3 FindABATherapy.org listings:

- Location management UI is fully functional for directory listings
- Adding a 4th location shows: _"Free accounts include up to 3 FindABATherapy.org listings. Go Live for up to 10 locations."_
- Listings are live and real on the directory — no preview banner on the directory itself

---

## X. Conversion Metrics & Success Targets

### Conversion Metrics to Track

|Metric|What it tells you|
|---|---|
|Signup → Setup completion|Is onboarding too long or confusing?|
|Setup completion → Day 7 return|Are users coming back after initial setup?|
|Page preview views|Are users looking at their branded pages?|
|Upgrade modal opens|Are CTAs working? Which ones?|
|Modal open → Payment entered|Is the modal causing friction?|
|Payment → Activation|Is Stripe flow working?|
|Time from signup → upgrade|How long is the sales cycle?|
|Which CTA triggered upgrade|Which trigger is most effective?|
|Day 30 retention (Pro)|Are paying users staying?|
|Add-on adoption rate|Are users scaling naturally?|

### Success Targets

#### Activation

| Metric | Target |
|--------|--------|
| Onboarding completion rate | > 70% of signups |
| Time to first value (listing live) | < 5 minutes |
| Users who add first client within 7 days | > 50% of completed onboarding |
| Users who send first communication within 14 days | > 30% of Pro users |

#### Conversion

| Metric | Target |
|--------|--------|
| Free to Pro conversion rate | > 15% within 30 days |
| Primary upgrade trigger | Identify top 3 triggers |

#### Retention

| Metric | Target |
|--------|--------|
| Monthly active users (MAU) | Grow 20% MoM |
| Weekly dashboard logins | > 3x per week for Pro users |
| Communications sent per agency per month | > 5 for active Pro users |
| 90-day retention (Pro) | > 80% |

#### Product Value

| Metric | Target |
|--------|--------|
| Clients tracked per agency (avg) | > 15 for Pro users |
| Communications sent per client (avg) | > 3 over client lifetime |
| Tasks created per agency per month | > 10 for active users |
| Referral sources tracked | > 60% of new clients have source |

### North Star Metric

> **Clients moved from Inquiry to Active**
>
> The number of clients that agencies successfully move from Inquiry stage to Active stage using the platform. When this number grows, everything else follows — retention, expansion, referrals, and revenue.

---

## XI. The Pitch — Final Version

### For the landing page:

> ## Stop running your ABA business on Google Forms.
> 
> Branded intake forms. Client CRM. Automated emails. Task management. Job board. All connected. All yours. Set up in 10 minutes.
> 
> **Sign up free. Build your pages. Go Live when you're ready.**
> 
> One plan. $79/month. Everything included.

### For a sales conversation:

> "You're spending hours every week on intake forms, manual emails, spreadsheet tracking, and Indeed job postings. None of it talks to each other.
> 
> We replace all of it with one platform. Your branded contact form feeds into your CRM, which triggers automated emails, which generates tasks and reminders. Your job postings go on FindABAJobs.org and applicants flow into the same system.
> 
> You can sign up right now, for free, and see the whole thing working with your branding in 10 minutes. When you're ready to go live, it's $79 a month. That's it."

### For the upgrade moment:

> **You built it. Now turn it on.**
> 
> Your branded pages are ready. Your CRM is set up. Your email templates look great. Go Live to start accepting real submissions and managing real clients.
> 
> **$79/month. One click. You're live.**

---