# Common Worker Context

You are contributing to a staged but single-cutover migration of `/Users/hashemselim/Code/findabatherapy` from:

- Supabase Auth
- Supabase Postgres
- Supabase Storage

to:

- Clerk for auth and sessions
- Convex for application data, authorization, and domain logic
- Convex file storage for uploaded files and authorized delivery

## Why This Work Exists

The shipped app still contains live Supabase runtime. The migration is incomplete. The goal is to remove Supabase from shipped runtime, tests required for release, and required operational tooling without doing a second production migration cycle.

## Current Baseline

- Integration branch: `codex/clerk-convex-cutover`
- Current inventory: `/Users/hashemselim/Code/findabatherapy/docs/migrations/2026-03-29-supabase-clerk-convex-inventory.md`
- Remaining-work determination: `/Users/hashemselim/Code/findabatherapy/docs/migrations/2026-03-31-supabase-cutover-determination.md`
- Parallel rules: `/Users/hashemselim/Code/findabatherapy/docs/migrations/parallel-cutover/PARALLEL-RULES.md`
- Current runtime files with Supabase references: `117`

## Existing Migration Progress

The repo already has partial Convex and Clerk migration work in place:

- Clerk and Convex runtime scaffolding exists.
- Convex currently covers important parts of:
  - `workspaces`
  - `listings`
  - `locations`
  - `files`
  - `jobs`
  - `notifications`
  - `billing` read and sync primitives
- Some dashboard and billing paths already branch correctly in Convex mode.
- The migration is still incomplete across many domains.

## Global Worker Rules

- You are not alone in the codebase.
- Do not revert changes made by other workers.
- You are sharing the same git worktree unless explicitly told otherwise.
- In shared-worktree mode, do not create or switch branches.
- Stay on `codex/clerk-convex-cutover`.
- Stay inside your owned paths unless the shard prompt explicitly permits a narrow shared contract change.
- If you need to cross your scope boundary, stop and report it instead of widening your edits.
- Remove Supabase runtime usage only for the shard you own.
- Do not perform cleanup-only deletions outside your shard.
- Do not claim the migration is complete unless your shard is actually complete.

## Required Workflow

1. Confirm the repo is on `codex/clerk-convex-cutover`.
2. Do not create or switch branches unless you are explicitly told you have your own separate git worktree.
3. Read:
   - this common prompt
   - your shard prompt
   - your shard task file
4. Work through the shard task list from top to bottom.
5. When you finish one task, immediately continue to the next uncompleted task in your shard.
6. Keep going until one of the following is true:
   - every task in your shard is complete
   - you hit a cross-shard blocker you cannot safely resolve
   - you hit a missing model or contract that belongs to another shard
7. After each meaningful edit batch, run the shard validation commands.
8. If validation fails, fix it and rerun until it passes.
9. Before you stop, summarize:
   - what changed
   - which tasks are done
   - exact validation that passed
   - blockers or follow-up items, if any

## Minimum Validation

Every worker must run:

```bash
npx tsc --noEmit
```

If your work changes Supabase reference counts or migration-visible surfaces, also run:

```bash
node scripts/generate-cutover-inventory.mjs
```

## Expected Output

Your final response must include:

- branch name used
- files changed
- tasks completed
- validation commands run
- evidence that validation passed
- remaining blockers inside your shard
