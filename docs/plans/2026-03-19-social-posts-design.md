# GoodABA Social Posts — Design Document

## Summary

Curated library of ~50 pre-made, branded social post templates for ABA providers. Available at `/dashboard/social` for Pro subscribers only. Each template is a 1080x1080 branded PNG + body text. Users click to copy image, click to copy caption, paste to social media.

## Rendering Approach

**Satori + sharp** — JSX → SVG → PNG, server-side in Next.js API route.

All ~50 branded PNGs are **pre-generated async** on first visit to `/dashboard/social` (or when brand data changes). Stored in Supabase Storage bucket `social-posts`. Page loads with all images immediately available as static URLs.

## Brand Data Sources

| Data | Source | Field |
|------|--------|-------|
| Agency name | `profiles` | `agency_name` |
| Logo | `listings` | `logo_url` (Supabase Storage) |
| Brand color | `profiles` | `intake_form_settings->background_color` (default `#5788FF`) |

## Template Catalog

Hardcoded TypeScript file — no database table. ~50 templates across categories:

| Category | Description | ~Count |
|----------|-------------|--------|
| `aba_observance` | BCBA Appreciation Day, RBT Day, etc. | 8 |
| `autism_observance` | Autism Acceptance Month, World Autism Day | 6 |
| `national_holiday` | MLK Day, Memorial Day, July 4th, etc. | 10 |
| `seasonal` | Back to school, summer, new year, etc. | 6 |
| `aba_tip` | Evergreen ABA education tips | 10 |
| `quote` | Motivational/community quotes | 6 |
| `announcement` | Hiring, accepting clients, new location | 4 |

Each template:
```typescript
{
  id: string;           // "autism-acceptance-month"
  title: string;        // "Autism Acceptance Month"
  caption: string;      // Full body text
  hashtags: string;     // "#AutismAcceptance #ABA"
  category: Category;
  layoutId: LayoutId;   // Which visual layout
  layoutProps: {};      // Title, subtitle, icon for the layout
  eventDate: string | null; // "04-02" MM-DD for dated, null for evergreen
}
```

## Visual Layouts (5-6)

Each layout is a React component rendered by Satori:

1. **bold-quote** — Large text centered, brand color background, logo + name bottom
2. **event-banner** — Event name prominent, date below, decorative border, logo bottom
3. **tip-card** — "ABA Tip" header badge, tip text body, brand color accent, logo bottom-right
4. **split-block** — Left half brand color with text, right half white with logo + name
5. **announcement** — Bold headline, supporting text, brand color BG, logo centered
6. **minimal** — White background, text centered, thin brand color border, logo bottom

All layouts: 1080x1080, agency name visible, logo visible, brand color applied.

## Pre-Generation Flow

1. User visits `/dashboard/social` for the first time (or brand data changed)
2. Server checks Supabase Storage for existing assets at `social-posts/{profileId}/`
3. If missing or stale → trigger async generation via API route
4. API route renders all ~50 templates with Satori + sharp
5. Uploads PNGs to `social-posts/{profileId}/{templateId}.png`
6. Stores generation metadata (brand hash) to detect when re-generation needed
7. Page shows loading state during generation, then refreshes

**Cache invalidation:** Hash `agency_name + logo_url + background_color`. If hash changes on page load, trigger re-generation.

## Dashboard Page

**Route:** `/dashboard/social`

**Two tabs:**
- **Upcoming** (default) — Dated templates sorted by next occurrence, shown ~21 days before event
- **Library** — All templates, filterable by category chips

**Each template card:**
- Branded preview image (from Supabase Storage URL)
- Title + category badge + event date (if applicable)
- "Copy Image" button → fetches PNG blob, writes to clipboard
- "Copy Caption" button → copies caption + hashtags to clipboard

**States:**
- No brand setup → empty state linking to branding page
- Generation in progress → skeleton loading cards with progress
- Ready → full grid of cards

## Plan Gating

- Add `hasSocialPosts: true` to Pro features, `false` to Free
- Add `guardSocialPosts()` to guards
- Free users see `PreviewBanner` + `PreviewOverlay` upgrade prompt
- Add nav item to Company section in `nav-config.ts` with `proBadge: true`

## Supabase Storage

New bucket: `social-posts`
- Public read access (for image URLs)
- Authenticated write (API route uses service role)
- Path: `social-posts/{profileId}/{templateId}.png`

## Content Guidelines

All template copy follows:
- No clinical guarantees or outcome promises
- No "cure" or "best" language
- No stigmatizing autism language
- Educational, supportive, community-oriented tone
- Lightly promotional at most

## Not In V1

- No text editing or customization
- No auto-posting or social connections
- No scheduling or post tracking
- No story/vertical format
- No religious holiday category
- No AI generation
