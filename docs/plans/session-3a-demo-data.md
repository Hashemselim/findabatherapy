# Session 3a: Expanded Demo Data

## Why This Exists
The old free tier hid features behind lock screens — users had no idea what they were paying for. The new model gives free users a permanent interactive preview of every dashboard page. To make those previews feel real, each page needs realistic ABA therapy industry data: clients at various pipeline stages, leads, tasks, employees, jobs, communications, and referral analytics. This demo data is what makes the "try before you buy" experience work.

## How to Work

**Do NOT read all files upfront.** Work incrementally:

1. First read `src/lib/demo/data.ts` — this is where all new exports go. Note existing helpers like `daysAgo()`, `hoursAgo()`, `generateTimeSeries()`.
2. For each demo dataset below, read the corresponding dashboard page to discover the actual data shape it expects, then write the export. One at a time.

## Context
ABA therapy SaaS (Next.js 15 + Supabase + Tailwind + shadcn/ui). Free users see the full dashboard with **demo data** instead of locked/hidden features. Plan tiers are now `"free" | "pro"` (enterprise removed in Session 1).

## Step 1: Add demo data exports to `src/lib/demo/data.ts`

For each export below, first check the corresponding dashboard page under `src/app/(dashboard)/dashboard/` and its server actions to see the exact data shape expected. All IDs should be `demo-xxx` prefixed. Use existing `daysAgo()` and `hoursAgo()` helpers for timestamps.

**Add these exports one at a time (read the page, write the export, move on):**

- **`DEMO_CLIENTS`** — 8 clients across pipeline stages (inquiry, assessment_scheduled, assessment_complete, insurance_verified, active, discharged). Include guardian info, insurance provider, status, assigned therapist, timestamps spread over 3 months. Check: `src/app/(dashboard)/dashboard/clients/`

- **`DEMO_LEADS`** — 5 inquiry form submissions. Include source (website, referral, directory), parent name, child info, message, timestamps over 2 weeks.

- **`DEMO_PIPELINE_STATS`** — Stage counts matching DEMO_CLIENTS, plus attention items (e.g., "Insurance auth expiring in 3 days") and activity feed entries.

- **`DEMO_TASKS`** — 6 tasks: 2 overdue, 1 due today, 3 upcoming. Types like "Follow up with guardian", "Submit insurance auth", "Schedule assessment". Include assigned_to, priority, due_date.

- **`DEMO_EMPLOYEES`** — 4 team members: 1 BCBA, 2 RBTs, 1 admin. Include name, role, credentials (certification number, expiry date), status, hire_date.

- **`DEMO_JOBS`** — 3 job postings: BCBA, RBT, admin position. Include title, location, salary range, posted date, applicant count, status.

- **`DEMO_COMMUNICATIONS`** — 5 sent communication history entries. Mix of email types (welcome, reminder, insurance update, assessment report, billing). Include to, subject, sent_at, status.

- **`DEMO_REFERRAL_SOURCES`** — Referral analytics: sources like "FindABATherapy.org", "Google Search", "Pediatrician Referral", "Parent Referral", "Social Media" with counts and conversion rates.

## Step 2: Create `src/hooks/use-preview-data.ts`

Read `src/contexts/auth-context.tsx` to see how `profile.plan_tier` is accessed, then create:

- `usePreviewMode()` — returns `{ isPreview: boolean }` based on plan tier from auth context
- `usePreviewData<T>(realData: T | null, demoData: T)` — returns `{ data: T; isPreview: boolean }`. Free plan → demoData; otherwise realData (or demoData fallback if null).

## Step 3: Create `src/lib/demo/preview-helpers.ts`

Read `src/lib/plans/guards.ts` to see `getCurrentPlanTier()`, then create:

- `getPreviewData<T>(realData: T | null, demoData: T)` — server-side equivalent of the hook. Uses `getCurrentPlanTier()` to check if user is free.

## Notes
- Demo data should feel realistic and professional — first things a free user sees
- Match data shapes to what dashboard pages actually expect — always check the page first

## Verification

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "e2e/"
npm run lint 2>&1 | tail -20
```

Commit: "feat: expand demo data module with clients, leads, tasks, employees, jobs, communications"
