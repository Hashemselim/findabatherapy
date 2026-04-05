# Worker Prompt: Auth and Workspace Spine

You are working on the Supabase-to-Clerk-and-Convex migration in `/Users/hashemselim/Code/findabatherapy`.

You are not alone in the codebase. Other workers may be changing unrelated files at the same time. Do not revert their edits. Stay inside your owned paths unless a narrowly-scoped shared contract change is absolutely required.

## Mission

Finish the auth and workspace runtime spine so the app no longer depends on Supabase for:

- auth route flows
- middleware session handling
- profile and invite API bridges
- workspace membership, invitation, and seat-summary runtime

## Branch

Shared-worktree mode:
- Stay on `codex/clerk-convex-cutover`
- Do not switch branches

Separate-worktree mode only:
- Use `codex/migrate-auth-workspace`
- Base branch: `codex/clerk-convex-cutover`

## Owned Paths

- `src/middleware.ts`
- `src/lib/auth/**`
- `src/app/auth/**`
- `src/app/api/auth/**`
- `src/lib/platform/auth/**`
- `src/lib/platform/workspace/**`
- `src/lib/workspace/**`
- `src/lib/actions/workspace-users.ts`
- `src/app/(dashboard)/dashboard/settings/users/**`
- `src/lib/supabase/middleware.ts`

## Avoid Paths

- `src/lib/stripe/**`
- `src/app/api/stripe/**`
- `src/lib/actions/clients.ts`
- `src/lib/actions/agreements.ts`
- `src/lib/actions/jobs.ts`

## Required Outcomes

- Clerk fully owns sign-in, sign-up, sign-out, reset, callback, confirm, and profile flows.
- Convex owns current workspace resolution, role enforcement, invitations, and seat summary in Convex mode.
- No Clerk-mode runtime path statically depends on Supabase middleware or Supabase auth/session refresh behavior.
- Settings users page and actions run through platform auth/workspace APIs in Convex mode.

## Acceptance Criteria

- `src/middleware.ts` does not require Supabase session refresh in Clerk mode.
- `src/app/api/auth/profile/route.ts` and `src/app/api/auth/invite/route.ts` are platform-backed.
- `src/lib/actions/workspace-users.ts` has no Convex-mode dependency on Supabase auth helpers.
- The settings users surface works through Convex in Convex mode.

## Validation

Run:

```bash
npx tsc --noEmit
node scripts/generate-cutover-inventory.mjs
```

## Deliverable

Return:

- files changed
- what Supabase runtime was removed
- what auth/workspace blockers remain, if any
