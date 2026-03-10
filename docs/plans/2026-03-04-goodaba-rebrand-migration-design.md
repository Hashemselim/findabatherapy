# GoodABA Rebrand Plan: Preserve FindABATherapy, Consolidate Platform + Jobs

**Date:** 2026-03-04
**Status:** Revised design

---

## Summary

Adopt a hybrid brand architecture:

- **FindABATherapy.org stays intact** as the family-facing provider directory and SEO asset.
- **BehaviorWork.com is replaced by GoodABA.com** as the provider-facing platform brand.
- **FindABAJobs is folded into GoodABA Jobs** and served from `goodaba.com/jobs`.
- **All provider-controlled public pages move to GoodABA now** under a unified provider route structure.

This keeps the strongest descriptive public brand while simplifying the agency-facing story into one company and one platform.

---

## Recommended Brand Architecture

### 1. Family-facing brand

- **Brand:** FindABATherapy
- **Domain:** `findabatherapy.org`
- **Audience:** Families and referral sources looking for ABA providers
- **Primary job:** Discovery and provider lead generation
- **Endorsement:** Use light endorsed-brand treatment where helpful, such as `FindABATherapy by GoodABA`

### 2. Provider-facing platform brand

- **Brand:** GoodABA
- **Domain:** `goodaba.com`
- **Audience:** ABA agency owners, operators, clinical leaders
- **Primary job:** Sell and operate the software platform
- **Core surfaces:** marketing site, pricing, auth, dashboard, billing, onboarding, support

### 3. Recruiting brand

- **Brand:** GoodABA Jobs
- **Domain:** `goodaba.com/jobs`
- **Audience:** Job seekers and hiring agencies
- **Primary job:** Job discovery and recruiting distribution
- **Legacy domain:** `findabajobs.org` becomes a permanent redirect domain

---

## Why This Direction Is Better

This structure matches the strategy more closely than a full consolidation:

- The strategy explicitly treats **client acquisition and lifecycle management** as the top value driver.
- It also treats **FindABATherapy distribution** as unique strategic leverage.
- Hiring is important, but it is secondary to getting and converting families.

So the right move is:

- preserve the strongest acquisition brand
- simplify the provider-facing product story
- consolidate the less strategically important public brand

---

## Domain Architecture

### FindABATherapy.org

Keep the directory domain and its public SEO structure as-is:

- homepage
- search
- provider profiles
- state/city pages
- insurance pages
- learn content
- FAQ

FindABATherapy scope is explicitly limited to:

- directory and discovery
- provider listing pages
- state and city SEO pages
- insurance SEO pages
- editorial/learn content
- FAQ and family education

Only change the provider conversion path:

- `Get Listed`
- pricing / signup CTAs
- any BehaviorWork references

Those should send users to `https://www.goodaba.com/`.

### GoodABA.com

GoodABA becomes the provider/company domain:

- `/` -> primary provider-facing landing page
- `/provider/[slug]` -> branded brochure
- `/provider/[slug]/website` -> full branded website homepage
- `/provider/[slug]/website/contact`
- `/provider/[slug]/website/intake`
- `/provider/[slug]/website/resources`
- `/provider/[slug]/website/careers`
- `/provider/[slug]/contact`
- `/provider/[slug]/intake`
- `/provider/[slug]/resources`
- `/provider/[slug]/careers`
- `/provider/[slug]/jobs/[jobSlug]`
- `/jobs` -> GoodABA Jobs homepage
- `/jobs/search`
- `/jobs/[state]`
- `/jobs/[state]/[city]`
- `/jobs/role/[position]`
- `/jobs/post/[slug]`
- `/jobs/employers`
- `/jobs/employers/[slug]`
- `/auth/*`
- `/dashboard/*`

GoodABA scope is explicitly:

- landing and pricing
- all provider-controlled branded pages
- branded brochure
- branded website
- provider contact and intake flows
- provider resources
- provider careers and provider job pages
- jobs marketplace
- auth, onboarding, dashboard, and billing

Product priority within GoodABA public pages:

- the **primary provider-facing public surfaces** are the branded brochure and standalone branded pages
- the **full branded website is optional/secondary**
- implementation and onboarding should prioritize brochure, contact, intake, resources, and careers before website-specific expansion
- because standalone branded pages and website subpages share similar content, they should not compete for indexing by default

### Redirect-only domains

- `behaviorwork.com/*` -> `goodaba.com/*`
- `findabajobs.org/*` -> `goodaba.com/jobs/*` equivalents

---

## Information Architecture

### FindABATherapy.org navigation

Keep the family-first navigation. Do not turn it into a mixed family + jobs + platform site.

Recommended nav:

- Find Providers
- Learn
- Insurance
- FAQ
- Get Listed
- Log In

`Get Listed` should link to `https://www.goodaba.com/`.

### GoodABA.com navigation

Provider-facing top nav:

- Platform
- Pricing
- Jobs
- Log In
- Start Free

If landing and pricing are combined, use:

- Platform
- Jobs
- FAQ
- Log In
- Start Free

### Recommendation: combine landing + pricing

Use one primary marketing page on `goodaba.com/` unless there is a strong paid-acquisition reason to split them.

Recommended homepage sections:

- hero
- product value proposition
- workflow / lifecycle explanation
- branded pages and forms
- CRM and communications
- hiring / jobs distribution
- pricing
- FAQ
- CTA

Optional:

- keep `/pricing` as a simple anchored version or alias later if needed

---

## Route Mapping

### A. FindABATherapy routes

These remain unchanged:

| Current | New | Notes |
|---------|-----|-------|
| `/` | `/` | No change |
| `/search` | `/search` | No change |
| `/provider/[slug]` | `/provider/[slug]` | No change |
| `/provider/p/[slug]` | `/provider/p/[slug]` | No change for now |
| `/states` | `/states` | No change |
| `/[state]` | `/[state]` | No change |
| `/[state]/guide` | `/[state]/guide` | No change |
| `/[state]/[city]` | `/[state]/[city]` | No change |
| `/insurance` | `/insurance` | No change |
| `/insurance/[slug]` | `/insurance/[slug]` | No change |
| `/centers` | `/centers` | No change |
| `/learn` | `/learn` | No change |
| `/learn/[slug]` | `/learn/[slug]` | No change |
| `/learn/glossary` | `/learn/glossary` | No change |
| `/faq` | `/faq` | No change |

### B. Provider conversion routes on FindABATherapy

These should now hand off to GoodABA:

| Current | New | Notes |
|---------|-----|-------|
| `/get-listed` | `https://www.goodaba.com/` | Canonical provider CTA destination |
| `/behaviorwork` | `goodaba.com` | Permanent redirect |
| `/behaviorwork/get-started` | `goodaba.com` | Permanent redirect |

### C. Provider-controlled public routes moving to GoodABA

These should move now instead of remaining on FindABATherapy:

| Current | New | Notes |
|---------|-----|-------|
| `/p/[slug]` | `goodaba.com/provider/[slug]` | Branded brochure canonical route |
| `/site/[slug]` | `goodaba.com/provider/[slug]/website` | Full branded website homepage |
| `/site/[slug]/contact` | `goodaba.com/provider/[slug]/website/contact` | Contact page inside the branded website |
| `/site/[slug]/intake` | `goodaba.com/provider/[slug]/website/intake` | Intake page inside the branded website |
| `/site/[slug]/resources` | `goodaba.com/provider/[slug]/website/resources` | Resource hub inside the branded website |
| `/site/[slug]/resources/*` | `goodaba.com/provider/[slug]/website/resources/*` | Website resources canonicalize under the website namespace |
| `/site/[slug]/careers` | `goodaba.com/provider/[slug]/website/careers` | Careers page inside the branded website |
| `/contact/[slug]` | `goodaba.com/provider/[slug]/contact` | Standalone contact link now uses provider namespace |
| `/intake/[slug]/client` | `goodaba.com/provider/[slug]/intake` | Standalone intake link now uses provider namespace |
| `/resources/[slug]` | `goodaba.com/provider/[slug]/resources` | Provider resource hub moves to GoodABA |
| `/resources/[slug]/faq` | `goodaba.com/provider/[slug]/resources/faq` | Provider FAQ |
| `/resources/[slug]/glossary` | `goodaba.com/provider/[slug]/resources/glossary` | Provider glossary |
| `/resources/[slug]/guides` | `goodaba.com/provider/[slug]/resources/guides` | Provider guides |
| `/resources/[slug]/guides/[guideSlug]` | `goodaba.com/provider/[slug]/resources/guides/[guideSlug]` | Provider guide detail |
| `/careers/[slug]` | `goodaba.com/provider/[slug]/careers` | Provider-specific careers page |
| `/careers/[slug]/[jobSlug]` | `goodaba.com/provider/[slug]/jobs/[jobSlug]` | Provider-owned job page |
| `/provider/[slug]/careers` | `goodaba.com/provider/[slug]/careers` | Legacy provider careers mapping |

### D. GoodABA marketplace and platform routes

| Purpose | Route | Notes |
|---------|------|-------|
| Landing + pricing | `/` | Recommended combined page |
| Optional pricing page | `/pricing` | Optional later, not required for launch |
| Branded brochure | `/provider/[slug]` | Canonical brochure page |
| Branded website home | `/provider/[slug]/website` | Canonical full website homepage |
| Branded website contact | `/provider/[slug]/website/contact` | Contact page inside website |
| Branded website intake | `/provider/[slug]/website/intake` | Intake page inside website |
| Branded website resources | `/provider/[slug]/website/resources` | Resources inside website |
| Branded website careers | `/provider/[slug]/website/careers` | Careers inside website |
| Provider contact | `/provider/[slug]/contact` | Canonical provider contact page |
| Provider intake | `/provider/[slug]/intake` | Canonical provider intake page |
| Provider resources | `/provider/[slug]/resources` | Canonical provider resources hub |
| Provider careers | `/provider/[slug]/careers` | Canonical provider careers page |
| Provider job detail | `/provider/[slug]/jobs/[jobSlug]` | Canonical provider-owned job detail |
| Jobs homepage | `/jobs` | Replaces jobs-domain homepage |
| Jobs search | `/jobs/search` | Keep current pattern |
| Jobs by state | `/jobs/[state]` | Keep current pattern |
| Jobs by city | `/jobs/[state]/[city]` | Keep current pattern |
| Jobs by role | `/jobs/role/[position]` | Avoid conflict with state and job detail routes |
| Marketplace job detail | `/jobs/post/[slug]` | Avoid conflict with state and role routes |
| Employers | `/jobs/employers` | Keep |
| Employer detail | `/jobs/employers/[slug]` | Keep |
| Auth | `/auth/*` | Canonical provider auth routes on GoodABA |
| Dashboard | `/dashboard/*` | Canonical provider dashboard and billing routes on GoodABA |

### E. Job page types and indexing rules

The jobs product should explicitly support three page types:

1. **Marketplace job pages**

- Route: `/jobs/post/[slug]`
- Purpose: public GoodABA Jobs listing pages browsable across providers
- SEO: indexable
- Canonical: self-canonical

2. **Provider-branded public job pages**

- Route: `/provider/[slug]/jobs/[jobSlug]`
- Purpose: provider-context job pages linked from the provider careers flow
- SEO: **not indexed separately by default**
- Canonical: canonicalize to `/jobs/post/[slug]` unless there is a clear SEO reason to let a provider-branded page stand alone

3. **Private or limited-access provider job pages**

- Route: implementation-specific if needed
- Purpose: provider-branded job pages not intended for broad public discovery
- SEO: `noindex`
- Canonical: none unless promoted to a public page

### F. Legacy jobs redirects

| Old URL | Redirects To |
|---------|-------------|
| `findabajobs.org/` | `goodaba.com/jobs` |
| `findabajobs.org/*` | `goodaba.com/jobs` or nearest relevant jobs destination | Lightweight redirect strategy is acceptable because legacy usage and SEO are minimal |

### G. Legacy in-app path redirects

| Old URL | Redirects To |
|---------|-------------|
| `/job/[slug]` | `/jobs/post/[slug]` |
| `/[position]-jobs` | `/jobs/role/[position]` |
| `/careers/[slug]` | `/provider/[slug]/careers` |
| `/careers/[slug]/[jobSlug]` | `/provider/[slug]/jobs/[jobSlug]` |

### H. BehaviorWork redirects

| Old URL | Redirects To |
|---------|-------------|
| `behaviorwork.com/` | `goodaba.com/` |
| `behaviorwork.com/pricing` | `goodaba.com/` |
| `behaviorwork.com/dashboard/*` | `goodaba.com/dashboard/*` |
| `behaviorwork.com/auth/*` | `goodaba.com/auth/*` |
| `behaviorwork.com/*` | `goodaba.com/*` |

---

## Code Changes Required

### 1. Domain configuration

Update `src/lib/utils/domains.ts` from three brands to two public brands plus one platform brand model:

- keep `therapy` for `findabatherapy.org`
- replace `parent` with `goodaba`
- remove `behaviorwork.com` as a primary runtime domain
- either remove `jobs` as a standalone domain brand or refactor it into a section under GoodABA

Recommended end state:

- `findabatherapy.org` remains a first-class production domain
- `goodaba.com` becomes the primary app domain for platform + jobs
- `findabajobs.org` is supported only for redirects

### 2. Middleware

Revise `src/middleware.ts` to support:

- `findabatherapy.org` serving therapy public routes
- `goodaba.com` serving jobs + auth + dashboard + platform marketing
- redirecting old `behaviorwork.com` traffic to `goodaba.com`
- redirecting old `findabajobs.org` traffic to GoodABA Jobs
- canonicalizing provider auth, signup, onboarding, dashboard, and billing flows to `goodaba.com`

Do **not** remove all domain-aware routing logic. Some domain-aware behavior is still required because the app will still serve at least two public domains.

### 3. Route restructuring for provider pages and jobs

Do **not** move therapy routes under `/find`.
Do **not** move learn routes from `/learn` to `/resources`.

Move all provider-controlled public pages to GoodABA under a unified provider namespace:

- `goodaba.com/provider/[slug]` for the branded brochure
- `goodaba.com/provider/[slug]/website` for the full branded website
- `goodaba.com/provider/[slug]/website/contact`
- `goodaba.com/provider/[slug]/website/intake`
- `goodaba.com/provider/[slug]/website/resources`
- `goodaba.com/provider/[slug]/website/careers`
- `goodaba.com/provider/[slug]/contact`
- `goodaba.com/provider/[slug]/intake`
- `goodaba.com/provider/[slug]/resources`
- `goodaba.com/provider/[slug]/careers`
- `goodaba.com/provider/[slug]/jobs/[jobSlug]`

Treat these as primary launch surfaces:

- brochure
- contact
- intake
- resources
- careers

Treat the full branded website as optional/secondary for early rollout.

Move the jobs marketplace routes to their GoodABA namespace:

- current jobs homepage stays `/jobs`
- current job search stays `/jobs/search`
- current state and city routes stay under `/jobs/...`
- current position pages should move from `/(jobs)/[position]-jobs` to `/jobs/role/[position]`
- current job detail pages should move from `/job/[slug]` to `/jobs/post/[slug]`

This keeps one provider identity model across both domains, avoids jobs route collisions, and preserves the therapy site SEO structure.

### 4. GoodABA marketing page

Replace the BehaviorWork marketing experience with GoodABA branding:

- `/behaviorwork` content becomes GoodABA marketing content
- recommended canonical location is `goodaba.com/`
- current `findabatherapy.org/get-listed` should become a handoff path, not a primary marketing destination
- all provider CTA entry points should land on `https://www.goodaba.com/`

### 5. Site configuration

Refactor config files to reflect actual site responsibilities:

- `src/config/site.ts` remains for FindABATherapy
- `src/config/jobs.ts` becomes GoodABA Jobs config or is merged into a GoodABA marketing/jobs config
- `src/config/brands.ts` should describe section-level brand tokens, not pretend there are still three separate public companies

### 6. Metadata and SEO

Update metadata by domain responsibility:

- FindABATherapy metadata stays branded as FindABATherapy
- GoodABA marketing pages use GoodABA branding
- GoodABA provider-branded public pages canonicalize to GoodABA URLs
- GoodABA Jobs pages use GoodABA Jobs branding
- provider careers and provider job pages should be reviewed carefully so canonical and OG data align with the new provider URLs
- provider-branded job pages should canonicalize to marketplace job pages by default
- website subpages that substantially duplicate standalone branded pages should canonicalize to the standalone branded pages or be marked `noindex`

### 7. Email templates

Update provider/platform emails to GoodABA:

- support emails for platform flows should become `support@goodaba.com`
- platform sender domain should become `goodaba.com`
- therapy-facing directory emails should be reviewed case by case rather than blindly rebranded

The previous BehaviorWork unified sender approach can be repointed to GoodABA.

### 8. UI copy sweep

Replace BehaviorWork references across:

- auth header
- onboarding
- dashboard
- billing
- pricing
- upgrade modal
- marketing pages
- email wrappers
- docs and env examples

Do **not** blindly replace every `FindABATherapy` reference. Many of those should remain unchanged.

---

## File-Level Impact Areas

### High-priority code areas

- `src/lib/utils/domains.ts`
- `src/middleware.ts`
- `src/config/site.ts`
- `src/config/jobs.ts`
- `src/config/brands.ts`
- `src/app/(site)/get-listed/page.tsx`
- `src/app/(site)/behaviorwork/page.tsx`
- `src/app/(site)/behaviorwork/get-started/page.tsx`
- `src/app/(jobs)/layout.tsx`
- `src/app/(careers)/layout.tsx`
- `src/app/(jobs)/jobs/*`
- `src/app/(jobs)/job/[slug]/page.tsx`
- `src/app/(jobs)/[position]-jobs/page.tsx`
- `src/app/(website)/site/[slug]/*`
- `src/app/(intake)/contact/[slug]/page.tsx`
- `src/app/(intake)/intake/[slug]/client/page.tsx`
- `src/app/(intake)/resources/[slug]/*`
- `src/app/(careers)/careers/[slug]/*`
- `src/app/layout.tsx`
- `src/app/sitemap.ts`
- `src/app/(jobs)/jobs/sitemap.ts`
- `src/app/robots.ts`
- `src/app/api/og/route.tsx`
- `src/lib/email/email-helpers.ts`
- `src/lib/email/notifications.ts`

### UI copy and navigation areas

- `src/components/layout/auth-header.tsx`
- `src/components/layout/site-header.tsx`
- `src/components/layout/site-footer.tsx`
- dashboard sidebars and share cards
- all `behaviorwork-*` marketing components
- onboarding copy referencing BehaviorWork

### Documentation and config

- `README.md`
- `CLAUDE.md`
- `.env.example`
- scripts referencing `behaviorwork.com`

---

## Sitemap Strategy

### FindABATherapy sitemap

Keep the main sitemap focused on therapy content and existing therapy URLs:

- homepage
- search
- provider pages
- state and city pages
- insurance pages
- learn content
- FAQ

Do not include provider-controlled GoodABA pages in the FindABATherapy sitemap.

### GoodABA sitemap

GoodABA sitemap should include:

- homepage
- provider brochure pages
- provider contact pages
- provider intake pages
- provider resources
- provider careers
- jobs marketplace pages

Do not include provider-branded job pages in the sitemap by default.
Do not include website subpages that substantially duplicate standalone branded pages in the sitemap by default.

Jobs subset:

- `/jobs`
- `/jobs/search`
- `/jobs/[state]`
- `/jobs/[state]/[city]`
- `/jobs/role/[position]`
- `/jobs/post/[slug]`
- `/jobs/employers/[slug]`

---

## Infrastructure Changes

### DNS and Vercel

1. Add `goodaba.com` to the project as the new provider-platform domain.
2. Decide canonical host: `www.goodaba.com` or apex `goodaba.com`.
3. Keep `findabatherapy.org` active on the main project.
4. Point `behaviorwork.com` to redirects.
5. Point `findabajobs.org` to redirects.

### Email

1. Verify `goodaba.com` in Resend.
2. Add SPF, DKIM, and DMARC records.
3. Keep the existing sending domain active until GoodABA deliverability is validated.
4. Switch provider/platform mail first.
5. Review therapy-facing emails separately before changing visible branding.

### Analytics

1. Add `goodaba.com` to PostHog allowed origins.
2. Keep `findabatherapy.org` as an active origin.
3. Keep legacy redirect domains in analytics only if needed for transition visibility.

### Search Console

1. Add `goodaba.com` as a property.
2. Keep `findabatherapy.org` as its own active property.
3. Use Change of Address only for:
   - `behaviorwork.com` -> `goodaba.com`
   - `findabajobs.org` -> `goodaba.com`
4. Do **not** use Change of Address for `findabatherapy.org` because it is not moving.

---

## Launch Validation Checklist

Before cutover:

- verify every `Get Listed`, pricing, signup, upgrade, and login CTA on FindABATherapy lands on `https://www.goodaba.com/` or the correct GoodABA auth route
- verify OAuth signup and callback complete on GoodABA
- verify email signup confirmation returns to GoodABA
- verify dashboard access, onboarding, and billing work entirely on GoodABA
- verify Stripe checkout success and cancel flows return to GoodABA
- verify branded brochure routes resolve on GoodABA under `/provider/[slug]`
- verify branded website routes resolve on GoodABA under `/provider/[slug]/website*`
- verify provider public pages resolve on GoodABA under `/provider/[slug]/*`
- verify old provider-owned URLs redirect to the correct new GoodABA provider URLs
- verify old jobs paths redirect to the correct new GoodABA marketplace or provider job URLs
- verify canonical tags and OG metadata point to GoodABA for provider-owned pages
- verify canonical tags remain on FindABATherapy for directory/editorial pages
- verify provider-branded job pages canonicalize correctly to marketplace job pages or are marked `noindex`
- verify website subpages that duplicate standalone branded pages canonicalize correctly or are marked `noindex`
- verify GoodABA sitemap and FindABATherapy sitemap only contain the correct domain-owned URLs
- verify there are no redirect chains on top pages
- verify no auth or billing links still point at `behaviorwork.com`
- verify no provider CTA links still point at `findabatherapy.org/get-listed`
- verify analytics is recording events on both active domains

After cutover:

- manually test top public routes on both domains
- check Search Console for crawl and indexing errors
- check server logs for 404s and auth callback failures
- check Stripe webhook delivery on GoodABA
- run a final grep for stale `behaviorwork.com` references in live code paths

---

## Execution Order

### Phase 0: Preparation

- register and verify `goodaba.com`
- prepare logo, colors, favicon, and brand assets
- verify GoodABA email domain
- add GoodABA Search Console and analytics configuration

### Phase 1: GoodABA brand replacement for platform

- replace BehaviorWork branding with GoodABA across dashboard, auth, billing, onboarding, and marketing components
- update email sender and support references from BehaviorWork to GoodABA where they belong to the platform
- update docs and environment examples

### Phase 2: GoodABA marketing launch

- build the GoodABA landing page on `goodaba.com/`
- include pricing on the homepage unless a separate pricing page is clearly needed
- update provider CTAs on FindABATherapy to point to GoodABA
- convert `/get-listed` on FindABATherapy into a handoff route to `https://www.goodaba.com/`

### Phase 3: Jobs migration

- move jobs branding from FindABAJobs to GoodABA Jobs
- move provider-controlled public pages from FindABATherapy route shapes to GoodABA `/provider/[slug]/*`
- move job detail URLs to `/jobs/post/[slug]`
- move position landing pages to `/jobs/role/[position]`
- update jobs metadata, sitemap, OG tags, and structured data
- set up lightweight redirects from `findabajobs.org`

### Phase 4: Domain and redirect cutover

- cut `goodaba.com` live
- redirect `behaviorwork.com` to `goodaba.com`
- redirect `findabajobs.org` to `goodaba.com/jobs`
- validate auth, billing, and webhook flows on GoodABA

### Phase 5: Cleanup

- remove dead BehaviorWork code
- keep only the domain logic still needed for FindABATherapy + GoodABA
- run final grep for stale brand strings
- monitor crawl errors, rankings, redirect chains, and email deliverability

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Over-disrupting directory SEO | Do not move FindABATherapy routes or content architecture. |
| Route conflicts in jobs migration | Use `/jobs/role/[position]` and `/jobs/post/[slug]`, not ambiguous `/jobs/[slug]`. |
| Mixed brand confusion | Keep FindABATherapy family-first and GoodABA provider-first. |
| Broken provider CTA journey | Use `https://www.goodaba.com/` as the one canonical provider CTA destination and audit every entry point. |
| Provider public page sprawl | Move provider-owned public pages to `/provider/[slug]/*` on GoodABA now instead of carrying old mixed route shapes forward. |
| Email confusion | Rebrand provider/platform mail first; review therapy emails separately. |
| Middleware regressions | Keep domain-aware logic where still required instead of over-simplifying. |

---

## Out of Scope

- legal entity rename
- trademark work
- social media handle acquisition
- major redesign of FindABATherapy public information architecture
- migration of therapy SEO URLs to GoodABA

---

## Decision Summary

This plan assumes the following final decisions:

- **FindABATherapy remains the family-facing directory brand and domain**
- **GoodABA replaces BehaviorWork as the provider-facing platform brand**
- **Jobs moves under GoodABA as GoodABA Jobs**
- **All provider-controlled public pages move to `goodaba.com/provider/[slug]/*`**
- **FindABATherapy provider CTAs hand off to `https://www.goodaba.com/`**
- **GoodABA homepage should combine landing + pricing unless a later growth need requires separation**
