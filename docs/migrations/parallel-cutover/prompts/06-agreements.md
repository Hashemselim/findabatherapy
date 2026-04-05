# Worker Prompt: Agreements, Versions, Artifacts, and Authorized Delivery

You are working on the Supabase-to-Clerk-and-Convex migration in `/Users/hashemselim/Code/findabatherapy`.

You are not alone in the codebase. Stay inside your owned paths.

## Mission

Move the agreements subsystem off Supabase:

- packet CRUD
- versioning
- packet documents
- preview route
- submission documents
- signed artifacts
- authorized retrieval and download

## Branch

Shared-worktree mode:
- Stay on `codex/clerk-convex-cutover`
- Do not switch branches

Separate-worktree mode only:
- Use `codex/migrate-agreements`
- Base branch: `codex/clerk-convex-cutover`

## Owned Paths

- `src/lib/actions/agreements.ts`
- `src/app/(dashboard)/dashboard/forms/agreements/**`
- `src/app/api/agreements/**`
- `convex/agreements.ts`

## Avoid Paths

- `src/lib/actions/clients.ts`
- `src/lib/stripe/**`
- `src/app/api/stripe/**`

## Required Outcomes

- Agreement packet and version data are Convex-backed.
- Agreement files and artifacts are stored in Convex files.
- Preview and download routes authorize access without Supabase signed URLs.

## Acceptance Criteria

- No Convex-mode agreement path depends on Supabase tables or buckets.
- Preview and download routes preserve current behavior and are server-authorized.

## Validation

```bash
npx tsc --noEmit
node scripts/generate-cutover-inventory.mjs
```

## Deliverable

Return:

- files changed
- what agreement flows are migrated
- any shared file-delivery primitives another shard should reuse
