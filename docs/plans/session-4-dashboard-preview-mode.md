# Session 4: Dashboard Pages — Preview Mode Conversion

## Why This Exists
The old model hid features behind lock screens for free users. The NEW model gives free users a **permanent interactive preview** — every dashboard page populated with realistic demo data and an amber "Go Live" banner. The goal: let them fall in love with the product before paying. Pro ($79/mo) removes demo data and activates real functionality.

## How to Work

**Do NOT read all files upfront.** Work through pages one at a time:

1. First, read just two files to understand the building blocks:
   - `src/lib/demo/data.ts` — scan the DEMO_* export names and their shapes
   - `src/components/ui/preview-banner.tsx` — note its props

2. Then list the dashboard page directories:
```bash
ls src/app/\(dashboard\)/dashboard/
```

3. For each page below: read it, understand its data fetching, add preview mode, move to the next. One page at a time.

## Context
ABA therapy SaaS (Next.js 15 App Router + Supabase + Tailwind + shadcn/ui).

**Key pattern:** Dashboard pages are React Server Components that call server actions for data. For free users, substitute demo data using the server-side preview helper from `src/lib/demo/preview-helpers.ts`.

**Plan tier access:**
- Server components: `getCurrentPlanTier()` from `src/lib/plans/guards.ts`
- Client components: `useAuth()` from `src/contexts/auth-context.tsx` → `profile.plan_tier`

## What To Do

For each page:
1. Read the page file to understand its data fetching
2. Check the user's plan tier (already available from existing data fetching)
3. If free → substitute corresponding demo data
4. Add a preview banner at top with contextual message
5. Wrap data displays with preview overlay (`src/components/ui/preview-overlay.tsx`)
6. Replace action buttons (Add, Send, etc.) with LockedButton for free users

### Pages to convert (work through sequentially):

| Page | Demo Data to use | Preview Banner Message |
|------|-----------|----------------------|
| Pipeline | pipeline stats | "This is a preview of your client pipeline. Go Live to manage real clients." |
| Clients | clients | "This is a preview of your client list with example data. Go Live to manage real clients." |
| Leads | leads | "These are example lead submissions. Go Live to start receiving real inquiries from your forms." |
| Tasks | tasks | "This is a preview of task management with example tasks. Go Live to track real tasks and deadlines." |
| Communications | communications | "This is a preview of client communications. Go Live to send real emails and track history." |
| Analytics | analytics (pre-existing) | "This is a preview with example analytics. Go Live to track real views, clicks, and inquiries." |
| Employees | employees | "This is a preview of team management with example employees. Go Live to manage your real team." |
| Jobs | jobs | "FindABAJobs.org is included with Pro. Go Live to post real jobs and recruit BCBAs and RBTs." |

Find pages under `src/app/(dashboard)/dashboard/` — explore subdirectories as you go.

### Nav and sidebar changes (do last):

- **Nav config**: find it via `grep -rl "proBadge\|navItems\|navConfig" src/components/dashboard/` and remove any `proBadge: true` properties. All nav items should be accessible to everyone.

- **Sidebar**: In the sidebar component, add a "Preview Mode" amber/yellow badge below the agency name for free users. Remove any remaining enterprise label logic.

## Notes
- Each page has different data fetching patterns. Read the file first.
- Some pages are RSC, some have client wrappers. Use the appropriate preview helper.
- Don't break Pro users — preview logic is additive.
- Replace existing lock screens with preview mode (demo data + banner).
- Keep empty state handling for Pro users with no data (don't show them demo data).

## Verification

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "e2e/"
npm run lint 2>&1 | tail -20
npm run build 2>&1 | tail -100
```

Commit: "feat: convert dashboard pages to preview mode with demo data for free users"
