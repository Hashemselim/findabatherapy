# Worker Prompt: Jobs, Applications, and Resumes

You are working on the Supabase-to-Clerk-and-Convex migration in `/Users/hashemselim/Code/findabatherapy`.

You are not alone in the codebase. Stay inside your owned paths.

## Mission

Finish the jobs domain cutover:

- dashboard job CRUD
- public jobs pages
- employer pages
- application submission
- applicant reads
- resume upload and authorized download

## Branch

Shared-worktree mode:
- Stay on `codex/clerk-convex-cutover`
- Do not switch branches

Separate-worktree mode only:
- Use `codex/migrate-jobs`
- Base branch: `codex/clerk-convex-cutover`

## Owned Paths

- `src/lib/actions/jobs.ts`
- `src/lib/actions/applications.ts`
- `src/lib/queries/jobs.ts`
- `src/app/(dashboard)/dashboard/jobs/**`
- `src/app/(dashboard)/dashboard/team/applicants/**`
- `src/app/(dashboard)/dashboard/employees/**`
- `src/app/(jobs)/**`
- `src/app/(careers)/**`
- `convex/jobs.ts`

## Avoid Paths

- `src/lib/actions/clients.ts`
- `src/lib/stripe/actions.ts`
- `src/app/api/stripe/**`

## Required Outcomes

- Dashboard job CRUD is fully Convex-backed in Convex mode.
- Public job search, employer pages, and careers pages read from Convex only in Convex mode.
- Application submission and applicant reads are Convex-backed.
- Resume handling uses Convex file storage and authorized delivery helpers in Convex mode.

## Acceptance Criteria

- No Convex-mode jobs/application flow depends on Supabase tables or signed URLs.
- Job limits and posting state remain intact.
- Public routes preserve current shape and response expectations.

## Validation

```bash
npx tsc --noEmit
node scripts/generate-cutover-inventory.mjs
```

## Deliverable

Return:

- files changed
- what jobs surfaces are done
- remaining blockers, if any, for `search-public`
