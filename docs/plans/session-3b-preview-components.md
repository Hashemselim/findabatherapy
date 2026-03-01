# Session 3b: Preview Banner & Overlay Components

## Why This Exists
Every dashboard page for free users will show demo data with visual indicators that it's a preview. We need three reusable components: (1) a preview banner above page content with a "Go Live" CTA, (2) a preview overlay that wraps tables/lists to show them as non-interactive with an "Example data" badge, and (3) an empty state CTA card for Pro users who just upgraded and have no real data yet. These are the building blocks Session 4 will use on every dashboard page.

## How to Work

**Only two files need reading before you start:**
1. `src/components/billing/upgrade-modal.tsx` — find `useUpgradeModal()` hook. Note its exact interface. Your banner's "Go Live" button calls this hook.
2. `src/contexts/auth-context.tsx` — `useAuth()` hook for accessing `profile.plan_tier` in client components.

Then create the 3 components below. Do them sequentially — don't read other files unless you hit an import you need to check.

## Context
ABA therapy SaaS (Next.js 15 + Tailwind + shadcn/ui). Uses `cn()` from `@/lib/utils`. Uses shadcn `Button`, `Badge` components. Plan tiers: `"free" | "pro"`. Pro = $79/mo or $47/mo annual.

## What To Create

### 1. `src/components/ui/preview-banner.tsx`

Client component with two variants:

**Inline variant** (dashboard pages):
- Full-width amber/yellow rounded bar with border
- "PREVIEW" badge on left + contextual message text
- "Go Live — $79/mo" CTA button on right → opens upgrade modal
- Sits above page content with margin below

**Public variant** (branded forms/pages free users preview):
- Full-width amber bar at top of page (no border-radius)
- Eye icon + message + CTA button

Props: `message` (string), `variant` ("inline" | "public"), `className`, `ctaText` (defaults to "Go Live — $79/mo"), `triggerFeature` (string for tracking which CTA was clicked).

**Also export `LockedButton`** from same file — a disabled-looking button with Lock icon that opens upgrade modal on click. Replaces real action buttons (Add Client, Send Email, etc.) in preview mode.

Props: `label` (string), `className`.

### 2. `src/components/ui/preview-overlay.tsx`

Client component wrapper for tables/content in preview mode.

When `isPreview=true`:
- Wraps children in relative container
- "Example data" badge in top-right corner
- Children become non-interactive (`pointer-events-none`, `select-none`, reduced opacity)

When `isPreview=false`: passthrough — renders children as-is.

Props: `children`, `isPreview` (boolean), `showLabel` (boolean, default true), `label` (string, default "Example data"), `className`.

### 3. `src/components/ui/empty-state-cta.tsx`

Reusable empty state card for Pro users with no data yet.

Design: centered content, dashed border, muted background. Rounded icon container at top. Title + description. Optional CTA button (link or onClick).

Props: `icon` (LucideIcon), `title`, `description`, `action?` ({ label, href?, onClick? }), `className`.

Can be a server component since CTA can use Next.js Link.

## Verification

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "e2e/"
npm run lint 2>&1 | tail -20
```

Commit: "feat: add preview banner, overlay, and empty state CTA components"
