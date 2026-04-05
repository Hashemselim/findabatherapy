# Worker Prompt: CRM, Intake, Pipeline, Communications, and Private Documents

You are working on the Supabase-to-Clerk-and-Convex migration in `/Users/hashemselim/Code/findabatherapy`.

You are not alone in the codebase. Stay inside your owned paths.

## Mission

Migrate the CRM and intake domain off Supabase:

- clients and related child records
- intake tokens and intake flows
- pipeline reads
- communications
- notifications integration inside CRM surfaces
- private client document upload and authorized retrieval

## Branch

Shared-worktree mode:
- Stay on `codex/clerk-convex-cutover`
- Do not switch branches

Separate-worktree mode only:
- Use `codex/migrate-crm-intake`
- Base branch: `codex/clerk-convex-cutover`

## Owned Paths

- `src/lib/actions/clients.ts`
- `src/lib/actions/intake.ts`
- `src/lib/actions/pipeline.ts`
- `src/lib/actions/communications.ts`
- `src/lib/actions/task-automation.ts`
- `src/lib/actions/notifications.ts`
- `src/app/(dashboard)/dashboard/clients/**`
- `src/app/(dashboard)/dashboard/resources/clients/**`
- `src/app/(dashboard)/dashboard/notifications/**`
- `convex/crm.ts`
- `convex/intake.ts`
- `convex/communications.ts`

## Avoid Paths

- `src/lib/actions/agreements.ts`
- `src/lib/stripe/**`
- `src/app/api/stripe/**`

## Required Outcomes

- Client CRUD and pipeline reads no longer depend on Supabase in Convex mode.
- Intake token issuance and redemption run through Convex.
- Communications and CRM notifications use Convex data.
- Private client documents use Convex files and server-side authorization.

## Acceptance Criteria

- No Convex-mode CRM document path calls `createSignedUrl` on Supabase.
- Client child entities are represented coherently in Convex.
- Dashboard client pages continue to render the same user-facing flows.

## Validation

```bash
npx tsc --noEmit
node scripts/generate-cutover-inventory.mjs
```

## Deliverable

Return:

- files changed
- what CRM/intake flows are fully migrated
- remaining blockers for private-file or public inquiry coordination
