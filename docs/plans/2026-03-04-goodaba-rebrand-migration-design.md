# GoodABA.com Rebrand & Domain Consolidation

**Date:** 2026-03-04
**Status:** Design — awaiting approval

---

## Summary

Consolidate three brands (FindABATherapy.org, FindABAJobs.org, BehaviorWork.com) into one unified brand: **GoodABA.com**. Eliminate multi-domain routing. All audiences — families, job seekers, and agencies — are served from a single domain with route-based separation.

Old domains remain owned and 301-redirect to their GoodABA equivalents permanently.

---

## Navigation Structure

```
goodaba.com
├── Find Providers     → /find (directory)
├── Family Resources   → /resources (learn hub)
├── Find Jobs          → /jobs (job board)
├── Get Listed         → /get-listed (agency landing + pricing)
└── Log In             → /auth/sign-in
```

---

## Route Mapping: Current → New

### Homepage

| Current | New | Notes |
|---------|-----|-------|
| `findabatherapy.org/` | `goodaba.com/` | Directory-first homepage with unified nav. Same content as current therapy homepage but with top nav surfacing Jobs, Get Listed, etc. |

### Provider Directory (currently `(site)` routes)

| Current | New | Notes |
|---------|-----|-------|
| `/search` | `/find` | Main directory search page. Also serves as the homepage hero section. |
| `/provider/[slug]` | `/find/provider/[slug]` | Individual provider listing |
| `/provider/p/[slug]` | `/find/provider/[slug]` | Merge with above (301 redirect old format) |
| `/states` | `/find/states` | Browse all states |
| `/[state]` | `/find/[state]` | State listings (e.g., `/find/texas`) |
| `/[state]/guide` | `/find/[state]/guide` | State guide |
| `/[state]/[city]` | `/find/[state]/[city]` | City listings (e.g., `/find/texas/houston`) |
| `/insurance` | `/find/insurance` | Browse insurance carriers |
| `/insurance/[slug]` | `/find/insurance/[slug]` | Insurance-specific listings |
| `/centers` | `/find/centers` | ABA centers directory |
| `/faq` | `/faq` | Keep at root level (applies to whole platform) |

### Family Resources (currently `(site)` learn routes)

| Current | New | Notes |
|---------|-----|-------|
| `/learn` | `/resources` | Learning hub homepage. Nav label: "Family Resources" |
| `/learn/[slug]` | `/resources/[slug]` | Individual article/guide |
| `/learn/glossary` | `/resources/glossary` | Glossary of ABA terms |

### Job Board (currently `(jobs)` routes)

| Current | New | Notes |
|---------|-----|-------|
| `findabajobs.org/jobs` | `/jobs` | Job board homepage |
| `findabajobs.org/jobs/search` | `/jobs/search` | Job search |
| `findabajobs.org/jobs/[state]` | `/jobs/[state]` | Jobs by state |
| `findabajobs.org/jobs/[state]/[city]` | `/jobs/[state]/[city]` | Jobs by city |
| `findabajobs.org/[position]-jobs` | `/jobs/[position]` | Position category (e.g., `/jobs/rbt`) |
| `findabajobs.org/job/[slug]` | `/jobs/[slug]` | Individual job posting |
| `findabajobs.org/employers` | `/jobs/employers` | Employer profiles |
| `findabajobs.org/employers/[slug]` | `/jobs/employers/[slug]` | Individual employer |

### Careers Pages (currently `(careers)` routes)

| Current | New | Notes |
|---------|-----|-------|
| `/careers/[slug]` | `/careers/[slug]` | No change — employer career pages stay |
| `/careers/[slug]/[jobSlug]` | `/careers/[slug]/[jobSlug]` | No change |
| `/provider/[slug]/careers` | `/careers/[slug]` | Redirect to canonical careers URL |

### Agency Landing (currently `/behaviorwork` routes)

| Current | New | Notes |
|---------|-----|-------|
| `/behaviorwork` | `/get-listed` | Single long-form landing page: hero → features → how it works → pricing → FAQ → CTA. Replaces both `/behaviorwork` and `/behaviorwork/get-started`. |
| `/behaviorwork/get-started` | `/get-listed` | 301 redirect (merged into one page) |
| `/get-listed` (current) | `/get-listed` | Current signup CTA page merges into new landing page |

### Branded Agency Pages (currently various)

| Current | New | Notes |
|---------|-----|-------|
| `/p/[slug]` | `/p/[slug]` | No change — short branded page URLs |
| `/site/[slug]` | `/site/[slug]` | No change — full agency microsites |
| `/site/[slug]/contact` | `/site/[slug]/contact` | No change |
| `/site/[slug]/careers` | `/site/[slug]/careers` | No change |
| `/site/[slug]/intake` | `/site/[slug]/intake` | No change |
| `/site/[slug]/resources/*` | `/site/[slug]/resources/*` | No change |

### Intake & Contact Forms

| Current | New | Notes |
|---------|-----|-------|
| `/intake/[slug]/client` | `/intake/[slug]/client` | No change |
| `/contact/[slug]` | `/contact/[slug]` | No change |
| `/resources/[slug]/*` | `/resources/[slug]/*` | No change (intake resources, different from learn) |

### Auth

| Current | New | Notes |
|---------|-----|-------|
| `/auth/sign-in` | `/auth/sign-in` | No change |
| `/auth/sign-up` | `/auth/sign-up` | No change |
| `/auth/reset-password` | `/auth/reset-password` | No change |

### Dashboard

| Current | New | Notes |
|---------|-----|-------|
| `/dashboard/*` | `/dashboard/*` | No changes to any dashboard routes |

### Legal

| Current | New | Notes |
|---------|-----|-------|
| `/legal/privacy` | `/legal/privacy` | No change — update company name references in copy |
| `/legal/terms` | `/legal/terms` | No change — update company name references in copy |

### Admin & Demo

| Current | New | Notes |
|---------|-----|-------|
| `/admin/*` | `/admin/*` | No change |
| `/demo/*` | `/demo/*` | No change |

---

## 301 Redirect Map (Old Domains → GoodABA)

These redirects run at the DNS/Vercel level. Old domains stay owned permanently.

### findabatherapy.org

| Old URL | Redirects To |
|---------|-------------|
| `/` | `goodaba.com/` |
| `/search` | `goodaba.com/find` |
| `/provider/[slug]` | `goodaba.com/find/provider/[slug]` |
| `/provider/p/[slug]` | `goodaba.com/find/provider/[slug]` |
| `/states` | `goodaba.com/find/states` |
| `/[state]` | `goodaba.com/find/[state]` |
| `/[state]/guide` | `goodaba.com/find/[state]/guide` |
| `/[state]/[city]` | `goodaba.com/find/[state]/[city]` |
| `/insurance` | `goodaba.com/find/insurance` |
| `/insurance/[slug]` | `goodaba.com/find/insurance/[slug]` |
| `/centers` | `goodaba.com/find/centers` |
| `/learn` | `goodaba.com/resources` |
| `/learn/[slug]` | `goodaba.com/resources/[slug]` |
| `/learn/glossary` | `goodaba.com/resources/glossary` |
| `/faq` | `goodaba.com/faq` |
| `/get-listed` | `goodaba.com/get-listed` |
| `/*` (catch-all) | `goodaba.com/*` |

### findabajobs.org

| Old URL | Redirects To |
|---------|-------------|
| `/` | `goodaba.com/jobs` |
| `/jobs` | `goodaba.com/jobs` |
| `/jobs/search` | `goodaba.com/jobs/search` |
| `/jobs/[state]` | `goodaba.com/jobs/[state]` |
| `/jobs/[state]/[city]` | `goodaba.com/jobs/[state]/[city]` |
| `/[position]-jobs` | `goodaba.com/jobs/[position]` |
| `/job/[slug]` | `goodaba.com/jobs/[slug]` |
| `/employers` | `goodaba.com/jobs/employers` |
| `/employers/[slug]` | `goodaba.com/jobs/employers/[slug]` |
| `/*` (catch-all) | `goodaba.com/*` |

### behaviorwork.com

| Old URL | Redirects To |
|---------|-------------|
| `/` | `goodaba.com/get-listed` |
| `/dashboard/*` | `goodaba.com/dashboard/*` |
| `/*` (catch-all) | `goodaba.com/*` |

---

## Code Changes Required

### 1. Domain Configuration (`src/lib/utils/domains.ts`)

**Current:** Three-brand `domains` object with brand detection by hostname.

**New:** Single-domain configuration.

```typescript
// Replace entire domains object with:
export const siteConfig = {
  domain: "goodaba.com",
  production: "https://www.goodaba.com",
  name: "GoodABA",
  supportEmail: "support@goodaba.com",
  noReplyEmail: "noreply@goodaba.com",
};
```

- Remove `Brand` type (`"therapy" | "jobs" | "parent"`)
- Remove `getBrandFromHost()`, `getBrandFromPath()`, `getBrandFromRequest()`
- Remove `isJobsDomain()`, `isParentDomain()`
- Simplify `getBaseUrl()` to return single domain
- Simplify `getFromEmail()` / `getFormattedFromEmail()` to use `@goodaba.com`
- Remove `getAllProductionDomains()` (one domain now)

### 2. Middleware (`src/middleware.ts`)

**Current:** Complex host-based brand detection with cross-domain redirects and rewrites.

**New:** Standard Next.js middleware — auth protection, no brand routing.

- Remove `getBrandFromRequest()` call
- Remove all host-based routing logic (lines 130-201)
- Remove jobs domain detection
- Remove cross-domain redirects
- Keep: auth guards, CSP headers, any rate limiting

### 3. Site Configs (`src/config/site.ts`, `src/config/jobs.ts`, `src/config/brands.ts`)

**Current:** Separate config objects per brand.

**New:** One unified config.

```typescript
// src/config/site.ts — single config
export const siteConfig = {
  name: "GoodABA",
  tagline: "The ABA Growth Toolkit",
  description: "Find ABA providers. Post ABA jobs. Manage your ABA agency. One platform.",
  contactEmail: "support@goodaba.com",
  url: "https://www.goodaba.com",
  seo: {
    // Merged keywords from both therapy + jobs configs
  },
  social: {
    twitter: "https://twitter.com/goodaba",
    // ...
  },
  nav: {
    public: [
      { label: "Find Providers", href: "/find" },
      { label: "Family Resources", href: "/resources" },
      { label: "Find Jobs", href: "/jobs" },
      { label: "Get Listed", href: "/get-listed" },
    ],
  },
};
```

- Delete `src/config/jobs.ts` (merge relevant SEO keywords into unified config)
- Simplify `src/config/brands.ts` (keep color tokens for visual differentiation of directory vs jobs sections, but remove brand-switching logic)

### 4. Layouts & Metadata

**Root layout (`src/app/layout.tsx`):**
- `metadataBase: new URL("https://www.goodaba.com")`
- Update all metadata to GoodABA branding
- Update OG defaults

**Jobs layout (`src/app/(jobs)/layout.tsx`):**
- Remove `metadataBase` override (inherits from root)
- Keep layout structure (different header/footer for jobs section)
- Update metadata title template to `"%s | GoodABA Jobs"`

**Careers layout (`src/app/(careers)/layout.tsx`):**
- Remove `metadataBase` override
- Update metadata

**Site layout (`src/app/(site)/layout.tsx`):**
- Update nav component to unified GoodABA nav

### 5. Route Group Restructuring

**Move directory routes under `/find`:**
- Current `(site)` routes at root (`/[state]`, `/search`, `/provider/[slug]`) need to move under a `/find` prefix
- Option A: Move files into `(site)/find/` directory
- Option B: Create new `(find)` route group with `/find` in the URL
- This is the most file-movement-heavy change

**Rename learn routes:**
- Move `(site)/learn/` → route under `/resources` (note: potential conflict with intake `resources/[slug]` routes — need to differentiate. Intake resources are provider-slug-scoped, learn resources are global.)

**Position-type job routes:**
- Current: `findabajobs.org/[position]-jobs` (e.g., `/rbt-jobs`)
- New: `/jobs/[position]` (e.g., `/jobs/rbt`)
- Requires updating dynamic route structure

### 6. Sitemaps

**Current:** Two separate sitemaps (therapy sitemap.ts + jobs sitemap.ts).

**New:** One unified sitemap at root.

- Merge both into `src/app/sitemap.ts`
- All URLs use `https://www.goodaba.com` base
- Directory URLs: `/find/provider/[slug]`, `/find/[state]/[city]`, etc.
- Job URLs: `/jobs/[slug]`, `/jobs/[state]/[city]`, etc.

### 7. OG Image Generation (`src/app/api/og/route.tsx`)

- Keep existing visual style (same gradients, same layout) — just swap brand names
- Replace hardcoded `findabatherapy.org` / `findabajobs.org` text with `goodaba.com`
- Remove brand parameter switching if no longer needed (one domain)

### 8. Email Templates (`src/lib/email/email-helpers.ts`)

- `emailWrapper()`: Update footer from "via findabatherapy.org" → "via GoodABA"
- `agencyEmailWrapper()`: Update "Powered by BehaviorWork" → "Powered by GoodABA"
- Update support email: `support@goodaba.com`
- Update all `from` addresses: `noreply@goodaba.com`

### 9. Robots.txt (`src/app/robots.ts`)

- Update base URL to `https://www.goodaba.com`
- Single sitemap reference

### 10. Environment Variables

```env
NEXT_PUBLIC_SITE_URL=https://www.goodaba.com

# Remove per-brand email overrides
# Just use:
EMAIL_FROM=noreply@goodaba.com
```

### 11. Stripe Configuration

- No code changes needed (uses relative paths + `getValidatedOrigin()`)
- Update Stripe Dashboard: business name, support email, receipt branding
- Update webhook endpoint URL in Stripe to `goodaba.com/api/stripe/webhooks`

### 12. Dynamic Icons

- Update `icon.tsx` / `apple-icon.tsx` in route groups to GoodABA branding
- Remove per-brand icon switching logic if any

### 13. Brand Name Sweep (All UI, Copy, and Code References)

Every file referencing old brand names must be updated. Full audit below.

#### Components — UI Copy & Navigation

| File | What to Change |
|------|---------------|
| `src/components/layout/auth-header.tsx` | Replace "findabatherapy.org" and "findabajobs.org" display text → "GoodABA" |
| `src/components/brand/behaviorwork-logo.tsx` | Rename file → `goodaba-logo.tsx`, update logo rendering |
| `src/components/marketing/behaviorwork-header.tsx` | Rename → `goodaba-header.tsx`, update all copy |
| `src/components/marketing/behaviorwork-footer.tsx` | Rename → `goodaba-footer.tsx`, update all copy |
| `src/components/marketing/behaviorwork-funnel-visual.tsx` | Rename → `goodaba-funnel-visual.tsx`, update chip labels ("Find ABA Therapy" → "GoodABA Directory", etc.) |
| `src/components/marketing/behaviorwork-tracker.tsx` | Rename → `goodaba-tracker.tsx` |
| `src/components/marketing/behaviorwork-cta-button.tsx` | Rename → `goodaba-cta-button.tsx` |
| All nav/header/footer components | Update brand name, links, and nav items to new unified nav structure |

#### Onboarding Flow

| File | What to Change |
|------|---------------|
| `src/app/(dashboard)/dashboard/onboarding/*` (all steps) | Replace any "FindABATherapy", "FindABAJobs", "BehaviorWork" references in step descriptions, labels, preview text |
| Onboarding branded preview step | Update preview URLs shown to user (e.g., "Your listing on FindABATherapy.org" → "Your listing on GoodABA") |
| Onboarding success page | Update congratulations copy and next-step links |

#### Dashboard & Settings

| File | What to Change |
|------|---------------|
| Dashboard sidebar/nav | Update any "FindABATherapy" or "FindABAJobs" labels |
| Settings/billing page | Update plan names, branding references |
| Upgrade modal / pricing cards | Replace "BehaviorWork" or "FindABATherapy" in feature descriptions |
| Dashboard home/overview | Update any welcome copy or brand references |
| Intake pages management | Update URLs shown for branded pages (contact form links, intake form links) |

#### Marketing & Landing Pages

| File | What to Change |
|------|---------------|
| `src/content/behaviorwork.ts` | Rename → `goodaba.ts`. Update all copy: chip labels ("Find ABA Therapy", "Find ABA Jobs"), engine cards, highlights, FAQ answers referencing "Behavior Work" |
| `/behaviorwork` page components | Move to `/get-listed`, update all copy |
| `/get-listed` (current) | Merge into new landing page |
| Site homepage hero/CTA sections | Update brand references |

#### SEO & Structured Data

| File | What to Change |
|------|---------------|
| `src/lib/seo/schemas.ts` | Organization name → "GoodABA", update URLs, twitter handle, LinkedIn, contact email |
| `src/lib/seo/job-schemas.ts` | Update organization references to GoodABA |
| All `page.tsx` files with inline metadata | Grep for old brand names in `title`, `description`, `openGraph` fields |

#### Email Templates & Notifications

| File | What to Change |
|------|---------------|
| `src/lib/email/email-helpers.ts` | "via findabatherapy.org" → "via GoodABA", "Powered by BehaviorWork" → "Powered by GoodABA" |
| `src/lib/email/notifications.ts` | Update `behaviorWorkLogoHtml` import → `goodabaLogoHtml`, update all brand references |
| Drip email templates | Update brand name, URLs, support email in all drip sequence emails |
| Communication templates (22 templates) | Screen for any brand name references in template copy |

#### Scripts & Utilities

| File | What to Change |
|------|---------------|
| `src/env.ts` | Update "findabatherapy.org" in error message example |
| `scripts/send-test-emails.ts` | Update domain references |
| `scripts/set-admin.ts` | Update BehaviorWork references |
| `.env.example` | Update example URLs and email addresses |

#### Tests

| Directory | What to Change |
|-----------|---------------|
| `e2e/find-aba-therapy/` | Rename directory → `e2e/goodaba-directory/` (or similar), update spec references |
| `e2e/find-aba-jobs/` | Rename directory → `e2e/goodaba-jobs/`, update spec references |
| All test fixtures | Update any hardcoded URLs or brand names |

#### Documentation

| File | What to Change |
|------|---------------|
| `CLAUDE.md` | Update brand names, domain references, route group descriptions |
| `README.md` | Update project description and URLs |
| `docs/strategy/BehaviorWork Strategy.md` | Update or note as historical (strategy still applies, brand name changed) |
| All other docs | Grep and update |

#### Database Migrations

| File | What to Change |
|------|---------------|
| `supabase/migrations/034_create_job_tables.sql` | Comment references only — no data migration needed |
| Any seed scripts | Update brand name references in seed data |

---

## Infrastructure Changes

### DNS & Vercel

1. **Add `goodaba.com` domain to Vercel project** (primary domain)
2. **Configure `www.goodaba.com`** as canonical (redirect naked → www, or vice versa — pick one)
3. **Set up redirect projects** for old domains:
   - `findabatherapy.org` → Vercel redirect project with 301 rules
   - `findabajobs.org` → Vercel redirect project with 301 rules
   - `behaviorwork.com` → Vercel redirect project with 301 rules
   - Or: handle redirects in middleware during transition period
4. **Update `NEXT_PUBLIC_SITE_URL`** in Vercel environment variables

### Email (Resend)

1. **Verify `goodaba.com`** domain in Resend
2. **Add DNS records:** SPF, DKIM, DMARC for `goodaba.com`
3. **Test deliverability** before switching
4. **Keep `behaviorwork.com`** verified during transition (emails in flight)
5. **Update from addresses** in code after verification confirmed

### Google Search Console

1. **Add `goodaba.com`** as new property
2. **Use Change of Address tool** on both old properties:
   - `findabatherapy.org` → `goodaba.com`
   - `findabajobs.org` → `goodaba.com`
3. **Submit new sitemap** at `goodaba.com/sitemap.xml`
4. **Monitor indexing** for 2-3 months

### Google Analytics / PostHog

1. **Update PostHog** project settings for new domain
2. **Add `goodaba.com`** to allowed origins
3. **Keep old domains** in allowed origins during transition

---

## Execution Order

The migration should happen in phases to minimize risk:

### Phase 0: Pre-Migration (no code changes)
- Register/verify `goodaba.com` in Vercel
- Verify `goodaba.com` in Resend, add DNS records
- Set up Google Search Console for `goodaba.com`
- Design GoodABA logo and brand assets

### Phase 1: Code — Single Domain Architecture
- Rewrite `domains.ts` to single-domain config
- Simplify middleware (remove brand routing)
- Merge site configs (`site.ts`, `jobs.ts`, `brands.ts` → unified `site.ts`)
- Update all metadata and layouts (`metadataBase`, titles, descriptions)
- Update email templates (from addresses, footer copy, logo references)

### Phase 2: Code — Route Restructuring
- Move directory routes under `/find`
- Move learn routes to `/resources`
- Restructure job position routes
- Build unified nav component (Find Providers, Family Resources, Find Jobs, Get Listed, Log In)
- Build `/get-listed` landing page (merge `/behaviorwork` + `/behaviorwork/get-started`)
- Merge sitemaps into one

### Phase 3: Code — Brand Name Sweep
- Rename all `behaviorwork-*` component files → `goodaba-*`
- Update all UI copy: auth header, dashboard sidebar, settings, billing, upgrade modal, pricing cards
- Update onboarding flow: step descriptions, preview URLs, success page copy
- Update marketing content (`src/content/behaviorwork.ts` → `goodaba.ts`)
- Update SEO schemas (`schemas.ts`, `job-schemas.ts`)
- Update OG image generation (swap domain text, keep existing visual style)
- Update scripts, env examples, error messages
- Update tests (rename e2e directories, update fixtures)
- Update documentation (CLAUDE.md, README, strategy docs)

### Phase 4: Deploy & Redirect
- Deploy to `goodaba.com`
- Verify everything works on new domain
- Set up 301 redirects from old domains
- Update Stripe Dashboard (business name, support email, webhook URL, receipt branding)
- Update Google Search Console (Change of Address for both old properties)
- Submit new sitemap
- Update PostHog allowed origins

### Phase 5: Cleanup & Monitoring
- Remove dead brand-detection code
- Remove unused config files
- Final grep for any remaining old brand references
- Monitor search rankings for 2-3 months
- Keep old domain redirects running indefinitely

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| SEO ranking drop | 301 redirects preserve ~90-99% link equity. Google Search Console Change of Address. Expect 2-8 week dip, recovery within 2-3 months. |
| Broken links from external sites | Old domains redirect permanently. No link goes dead. |
| Email deliverability | Verify `goodaba.com` in Resend and test before switching. Run both domains in parallel briefly. |
| Stripe webhooks break | Update webhook URL in Stripe before removing old domain. Test in Stripe CLI. |
| Existing users confused | Email announcement before migration. Dashboard banner explaining the rebrand. Old URLs all redirect seamlessly. |

---

## Out of Scope

- Logo/visual identity design (needed before Phase 0, but separate workstream)
- Marketing copy for `/get-listed` page (content strategy, separate from code)
- Social media account creation (@goodaba)
- Business entity / legal name changes
- Existing user notification email campaign (operational, not code)
