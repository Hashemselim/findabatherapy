# BehaviorWork Unified Platform - Product Requirements Document

## Executive Summary

BehaviorWork is a unified platform for ABA agencies with three public-facing brands:
- **findabatherapy.org** - Provider directory (SEO/marketing site)
- **findabajobs.org** - Job board (SEO/marketing site)
- **behaviorwork.com** - Central hub (auth, dashboard, billing, management)

All three domains are served by a single Next.js deployment sharing one Supabase database.

---

## Agentic Coding Guide

This PRD is optimized for autonomous implementation using Claude Code with the Ralph Loop plugin.

### Overnight Autonomous Run

**To run all phases unattended:**
```
Implement all phases (1 through 8) from @docs/behaviorwork-platform-prd.md autonomously.
Skip stop points and continue through all phases. At the end, output a summary of:
1. All files created/modified
2. Any errors encountered
3. Which acceptance criteria passed/failed
```

### Manual Phase-by-Phase Run

**Starting a Phase:**
```
Implement Phase 1: Database & Foundation from @docs/behaviorwork-platform-prd.md
```

**Resuming Work:**
```
Continue Phase 3B from @docs/behaviorwork-platform-prd.md - I completed the search page, now do job detail.
```

**Running Parallel Phases:**
```
Implement Phase 2 and Phase 3A in parallel from @docs/behaviorwork-platform-prd.md
```

### Document Structure

Each phase includes:
- **Goal** - One sentence describing the outcome
- **Depends On** - Prerequisites (check dependency graph)
- **Tasks** - Numbered implementation steps
- **Files to Create/Modify** - Exact paths
- **Reference Files** - Existing code to adapt from
- **Verification Commands** - How to test completion
- **Acceptance Criteria** - Checkboxes for done-ness
- **Error Handling** - Edge cases to implement
- **Stop Points** - Where human review is needed (skip in overnight mode)

### Agent Instructions

1. **Before starting a phase:** Verify all dependencies are complete
2. **For each task:** Read reference files first, then implement
3. **After each file:** Run `pnpm tsc --noEmit` to catch type errors early
4. **Before marking complete:** Run all verification commands
5. **At stop points:** In overnight mode, log the stop point and continue. In manual mode, pause and summarize.
6. **At end of all phases:** Output summary for human review

### Parallelization Rules

Per the dependency graph:
- Phase 2 + Phase 3A can run in parallel after Phase 1
- All other phases are sequential
- Within a phase, tasks should be done in order

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      SINGLE CODEBASE                            │
│                      SINGLE SUPABASE DATABASE                   │
│                      SINGLE VERCEL DEPLOYMENT                   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────────┐
│findabatherapy │   │ findabajobs   │   │  behaviorwork.com │
│    .org       │   │    .org       │   │                   │
│               │   │               │   │  CENTRAL HUB      │
│ PUBLIC ONLY   │   │ PUBLIC ONLY   │   │  - Auth           │
│ - Search      │   │ - Search      │   │  - Dashboard      │
│ - Browse      │   │ - Browse      │   │  - Billing        │
│ - Profiles    │   │ - Job details │   │  - All management │
│               │   │               │   │                   │
│ "Sign In" ────┼───┼───────────────┼───→ /auth/sign-in    │
│               │   │               │   │                   │
└───────────────┘   └───────────────┘   └───────────────────┘
```

### Parallel Site Architecture

**findabajobs.org mirrors findabatherapy.org** - same UX patterns, different content type.

| Pattern | findabatherapy.org | findabajobs.org |
|---------|-------------------|-----------------|
| **Homepage** | `/` - Hero + search + featured | `/` - Hero + search + featured jobs |
| **State Directory** | `/[state]` - Providers in state | `/[state]` - Jobs in state |
| **City Directory** | `/[state]/[city]` - Providers in city | `/[state]/[city]` - Jobs in city |
| **Search Results** | `/search?filters` - Provider cards | `/search?filters` - Job cards |
| **Detail Page** | `/provider/[slug]` - Full profile | `/job/[slug]` - Full job posting |
| **Provider Page** | `/provider/[slug]` - Provider profile | `/provider/[slug]` - Provider + all jobs |
| **Contact Form** | Inquiry form (modal/inline) | Application form (with resume) |
| **Google Autocomplete** | Location search | Location search |
| **Geocoding** | Radius-based search | Radius-based search |
| **Filters** | Service type, insurance, etc. | Position type, salary, remote, etc. |

### Parallel Dashboard Architecture

| Pattern | Provider Directory | Job Board |
|---------|-------------------|-----------|
| **Create/Edit** | `/dashboard/listings` | `/dashboard/jobs` |
| **View Responses** | `/dashboard/inbox` (inquiries) | `/dashboard/applications` |
| **Plan Limits** | Locations per plan | Jobs per plan |
| **Email Notifications** | New inquiry → provider | New application → provider |
| **Analytics** | Profile views, clicks | Job views, applications |

### Shared Components Philosophy

Rather than building separate component trees, **adapt existing components**:

```
src/components/
├── search/
│   ├── search-hero.tsx          # Shared - accepts title/subtitle props
│   ├── location-autocomplete.tsx # Shared - Google Places
│   ├── search-filters.tsx       # Adapt - different filter options
│   └── search-results.tsx       # Shared - accepts card component as prop
├── cards/
│   ├── provider-card.tsx        # Existing
│   └── job-card.tsx             # New - same structure, job data
├── forms/
│   ├── inquiry-form.tsx         # Existing
│   └── application-form.tsx     # New - same pattern + resume upload
└── directory/
    ├── state-page.tsx           # Shared - accepts content type prop
    └── city-page.tsx            # Shared - accepts content type prop
```

---

## Domain Responsibilities

### findabatherapy.org (Public Only)
- Provider search and browse
- State/city directory pages
- Individual provider profiles
- SEO landing pages
- **No auth routes** - "Sign In" links to behaviorwork.com

### findabajobs.org (Public Only)
- Job search and browse
- Job detail pages
- Provider careers pages (white-label)
- SEO landing pages
- **No auth routes** - "Sign In" links to behaviorwork.com

### behaviorwork.com (Central Hub)
- **Auth:** Sign in, sign up, password reset
- **Dashboard:** Unified management for all products
- **Billing:** Stripe checkout, subscription management
- **Listings:** Provider directory management
- **Jobs:** Job posting management
- **Applications:** Candidate tracking
- **CRM:** Inbox, contacts, pipeline

---

## User Flows

### New Provider Sign-Up
```
Provider finds listing on findabatherapy.org
     ↓
Clicks "Claim this listing" or "Sign Up"
     ↓
Redirects to behaviorwork.com/auth/sign-up
     ↓
Creates account (Google OAuth or email)
     ↓
Lands on behaviorwork.com/dashboard
     ↓
Completes onboarding
     ↓
Can now manage: listings, jobs, inbox
```

### Job Seeker Applies
```
Job seeker finds job on findabajobs.org
     ↓
Clicks "Apply"
     ↓
Fills out application form (no account needed)
     ↓
Application saved to database
     ↓
Provider sees application in behaviorwork.com/dashboard
```

### Provider Posts Job
```
Provider logs into behaviorwork.com/dashboard
     ↓
Goes to Jobs section
     ↓
Creates job posting
     ↓
Job appears on findabajobs.org
     ↓
Also appears on provider's careers page:
findabajobs.org/careers/[provider-slug]
```

---

## Auth Configuration

**All auth happens on behaviorwork.com only.**

| Service | Configuration |
|---------|---------------|
| **Supabase** | Single redirect URL: `https://behaviorwork.com/auth/callback` |
| **Google OAuth** | Single redirect URI: `https://behaviorwork.com/auth/callback` |
| **Microsoft OAuth** | Single redirect URI: `https://behaviorwork.com/auth/callback` |
| **Turnstile** | Add all 3 domains (for public forms like job applications) |
| **Stripe** | Webhook URL: `https://behaviorwork.com/api/stripe/webhooks` |
| **Resend** | Add domains: `findabajobs.org`, `behaviorwork.com` (see Email Configuration) |

**Why this is simpler:**
- One redirect URL to configure
- One domain handles all authenticated routes
- Session cookie only needs to work on behaviorwork.com
- Public sites have zero auth complexity

---

## Email Configuration (Resend)

**Domain Setup Required:**
1. Add `findabajobs.org` domain in Resend dashboard
2. Add `behaviorwork.com` domain in Resend dashboard
3. Configure DNS records (SPF, DKIM, DMARC) for each domain

**Email Types:**

| Email | From Address | Trigger |
|-------|--------------|---------|
| New Application | `jobs@findabajobs.org` | Job seeker submits application |
| Application Status Update | `jobs@findabajobs.org` | Provider updates application status |
| New Inquiry | `hello@findabatherapy.org` | Family submits contact form (existing) |
| Account Notifications | `hello@behaviorwork.com` | Sign up, password reset, billing |

**Environment Variables:**
```bash
RESEND_API_KEY=re_xxx                    # Already exists
EMAIL_FROM_JOBS=jobs@findabajobs.org     # New
EMAIL_FROM_HUB=hello@behaviorwork.com    # New
```

---

## Job Seeker Experience

**No accounts required.** Job seekers can browse and apply without creating an account.

### Cookie-Based Form Prefill
Same pattern as findabatherapy.org inquiry forms:

1. Job seeker fills out first application form
2. On submit, save applicant info to localStorage/cookies:
   - `applicant_name`
   - `applicant_email`
   - `applicant_phone`
3. On subsequent applications, prefill these fields
4. User can edit prefilled values before submitting

**Implementation:** Reuse existing pattern from `src/components/inquiry-form.tsx`

### Resume Upload Limits

| Constraint | Value |
|------------|-------|
| Max file size | 10MB |
| Allowed formats | PDF, DOC, DOCX |
| Storage bucket | `job-resumes` |
| Storage path | `{job_id}/{applicant_email}/{filename}` |

**Why 10MB:** Accommodates multi-page resumes with embedded images/graphics while preventing abuse.

---

## Middleware Routing

The middleware uses **URL rewriting** to route identical paths to different route groups based on hostname.

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // findabatherapy.org - Provider directory (uses (site) route group)
  if (hostname.includes('findabatherapy')) {
    // Auth/dashboard routes redirect to behaviorwork.com
    if (pathname.startsWith('/auth') || pathname.startsWith('/dashboard')) {
      return NextResponse.redirect('https://behaviorwork.com' + pathname);
    }
    // All other routes use (site) route group - no rewrite needed
    // Next.js serves from (site) by default
    return NextResponse.next();
  }

  // findabajobs.org - Job board (uses (jobs) route group)
  if (hostname.includes('findabajobs')) {
    // Auth/dashboard routes redirect to behaviorwork.com
    if (pathname.startsWith('/auth') || pathname.startsWith('/dashboard')) {
      return NextResponse.redirect('https://behaviorwork.com' + pathname);
    }

    // Rewrite all routes to (jobs) route group
    // This maps parallel URLs to the jobs-specific pages
    const jobsRoutes = ['/', '/search', '/job/', '/careers/'];
    const statePattern = /^\/[a-z-]+$/i;           // /new-jersey
    const cityPattern = /^\/[a-z-]+\/[a-z-]+$/i;   // /new-jersey/edison

    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/(jobs)', request.url));
    }
    if (pathname.startsWith('/search')) {
      return NextResponse.rewrite(new URL('/(jobs)/search' + pathname.slice(7), request.url));
    }
    if (pathname.startsWith('/provider/')) {
      return NextResponse.rewrite(new URL('/(jobs)/provider/' + pathname.slice(10), request.url));
    }
    if (pathname.startsWith('/job/')) {
      return NextResponse.rewrite(new URL('/(jobs)/job/' + pathname.slice(5), request.url));
    }
    if (pathname.startsWith('/careers/')) {
      return NextResponse.rewrite(new URL('/(jobs)/careers/' + pathname.slice(9), request.url));
    }
    // State and city directory pages
    if (statePattern.test(pathname) || cityPattern.test(pathname)) {
      return NextResponse.rewrite(new URL('/(jobs)' + pathname, request.url));
    }

    return NextResponse.next();
  }

  // behaviorwork.com - Central hub (default)
  // Handles: /auth/*, /dashboard/*, /api/*
  // Homepage redirects to dashboard if logged in, otherwise shows marketing page
  return NextResponse.next();
}
```

### Route Mapping Summary

| Request | Hostname | Rewritten To |
|---------|----------|--------------|
| `/` | findabatherapy.org | `/(site)/page.tsx` |
| `/` | findabajobs.org | `/(jobs)/page.tsx` |
| `/new-jersey` | findabatherapy.org | `/(site)/[state]/page.tsx` |
| `/new-jersey` | findabajobs.org | `/(jobs)/[state]/page.tsx` |
| `/search?q=...` | findabatherapy.org | `/(site)/search/page.tsx` |
| `/search?q=...` | findabajobs.org | `/(jobs)/search/page.tsx` |
| `/provider/abc` | findabatherapy.org | `/(site)/provider/[slug]/page.tsx` |
| `/provider/abc` | findabajobs.org | `/(jobs)/provider/[slug]/page.tsx` |
| `/job/xyz` | findabajobs.org | `/(jobs)/job/[slug]/page.tsx` |
| `/careers/abc` | findabajobs.org | `/(jobs)/careers/[slug]/page.tsx` |
| `/dashboard` | any | `/(dashboard)/dashboard/page.tsx` |

---

## Database Schema Extension

### Existing Tables (No Changes)
- `profiles` - Provider accounts
- `listings` - Provider directory entries
- `locations` - Physical service locations
- `inquiries` - Family contact forms
- `media_assets` - Photos, logos
- `audit_events` - Analytics

### New Tables for Job Board

```sql
-- Job Postings
CREATE TABLE job_postings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,

  -- Job details
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,

  -- Position type (ABA-specific)
  position_type text NOT NULL, -- bcba, rbt, clinical_director, executive_director, admin
  employment_type text,        -- full_time, part_time, contract, per_diem

  -- Compensation
  salary_min integer,
  salary_max integer,
  salary_type text,            -- hourly, annual

  -- Options
  remote_option boolean DEFAULT false,

  -- Requirements (flexible JSON)
  requirements jsonb,          -- {certifications: [], experience_years: 2, etc.}
  benefits jsonb,              -- {health: true, pto: true, supervision: true}

  -- Status
  status text DEFAULT 'draft', -- draft, published, filled, closed
  published_at timestamptz,
  expires_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Job Applications
CREATE TABLE job_applications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_posting_id uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,

  -- Applicant info
  applicant_name text NOT NULL,
  applicant_email text NOT NULL,
  applicant_phone text,

  -- Application materials
  resume_path text,            -- Supabase storage path
  cover_letter text,

  -- Tracking
  status text DEFAULT 'new',   -- new, reviewed, phone_screen, interview, offered, hired, rejected
  rating integer,              -- 1-5 recruiter rating
  notes text,                  -- internal notes
  source text,                 -- direct, careers_page, linkedin, indeed

  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Agencies manage their own jobs
CREATE POLICY "Agencies manage own jobs" ON job_postings
  FOR ALL USING (auth.uid() = profile_id);

-- Public can view published jobs
CREATE POLICY "Public can view published jobs" ON job_postings
  FOR SELECT USING (status = 'published');

-- Agencies view applications for their jobs
CREATE POLICY "Agencies view own applications" ON job_applications
  FOR ALL USING (
    job_posting_id IN (
      SELECT id FROM job_postings WHERE profile_id = auth.uid()
    )
  );

-- Anyone can submit applications (insert only)
CREATE POLICY "Anyone can apply" ON job_applications
  FOR INSERT WITH CHECK (true);
```

---

## Route Structure

### Parallel Public Routes

Both sites use **identical URL patterns** - middleware routes to the correct route group based on hostname.

```
findabatherapy.org              findabajobs.org
──────────────────              ───────────────
/                    ←──────→   /                    (Homepage)
/[state]             ←──────→   /[state]             (State directory)
/[state]/[city]      ←──────→   /[state]/[city]      (City directory)
/search              ←──────→   /search              (Search results)
/provider/[slug]     ←──────→   /provider/[slug]     (Provider profile + jobs)
                                /job/[slug]          (Job detail page)
                                /careers/[slug]       (White-label careers - Pro+)
```

### File Structure

```
src/app/
├── (site)/                         # findabatherapy.org routes
│   ├── page.tsx                    # Homepage
│   ├── [state]/page.tsx            # State directory
│   ├── [state]/[city]/page.tsx     # City directory
│   ├── search/page.tsx             # Search results
│   └── provider/[slug]/page.tsx    # Provider profile
│
├── (jobs)/                         # findabajobs.org routes (PARALLEL)
│   ├── page.tsx                    # Homepage (mirrors site homepage)
│   ├── [state]/page.tsx            # State job directory
│   ├── [state]/[city]/page.tsx     # City job directory
│   ├── search/page.tsx             # Job search results
│   ├── provider/[slug]/page.tsx    # Provider profile + all their jobs
│   ├── job/[slug]/page.tsx         # Job detail + apply
│   └── careers/[slug]/page.tsx     # White-label careers page (Pro+)
│
├── (dashboard)/                    # behaviorwork.com dashboard
│   └── dashboard/
│       ├── page.tsx                # Overview
│       ├── listings/               # Provider directory management
│       ├── jobs/                   # Job posting management (NEW)
│       │   ├── page.tsx            # List jobs
│       │   ├── new/page.tsx        # Create job
│       │   └── [id]/page.tsx       # Edit job
│       ├── applications/           # Application tracking (NEW)
│       │   └── page.tsx
│       ├── inbox/                  # Inquiries (existing)
│       ├── analytics/              # Unified analytics
│       ├── billing/                # Subscription management
│       └── settings/               # Account settings
│
├── auth/                           # Auth routes (behaviorwork.com only)
│   ├── sign-in/page.tsx
│   ├── sign-up/page.tsx
│   ├── callback/route.ts
│   └── reset-password/page.tsx
│
└── api/
    ├── stripe/webhooks/route.ts    # Stripe webhooks
    └── jobs/                       # Job-related API routes if needed
```

---

## Provider Pages & White-Label Careers

### Public Provider Page (`/provider/[slug]`)
Standard findabajobs.org page with site header/footer - mirrors findabatherapy.org provider pages.

**URL:** `findabajobs.org/provider/acme-therapy`

**Features:**
- Site header and footer (findabajobs.org branding)
- Provider logo, name, description
- List of all open positions
- Link to findabatherapy.org provider profile
- Apply buttons for each job
- SEO-optimized for "jobs at [Provider Name]"

### White-Label Careers Page (`/careers/[slug]`) - Pro+ Feature
Embeddable page providers can link from their own website - no site branding.

**URL:** `findabajobs.org/careers/acme-therapy`

**Features:**
- **No site header/footer** - clean embed experience
- Provider logo and branding only
- Provider description (customizable in dashboard)
- List of open positions
- Apply buttons for each job
- "Powered by BehaviorWork" footer (Free/Pro tiers)
- **No branding footer** (Enterprise tier)

**Use Case:**
```
Provider website (acmetherapy.com/careers)
     ↓
Links to or embeds: findabajobs.org/careers/acme-therapy
     ↓
Job seekers apply without leaving branded experience
     ↓
Applications flow to behaviorwork.com/dashboard
```

**Viral Loop:**
```
Provider posts job on behaviorwork.com
     ↓
Gets careers page URL: findabajobs.org/careers/acme-therapy
     ↓
Shares on Indeed, LinkedIn, Facebook, own website
     ↓
"Powered by BehaviorWork" seen by other providers
     ↓
Other providers sign up
```

---

## Job Posting Form (Dashboard)

### Basic Info Section
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Job Title | text | Yes | e.g., "BCBA - Full Time" |
| Position Type | select | Yes | From POSITION_TYPES |
| Employment Type | multi-select | Yes | From EMPLOYMENT_TYPES |
| Location | select | No | From provider's existing locations, or "Remote" |
| Remote Option | checkbox | No | Allows remote/hybrid work |

### Compensation Section
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Show Salary | checkbox | No | Toggle salary visibility |
| Salary Type | radio | If showing | Hourly / Annual |
| Salary Min | number | If showing | Minimum compensation |
| Salary Max | number | No | Maximum (optional range) |

### Job Details Section
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Description | rich text | Yes | Full job description, responsibilities |
| Requirements | rich text | No | Qualifications, experience needed |
| Benefits | multi-select | No | From BENEFITS_OPTIONS |

### Settings Section
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Status | select | Yes | Draft / Published |
| Expires At | date | No | Auto-close after date |

---

## Implementation Phases

```
DEPENDENCY GRAPH
================

Phase 1 (Database) ─────┬──→ Phase 2 (Dashboard Jobs)
                        │
                        ├──→ Phase 3A (Jobs Layout)
                        │         │
                        │         ▼
                        │    Phase 3B (Job Pages) ──→ Phase 3C (Application Form)
                        │                                      │
                        │                                      ▼
                        └──→ Phase 4 (Email) ←─────────────────┘
                                   │
                                   ▼
Phase 2 ──────────────────→ Phase 5 (Application Tracking)
                                   │
                                   ▼
                           Phase 6 (Careers Pages)
                                   │
                                   ▼
                           Phase 7 (SEO)
                                   │
                                   ▼
                           Phase 8 (Multi-Domain)

PARALLELIZABLE: Phase 2 + Phase 3A can run in parallel after Phase 1
```

---

### Phase 1: Database & Foundation

**Goal:** Create all database tables, storage, and server-side code needed for jobs feature.

**Tasks:**
1. Create database migration for `job_postings` and `job_applications` tables
2. Add RLS policies for job postings and applications
3. Create `job-resumes` storage bucket with appropriate policies
4. Add Zod schemas in `src/lib/validations/jobs.ts`
5. Create server actions in `src/lib/actions/jobs.ts` and `applications.ts`
6. Add queries in `src/lib/queries/jobs.ts`

**Files to Create:**
- `supabase/migrations/YYYYMMDD_create_job_tables.sql`
- `src/lib/validations/jobs.ts`
- `src/lib/actions/jobs.ts`
- `src/lib/actions/applications.ts`
- `src/lib/queries/jobs.ts`

**Verification Commands:**
```bash
# Run migration locally
pnpm supabase db reset

# Verify tables exist
pnpm supabase db dump --schema public | grep -E "job_postings|job_applications"

# Test RLS - should return empty array (not error)
curl -X GET "$SUPABASE_URL/rest/v1/job_postings?select=*" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

**Acceptance Criteria:**
- [ ] Migration runs without errors on `supabase db reset`
- [ ] `job_postings` table exists with all columns from schema
- [ ] `job_applications` table exists with all columns from schema
- [ ] RLS policies allow public SELECT on published jobs
- [ ] RLS policies block INSERT/UPDATE/DELETE without auth
- [ ] `job-resumes` bucket exists with 10MB file size limit
- [ ] Zod schemas validate all form inputs with proper error messages
- [ ] Server actions return `ActionResult<T>` type consistently
- [ ] TypeScript compiles with no errors: `pnpm tsc --noEmit`

---

### Phase 2: Dashboard Job Management

**Goal:** Providers can create, edit, and manage job postings from the dashboard.

**Depends On:** Phase 1

**Tasks:**
1. Add Jobs section to dashboard sidebar navigation
2. Build job list page (`/dashboard/jobs`) - shows provider's jobs with status
3. Build job creation form (`/dashboard/jobs/new`)
4. Build job edit page (`/dashboard/jobs/[id]`)
5. Add job publishing/unpublishing actions
6. Respect plan limits (Free: 1 job, Pro: 5 jobs, Enterprise: unlimited)

**Files to Create:**
- `src/app/(dashboard)/dashboard/jobs/page.tsx`
- `src/app/(dashboard)/dashboard/jobs/new/page.tsx`
- `src/app/(dashboard)/dashboard/jobs/[id]/page.tsx`
- `src/components/jobs/job-form.tsx`
- `src/components/jobs/job-list.tsx`
- `src/components/jobs/job-status-badge.tsx`

**Files to Modify:**
- `src/components/dashboard/sidebar.tsx` - Add Jobs nav item

**Verification Commands:**
```bash
# Start dev server
pnpm dev

# Manual test flow:
# 1. Sign in as test provider
# 2. Navigate to /dashboard/jobs
# 3. Click "New Job"
# 4. Fill form and save as draft
# 5. Publish job
# 6. Edit job
# 7. Verify plan limits enforced
```

**Acceptance Criteria:**
- [ ] Jobs appears in dashboard sidebar navigation
- [ ] `/dashboard/jobs` shows list of provider's jobs with status badges
- [ ] "New Job" button navigates to `/dashboard/jobs/new`
- [ ] Job form validates all required fields before submit
- [ ] Draft jobs save successfully and show "Draft" status
- [ ] Publishing job changes status to "Published" and sets `published_at`
- [ ] Edit page loads existing job data into form
- [ ] Free tier blocked from creating 2nd job (shows upgrade prompt)
- [ ] Pro tier blocked from creating 6th job
- [ ] Enterprise tier has no limit

**Error Handling:**
- If job save fails → Show toast error, keep form data, don't navigate away
- If plan limit reached → Show modal with upgrade CTA, don't allow form submit
- If job not found on edit → Redirect to `/dashboard/jobs` with error toast

**⚠️ STOP POINT:** Review job form UX with product owner before proceeding. Ensure all ABA-specific position types and benefits are correct.

---

### Phase 3A: Jobs Site Layout & Homepage

**Goal:** Create the (jobs) route group with layout, header, footer, and homepage.

**Depends On:** Phase 1

**Tasks:**
1. Create `(jobs)` route group with layout
2. Adapt header component for findabajobs.org branding
3. Adapt footer component for findabajobs.org branding
4. Build jobs homepage with hero, search, and featured jobs

**Files to Create:**
- `src/app/(jobs)/layout.tsx`
- `src/app/(jobs)/page.tsx`
- `src/components/jobs/jobs-header.tsx`
- `src/components/jobs/jobs-footer.tsx`
- `src/components/jobs/featured-jobs.tsx`

**Reference Files (adapt from):**
- `src/app/(site)/layout.tsx`
- `src/app/(site)/page.tsx`
- `src/components/site/header.tsx`
- `src/components/site/footer.tsx`

**Acceptance Criteria:**
- [ ] `/(jobs)` route group exists with working layout
- [ ] Header shows "Find ABA Jobs" branding (not "Find ABA Therapy")
- [ ] Header links point to job-related pages
- [ ] Footer shows findabajobs.org branding
- [ ] Homepage renders with hero section
- [ ] Homepage shows featured/recent jobs (or empty state if none)
- [ ] Search box on homepage navigates to `/search` with query params

---

### Phase 3B: Job Search & Detail Pages

**Goal:** Job seekers can search for jobs and view job details.

**Depends On:** Phase 3A

**Tasks:**
1. Build job search page with filters
2. Build job card component
3. Build job detail page
4. Add JobPosting JSON-LD schema

**Files to Create:**
- `src/app/(jobs)/search/page.tsx`
- `src/app/(jobs)/job/[slug]/page.tsx`
- `src/components/jobs/job-card.tsx`
- `src/components/jobs/job-filters.tsx`
- `src/components/jobs/job-detail.tsx`
- `src/lib/seo/job-schemas.ts`

**Reference Files (adapt from):**
- `src/app/(site)/search/page.tsx`
- `src/app/(site)/provider/[slug]/page.tsx`
- `src/components/cards/provider-card.tsx`
- `src/components/search/search-filters.tsx`

**Verification Commands:**
```bash
# Create test job via Supabase Studio or dashboard
# Then verify search returns it:
curl "http://localhost:3000/search?position=bcba"

# Verify JSON-LD in page source
curl -s "http://localhost:3000/job/test-job-slug" | grep -o '"@type":"JobPosting"'
```

**Acceptance Criteria:**
- [ ] `/search` page renders with filter sidebar
- [ ] Position type filter works (BCBA, RBT, etc.)
- [ ] Employment type filter works
- [ ] Location + radius filter works
- [ ] Remote toggle filter works
- [ ] Job cards show: title, company, location, salary (if provided), posted date
- [ ] Clicking job card navigates to `/job/[slug]`
- [ ] Job detail page shows full description, requirements, benefits
- [ ] Job detail page shows "Apply" button
- [ ] JobPosting JSON-LD schema present in page source
- [ ] Empty state shows when no jobs match filters

---

### Phase 3C: Application Form

**Goal:** Job seekers can apply to jobs with resume upload.

**Depends On:** Phase 3B

**Tasks:**
1. Build application form component with resume upload
2. Implement cookie-based form prefill (reuse pattern from inquiry form)
3. Add Turnstile protection
4. Handle form submission and success state

**Files to Create:**
- `src/components/jobs/application-form.tsx`
- `src/lib/storage/resumes.ts`

**Reference Files (adapt from):**
- `src/components/inquiry-form.tsx`
- `src/lib/storage/index.ts`

**Verification Commands:**
```bash
# Test file upload to storage bucket
# 1. Submit application with PDF resume
# 2. Check Supabase Storage for file:
pnpm supabase storage ls job-resumes
```

**Acceptance Criteria:**
- [ ] Application form appears on job detail page
- [ ] Required fields: name, email, phone, resume
- [ ] Resume upload accepts PDF, DOC, DOCX only
- [ ] Resume upload rejects files > 10MB with clear error
- [ ] Turnstile widget appears and validates
- [ ] Form submission creates `job_applications` record
- [ ] Resume uploaded to `job-resumes` bucket with correct path
- [ ] Success message shown after submit
- [ ] Applicant info saved to localStorage for prefill
- [ ] Subsequent applications prefill name, email, phone
- [ ] User can edit prefilled values before submitting

**Error Handling:**
- If resume upload fails → Show specific error, don't submit form
- If Turnstile fails → Show "Please verify you're human" error
- If database insert fails → Show generic error, suggest retry
- If duplicate application (same email + job) → Show "You've already applied"

---

### Phase 4: Email Notifications

**Goal:** Applicants and providers receive email notifications for applications.

**Depends On:** Phase 3C

**Tasks:**
1. Verify Resend domain setup (findabajobs.org)
2. Create email templates for application notifications
3. Send confirmation email to applicant on submit
4. Send notification email to provider on new application

**Files to Create:**
- `src/lib/email/application-received.tsx`
- `src/lib/email/application-confirmation.tsx`

**Files to Modify:**
- `src/lib/actions/applications.ts` - Add email sending after insert
- `src/env.ts` - Add `EMAIL_FROM_JOBS` variable

**Environment Variables Required:**
```bash
EMAIL_FROM_JOBS=jobs@findabajobs.org
```

**Verification Commands:**
```bash
# Check Resend dashboard for sent emails after test application
# Or use Resend test mode to verify email content
```

**Acceptance Criteria:**
- [ ] `EMAIL_FROM_JOBS` environment variable configured
- [ ] Applicant receives confirmation email within 1 minute of applying
- [ ] Confirmation email shows job title, company name, job link
- [ ] Provider receives notification email within 1 minute
- [ ] Provider notification shows applicant name, email, phone
- [ ] Provider notification includes link to dashboard application view
- [ ] Emails render correctly in Gmail, Outlook, Apple Mail

**Error Handling:**
- If email send fails → Log error, don't fail the application submission
- Email failures should not block the user flow

**⚠️ STOP POINT:** Verify emails are sending correctly in staging before proceeding. Check spam folders.

---

### Phase 5: Application Tracking

**Goal:** Providers can view and manage applications in the dashboard.

**Depends On:** Phase 2, Phase 4

**Tasks:**
1. Build applications list page (`/dashboard/applications`)
2. Build application detail view with status pipeline
3. Add status update actions (new → reviewed → interview → hired/rejected)
4. Add notes and rating features
5. Add filtering by status, job, date

**Files to Create:**
- `src/app/(dashboard)/dashboard/applications/page.tsx`
- `src/app/(dashboard)/dashboard/applications/[id]/page.tsx`
- `src/components/jobs/application-list.tsx`
- `src/components/jobs/application-detail.tsx`
- `src/components/jobs/application-status-badge.tsx`
- `src/components/jobs/application-status-pipeline.tsx`

**Files to Modify:**
- `src/components/dashboard/sidebar.tsx` - Add Applications nav item

**Reference Files (adapt from):**
- `src/app/(dashboard)/dashboard/inbox/page.tsx`
- `src/components/inbox/` components

**Acceptance Criteria:**
- [ ] Applications appears in dashboard sidebar
- [ ] `/dashboard/applications` shows list of all applications
- [ ] Applications grouped or filterable by job posting
- [ ] Status badge shows current status with appropriate color
- [ ] Clicking application opens detail view
- [ ] Detail view shows applicant info, resume link, cover letter
- [ ] Status pipeline allows moving through stages
- [ ] Notes field saves internal notes
- [ ] Rating (1-5 stars) can be set and updated
- [ ] Filter by status works
- [ ] Filter by job works
- [ ] Filter by date range works
- [ ] Resume downloads correctly when clicked

---

### Phase 6: White-Label Careers Pages

**Goal:** Providers get a careers page URL they can share/embed.

**Depends On:** Phase 5

**Tasks:**
1. Build careers page (`/careers/[provider-slug]`)
2. Show provider logo, description, and open positions
3. Add "Powered by BehaviorWork" footer for Free/Pro
4. Hide branding for Enterprise tier

**Files to Create:**
- `src/app/(jobs)/careers/[slug]/page.tsx`
- `src/components/jobs/careers-header.tsx`
- `src/components/jobs/careers-job-list.tsx`

**Acceptance Criteria:**
- [ ] `/careers/[slug]` renders provider's careers page
- [ ] Page shows provider logo and name prominently
- [ ] Page shows provider description/about section
- [ ] Page lists all published jobs for that provider
- [ ] Each job card has "Apply" button
- [ ] Apply navigates to job detail page with application form
- [ ] Free/Pro accounts show "Powered by BehaviorWork" footer
- [ ] Enterprise accounts have no BehaviorWork branding
- [ ] Page works without site header/footer (clean for embedding)
- [ ] SEO meta tags set for "[Provider] Careers"

---

### Phase 7: SEO & Directory Pages

**Goal:** Job directory pages for SEO (state/city landing pages).

**Depends On:** Phase 6

**Tasks:**
1. Build state job directory (`/[state]`)
2. Build city job directory (`/[state]/[city]`)
3. Update sitemap to include all job URLs
4. Add meta descriptions and OG images for job pages

**Files to Create:**
- `src/app/(jobs)/[state]/page.tsx`
- `src/app/(jobs)/[state]/[city]/page.tsx`

**Files to Modify:**
- `src/app/sitemap.ts` - Add job URLs

**Reference Files (adapt from):**
- `src/app/(site)/[state]/page.tsx`
- `src/app/(site)/[state]/[city]/page.tsx`

**Acceptance Criteria:**
- [ ] `/new-jersey` shows jobs in New Jersey
- [ ] `/new-jersey/edison` shows jobs in Edison, NJ
- [ ] State pages show job count and list of cities with jobs
- [ ] City pages show jobs with location in that city
- [ ] Meta title follows pattern: "ABA Jobs in {Location}"
- [ ] Meta description is unique per page
- [ ] OG image generated for social sharing
- [ ] Sitemap includes all state pages with jobs
- [ ] Sitemap includes all city pages with jobs
- [ ] Sitemap includes all individual job URLs

---

### Phase 8: Multi-Domain Routing

**Goal:** Three domains serve different content from single deployment.

**Depends On:** Phase 7

**Tasks:**
1. Update middleware for hostname-based routing
2. Configure Vercel custom domains
3. Update OAuth redirect URLs in providers
4. Test cross-domain flows
5. Deploy and verify all domains working

**Files to Modify:**
- `src/middleware.ts` - Add hostname detection and rewrites

**Verification Commands:**
```bash
# Local testing with /etc/hosts
echo "127.0.0.1 local.findabatherapy.org" | sudo tee -a /etc/hosts
echo "127.0.0.1 local.findabajobs.org" | sudo tee -a /etc/hosts
echo "127.0.0.1 local.behaviorwork.com" | sudo tee -a /etc/hosts

# Test each domain locally
curl -H "Host: local.findabatherapy.org" http://localhost:3000/
curl -H "Host: local.findabajobs.org" http://localhost:3000/
curl -H "Host: local.behaviorwork.com" http://localhost:3000/

# Verify auth redirect
curl -I -H "Host: local.findabajobs.org" http://localhost:3000/dashboard
# Should 302 redirect to behaviorwork.com
```

**Acceptance Criteria:**
- [ ] `findabatherapy.org` serves provider directory (existing site)
- [ ] `findabajobs.org` serves job board
- [ ] `behaviorwork.com` serves auth and dashboard
- [ ] `/dashboard` on findabatherapy.org redirects to behaviorwork.com/dashboard
- [ ] `/dashboard` on findabajobs.org redirects to behaviorwork.com/dashboard
- [ ] `/auth/*` on public sites redirects to behaviorwork.com/auth/*
- [ ] OAuth callback works on behaviorwork.com
- [ ] Session cookie works correctly on behaviorwork.com
- [ ] Public pages on findabajobs.org work without auth
- [ ] All three domains have valid SSL certificates

**Error Handling:**
- Unknown hostname → Serve findabatherapy.org as default
- Auth required but no session → Redirect to behaviorwork.com/auth/sign-in with return URL

**⚠️ STOP POINT:** Thoroughly test all three domains in staging before production deployment. Verify OAuth works end-to-end.

---

## Verification Plan

> **Note:** Each phase has its own verification commands. This section covers end-to-end testing after all phases are complete.

### Pre-Deployment Checklist

```bash
# 1. Type check passes
pnpm tsc --noEmit

# 2. Build succeeds
pnpm build

# 3. All tests pass (if applicable)
pnpm test

# 4. Linting passes
pnpm lint
```

### Local End-to-End Test

**Setup multi-domain locally:**
```bash
# Add to /etc/hosts (one-time setup)
echo "127.0.0.1 local.findabatherapy.org" | sudo tee -a /etc/hosts
echo "127.0.0.1 local.findabajobs.org" | sudo tee -a /etc/hosts
echo "127.0.0.1 local.behaviorwork.com" | sudo tee -a /etc/hosts
```

**Test Flow:**
- [ ] Visit `local.findabatherapy.org:3000` - provider directory loads
- [ ] Visit `local.findabajobs.org:3000` - job board loads
- [ ] Visit `local.behaviorwork.com:3000` - hub/marketing page loads
- [ ] Click "Sign In" on jobs site - redirects to behaviorwork.com
- [ ] Sign in as test provider
- [ ] Create job posting from dashboard
- [ ] Visit `local.findabajobs.org:3000/search` - job appears
- [ ] View job detail page - JSON-LD schema present
- [ ] Submit test application with resume
- [ ] Check dashboard - application appears
- [ ] Check email (Resend dashboard) - notifications sent
- [ ] Visit careers page - provider branding shown

### Production Deployment

**Vercel Configuration:**
1. Add `findabajobs.org` domain
2. Add `behaviorwork.com` domain
3. Verify SSL certificates active

**DNS Records:**
```
findabajobs.org    A     76.76.21.21
www.findabajobs.org CNAME cname.vercel-dns.com
behaviorwork.com   A     76.76.21.21
www.behaviorwork.com CNAME cname.vercel-dns.com
```

**OAuth Configuration:**
- [ ] Google Cloud Console: Add `https://behaviorwork.com/auth/callback`
- [ ] Microsoft Entra: Add `https://behaviorwork.com/auth/callback`
- [ ] Supabase Dashboard: Update redirect URL

**Post-Deployment Smoke Test:**
- [ ] Sign up new account via Google OAuth
- [ ] Create and publish job posting
- [ ] Submit application as job seeker
- [ ] Verify emails received (check spam folders)
- [ ] Verify all three domains resolve correctly

---

## Human Actions Required (Post-Agent Checklist)

> **After the agent completes all phases, you need to do these manual steps.**
> The agent cannot access external dashboards or configure third-party services.

### 1. Supabase Configuration

**Storage Bucket (if not created by migration):**
1. Go to Supabase Dashboard → Storage
2. Create bucket: `job-resumes`
3. Set policies:
   - Public: No
   - Authenticated users: Can upload to their own paths
   - File size limit: 10MB
   - Allowed MIME types: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

**Verify Migration:**
1. Go to Supabase Dashboard → Table Editor
2. Confirm `job_postings` table exists with all columns
3. Confirm `job_applications` table exists with all columns
4. Go to Authentication → Policies, verify RLS policies are active

### 2. Resend Email Configuration

**Add Domain (findabajobs.org):**
1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click "Add Domain" → Enter `findabajobs.org`
3. Add DNS records to your domain registrar:
   ```
   Type: TXT
   Name: resend._domainkey
   Value: (provided by Resend)

   Type: TXT
   Name: @
   Value: v=spf1 include:amazonses.com ~all
   ```
4. Wait for verification (can take up to 48 hours, usually minutes)

**Add Domain (behaviorwork.com):** (if not already configured)
1. Repeat above steps for `behaviorwork.com`

### 3. Environment Variables

**Add to Vercel (Production):**
```bash
EMAIL_FROM_JOBS=jobs@findabajobs.org
EMAIL_FROM_HUB=hello@behaviorwork.com
```

**Add to `.env.local` (Development):**
```bash
EMAIL_FROM_JOBS=jobs@findabajobs.org
EMAIL_FROM_HUB=hello@behaviorwork.com
```

### 4. Vercel Domain Configuration

**Add Domains:**
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add `findabajobs.org`
3. Add `www.findabajobs.org`
4. Add `behaviorwork.com`
5. Add `www.behaviorwork.com`

**Configure DNS (at your registrar):**
```
# findabajobs.org
@     A      76.76.21.21
www   CNAME  cname.vercel-dns.com

# behaviorwork.com
@     A      76.76.21.21
www   CNAME  cname.vercel-dns.com
```

**Wait for SSL:** Vercel auto-provisions SSL certificates. Can take 5-30 minutes.

### 5. OAuth Provider Updates

**Google Cloud Console:**
1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Edit your OAuth 2.0 Client
3. Add Authorized redirect URI: `https://behaviorwork.com/auth/callback`
4. Save

**Microsoft Entra (if using):**
1. Go to [Azure Portal](https://portal.azure.com) → App registrations
2. Edit your app → Authentication
3. Add redirect URI: `https://behaviorwork.com/auth/callback`
4. Save

**Supabase Auth:**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Update Site URL to: `https://behaviorwork.com`
3. Add to Redirect URLs: `https://behaviorwork.com/auth/callback`

### 6. Cloudflare Turnstile (if using)

1. Go to [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Edit your site or create new
3. Add domains:
   - `findabatherapy.org`
   - `findabajobs.org`
   - `behaviorwork.com`
   - `localhost` (for development)

### 7. Post-Setup Verification

Run these checks after completing all manual steps:

```bash
# 1. Verify build succeeds
pnpm build

# 2. Test locally with multi-domain
pnpm dev
# Visit: http://localhost:3000 (should work)

# 3. After DNS propagates, test production
curl -I https://findabajobs.org
curl -I https://behaviorwork.com
# Both should return 200 OK

# 4. Test OAuth flow
# Visit https://behaviorwork.com/auth/sign-in
# Sign in with Google
# Should redirect back to dashboard

# 5. Test email
# Create a job, submit an application
# Check Resend dashboard for sent emails
```

### 8. Review Agent Output

Before deploying, review:
- [ ] All new files in `src/app/(jobs)/`
- [ ] Database migration in `supabase/migrations/`
- [ ] Job form fields match ABA industry needs
- [ ] Position types are correct (BCBA, RBT, etc.)
- [ ] Benefits list is complete
- [ ] Error messages are user-friendly
- [ ] No hardcoded test data left in code

---

## Position Types & Options

### Position Types (ABA-Specific)
```typescript
const POSITION_TYPES = [
  { value: "bcba", label: "BCBA", description: "Board Certified Behavior Analyst" },
  { value: "bcaba", label: "BCaBA", description: "Board Certified Assistant Behavior Analyst" },
  { value: "rbt", label: "RBT", description: "Registered Behavior Technician" },
  { value: "bt", label: "BT", description: "Behavior Technician (non-certified)" },
  { value: "clinical_director", label: "Clinical Director", description: "Oversees clinical operations" },
  { value: "regional_director", label: "Regional Director", description: "Multi-location oversight" },
  { value: "executive_director", label: "Executive Director", description: "Executive leadership" },
  { value: "admin", label: "Administrative", description: "Office, billing, scheduling" },
  { value: "other", label: "Other", description: "Other positions" }
] as const;
```

### Employment Types
```typescript
const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "per_diem", label: "Per Diem" },
  { value: "internship", label: "Internship/Fieldwork" }
] as const;
```

### Benefits Options
```typescript
const BENEFITS_OPTIONS = [
  { value: "health_insurance", label: "Health Insurance" },
  { value: "dental_vision", label: "Dental & Vision" },
  { value: "pto", label: "Paid Time Off" },
  { value: "401k", label: "401(k)" },
  { value: "supervision", label: "BCBA Supervision (for RBTs)" },
  { value: "ceu_stipend", label: "CEU Stipend" },
  { value: "tuition_reimbursement", label: "Tuition Reimbursement" },
  { value: "signing_bonus", label: "Signing Bonus" },
  { value: "flexible_schedule", label: "Flexible Schedule" },
  { value: "mileage_reimbursement", label: "Mileage Reimbursement" }
] as const;
```

---

## Files to Create/Modify

> **Note:** Detailed file lists with reference patterns are included in each phase above. This section provides a quick overview.

### New Files - Database
- `supabase/migrations/XXX_create_job_tables.sql` - Job postings & applications tables

### New Files - Public Job Board (`src/app/(jobs)/`)
Pages mirror `(site)` structure:
- `page.tsx` - Homepage (adapt from `(site)/page.tsx`)
- `[state]/page.tsx` - State directory (adapt from `(site)/[state]/page.tsx`)
- `[state]/[city]/page.tsx` - City directory (adapt from `(site)/[state]/[city]/page.tsx`)
- `search/page.tsx` - Search results (adapt from `(site)/search/page.tsx`)
- `provider/[slug]/page.tsx` - Provider profile + all jobs (adapt from `(site)/provider/[slug]`)
- `job/[slug]/page.tsx` - Job detail + application form
- `careers/[slug]/page.tsx` - White-label careers page (Pro+ feature, no header/footer)
- `layout.tsx` - Jobs site layout (adapt header/footer from `(site)`)

### New Files - Dashboard (`src/app/(dashboard)/dashboard/`)
- `jobs/page.tsx` - List provider's job postings
- `jobs/new/page.tsx` - Create new job posting
- `jobs/[id]/page.tsx` - Edit job posting
- `applications/page.tsx` - All applications (mirrors inbox pattern)

### New Files - Server Actions (`src/lib/actions/`)
- `jobs.ts` - CRUD for job postings (pattern from `listings.ts`)
- `applications.ts` - Submit/update applications (pattern from `inquiries.ts`)

### New Files - Queries (`src/lib/queries/`)
- `jobs.ts` - Search jobs, get by slug (pattern from `search.ts`)

### New Files - Validations (`src/lib/validations/`)
- `jobs.ts` - Job posting & application schemas (pattern from `onboarding.ts`)

### Shared Components (Refactor to Accept Props)
Existing components to make more generic:
- `src/components/search/search-hero.tsx` - Add `title`, `subtitle`, `placeholder` props
- `src/components/search/location-autocomplete.tsx` - Already generic
- `src/components/search/search-results.tsx` - Add `CardComponent` prop
- `src/components/directory/state-page-content.tsx` - Add `contentType` prop
- `src/components/directory/city-page-content.tsx` - Add `contentType` prop

### New Components (`src/components/jobs/`)
Job-specific components (following existing patterns):
- `job-card.tsx` - Same structure as `provider-card.tsx`
- `job-filters.tsx` - Same pattern as search filters
- `job-detail.tsx` - Same pattern as provider profile sections
- `application-form.tsx` - Same pattern as `inquiry-form.tsx` + resume
- `application-list.tsx` - Same pattern as inbox list
- `application-status-badge.tsx` - Same pattern as existing badges
- `job-form.tsx` - Same pattern as listing edit forms
- `careers-header.tsx` - Provider branding header

### New Files - SEO (`src/lib/seo/`)
- `job-schemas.ts` - JobPosting JSON-LD (pattern from `schemas.ts`)

### New Files - Email Templates (`src/lib/email/`)
- `application-received.tsx` - Pattern from existing email templates
- `application-confirmation.tsx` - Pattern from existing email templates

### New Files - Storage
- Create `job-resumes` bucket in Supabase Storage

### Modified Files
- `src/middleware.ts` - Add hostname-based routing for 3 domains
- `src/components/dashboard/sidebar.tsx` - Add Jobs & Applications nav items
- `src/env.ts` - Add `EMAIL_FROM_JOBS`, `EMAIL_FROM_HUB`
- `src/lib/storage/index.ts` - Add resume upload/validation functions
- `src/app/sitemap.ts` - Add job URLs to sitemap
- `next.config.mjs` - Add findabajobs.org to allowed image domains

---

## Pricing Model

**Annual plans: 40% off**

| Tier | Monthly | Annual | Directory | Job Board | CRM |
|------|---------|--------|-----------|-----------|-----|
| Free | $0 | $0 | 1 location | 1 job | 10 contacts |
| Pro | $79/mo | $47/mo | 3 locations | 5 jobs | 250 contacts |
| Enterprise | $199/mo | $119/mo | Unlimited | Unlimited | Unlimited |

**Enterprise extras:**
- Priority support
- Remove "Powered by BehaviorWork" branding

**Why this pricing:**
- $79/mo Pro undercuts Indeed ($150-400/mo) while including CRM + directory
- $47/mo annual is a no-brainer for budget-conscious small agencies
- 3 locations / 5 jobs fits 80% of ABA agencies (mostly small 1-2 clinic operators)
- Clear upgrade path when they hit limits

**Market context:**
- ~1,600 ABA agencies in US, mostly small operators
- Massive staffing shortage = recruiting is #1 pain point
- ABA practice management software costs $200-400/mo (we don't compete with that)
- Indeed sponsored jobs cost $150-400/mo alone

One subscription unlocks all products.

---

## Reusable Patterns from Existing Codebase

The job board reuses existing findabatherapy.org patterns to maintain consistency and reduce development time.

### UI Components (Reuse Directly)
All 31 shadcn components in `src/components/ui/` are domain-agnostic:
- `Button`, `Input`, `Select`, `Card`, `Dialog`, `Badge`, `Avatar`
- `Tabs`, `Accordion`, `Table`, `Sheet`, `Popover`
- Form components with validation states

### Server Actions Pattern
Reuse the `ActionResult<T>` pattern from `src/lib/actions/`:
```typescript
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };
```

### Search & Filtering
Adapt `src/lib/queries/search.ts` patterns:
- URL parameter handling for filters
- Pagination with plan tier priority sorting
- Combined results with sections (Featured, Nearby, Other)

### Dashboard Components
Reuse from `src/components/dashboard/`:
- `DashboardShell` - Layout wrapper
- `DashboardSidebar` - Navigation (add Jobs section)
- Stat cards, tables, empty states

### Form Validation
Reuse Zod + react-hook-form setup from `src/lib/validations/`:
- Schema definition pattern
- Preset options arrays (adapt for job-specific options)
- Error message handling

### File Upload
Adapt `src/lib/storage/` for resume uploads:
- `generateStoragePath()` pattern
- `getPublicUrl()` for resume access
- Validation functions for file type/size

### SEO Components
Reuse from `src/components/seo/` and `src/lib/seo/`:
- `JsonLd` component for structured data
- `Breadcrumbs` component
- Metadata generation patterns

---

## SEO Implementation

### Job Posting Structured Data (Schema.org)
Each job detail page includes JobPosting JSON-LD:

```typescript
// src/lib/seo/job-schemas.ts
export function generateJobPostingSchema(job: JobPosting, agency: Profile) {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": job.title,
    "description": job.description,
    "datePosted": job.published_at,
    "validThrough": job.expires_at,
    "employmentType": mapEmploymentType(job.employment_type),
    "hiringOrganization": {
      "@type": "Organization",
      "name": agency.agency_name,
      "sameAs": `https://findabatherapy.org/provider/${agency.slug}`,
      "logo": agency.logo_url
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": job.location?.city,
        "addressRegion": job.location?.state,
        "postalCode": job.location?.zip
      }
    },
    "baseSalary": job.salary_min ? {
      "@type": "MonetaryAmount",
      "currency": "USD",
      "value": {
        "@type": "QuantitativeValue",
        "minValue": job.salary_min,
        "maxValue": job.salary_max,
        "unitText": job.salary_type === "hourly" ? "HOUR" : "YEAR"
      }
    } : undefined,
    "jobLocationType": job.remote_option ? "TELECOMMUTE" : undefined
  };
}
```

### URL Structure for SEO

| Page | URL | Title Pattern |
|------|-----|---------------|
| Job Search | `/jobs` | `ABA Therapy Jobs | Find ABA Jobs` |
| State Jobs | `/jobs/[state]` | `ABA Jobs in {State} | Find ABA Jobs` |
| City Jobs | `/jobs/[state]/[city]` | `ABA Jobs in {City}, {State}` |
| Job Detail | `/jobs/[slug]` | `{Title} at {Provider} | Find ABA Jobs` |
| Careers Page | `/careers/[provider-slug]` | `Careers at {Provider} | Find ABA Jobs` |

### Sitemap Generation
Extend existing sitemap to include:
- All published job postings
- State/city job directory pages
- Provider careers pages

---

## Job Search Filters

### Filter Options

| Filter | Type | Values |
|--------|------|--------|
| Position Type | Multi-select | BCBA, BCaBA, RBT, Clinical Director, Admin |
| Employment Type | Multi-select | Full-time, Part-time, Contract, Per Diem |
| Salary Range | Range slider | $15-$50/hr or $40k-$150k/yr |
| Remote | Toggle | Yes/No |
| Location | Text + Radius | City/ZIP + 10/25/50 miles |
| Posted Date | Select | Last 24h, Last 7 days, Last 30 days |

### URL Parameters
```
/jobs?
  position=bcba,rbt
  employment=full_time
  salary_min=25&salary_max=50&salary_type=hourly
  remote=true
  location=Edison,NJ&radius=25
  posted=7d
  page=1
```

### Sort Options
1. **Relevance** (default) - Plan tier priority, then recency
2. **Date Posted** - Newest first
3. **Salary** - Highest first (when salary provided)

---

## Application Form Fields

### Required Fields
- Full Name
- Email
- Phone Number
- Resume (PDF, DOC, DOCX - max 10MB)

### Optional Fields
- Cover Letter (textarea)
- LinkedIn URL
- How did you hear about us? (dropdown: Indeed, LinkedIn, Google, Referral, Other)

### Form Validation (Zod Schema)
```typescript
const applicationSchema = z.object({
  applicant_name: z.string().min(2, "Name is required"),
  applicant_email: z.string().email("Valid email required"),
  applicant_phone: z.string().regex(/^[\d\s\-\(\)\+]+$/, "Valid phone required"),
  resume: z.instanceof(File)
    .refine(f => f.size <= 10 * 1024 * 1024, "Max 10MB")
    .refine(f => ["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
      .includes(f.type), "PDF, DOC, or DOCX only"),
  cover_letter: z.string().max(5000).optional(),
  linkedin_url: z.string().url().optional().or(z.literal("")),
  source: z.enum(["indeed", "linkedin", "google", "referral", "careers_page", "other"]).optional()
});
```

---

## Email Templates

### New Application Notification (to Provider)
**Subject:** New application for {Job Title}
**From:** jobs@findabajobs.org

```
Hi {Provider Name},

You have a new application for {Job Title}.

Applicant: {Name}
Email: {Email}
Phone: {Phone}

View application: https://behaviorwork.com/dashboard/applications/{id}

---
Manage your job postings at behaviorwork.com
```

### Application Confirmation (to Applicant)
**Subject:** Application received - {Job Title} at {Provider}
**From:** jobs@findabajobs.org

```
Hi {Name},

Thanks for applying to {Job Title} at {Provider Name}!

Your application has been submitted. The hiring team will review it and reach out if there's a match.

Job details: https://findabajobs.org/jobs/{slug}

Good luck!

---
Find more ABA jobs at findabajobs.org
```
