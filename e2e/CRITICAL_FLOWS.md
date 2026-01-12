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

## 6. Additional Find ABA Therapy Pages

### 6.1 States Directory

**URL:** `/states`

**User Goal:** Browse all 50 states to find providers

**Critical Elements:**
- [ ] Page loads with all 50 state cards
- [ ] Each state shows state name and icon
- [ ] Click state → navigates to `/[state]`
- [ ] Search/filter states functionality
- [ ] Mobile responsive grid

---

### 6.2 Centers Directory

**URL:** `/centers`

**User Goal:** Find center-based therapy providers

**Critical Elements:**
- [ ] Page loads with center-based filter applied
- [ ] Shows providers with center-based service mode
- [ ] Filter by state/city
- [ ] SEO meta tags present
- [ ] Mobile responsive

---

### 6.3 State Guide Pages

**URL:** `/[state]/guide` (e.g., `/california/guide`)

**User Goal:** Learn about ABA therapy in specific state

**Critical Elements:**
- [ ] Page loads with state-specific content
- [ ] Breadcrumb navigation (Home → State → Guide)
- [ ] Table of contents
- [ ] State-specific regulations/resources
- [ ] CTA to search providers in state
- [ ] Related links section

---

### 6.4 Glossary Page

**URL:** `/learn/glossary`

**User Goal:** Look up ABA terminology

**Critical Elements:**
- [ ] Page loads with glossary terms
- [ ] Alphabetical navigation (A-Z)
- [ ] Search/filter terms
- [ ] Term definitions expand/display
- [ ] Related terms links
- [ ] Mobile responsive

---

### 6.5 Provider Shortlink

**URL:** `/provider/p/[slug]`

**User Goal:** Access provider via short URL

**Critical Elements:**
- [ ] Redirects to full provider profile
- [ ] Preserves any query parameters
- [ ] 301 redirect for SEO

---

## 7. Find ABA Jobs - Additional Pages

### 7.1 Employers Directory

**URL:** `/employers`

**User Goal:** Browse companies hiring in ABA

**Critical Elements:**
- [ ] Page loads with employer cards
- [ ] Search employers by name
- [ ] Filter by hiring status (currently hiring)
- [ ] Employer card shows:
  - [ ] Company logo
  - [ ] Company name
  - [ ] Number of open positions
  - [ ] Location
- [ ] Click card → navigates to `/employers/[slug]`
- [ ] Pagination works
- [ ] Mobile responsive

---

### 7.2 Employer Profile

**URL:** `/employers/[slug]`

**User Goal:** Learn about company and see all their jobs

**Critical Elements:**
- [ ] Page loads with employer details
- [ ] Company logo, name, description
- [ ] Contact information
- [ ] All open positions listed
- [ ] Job cards link to `/job/[slug]`
- [ ] "View Provider Profile" link (if applicable)
- [ ] Mobile responsive

---

### 7.3 Post Job Page

**URL:** `/employers/post`

**User Goal:** Employer wants to post a job

**Critical Elements:**
- [ ] Page loads with CTA
- [ ] Links to sign up/sign in
- [ ] Pricing information displayed
- [ ] Benefits of posting
- [ ] "Get Started" button → auth flow
- [ ] Mobile responsive

---

### 7.4 City Jobs Pages

**URL:** `/jobs/[state]/[city]` (e.g., `/jobs/california/los-angeles`)

**User Goal:** Find jobs in specific city

**Critical Elements:**
- [ ] Page loads with city header
- [ ] Job count in city
- [ ] Job cards for city
- [ ] Nearby cities section
- [ ] Breadcrumb navigation
- [ ] Filter options available
- [ ] Mobile responsive

---

## 8. White-Label Careers Pages

### 8.1 Provider Careers Page

**URL:** `/careers/[slug]`

**User Goal:** View provider's branded careers page

**Critical Elements:**
- [ ] Page loads with provider branding
- [ ] Provider logo prominently displayed
- [ ] Provider description/about section
- [ ] All published jobs listed
- [ ] No site header/footer (clean embed)
- [ ] "Powered by BehaviorWork" footer (Free/Pro)
- [ ] No branding footer (Enterprise)
- [ ] Apply button on each job
- [ ] Mobile responsive

---

### 8.2 Careers Job Detail

**URL:** `/careers/[slug]/[jobSlug]`

**User Goal:** View job details on careers page

**Critical Elements:**
- [ ] Job details display correctly
- [ ] Provider branding maintained
- [ ] Apply button works
- [ ] Back to careers link
- [ ] Application form opens correctly
- [ ] Mobile responsive

---

## 9. Dashboard - Additional Sections

### 9.1 Media Management

**URL:** `/dashboard/media`

**User Goal:** Manage photos and videos

**Critical Elements:**
- [ ] Page loads for Pro+ users
- [ ] Photo upload (up to 10 photos)
- [ ] File type validation (JPG, PNG, WebP)
- [ ] File size validation (max 5MB per photo)
- [ ] Drag and drop reorder
- [ ] Delete photo functionality
- [ ] Video URL input (YouTube/Vimeo)
- [ ] Video preview
- [ ] Save changes button
- [ ] Free users see upgrade prompt

---

### 9.2 Intake Form Management

**URL:** `/dashboard/intake`

**User Goal:** Manage custom intake forms

**Critical Elements:**
- [ ] Page loads with intake form settings
- [ ] Toggle intake form on/off
- [ ] Customize form fields
- [ ] View form submissions
- [ ] Copy intake form URL
- [ ] Preview intake form
- [ ] Mobile responsive

---

### 9.3 Clients Management

**URL:** `/dashboard/clients`

**User Goal:** View and manage family clients

**Critical Elements:**
- [ ] Page loads with client list (Pro+)
- [ ] Client cards show name, contact
- [ ] Search/filter clients
- [ ] View client details
- [ ] Client notes/history
- [ ] Free users see upgrade prompt

---

### 9.4 Leads Management

**URL:** `/dashboard/leads`

**User Goal:** Track potential clients

**Critical Elements:**
- [ ] Page loads with leads list (Pro+)
- [ ] Lead sources tracked
- [ ] Lead status (new, contacted, converted)
- [ ] Lead notes
- [ ] Convert to client action
- [ ] Free users see upgrade prompt

---

### 9.5 Feedback Page

**URL:** `/dashboard/feedback`

**User Goal:** View feedback from families

**Critical Elements:**
- [ ] Page loads with feedback list
- [ ] Feedback cards show content, date
- [ ] Filter by date/type
- [ ] Mark feedback as read
- [ ] Respond to feedback (if applicable)

---

### 9.6 Account Settings

**URL:** `/dashboard/account`

**User Goal:** Manage account security

**Critical Elements:**
- [ ] Page loads with account info
- [ ] Change email functionality
- [ ] Change password functionality
- [ ] Connected OAuth providers shown
- [ ] Disconnect OAuth option
- [ ] Delete account option
- [ ] Two-factor authentication (if available)

---

### 9.7 Team Management

**URL:** `/dashboard/team`

**User Goal:** View team members

**Critical Elements:**
- [ ] Page loads with team list
- [ ] Team member cards
- [ ] Role indicators
- [ ] "Manage Employees" link
- [ ] Invite team member (Enterprise)

---

### 9.8 Employees Management

**URL:** `/dashboard/team/employees`

**User Goal:** Manage staff members

**Critical Elements:**
- [ ] Page loads with employee list
- [ ] Add new employee
- [ ] Edit employee details
- [ ] Deactivate employee
- [ ] Role assignment
- [ ] Permission management (Enterprise)

---

### 9.9 Application Detail

**URL:** `/dashboard/jobs/applications/[id]`

**User Goal:** Review individual application

**Critical Elements:**
- [ ] Page loads with application details
- [ ] Applicant info displayed:
  - [ ] Name, email, phone
  - [ ] LinkedIn URL (if provided)
  - [ ] Cover letter (if provided)
- [ ] Resume download link works
- [ ] Status dropdown to change status
- [ ] Notes field (editable)
- [ ] Rating (1-5 stars)
- [ ] Quick actions (Hire, Reject)
- [ ] Navigation to next/previous application
- [ ] Back to applications list

---

### 9.10 Careers Page Management

**URL:** `/dashboard/jobs/careers`

**User Goal:** Manage provider careers page

**Critical Elements:**
- [ ] Page loads with careers page settings
- [ ] Preview careers page link
- [ ] Copy careers URL
- [ ] Customize description
- [ ] Toggle "Powered by" footer (Enterprise)
- [ ] View analytics for careers page

---

### 9.11 Upgrade Page

**URL:** `/dashboard/upgrade`

**User Goal:** See upgrade options

**Critical Elements:**
- [ ] Page loads with plan comparison
- [ ] Current plan highlighted
- [ ] Feature comparison table
- [ ] Annual/monthly toggle
- [ ] "Upgrade" buttons work
- [ ] Enterprise contact option

---

## 10. Public Intake Forms

### 10.1 Intake Form Page

**URL:** `/intake/[slug]`

**User Goal:** Family submits intake form

**Critical Elements:**
- [ ] Page loads with provider branding
- [ ] Form fields display correctly
- [ ] Required field validation
- [ ] File upload (if enabled)
- [ ] Turnstile CAPTCHA
- [ ] Success message after submission
- [ ] Provider contact info displayed
- [ ] Mobile responsive

---

## 11. Admin Routes

### 11.1 Admin Dashboard

**URL:** `/admin`

**User Goal:** Site administrators manage platform

**Critical Elements:**
- [ ] Page loads for admin users only
- [ ] Non-admin users redirected
- [ ] Overview stats displayed
- [ ] Quick links to admin sections
- [ ] Recent activity feed

---

### 11.2 Admin Analytics

**URL:** `/admin/analytics`

**User Goal:** View platform-wide analytics

**Critical Elements:**
- [ ] Page loads with site-wide metrics
- [ ] Total providers, jobs, applications
- [ ] Growth charts
- [ ] Top performing providers
- [ ] Search trends
- [ ] Date range filter

---

### 11.3 Admin Feedback

**URL:** `/admin/feedback`

**User Goal:** Review all user feedback

**Critical Elements:**
- [ ] Page loads with all feedback
- [ ] Filter by type, date, status
- [ ] Mark as reviewed
- [ ] Assign to team member
- [ ] Respond to feedback

---

### 11.4 Removal Requests

**URL:** `/admin/removal-requests`

**User Goal:** Handle listing removal requests

**Critical Elements:**
- [ ] Page loads with removal requests
- [ ] Request details displayed
- [ ] Approve/Deny actions
- [ ] Notification to provider
- [ ] Audit trail

---

## 12. Demo Pages

### 12.1 Demo Dashboard

**URL:** `/demo`

**User Goal:** Preview dashboard without account

**Critical Elements:**
- [ ] Page loads with demo data
- [ ] All dashboard sections accessible
- [ ] Demo badge/indicator visible
- [ ] CTA to create real account
- [ ] No actual data modifications allowed

---

### 12.2 Demo Sections

**URLs:**
- `/demo/company`
- `/demo/locations`
- `/demo/media`
- `/demo/analytics`
- `/demo/inbox`

**Critical Elements:**
- [ ] Each section loads with sample data
- [ ] Interactive elements work
- [ ] Cannot save changes (read-only)
- [ ] Upgrade prompts displayed

---

## 13. Updated Test Case Matrix

### 13.1 Additional Find ABA Therapy Tests

| Test ID | Flow | Description | Priority |
|---------|------|-------------|----------|
| FAT-018 | States | States directory page loads | P1 |
| FAT-019 | States | Click state navigates correctly | P1 |
| FAT-020 | Centers | Centers page loads with filter | P2 |
| FAT-021 | Guide | State guide page loads | P2 |
| FAT-022 | Glossary | Glossary page loads | P2 |
| FAT-023 | Glossary | Term search works | P2 |
| FAT-024 | Shortlink | Provider shortlink redirects | P1 |

### 13.2 Additional Find ABA Jobs Tests

| Test ID | Flow | Description | Priority |
|---------|------|-------------|----------|
| FAJ-013 | Employers | Employers directory loads | P1 |
| FAJ-014 | Employers | Search employers works | P1 |
| FAJ-015 | Employers | Employer profile loads | P1 |
| FAJ-016 | Employers | Post job page loads | P1 |
| FAJ-017 | City | City jobs page loads | P1 |
| FAJ-018 | City | City jobs filter works | P2 |

### 13.3 White-Label Careers Tests

| Test ID | Flow | Description | Priority |
|---------|------|-------------|----------|
| CAR-001 | Careers | Careers page loads with branding | P0 |
| CAR-002 | Careers | No site header/footer displayed | P0 |
| CAR-003 | Careers | Jobs list displays correctly | P0 |
| CAR-004 | Careers | Apply button opens form | P0 |
| CAR-005 | Careers | Job detail page works | P1 |
| CAR-006 | Careers | "Powered by" footer shows (Free/Pro) | P1 |
| CAR-007 | Careers | No footer for Enterprise | P1 |

### 13.4 Additional Dashboard Tests

| Test ID | Flow | Description | Priority |
|---------|------|-------------|----------|
| DASH-022 | Media | Photo upload works (Pro+) | P1 |
| DASH-023 | Media | Photo delete works | P1 |
| DASH-024 | Media | Video URL saves | P1 |
| DASH-025 | Media | Free users see upgrade | P1 |
| DASH-026 | Intake | Intake settings load | P2 |
| DASH-027 | Intake | Toggle intake form | P2 |
| DASH-028 | Clients | Clients list loads (Pro+) | P2 |
| DASH-029 | Leads | Leads list loads (Pro+) | P2 |
| DASH-030 | Feedback | Feedback list loads | P2 |
| DASH-031 | Account | Account settings load | P1 |
| DASH-032 | Account | Change password works | P1 |
| DASH-033 | Team | Team list loads | P2 |
| DASH-034 | Team | Add employee works | P2 |
| DASH-035 | Apps | Application detail loads | P0 |
| DASH-036 | Apps | Change application status | P0 |
| DASH-037 | Apps | Add notes to application | P1 |
| DASH-038 | Apps | Download resume works | P0 |
| DASH-039 | Apps | Rate application | P1 |
| DASH-040 | Careers | Careers management loads | P1 |
| DASH-041 | Upgrade | Upgrade page loads | P1 |

### 13.5 Intake Form Tests

| Test ID | Flow | Description | Priority |
|---------|------|-------------|----------|
| INT-009 | Intake | Public intake form loads | P1 |
| INT-010 | Intake | Form validation works | P1 |
| INT-011 | Intake | Form submission succeeds | P0 |
| INT-012 | Intake | Success message displays | P1 |
| INT-013 | Intake | Provider notified | P1 |

### 13.6 Admin Tests

| Test ID | Flow | Description | Priority |
|---------|------|-------------|----------|
| ADM-001 | Admin | Admin dashboard loads (admin only) | P0 |
| ADM-002 | Admin | Non-admin redirected | P0 |
| ADM-003 | Admin | Admin analytics loads | P1 |
| ADM-004 | Admin | Admin feedback loads | P2 |
| ADM-005 | Admin | Removal requests loads | P1 |
| ADM-006 | Admin | Approve removal works | P1 |

### 13.7 Demo Tests

| Test ID | Flow | Description | Priority |
|---------|------|-------------|----------|
| DEMO-001 | Demo | Demo dashboard loads | P2 |
| DEMO-002 | Demo | Demo company loads | P2 |
| DEMO-003 | Demo | Demo is read-only | P2 |
| DEMO-004 | Demo | CTA to sign up visible | P2 |

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

### Admin
- Platform administrator
- Access to all admin routes
- Can manage providers, feedback, removal requests

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

# Admin User (for admin tests)
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=TestPassword123!

# Base URLs
PLAYWRIGHT_BASE_URL=http://localhost:3000
PLAYWRIGHT_JOBS_URL=http://localhost:3000/jobs
```

### Test Data Requirements
- At least one published Free provider listing
- At least one published Pro provider listing
- At least one published Enterprise provider listing
- At least one published job posting
- At least one job application
- At least one state with providers
- At least one insurance with providers
- At least one intake form configured
- Admin user account for admin tests

---

## Appendix C: Test File Structure

```
e2e/
├── auth.setup.ts                      # Authentication setup
├── auth.spec.ts                       # Auth flow tests
├── CRITICAL_FLOWS.md                  # This documentation
├── .auth/                             # Auth state storage
├── dashboard/
│   ├── applications.spec.ts           # Application tracking tests (NEW)
│   ├── billing.spec.ts                # Billing tests
│   ├── company.spec.ts                # Company management tests
│   ├── jobs.spec.ts                   # Job posting tests
│   ├── locations.spec.ts              # Location management tests
│   ├── media.spec.ts                  # Media management tests (NEW)
│   ├── onboarding.spec.ts             # Onboarding tests
│   ├── overview.spec.ts               # Dashboard overview tests
│   └── additional.spec.ts             # Team, clients, leads, etc. (NEW)
├── find-aba-jobs/
│   ├── application.spec.ts            # Job application tests
│   ├── careers.spec.ts                # White-label careers tests (NEW)
│   ├── employers.spec.ts              # Employers directory tests (NEW)
│   ├── home.spec.ts                   # Jobs home page tests
│   ├── job-detail.spec.ts             # Job detail tests
│   ├── search.spec.ts                 # Job search tests
│   └── state-position.spec.ts         # State/position pages tests
├── find-aba-therapy/
│   ├── additional-pages.spec.ts       # States, centers, guide, glossary (NEW)
│   ├── home.spec.ts                   # Home page tests
│   ├── insurance.spec.ts              # Insurance pages tests
│   ├── provider-profile.spec.ts       # Provider profile tests
│   ├── search.spec.ts                 # Search tests
│   ├── state-city.spec.ts             # State/city pages tests
│   └── static-pages.spec.ts           # FAQ, legal, get-listed tests
├── intake/
│   └── intake.spec.ts                 # Public intake form tests (NEW)
├── admin/
│   └── admin.spec.ts                  # Admin route tests (NEW)
├── demo/
│   └── demo.spec.ts                   # Demo page tests (NEW)
└── integration/
    ├── jobs-visibility.spec.ts        # Job visibility integration tests
    ├── listing-visibility.spec.ts     # Listing visibility tests
    └── plan-limits.spec.ts            # Plan limits tests
```
