# Critical User Flows - Find ABA Therapy & Find ABA Jobs

This document maps all critical user flows, features, and test cases for comprehensive E2E testing.

---

## Table of Contents

1. [Find ABA Therapy - Family/Visitor Experience](#1-find-aba-therapy---familyvisitor-experience)
2. [Find ABA Jobs - Job Seeker Experience](#2-find-aba-jobs---job-seeker-experience)
3. [Provider Dashboard - Full Lifecycle](#3-provider-dashboard---full-lifecycle)
4. [Cross-Platform Integration](#4-cross-platform-integration)
5. [Test Case Matrix](#5-test-case-matrix)

---

## 1. Find ABA Therapy - Family/Visitor Experience

### 1.1 Home Page Discovery

**URL:** `/`

**User Goal:** Find an ABA therapy provider for their child

**Critical Elements:**
- [ ] Hero section with search card loads
- [ ] Trust badges display ("All 50 states", "Verified providers", etc.)
- [ ] Search card has:
  - [ ] Location input with autocomplete
  - [ ] Service type filters (In-Home, Center-Based, Telehealth, School-Based)
  - [ ] Insurance dropdown
  - [ ] Search button
- [ ] Featured providers section displays (marquee or grid)
- [ ] Browse by insurance section (6 carriers: Aetna, Cigna, UnitedHealthcare, Medicaid, BCBS, Tricare)
- [ ] Browse by state grid (all 50 states clickable)
- [ ] "Get Listed" CTA visible
- [ ] Footer with legal links

**Search Flow:**
1. User enters location (city, state, or ZIP)
2. User selects service types (checkboxes)
3. User optionally selects insurance
4. User clicks search
5. → Redirects to `/search` with query params

---

### 1.2 Provider Search & Filtering

**URL:** `/search?[params]`

**User Goal:** Find providers matching their criteria

**Search Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | string | State name |
| `city` | string | City name |
| `query` | string | Free-text search |
| `insurance` | array | Insurance carriers |
| `serviceTypes` | array | in_home, in_center, telehealth, school_based |
| `languages` | array | Languages spoken |
| `acceptingClients` | boolean | Currently accepting |
| `agesServed` | range | Min-max age |
| `radiusMiles` | number | Proximity radius (default 25) |
| `page` | number | Pagination |

**Critical Filter Tests:**
- [ ] Location autocomplete works
- [ ] "Use current location" button works (geolocation)
- [ ] Service type checkboxes filter results
- [ ] Insurance multi-select filters results
- [ ] Language filter works
- [ ] Age range filter (min/max inputs)
- [ ] "Accepting clients" toggle works
- [ ] Distance radius dropdown (5-100 miles)
- [ ] Clear all filters resets everything
- [ ] Active filters display as removable badges
- [ ] Filter persistence in URL (shareable links)

**Results Display:**
- [ ] Results count shows ("Showing X of Y providers")
- [ ] Provider cards display:
  - [ ] Logo/avatar
  - [ ] Agency name
  - [ ] Location (city, state)
  - [ ] Service modes (icons/badges)
  - [ ] Insurance accepted
  - [ ] Distance (if proximity search)
  - [ ] Premium badge (if applicable)
- [ ] Pagination works (Previous/Next)
- [ ] Premium providers appear first
- [ ] "Get Listed Free" CTA card in results
- [ ] No results state shows helpful message

**Mobile Responsiveness:**
- [ ] Filter sheet/drawer on mobile
- [ ] Single column results on mobile
- [ ] Touch-friendly filter controls

---

### 1.3 State-Based Browsing

**URL:** `/[state]` (e.g., `/california`)

**User Goal:** Browse providers in a specific state

**Critical Elements:**
- [ ] State header with badge and provider count
- [ ] Search card scoped to state
- [ ] City browse section (clickable city cards)
- [ ] Insurance filter badges (quick access)
- [ ] Provider results (max 50, sorted by premium)
- [ ] "About ABA Therapy in [State]" content section
- [ ] State-specific FAQs (4 questions)
- [ ] "View all X providers" button if >50

**Navigation:**
- [ ] Click city → goes to `/[state]/[city]`
- [ ] Click insurance → filters search
- [ ] Breadcrumb navigation works

---

### 1.4 City-Based Browsing

**URL:** `/[state]/[city]` (e.g., `/california/los-angeles`)

**User Goal:** Find providers near a specific city

**Critical Elements:**
- [ ] City header with badges and provider count
- [ ] "Last updated" date
- [ ] Insurance filter badges
- [ ] Provider results sorted by proximity to city center
- [ ] City-specific content section
- [ ] City-specific FAQs
- [ ] Nearby cities section (related city links)
- [ ] Geo meta tags present (geo.region, geo.placename)

---

### 1.5 Insurance-Based Browsing

**URL:** `/insurance` and `/insurance/[slug]`

**User Goal:** Find providers accepting specific insurance

**Insurance Directory (`/insurance`):**
- [ ] Search input for finding insurance
- [ ] Insurance card grid (icon, name, description)
- [ ] Cards link to individual insurance pages
- [ ] FAQ section (6 questions)

**Individual Insurance Page (`/insurance/[slug]`):**
- [ ] Insurance name and description
- [ ] Providers accepting that insurance
- [ ] Related insurance links
- [ ] "Get Listed" CTA

---

### 1.6 Provider Profile Page

**URL:** `/provider/[slug]`

**User Goal:** Learn about a provider and contact them

**Profile Sections (All Providers):**
- [ ] Hero with logo, name, headline
- [ ] Verified badge (if premium + active subscription)
- [ ] "Accepting New Clients" badge (if applicable)
- [ ] Contact info card (email, phone, website)
- [ ] Location section with:
  - [ ] Address
  - [ ] Service modes (Center/In-Home/Both)
  - [ ] Service radius (for in-home)
  - [ ] Directions button (center-based)
  - [ ] Location-specific insurances
- [ ] Insurance accepted badges
- [ ] Services offered

**Premium-Only Sections:**
- [ ] Google rating and review count
- [ ] Google reviews gallery
- [ ] About section with:
  - [ ] Ages served
  - [ ] Languages
  - [ ] Diagnoses treated
  - [ ] Clinical specialties
- [ ] Photo gallery (up to 10 photos)
- [ ] Video embed (YouTube)
- [ ] Contact form (if enabled)

**Multi-Location Support:**
- [ ] "Other Locations" card shows all locations
- [ ] Click location → highlights that location
- [ ] URL query param tracks current location view

---

### 1.7 Contact Form Submission (Premium Providers)

**User Goal:** Send inquiry to provider

**Form Fields:**
| Field | Required | Validation |
|-------|----------|------------|
| Family Name | Yes | Min 2 chars |
| Family Email | Yes | Valid email format |
| Family Phone | No | Phone format |
| Child Age | No | Select dropdown |
| Message | Yes | Min length |
| Turnstile CAPTCHA | Yes | Must complete |

**Form Behavior:**
- [ ] All required fields validated before submit
- [ ] Turnstile CAPTCHA loads and can be completed
- [ ] Honeypot field (hidden "website" field) present
- [ ] Form saves contact info to localStorage for auto-fill
- [ ] Success message displays after submission
- [ ] Option to send another message
- [ ] Error messages display on validation failure
- [ ] Turnstile resets on error for retry

**Backend Flow:**
- Inquiry stored in database
- Email notification sent to provider
- Source tracked as "listing_page"

---

### 1.8 Educational Content

**Learn Hub (`/learn`):**
- [ ] Article list with category filters
- [ ] Quick access to FAQ and Glossary
- [ ] Featured CTA to search providers

**Article Pages (`/learn/[slug]`):**
- [ ] Breadcrumb navigation
- [ ] Article header (title, category, read time)
- [ ] Full article content
- [ ] Related articles
- [ ] Table of contents (long articles)

**Glossary (`/learn/glossary`):**
- [ ] Searchable terms
- [ ] Category filtering
- [ ] Definitions display

---

### 1.9 Static Pages

**FAQ (`/faq`):**
- [ ] 5 categories with 6-8 questions each
- [ ] Searchable FAQ interface
- [ ] Category filtering
- [ ] Expandable/collapsible questions

**Legal Pages:**
- [ ] Terms of Service (`/legal/terms`) loads
- [ ] Privacy Policy (`/legal/privacy`) loads

**Get Listed (`/get-listed`):**
- [ ] Hero with CTAs
- [ ] Pricing plans display (Free, Pro, Enterprise)
- [ ] Annual/Monthly toggle
- [ ] Features section
- [ ] Testimonials
- [ ] How it works section
- [ ] FAQ section

---

## 2. Find ABA Jobs - Job Seeker Experience

### 2.1 Jobs Landing Page

**URL:** `/jobs`

**User Goal:** Discover ABA career opportunities

**Critical Elements:**
- [ ] Hero with animated background
- [ ] Live job count badge
- [ ] Search bar (keyword + location inputs)
- [ ] Quick filters (BCBA, RBT, Remote, Clinical Director)
- [ ] Browse by position type (6 cards)
- [ ] Featured jobs section (up to 6 jobs)
- [ ] Job preview table
- [ ] Browse by state grid (50 states + DC)
- [ ] Employer CTA ("Post a Job Free")

---

### 2.2 Job Search & Filtering

**URL:** `/jobs/search?[params]`

**User Goal:** Find jobs matching criteria

**Search Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Keyword search |
| `location` | string | City, state, or ZIP |
| `position` | array | Position types |
| `employment` | array | Employment types |
| `remote` | boolean | Remote only |
| `state` | string | State code |
| `city` | string | City name |
| `posted` | enum | 24h, 7d, 30d |
| `page` | number | Pagination |
| `sort` | enum | relevance, date, salary |

**Filter Options:**
- [ ] Position Type checkboxes:
  - BCBA, BCaBA, RBT, BT, Clinical Director, Regional Director, Executive Director, Admin, Other
- [ ] Employment Type checkboxes:
  - Full-time, Part-time, Contract, Per Diem, Internship
- [ ] Remote Only toggle
- [ ] Posted Within dropdown (Any, 24h, 7d, 30d)
- [ ] Active filter count badge
- [ ] "Clear All" button
- [ ] "Apply Filters" button

**Results Display:**
- [ ] Job count ("Showing X of Y jobs")
- [ ] Job cards display:
  - [ ] Company logo
  - [ ] Job title
  - [ ] Company name + verified badge
  - [ ] Location or "Remote"
  - [ ] Salary (if provided, formatted as "$85k/yr")
  - [ ] Position type badge
  - [ ] Employment type badges (first 2)
  - [ ] "Remote OK" badge if applicable
  - [ ] Posted time ("X days ago")
- [ ] Pagination (Previous/Next)
- [ ] No results state with clear filters option

**Sorting:**
- [ ] Relevance (default - premium first, then date)
- [ ] Date (newest first)
- [ ] Salary (highest first)

---

### 2.3 Job Detail Page

**URL:** `/job/[slug]`

**User Goal:** Learn about job and apply

**Job Header:**
- [ ] Provider logo
- [ ] Job title (h1)
- [ ] Company name + verified badge
- [ ] Location + Remote indicator
- [ ] Posted timestamp
- [ ] Position type badge
- [ ] Employment type badges
- [ ] Salary display (if provided)

**Job Content:**
- [ ] Full job description
- [ ] Requirements section (if provided)
- [ ] Benefits section with icons:
  - Health Insurance, Dental & Vision, PTO, 401k, BCBA Supervision, CEU Stipend, Tuition Reimbursement, Signing Bonus, Flexible Schedule, Mileage Reimbursement

**Sidebar:**
- [ ] Apply Now card (prominent CTA)
- [ ] About the Company card
- [ ] Job Summary card

**Apply Buttons:**
- [ ] Top "Apply" button
- [ ] Sidebar "Apply Now" button
- [ ] Both open application modal

---

### 2.4 Job Application Flow

**User Goal:** Submit job application

**Application Form Fields:**
| Field | Required | Validation |
|-------|----------|------------|
| Full Name | Yes | 2-100 chars |
| Email | Yes | Valid email |
| Phone | No | Valid phone format |
| LinkedIn URL | No | Valid URL |
| Resume | Yes | PDF/DOC/DOCX, max 10MB |
| Cover Letter | No | Max 5000 chars |
| Source | No | Dropdown selection |
| Turnstile CAPTCHA | Yes | Must complete |

**Resume Upload:**
- [ ] Drag & drop support
- [ ] Click to upload support
- [ ] File type validation (PDF, DOC, DOCX only)
- [ ] File size validation (max 10MB)
- [ ] File preview shows name and size
- [ ] Remove file button

**Source Options:**
- Direct Application (default)
- Careers Page
- LinkedIn
- Indeed
- Referral
- Google Search
- Other

**Form Behavior:**
- [ ] Client-side validation on all fields
- [ ] Honeypot field (hidden "website")
- [ ] Turnstile CAPTCHA required
- [ ] Form saves applicant info to localStorage
- [ ] Auto-fills on subsequent applications
- [ ] Success message with job/company name
- [ ] "Submit Another Application" button

**Backend Flow:**
- Turnstile token verified
- Duplicate check (same email + job)
- Resume uploaded to S3
- Application record created with status "new"
- Confirmation email to applicant
- Notification email to provider

---

### 2.5 State Jobs Pages

**URL:** `/jobs/[state]` (e.g., `/jobs/california`)

**User Goal:** Browse jobs in a specific state

**Critical Elements:**
- [ ] State icon and title
- [ ] Total job count in state
- [ ] "Search [State] Jobs" button
- [ ] Browse by position type (state-filtered)
- [ ] Popular cities section (top 8 by job count)
- [ ] Latest jobs list
- [ ] No results state with "Browse Remote Jobs" option

---

### 2.6 Position Type Pages

**URL:** `/[position]-jobs` (e.g., `/bcba-jobs`)

**User Goal:** Browse jobs for specific position

**Position Types:**
- bcba-jobs, bcaba-jobs, rbt-jobs, bt-jobs
- clinical-director-jobs, regional-director-jobs
- executive-director-jobs, admin-jobs

**Critical Elements:**
- [ ] Position title and icon
- [ ] Nationwide job count
- [ ] Typical Requirements card (4-5 items)
- [ ] Salary Range card (position-specific estimates)
- [ ] Browse by state (top 8 states)
- [ ] Latest jobs for position

---

### 2.7 Provider Careers Page

**URL:** `/provider/[slug]/careers`

**User Goal:** See all jobs from a specific company

**Critical Elements:**
- [ ] Provider hero (logo, name, headline, location)
- [ ] "Visit Website" button
- [ ] "View Full Profile" button
- [ ] "Open Positions (X)" section
- [ ] Job cards for all published jobs
- [ ] About section (if description provided)
- [ ] "Search All Jobs" CTA

---

## 3. Provider Dashboard - Full Lifecycle

### 3.1 Sign Up Flow

**URL:** `/auth/sign-up?plan=[plan]&interval=[interval]`

**User Goal:** Create provider account

**Sign Up Options:**
- [ ] Google OAuth button
- [ ] Microsoft OAuth button
- [ ] Email/Password form

**Email Sign Up Fields:**
| Field | Required | Validation |
|-------|----------|------------|
| Email | Yes | Valid email |
| Password | Yes | Min 8 characters |
| Terms & Privacy | Yes | Checkbox must be checked |
| Turnstile CAPTCHA | Yes | Must complete |

**URL Parameters:**
- `plan`: free, pro, enterprise
- `interval`: monthly, annual

**Flow:**
1. Enter credentials
2. Accept terms
3. Complete CAPTCHA
4. Submit
5. Email confirmation (or direct redirect)
6. → Redirect to `/dashboard/onboarding`

**Analytics Tracking:**
- Method selected (google/microsoft/email)
- Form submission
- Field completion
- CAPTCHA completion
- Terms acceptance
- Success/error

---

### 3.2 Sign In Flow

**URL:** `/auth/sign-in?redirect=[url]`

**User Goal:** Access existing account

**Sign In Options:**
- [ ] Google OAuth button
- [ ] Microsoft OAuth button
- [ ] Email/Password form

**Email Sign In:**
- [ ] Email input
- [ ] Password input
- [ ] Turnstile (appears after 2 failed attempts)
- [ ] "Forgot password?" link
- [ ] Sign up link

**Post-Login:**
- Redirects to `redirect` param or `/dashboard`

---

### 3.3 Password Reset

**URL:** `/auth/reset-password`

**Flow:**
1. Enter email
2. Click submit
3. Check email for reset link
4. Click link
5. Enter new password
6. Submit
7. → Redirect to sign in

---

### 3.4 Onboarding Flow

**Step 1: Practice Details** (`/dashboard/onboarding/details`)

| Field | Required | Validation |
|-------|----------|------------|
| Practice Name | Yes | 2-100 chars |
| Tagline/Headline | No | Max 150 chars |
| About Practice | Yes | 50-2000 chars |
| Services Offered | Yes | At least 1 selected |
| Contact Email | Yes | Valid email |
| Phone | No | Valid format |
| Website | No | Valid URL |

**Services Options:**
- ABA Therapy (default)
- Occupational Therapy (OT)
- Speech Therapy (SLP)
- Physical Therapy (PT)
- Feeding Therapy
- Social Skills Groups

---

**Step 2: Location & Services** (`/dashboard/onboarding/location`)

| Field | Required | Validation |
|-------|----------|------------|
| Service Types | Yes | At least 1 selected |
| Address (Autocomplete) | Yes | Valid address |
| Street | Conditional | Required for center/school-based |
| City | Yes | From autocomplete |
| State | Yes | From autocomplete |
| Postal Code | Yes | Valid format |
| Service Radius | Conditional | Required for in-home/telehealth |
| Insurances | Yes | At least 1 selected |
| Accepting Clients | No | Toggle |

**Service Types:**
- In-Home
- Center-Based
- Telehealth
- School-Based

**Insurance Options (22):**
- Aetna, Anthem, Beacon, Blue Cross, Cigna, Humana, Kaiser, Medicaid, Medicare, UnitedHealthcare, etc.
- Self-Pay, Other Commercial

**Service Radius Options:**
- 5, 10, 25, 50, 100 miles

---

**Step 3: Enhanced Profile** (`/dashboard/onboarding/enhanced`)

Premium Fields (Pro/Enterprise only):
| Field | Required | Options |
|-------|----------|---------|
| Ages Served | No | Min 0-99, Max 0-99 |
| Languages | No | 13 options |
| Diagnoses | No | 9 options |
| Specialties | No | 11 options |
| Video URL | No | YouTube/Vimeo |
| Contact Form | No | Toggle |

**Language Options:**
- English, Spanish, Mandarin, Cantonese, Vietnamese, Korean, Tagalog, Arabic, French, Russian, Portuguese, Hindi, Other

**Diagnoses Options:**
- ASD, ADHD, Developmental Delays, Intellectual Disabilities, Anxiety, Behavioral Disorders, Down Syndrome, Cerebral Palsy, Other Neurodevelopmental

**Specialty Options:**
- Early Intervention, School-Age, Adolescent/Adult, Parent Training, School Consultation, Feeding Therapy, Toilet Training, Social Skills Groups, Crisis Intervention, OT, Speech Therapy

---

**Step 4: Review & Plan Selection** (`/dashboard/onboarding/review`)

**Preview Shows:**
- Agency name
- Headline
- Location details
- Contact info
- Service modes
- Insurances
- Premium fields (if applicable)

**Plan Selection (unpaid users):**
| Plan | Monthly | Annual | Features |
|------|---------|--------|----------|
| Free | $0 | $0 | 1 location, basic profile, 1 job |
| Pro | $59/mo | $49/mo | 5 locations, contact form, photos, verified badge, 5 jobs |
| Enterprise | $149/mo | $125/mo | Unlimited locations, homepage placement, unlimited jobs |

**Actions:**
- Upgrade to Pro/Enterprise (→ Stripe checkout)
- Continue Free (→ Publish listing)

---

### 3.5 Dashboard Overview

**URL:** `/dashboard`

**Elements:**
- [ ] Quick Stats:
  - Listing Status (Published/Draft)
  - Current Plan (Free/Pro/Enterprise)
  - Service Locations count
  - New Inquiries count (Pro+ only)
- [ ] Onboarding Checklist (if incomplete):
  - Add services and insurances
  - Confirm location and contact info
  - Add photos/video (upgrade for free users)
  - View public listing
- [ ] Analytics Preview (Pro+ only)
- [ ] Featured Upsell (Pro+ with published listing)
- [ ] Upgrade Section (Free with published listing)

---

### 3.6 Company/Listing Management

**URL:** `/dashboard/company`

**Sections:**
- [ ] Listing Status card (Published/Draft + View Live)
- [ ] Company Details form:
  - Company Name
  - Headline
  - Description (with character counter)
  - Summary
  - Logo upload
- [ ] Company Contact card
- [ ] Service Locations summary
- [ ] Services & Attributes
- [ ] Contact Form status
- [ ] Photos & Video status

---

### 3.7 Locations Management

**URL:** `/dashboard/locations`

**Plan Limits:**
| Plan | Limit |
|------|-------|
| Free | 1 location |
| Pro | 5 locations |
| Enterprise | Unlimited |

**Location Fields:**
- Label (optional)
- Service types
- Address (autocomplete)
- Service radius
- Insurances
- Accepting clients toggle
- Primary location indicator

**Actions:**
- Add new location
- Edit existing location
- Delete location
- Set as primary

---

### 3.8 Jobs Management

**URL:** `/dashboard/jobs`

**Plan Limits:**
| Plan | Limit |
|------|-------|
| Free | 1 job |
| Pro | 5 jobs |
| Enterprise | Unlimited |

**Job List Display:**
- Job title
- Position type
- Employment types
- Location
- Status badge
- Applications count
- View/Edit links

---

### 3.9 Create/Edit Job

**URL:** `/dashboard/jobs/new` or `/dashboard/jobs/[id]`

**Job Form Fields:**
| Field | Required | Validation |
|-------|----------|------------|
| Title | Yes | 5-100 chars |
| Position Type | Yes | Dropdown |
| Location | No | Dropdown |
| Remote Option | No | Toggle |
| Employment Types | Yes | At least 1 |
| Show Salary | No | Toggle |
| Salary Type | Conditional | If showing salary |
| Salary Min | Conditional | If showing salary |
| Salary Max | No | Must be >= min |
| Description | Yes | 50-10,000 chars |
| Requirements | No | Max 5000 chars |
| Benefits | No | Multi-select |
| Status | Yes | Draft/Published |

**Position Types:**
- BCBA, BCaBA, RBT, BT
- Clinical Director, Regional Director, Executive Director
- Admin, Other

**Employment Types:**
- Full-time, Part-time, Contract, Per Diem, Internship

**Benefits:**
- Health Insurance, Dental & Vision, PTO, 401k
- BCBA Supervision, CEU Stipend, Tuition Reimbursement
- Signing Bonus, Flexible Schedule, Mileage Reimbursement

---

### 3.10 Applications Management

**URL:** `/dashboard/jobs/applications`

**List Display:**
- Applicant name
- Job applied for
- Application date
- Status badge (color-coded)
- Notes preview
- Rating (1-5 stars)

**Status Options:**
- New (blue)
- Reviewed (gray)
- Phone Screen (purple)
- Interview (orange)
- Offered (emerald)
- Hired (green)
- Rejected (red)

---

### 3.11 Application Detail

**URL:** `/dashboard/jobs/applications/[id]`

**Display:**
- Applicant info (name, email, phone)
- Cover letter
- LinkedIn URL
- Resume download link

**Actions:**
- Change status (dropdown)
- Add/edit notes (max 5000 chars)
- Set rating (1-5 stars)
- Hire button
- Reject button

---

### 3.12 Inbox (Pro+ Only)

**URL:** `/dashboard/inbox`

**Tabs:**
- Inbox (active inquiries)
- Archive (archived inquiries)

**Stats:**
- Total inquiries
- Unread count

**Filters:**
- Location filter
- Status filter (read/unread)
- Sort options

**Inquiry Display:**
- Unread indicator (blue dot)
- Sender name
- Subject preview
- Date/time

**Actions:**
- Mark read/unread
- Archive
- View full inquiry

**Intake Form Settings:**
- Contact form toggle
- Background color customization (#5788FF default)
- "Powered by" attribution toggle

---

### 3.13 Analytics (Pro+ Only)

**URL:** `/dashboard/analytics`

**Metrics:**
- Page Views
- Search Impressions
- Click-through Rate (CTR)

**Filters:**
- Date range (7d, 30d, 90d, custom)
- Location filter

**Display:**
- Metric cards with sparklines
- Line/area charts
- Data table (exportable)
- Traffic sources

---

### 3.14 Billing & Subscription

**URL:** `/dashboard/billing`

**Current Plan Display:**
- Plan name with icon
- Status badge (Active, Trial, Cancelling, Past Due)
- Price and renewal date
- Annual savings badge
- Manage Subscription button (Stripe portal)

**Alerts:**
- Subscription Cancelling (amber)
- Payment Past Due (red)
- Payment Not Completed (amber)
- Pending Changes (blue)

**Upgrade Cards (Free users):**
- Pro Plan card with features and CTAs
- Enterprise Plan card with features and CTAs

**Featured Locations Add-on (Pro+):**
- $99/mo per location ($59/mo annual)
- Current featured locations list
- Add/remove featured status

---

### 3.15 Checkout Flow

**URL:** `/dashboard/billing/checkout?plan=[plan]&interval=[interval]`

**Flow:**
1. Select plan from billing page
2. Redirect to checkout page
3. Display selected plan details
4. Redirect to Stripe Checkout
5. Complete payment on Stripe
6. Redirect to success page

---

### 3.16 Success Page

**URL:** `/dashboard/billing/success`

**Display:**
- Success message
- Plan confirmation
- "Go to Dashboard" button

---

### 3.17 Settings

**URL:** `/dashboard/settings`

**Account Information:**
- Name
- Email (with verified badge)
- Sign-in methods (Google, Microsoft, Email)
- Account created date

---

## 4. Cross-Platform Integration

### 4.1 Provider Listing ↔ Find ABA Therapy

**Test Scenarios:**
1. Create listing → appears in search results
2. Update listing details → reflected on public profile
3. Add/remove locations → updates search results
4. Change insurance accepted → filters correctly
5. Toggle accepting clients → status updates
6. Add photos/video → displays on profile
7. Enable contact form → form appears on profile
8. Upgrade to Pro → verified badge appears

---

### 4.2 Job Posting ↔ Find ABA Jobs

**Test Scenarios:**
1. Create job (published) → appears in job search
2. Create job (draft) → does NOT appear publicly
3. Update job details → reflected on job page
4. Change job status to closed → removed from search
5. Associate location → job shows correct location
6. Set remote option → appears in remote filter
7. Add salary → displays on job card
8. Provider upgrade → jobs show verified badge

---

### 4.3 Application ↔ Dashboard

**Test Scenarios:**
1. Submit application → appears in provider dashboard
2. Upload resume → downloadable by provider
3. Provider changes status → tracked correctly
4. Provider adds notes → persisted
5. Provider sets rating → displayed

---

### 4.4 Inquiry ↔ Inbox

**Test Scenarios:**
1. Submit contact form → appears in inbox
2. Inquiry marked read → indicator updates
3. Archive inquiry → moves to archive tab
4. Filter by location → correct inquiries shown

---

### 4.5 Plan Limits

**Test Scenarios:**
| Plan | Locations | Jobs | Test |
|------|-----------|------|------|
| Free | 1 | 1 | Cannot add 2nd location/job |
| Pro | 5 | 5 | Can add up to 5, blocked at 6 |
| Enterprise | ∞ | ∞ | Can add unlimited |

**Feature Access:**
| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Contact Form | ❌ | ✅ | ✅ |
| Inbox | ❌ | ✅ | ✅ |
| Analytics | ❌ | ✅ | ✅ |
| Photo Gallery | ❌ | ✅ | ✅ |
| Video Embed | ❌ | ✅ | ✅ |
| Verified Badge | ❌ | ✅ | ✅ |
| Homepage Placement | ❌ | ❌ | ✅ |
| Featured Locations | ❌ | 1 | ∞ |

---

## 5. Test Case Matrix

### 5.1 Find ABA Therapy - Public Tests

| Test ID | Flow | Description | Priority |
|---------|------|-------------|----------|
| FAT-001 | Home | Home page loads with all sections | P0 |
| FAT-002 | Home | Search card submits correctly | P0 |
| FAT-003 | Search | Filters work correctly | P0 |
| FAT-004 | Search | Results pagination works | P1 |
| FAT-005 | Search | No results state displays | P1 |
| FAT-006 | State | State page loads with providers | P1 |
| FAT-007 | City | City page loads with providers | P1 |
| FAT-008 | Insurance | Insurance directory loads | P1 |
| FAT-009 | Insurance | Individual insurance page loads | P2 |
| FAT-010 | Provider | Provider profile displays correctly | P0 |
| FAT-011 | Provider | Contact form submits (Premium) | P0 |
| FAT-012 | Provider | Multiple locations display | P1 |
| FAT-013 | Learn | Article pages load | P2 |
| FAT-014 | FAQ | FAQ page loads and expands | P2 |
| FAT-015 | Legal | Terms and Privacy pages load | P2 |
| FAT-016 | Get Listed | Pricing page displays | P1 |
| FAT-017 | Mobile | All pages responsive | P1 |

### 5.2 Find ABA Jobs - Public Tests

| Test ID | Flow | Description | Priority |
|---------|------|-------------|----------|
| FAJ-001 | Home | Jobs home page loads | P0 |
| FAJ-002 | Search | Job search with filters | P0 |
| FAJ-003 | Search | Pagination works | P1 |
| FAJ-004 | Job | Job detail page loads | P0 |
| FAJ-005 | Apply | Application form validates | P0 |
| FAJ-006 | Apply | Resume upload works | P0 |
| FAJ-007 | Apply | Application submits successfully | P0 |
| FAJ-008 | Apply | Duplicate application blocked | P1 |
| FAJ-009 | State | State jobs page loads | P1 |
| FAJ-010 | Position | Position type page loads | P1 |
| FAJ-011 | Careers | Provider careers page loads | P1 |
| FAJ-012 | Mobile | All pages responsive | P1 |

### 5.3 Authentication Tests

| Test ID | Flow | Description | Priority |
|---------|------|-------------|----------|
| AUTH-001 | Sign Up | Email sign up works | P0 |
| AUTH-002 | Sign Up | Google OAuth works | P0 |
| AUTH-003 | Sign Up | Microsoft OAuth works | P1 |
| AUTH-004 | Sign Up | Validation errors display | P0 |
| AUTH-005 | Sign In | Email sign in works | P0 |
| AUTH-006 | Sign In | Invalid credentials error | P0 |
| AUTH-007 | Sign In | Turnstile after failed attempts | P1 |
| AUTH-008 | Reset | Password reset flow | P1 |
| AUTH-009 | Redirect | Protected routes redirect | P0 |
| AUTH-010 | Logout | Logout clears session | P0 |

### 5.4 Dashboard Tests

| Test ID | Flow | Description | Priority |
|---------|------|-------------|----------|
| DASH-001 | Overview | Dashboard loads | P0 |
| DASH-002 | Onboarding | Complete onboarding flow | P0 |
| DASH-003 | Company | Edit listing details | P0 |
| DASH-004 | Company | Logo upload works | P1 |
| DASH-005 | Locations | Add location | P0 |
| DASH-006 | Locations | Edit location | P1 |
| DASH-007 | Locations | Delete location | P1 |
| DASH-008 | Locations | Plan limit enforced | P0 |
| DASH-009 | Jobs | Create job posting | P0 |
| DASH-010 | Jobs | Edit job posting | P1 |
| DASH-011 | Jobs | Change job status | P0 |
| DASH-012 | Jobs | Plan limit enforced | P0 |
| DASH-013 | Apps | View applications | P0 |
| DASH-014 | Apps | Change application status | P1 |
| DASH-015 | Apps | Download resume | P1 |
| DASH-016 | Inbox | View inquiries (Pro+) | P1 |
| DASH-017 | Inbox | Mark read/unread | P2 |
| DASH-018 | Analytics | View analytics (Pro+) | P1 |
| DASH-019 | Billing | View current plan | P0 |
| DASH-020 | Billing | Upgrade flow | P0 |
| DASH-021 | Settings | View account info | P2 |

### 5.5 Integration Tests

| Test ID | Flow | Description | Priority |
|---------|------|-------------|----------|
| INT-001 | Listing | Published listing appears in search | P0 |
| INT-002 | Listing | Updated details reflected publicly | P0 |
| INT-003 | Jobs | Published job appears in search | P0 |
| INT-004 | Jobs | Draft job NOT in search | P0 |
| INT-005 | Apply | Application appears in dashboard | P0 |
| INT-006 | Inquiry | Contact form creates inbox item | P0 |
| INT-007 | Upgrade | Pro features unlock after payment | P0 |
| INT-008 | Downgrade | Features restricted after cancel | P1 |

---

## Appendix A: Test User Personas

### Family/Visitor
- Looking for ABA therapy provider
- May have specific insurance requirements
- May need specific service types
- May be in specific location

### Job Seeker
- Looking for ABA career opportunity
- May have specific position preference
- May need specific employment type
- May prefer remote work

### Provider (Free)
- New to platform
- Limited budget
- Basic listing needs
- 1 location, 1 job

### Provider (Pro)
- Established practice
- Multiple locations (up to 5)
- Wants direct inquiries
- Hiring multiple positions

### Provider (Enterprise)
- Large organization
- Many locations
- Homepage visibility
- Unlimited hiring

---

## Appendix B: Environment Configuration

### Test Environment Variables
```env
# Authentication
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!

# Pro User (for premium feature tests)
TEST_PRO_USER_EMAIL=pro@example.com
TEST_PRO_USER_PASSWORD=TestPassword123!

# Enterprise User
TEST_ENTERPRISE_USER_EMAIL=enterprise@example.com
TEST_ENTERPRISE_USER_PASSWORD=TestPassword123!

# Base URLs
PLAYWRIGHT_BASE_URL=http://localhost:3000
PLAYWRIGHT_JOBS_URL=http://localhost:3000/jobs
```

### Test Data Requirements
- At least one published Free provider listing
- At least one published Pro provider listing
- At least one published job posting
- At least one state with providers
- At least one insurance with providers
