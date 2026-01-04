# Provider Tooling System - Comprehensive Implementation Plan

## Executive Summary

This document provides a detailed, phased implementation plan for building the complete Provider Tooling System for "Find ABA Therapy". The plan covers 9 phases from authentication foundation through analytics integration, organized in dependency order for reliable execution.

---

## Current State Analysis

### What's Built
- **UI Mockups**: Dashboard layout, get-listed pricing page, auth page shells
- **Database Schema**: Complete schema in `supabase/schema.sql` (profiles, listings, locations, media_assets, attributes, etc.)
- **Integrations Configured**: Supabase clients, Stripe SDK, environment validation
- **Plan Structure**: Free ($0), Pro ($49/mo), Enterprise ($149/mo), Featured (add-on for Pro/Enterprise only)

### What's Missing
- Authentication flows and session management
- Provider onboarding wizard
- Listing CRUD operations and form handlers
- Stripe checkout, webhooks, subscription lifecycle
- Media uploads to Supabase Storage
- Contact form system with email notifications
- Feature gating by plan tier
- Search integration with database
- Analytics and audit logging

---

## Phase 1: Foundation (Authentication & Middleware) ✅ COMPLETED

### Goal
Establish authentication infrastructure using Supabase Auth with email/password and OAuth. Implement route protection middleware and session management.

### Files Created ✅

| File | Purpose |
|------|---------|
| `src/lib/supabase/server.ts` | Server-side Supabase client with proper async cookie handling |
| `src/lib/supabase/client.ts` | Browser-side Supabase client |
| `src/lib/supabase/middleware.ts` | Middleware helper for session refresh |
| `src/middleware.ts` | Next.js middleware for route protection + dev bypass |
| `src/lib/auth/actions.ts` | Server Actions: signInWithEmail, signUpWithEmail, signInWithOAuth, signOut, resetPassword |
| `src/app/auth/callback/route.ts` | OAuth callback handler (creates profile, stores plan) |
| `src/app/auth/confirm/route.ts` | Email confirmation handler |
| `src/app/(site)/auth/dev-login/page.tsx` | Dev-only bypass for local testing |

### Files Modified ✅

| File | Changes |
|------|---------|
| `src/app/(site)/auth/sign-in/page.tsx` | Wired up form to signIn action, added OAuth buttons (Google + Microsoft) |
| `src/app/(site)/auth/sign-up/page.tsx` | Wired up form, handles plan query param, passes plan to actions |
| `src/components/providers.tsx` | Added QueryClientProvider |

### Key Implementation Details
- Uses `@supabase/ssr` for cookie-based auth in Next.js 14
- PKCE flow for OAuth providers (Google + Microsoft)
- Profile row created on first sign-in via auth callback
- **Plan stored in database during sign-up** (not localStorage)
- Middleware protects `/dashboard/*` and redirects to `/auth/sign-in`
- Dev bypass via cookie for local testing without real Supabase auth

### OAuth Providers Enabled
1. **Email/Password** - Primary authentication method
2. **Google OAuth** - For providers with Google Workspace
3. **Microsoft OAuth (Azure)** - For providers with Microsoft 365

### Dependencies
None (foundation phase)

---

## Phase 2: Provider Onboarding ✅ COMPLETED

### Goal
Multi-step wizard to collect agency information, create profile and listing records, and initiate checkout for paid plans after onboarding completion.

### User Flow & Payment Timing (Industry Best Practice)

```
1. User visits /get-listed (pricing page)
2. User clicks "Get Started" on a plan (Free, Pro $49/mo, or Enterprise $149/mo)
3. User is redirected to /auth/sign-up?plan=pro (plan stored in URL)
4. User signs up (email/password or OAuth)
   - Plan tier is stored in `profiles.plan_tier` in database
   - User is redirected to /dashboard/onboarding
5. User completes 5-step onboarding wizard:
   - Basics (agency name, contact info)
   - Details (headline, description, service modes)
   - Location (address, city, state, service radius)
   - Services (insurance, ages, languages, specialties)
   - Review (summary of all information)
6. On "Publish" click:
   - Free plan: Listing goes live immediately
   - Paid plan: User is redirected to Stripe Checkout
7. After successful payment:
   - Webhook confirms subscription
   - Listing is published
   - User sees dashboard with active listing
```

**Why payment happens at the end:**
- Users complete full onboarding before paying → higher conversion
- Users see the value they're getting before committing
- Reduces friction in the signup flow
- Follows SaaS industry best practice (Stripe, Linear, Notion all do this)

### Files Created ✅

| File | Purpose |
|------|---------|
| `src/lib/validations/onboarding.ts` | Zod schemas for each onboarding step |
| `src/lib/actions/onboarding.ts` | Server Actions: saveBasics, saveDetails, saveLocation, saveServices, getOnboardingData, completeOnboarding |
| `src/app/(dashboard)/dashboard/onboarding/layout.tsx` | Simplified onboarding layout with progress header |
| `src/app/(dashboard)/dashboard/onboarding/page.tsx` | Redirects to /basics (plan already selected on pricing page) |
| `src/app/(dashboard)/dashboard/onboarding/basics/page.tsx` | Step 1: Company Basics |
| `src/app/(dashboard)/dashboard/onboarding/details/page.tsx` | Step 2: Company Details |
| `src/app/(dashboard)/dashboard/onboarding/location/page.tsx` | Step 3: Primary Location (address + service radius) |
| `src/app/(dashboard)/dashboard/onboarding/services/page.tsx` | Step 4: Services & Attributes |
| `src/app/(dashboard)/dashboard/onboarding/review/page.tsx` | Step 5: Review & Publish |
| `src/components/onboarding/onboarding-progress.tsx` | Progress indicator component |

### Onboarding Steps (5 steps, no plan selection)

1. **Basics** - Agency name, contact email (pre-filled from auth)
2. **Details** - Headline, description, service modes (in-clinic, in-home, telehealth, school-based)
3. **Location** - State, city, street, ZIP, service radius (5-100 miles)
4. **Services** - Insurance accepted, ages served, languages, diagnoses, clinical specialties
5. **Review** - Summary of all info with edit links, Publish/Save Draft buttons

### Plan Storage Flow

**Email Sign-up:**
1. User fills sign-up form
2. `selectedPlan` from URL is added to form data
3. `signUpWithEmail` action stores plan in:
   - `profiles.plan_tier` column
   - `user_metadata.selected_plan` (for email confirmation flow)

**OAuth Sign-up (Google/Microsoft):**
1. `signInWithOAuth("google", selectedPlan)` is called
2. Plan is passed via redirect URL: `/auth/callback?plan=pro`
3. OAuth callback reads plan from URL params
4. Plan is stored in `profiles.plan_tier` on profile creation

**Review Page:**
- Reads plan from `data.profile.planTier` (database)
- Shows "Publish Listing" for free plans
- Shows "Publish & Checkout" for paid plans
- `completeOnboarding(true)` returns redirect URL to Stripe Checkout for paid plans

### Dependencies
Phase 1 (Authentication) ✅

---

## Phase 3: Dashboard & Listing Management ✅ COMPLETED

### Goal
CRUD operations for listings, locations, and attributes. Form handlers for editing published listings. Status management (draft/published/suspended).

### Files Created ✅

| File | Purpose |
|------|---------|
| `src/lib/actions/listings.ts` | Server Actions: getListing, updateListing, updateListingStatus, publishListing, unpublishListing, getListingBySlug |
| `src/lib/actions/locations.ts` | Server Actions: getLocations, addLocation, updateLocation, deleteLocation, setPrimaryLocation, getLocationLimit |
| `src/lib/actions/attributes.ts` | Server Actions: getAttributes, setAttributes, setAttribute, clearAttributes, clearAllAttributes |
| `src/components/dashboard/listing-form.tsx` | Main listing edit form with react-hook-form |
| `src/components/dashboard/locations-manager.tsx` | Locations CRUD with plan-based limits |
| `src/components/dashboard/listing-status-card.tsx` | Publish/Unpublish UI with status display |
| `src/lib/constants/states.ts` | US states constant for location forms |

### Files Modified ✅

| File | Changes |
|------|---------|
| `src/app/(dashboard)/dashboard/listing/page.tsx` | Fetches real data, shows listing form, locations manager, status controls |
| `src/app/(dashboard)/dashboard/page.tsx` | Shows real profile/listing data, completion progress, quick actions |

### Key Features Implemented
- Location limits enforced by plan tier (Free: 1, Pro: 5, Enterprise: unlimited)
- Server-side validation of all operations
- Publish/unpublish functionality with confirmation dialogs
- Real-time status display with visual indicators
- Completion progress tracking on dashboard

### Dependencies
Phase 1 ✅, Phase 2 ✅

---

## Phase 4: Stripe Integration ✅ COMPLETED

### Goal
Product/price configuration, checkout session creation, webhook handling, subscription lifecycle management, and billing portal integration.

### Connection to Onboarding Flow

```
Onboarding Review Page → "Publish & Checkout" button
           ↓
completeOnboarding(true) server action
           ↓
Returns { redirectTo: "/dashboard/billing/checkout?plan=pro" }
           ↓
Checkout page creates Stripe Checkout Session
           ↓
User completes payment on Stripe
           ↓
Stripe webhook: checkout.session.completed
           ↓
Webhook handler:
  - Updates profiles.stripe_customer_id
  - Updates profiles.stripe_subscription_id
  - Sets listings.status = 'published'
           ↓
User redirected to /dashboard/billing/success
           ↓
Success page shows confirmation, link to dashboard
```

### Files Created ✅

| File | Purpose |
|------|---------|
| `src/lib/stripe/config.ts` | Product/price configuration constants |
| `src/lib/stripe/actions.ts` | Server Actions: createCheckoutSession, createBillingPortalSession, getSubscription, redirectToBillingPortal |
| `src/app/api/stripe/webhooks/route.ts` | Webhook handler for subscription events |
| `src/app/(dashboard)/dashboard/billing/checkout/page.tsx` | Creates checkout session and redirects to Stripe |
| `src/app/(dashboard)/dashboard/billing/success/page.tsx` | Post-checkout success page |
| `src/app/(dashboard)/dashboard/billing/cancel/page.tsx` | Checkout cancelled page |

### Files Modified ✅

| File | Changes |
|------|---------|
| `src/app/(dashboard)/dashboard/billing/page.tsx` | Real subscription data, upgrade/manage buttons, billing portal link |
| `src/lib/actions/onboarding.ts` | Updated completeOnboarding to return checkout redirect for paid plans |

### Webhook Events Handled ✅
- `checkout.session.completed`: Update profile with Stripe IDs, publish listing, log audit event
- `customer.subscription.updated`: Handle plan changes (upgrade/downgrade), update listing tier
- `customer.subscription.deleted`: Downgrade to free, log audit event
- `invoice.paid`: Log successful payment audit event
- `invoice.payment_failed`: Log failed payment audit event

### Stripe Dashboard Setup Required
1. Create Products: Pro ($49/mo), Enterprise ($149/mo), Featured Add-on ($99/mo)
2. Configure webhook endpoint: `https://yourdomain.com/api/stripe/webhooks`
3. Enable Customer Portal in Stripe Dashboard
4. Set up test mode for development

### Key Implementation Details
- Use Stripe metadata to store `profile_id` and `listing_id` for webhook correlation
- Create Stripe customer on first checkout, not signup
- Store `stripe_customer_id` and `stripe_subscription_id` in profiles table
- Billing page shows real subscription status, renewal date, plan features
- Featured Add-on marked as "Coming Soon" for future implementation

### Dependencies
Phase 1 ✅, Phase 2 ✅

---

## Phase 5: Media & Storage ✅ COMPLETED

### Goal
Image uploads for logos and photo galleries, video URL embedding, Supabase Storage integration with proper access policies.

### Files Created ✅

| File | Purpose |
|------|---------|
| `src/lib/storage/config.ts` | Storage bucket names, allowed types, size limits, video URL parsing |
| `src/lib/storage/actions.ts` | Server Actions: uploadLogo, deleteLogo, getPhotos, uploadPhoto, deletePhoto, reorderPhotos, updateVideoUrl, getVideoUrl |
| `src/components/dashboard/logo-uploader.tsx` | Logo upload with preview and delete |
| `src/components/dashboard/photo-gallery-manager.tsx` | Photo CRUD with drag-to-reorder, plan limits |
| `src/components/dashboard/video-embed-form.tsx` | YouTube/Vimeo URL input with preview |

### Files Modified ✅

| File | Changes |
|------|---------|
| `src/lib/actions/listings.ts` | Added logoUrl and videoUrl to ListingData interface and queries |
| `src/app/(dashboard)/dashboard/listing/page.tsx` | Added media section with logo, photo gallery, and video components |
| `src/app/(site)/provider/[slug]/page.tsx` | Rewrote to use real listing data, display logo, gallery, and video for premium listings |

### Key Features Implemented
- Logo upload/delete with 2MB limit
- Photo gallery with drag-to-reorder, 5MB per photo limit, plan-based limits (0/10/10)
- Video embed for YouTube and Vimeo with URL parsing and preview
- Premium-only gating for photo gallery and video embed
- Server-side validation for file types and sizes

### Supabase Storage Setup Required
- Create buckets: `listing-logos`, `listing-photos`
- Configure public read access
- RLS policies for owner-only uploads

### Dependencies
Phase 1 ✅, Phase 3 ✅

---

## Phase 6: Contact & Notifications ⬅️ NEXT

### Goal
Family inquiry contact forms, email notification system, inquiry tracking and dashboard display.

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/validations/contact.ts` | Contact form Zod schema |
| `src/lib/email/config.ts` | Email provider configuration (Resend recommended) |
| `src/lib/email/templates/inquiry-notification.tsx` | React Email template for provider notification |
| `src/lib/email/templates/inquiry-confirmation.tsx` | React Email template for family confirmation |
| `src/lib/email/send.ts` | Email sending utilities |
| `src/lib/actions/inquiries.ts` | Server Actions: submitInquiry, getInquiries, markRead, archive |
| `src/app/api/inquiries/route.ts` | Inquiry submission endpoint |
| `src/components/provider/contact-form.tsx` | Family-facing contact form |
| `src/components/dashboard/inquiries-list.tsx` | Provider inquiry inbox |
| `src/components/dashboard/inquiry-detail.tsx` | Single inquiry view |
| `src/app/(dashboard)/dashboard/inquiries/page.tsx` | Inquiries dashboard page |

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/(site)/provider/[slug]/page.tsx` | Add contact form for premium listings |
| `src/components/dashboard/dashboard-sidebar.tsx` | Add Inquiries nav with unread badge |

### Database Schema Addition
```sql
CREATE TABLE public.inquiries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  family_name text NOT NULL,
  family_email text NOT NULL,
  family_phone text,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Key Implementation Details
- Use Resend for transactional emails
- Rate limiting: 1 inquiry per IP per minute
- Premium-only: Contact form on provider page
- Free tier: Show phone/email only, no contact form
- Add honeypot field for spam protection

### Dependencies
Phase 1, Phase 3, Phase 7

---

## Phase 7: Plan Features & Gating

### Goal
Feature flags based on plan tier, UI restrictions, upgrade prompts, and server-side enforcement.

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/plans/features.ts` | Feature definitions by plan tier |
| `src/lib/plans/guards.ts` | Feature access guard functions |
| `src/hooks/use-plan-features.ts` | Client-side feature access hook |
| `src/components/ui/feature-gate.tsx` | Feature gating wrapper component |
| `src/components/ui/upgrade-prompt.tsx` | Contextual upgrade CTA |
| `src/components/ui/locked-feature.tsx` | Locked feature overlay |
| `src/components/billing/upgrade-modal.tsx` | Upgrade flow modal |

### Plan Feature Matrix

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Max Locations | 1 | 5 | Unlimited |
| Contact Form | No | Yes | Yes |
| Photo Gallery | No | Yes (10) | Yes (10) |
| Video Embed | No | Yes | Yes |
| Verified Badge | No | Yes | Yes |
| Search Priority | Standard | Priority | Priority |
| Analytics | No | Yes | Yes |
| Homepage Placement | No | No | Yes |
| Featured Add-on Eligible | No | Yes | Yes |

### Featured Add-on (Pro/Enterprise Only)
- **Price**: $99/month (add-on to existing subscription)
- **Requires**: Active Pro or Enterprise subscription
- **Benefits**:
  - Pinned to top of state search results
  - Sponsored banner placements
  - "Featured" badge on listing
  - Monthly performance snapshots

### Files to Modify
- Multiple dashboard components: Add feature gates
- `src/app/(site)/provider/[slug]/page.tsx`: Conditional rendering by plan
- All server actions: Add plan validation

### Key Implementation Details
- Always validate plan restrictions server-side
- Use `<FeatureGate>` component for consistent UI patterns
- Show contextual upgrade prompts (not just blocking)
- Handle plan downgrades gracefully (keep data, hide features)

### Dependencies
Phase 1, Phase 4

---

## Phase 8: Search Integration & Geocoding

### Goal
Connect search UI to database, implement filtering, sorting, pagination, and **proximity-based search** using geocoding for both visitor location input and provider service areas.

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/queries/search.ts` | Search query functions with filters and geo-distance |
| `src/lib/actions/search.ts` | Search server action |
| `src/app/api/search/route.ts` | Search API endpoint (optional) |
| `src/lib/search/filters.ts` | Filter parsing and URL serialization |
| `src/lib/geo/geocode.ts` | Geocoding utilities (city/ZIP to lat/lng) |
| `src/lib/geo/distance.ts` | Haversine distance calculation |
| `src/lib/geo/config.ts` | Geocoding API configuration |
| `src/components/search/search-filters.tsx` | Filter sidebar component |
| `src/components/search/search-results.tsx` | Results list with sort |
| `src/components/search/search-pagination.tsx` | Pagination component |
| `src/components/search/sort-toggle.tsx` | Sort controls |
| `src/components/search/location-input.tsx` | City/ZIP autocomplete input |
| `src/components/dashboard/service-area-input.tsx` | Service radius selector for providers |

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/(site)/search/page.tsx` | Replace mock data with real queries, add filters/pagination |
| `src/components/home/home-search-card.tsx` | Wire up to search route |
| `src/app/(site)/[state]/page.tsx` | Fetch listings filtered by state |

### Database Operations
- Trigger to refresh `listing_search_index` on listing changes
- Search function with full-text search, filtering, and plan-based ordering

### Geocoding & Proximity Search

#### Visitor Location Flow
1. Visitor enters city name or ZIP code in search
2. System geocodes input to lat/lng coordinates
3. Search queries providers whose service area includes visitor location
4. Results sorted by distance from visitor

#### Provider Service Area Flow
1. Provider enters location address during onboarding
2. System geocodes address to lat/lng (stored in `locations` table)
3. Provider sets service radius (5, 10, 25, 50, 100 miles)
4. Service area = location point + radius

#### Database Support
```sql
-- Add PostGIS extension for geo queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column for efficient geo queries
ALTER TABLE locations ADD COLUMN geo_point geography(Point, 4326);

-- Create index for geo queries
CREATE INDEX locations_geo_idx ON locations USING GIST (geo_point);

-- Update geo_point from lat/lng
UPDATE locations SET geo_point = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Trigger to auto-update geo_point
CREATE OR REPLACE FUNCTION update_geo_point()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geo_point := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_geo_point
BEFORE INSERT OR UPDATE ON locations
FOR EACH ROW
EXECUTE FUNCTION update_geo_point();

-- Search function with proximity
CREATE OR REPLACE FUNCTION search_providers_near(
  search_lat numeric,
  search_lng numeric,
  max_distance_miles int DEFAULT 50
)
RETURNS TABLE (listing_id uuid, distance_miles numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.listing_id,
    (ST_Distance(l.geo_point, ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography) / 1609.34)::numeric as distance_miles
  FROM locations l
  WHERE ST_DWithin(
    l.geo_point,
    ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
    max_distance_miles * 1609.34  -- Convert miles to meters
  )
  AND (l.service_radius_miles IS NULL OR
       ST_Distance(l.geo_point, ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography) / 1609.34 <= l.service_radius_miles)
  ORDER BY distance_miles;
END;
$$ LANGUAGE plpgsql;
```

#### Geocoding API Options
- **Recommended**: Google Maps Geocoding API (most accurate, $5/1000 requests)
- **Alternative**: Mapbox Geocoding API (good accuracy, $5/1000 requests)
- **Budget**: OpenCage or Nominatim (free tier available)

### Key Implementation Details
- Use URL params for all search state (shareable URLs)
- Implement debounced search input
- Featured listings always appear first, then Pro/Enterprise, then Free
- Cache geocoding results to reduce API costs
- Refresh materialized view asynchronously
- Show distance in search results when visitor location provided

### Dependencies
Phase 3

---

## Phase 9: Analytics & Audit

### Goal
Track listing views, search appearances, inquiry conversions. Provide analytics dashboard. Implement audit logging.

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/analytics/events.ts` | Event type definitions |
| `src/lib/analytics/track.ts` | Event tracking functions |
| `src/lib/actions/analytics.ts` | Analytics server actions |
| `src/app/api/analytics/track/route.ts` | Client-side event endpoint |
| `src/lib/queries/analytics.ts` | Analytics aggregation queries |
| `src/components/dashboard/analytics-overview.tsx` | Overview metrics cards |
| `src/components/dashboard/analytics-chart.tsx` | Views over time chart |
| `src/components/dashboard/traffic-sources.tsx` | Traffic breakdown |
| `src/hooks/use-track-view.ts` | View tracking hook |

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/(site)/provider/[slug]/page.tsx` | Add view tracking |
| `src/app/(site)/search/page.tsx` | Track search impressions and clicks |
| `src/app/(dashboard)/dashboard/page.tsx` | Display real metrics |

### Events to Track
- `listing_view`: Provider page views
- `search_impression`: Listing appeared in search results
- `search_click`: User clicked listing from search
- `inquiry_submitted`: Contact form submission
- `contact_click`: Phone/email click

### Key Implementation Details
- Use `audit_events` table for all tracking
- Session-based deduplication for views
- Analytics dashboard only for Premium+ plans
- Daily rollup aggregation for performance
- 90-day retention policy for raw events

### Dependencies
Phase 1, Phase 3, Phase 7

---

## Implementation Order & Dependencies

```
Week 1: Phase 1 (Foundation)
   └── Auth, middleware, protected routes

Week 2: Phase 2 (Onboarding) + Phase 3 (Dashboard)
   ├── Multi-step wizard
   └── Listing CRUD, locations, attributes

Week 3: Phase 4 (Stripe) + Phase 7 (Plan Features)
   ├── Checkout, webhooks, portal
   └── Feature gates, upgrade prompts

Week 4: Phase 5 (Media) + Phase 6 (Contact)
   ├── Logo/photo uploads
   └── Contact form, email notifications

Week 5: Phase 8 (Search & Geocoding)
   └── Search queries, filtering, proximity search, pagination

Week 6: Phase 9 (Analytics)
   └── Event tracking, metrics dashboard
```

---

## Deferred Features (Future Phases)

The following features are intentionally deferred to keep the initial build focused:

1. **Team/Multi-User Access** - Team member invitations, role-based permissions
2. **Annual Billing** - Yearly subscription options with discount
3. **Advanced Analytics** - Detailed funnel analysis, A/B testing
4. **API Access** - Public API for providers to integrate with their systems
5. **Mobile App** - Native mobile experience for providers

---

## Critical Files Reference

| File | Importance |
|------|------------|
| `src/middleware.ts` | Route protection - blocks all unauthorized access |
| `src/lib/supabase/server.ts` | Server-side client - used in all server actions |
| `src/lib/actions/listings.ts` | Core CRUD - central to dashboard functionality |
| `src/app/api/stripe/webhooks/route.ts` | Subscription management - billing depends on this |
| `src/lib/plans/features.ts` | Feature definitions - controls all feature gating |

---

## Environment Variables Required

```env
# Existing
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# New - Stripe Products
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx
STRIPE_FEATURED_ADDON_PRICE_ID=price_xxx

# New - Email
RESEND_API_KEY=re_xxx

# New - Geocoding
GOOGLE_MAPS_API_KEY=xxx  # or MAPBOX_ACCESS_TOKEN

# New - Site
NEXT_PUBLIC_SITE_URL=https://findabatherapy.org
```

---

## Database Migrations Required

1. **Rename plan_tier enum values** (Phase 0 - Pre-work)
   ```sql
   -- Rename enum values to match public naming
   ALTER TYPE plan_tier RENAME VALUE 'premium' TO 'pro';
   ALTER TYPE plan_tier RENAME VALUE 'featured' TO 'enterprise';
   -- Add new 'featured' as boolean flag or separate table for add-on tracking
   ALTER TABLE profiles ADD COLUMN has_featured_addon boolean NOT NULL DEFAULT false;
   ALTER TABLE profiles ADD COLUMN featured_addon_subscription_id text;
   ```
2. **Add `inquiries` table** (Phase 6)
3. **Add slug generation function and trigger** (Phase 2)
4. **Add location limit enforcement trigger** (Phase 3)
5. **Add search index refresh trigger** (Phase 8)
6. **Add analytics aggregation function** (Phase 9)
7. **Add service_radius to locations table** (Phase 2)
   ```sql
   ALTER TABLE locations ADD COLUMN service_radius_miles integer DEFAULT 25;
   ```

---

## Third-Party Setup Required

1. **Supabase**:
   - Enable Auth providers: Email/Password, Google, Microsoft
   - Enable PostGIS extension for geo queries
   - Create storage buckets: `listing-logos`, `listing-photos`
   - Configure RLS policies for storage

2. **Stripe**:
   - Create Products: Pro ($49/mo), Enterprise ($149/mo), Featured Add-on ($99/mo)
   - Configure webhook endpoint: `https://yourdomain.com/api/stripe/webhooks`
   - Enable Customer Portal
   - Set up subscription proration for upgrades/downgrades

3. **Resend**:
   - Create account and verify sending domain
   - Configure API key

4. **Google Maps** (or Mapbox):
   - Enable Geocoding API
   - Enable Places API (for autocomplete)
   - Set up API key with appropriate restrictions

5. **Vercel** (if deploying there):
   - Configure environment variables
   - Set up webhook URLs for Stripe
