# Parallel Agent Migration Kit

This folder is the operating kit for running the remaining Supabase-to-Clerk-and-Convex migration in parallel.

Current baseline from the repo:

- Branch: `codex/clerk-convex-cutover`
- Inventory snapshot: [2026-03-29-supabase-clerk-convex-inventory.md](/Users/hashemselim/Code/findabatherapy/docs/migrations/2026-03-29-supabase-clerk-convex-inventory.md)
- Determination doc: [2026-03-31-supabase-cutover-determination.md](/Users/hashemselim/Code/findabatherapy/docs/migrations/2026-03-31-supabase-cutover-determination.md)
- Remaining runtime files with Supabase references: `117`

## What This Kit Gives You

- A fixed shard plan with non-overlapping primary write scopes.
- One prompt file per worker.
- A machine-readable manifest at [agent-manifest.json](/Users/hashemselim/Code/findabatherapy/docs/migrations/parallel-cutover/agent-manifest.json).
- A helper script at [agents.mjs](/Users/hashemselim/Code/findabatherapy/scripts/parallel-migration/agents.mjs).
- A common worker context file at [COMMON-WORKER-PROMPT.md](/Users/hashemselim/Code/findabatherapy/docs/migrations/parallel-cutover/COMMON-WORKER-PROMPT.md).
- One shard task queue per worker in [shards](/Users/hashemselim/Code/findabatherapy/docs/migrations/parallel-cutover/shards).
- Shared operating rules at [PARALLEL-RULES.md](/Users/hashemselim/Code/findabatherapy/docs/migrations/parallel-cutover/PARALLEL-RULES.md).
- An operator board at [TASK-BOARD.md](/Users/hashemselim/Code/findabatherapy/docs/migrations/parallel-cutover/TASK-BOARD.md).

## Recommended Operating Model

1. Keep `codex/clerk-convex-cutover` as the integration branch.
2. If workers share the same worktree, keep every worker on `codex/clerk-convex-cutover`.
3. Only use per-worker branches if each worker has its own separate git worktree.
4. Launch one worker per shard using the prompt files in [prompts](/Users/hashemselim/Code/findabatherapy/docs/migrations/parallel-cutover/prompts).
5. Keep workers inside their owned paths.
6. If using separate worktrees, merge finished shards back into the integration branch one at a time.
7. Run repo-wide validation after each merge or after each completed shard batch in shared-worktree mode:
   - `npx tsc --noEmit`
   - `node scripts/generate-cutover-inventory.mjs`
8. Hold cleanup-only work until the runtime shards are merged.

## Suggested Shards

1. `auth-workspace`
2. `provider-core`
3. `search-public`
4. `jobs`
5. `crm-intake`
6. `agreements`
7. `billing-stripe`
8. `admin-analytics-referrals`
9. `tooling-cleanup`

## How To Inspect The Manifest

List agents:

```bash
node scripts/parallel-migration/agents.mjs list
```

Show one agent brief:

```bash
node scripts/parallel-migration/agents.mjs show billing-stripe
```

Show the recommended launch order:

```bash
node scripts/parallel-migration/agents.mjs order
```

Print the full launch prompt for one worker:

```bash
node scripts/parallel-migration/agents.mjs prompt billing-stripe
```

## How To Trigger Agents

Use the synthesized prompt output from `agents.mjs prompt <agent-id>`. It includes:

- common migration context
- exact mission
- owned paths
- paths to avoid
- acceptance criteria
- validation commands
- branch naming convention
- a shard-local task queue to keep working through

Recommended worker naming only if using separate worktrees:

- `codex/migrate-auth-workspace`
- `codex/migrate-provider-core`
- `codex/migrate-search-public`
- `codex/migrate-jobs`
- `codex/migrate-crm-intake`
- `codex/migrate-agreements`
- `codex/migrate-billing-stripe`
- `codex/migrate-admin-analytics-referrals`
- `codex/migrate-tooling-cleanup`

## Merge Order

Use this order unless a worker finishes later and is obviously independent:

1. `auth-workspace`
2. `provider-core`
3. `jobs`
4. `billing-stripe`
5. `search-public`
6. `crm-intake`
7. `agreements`
8. `admin-analytics-referrals`
9. `tooling-cleanup`

## Coordinator Rules

- Do not let workers edit [TASK-BOARD.md](/Users/hashemselim/Code/findabatherapy/docs/migrations/parallel-cutover/TASK-BOARD.md). Keep that as the operator-owned board.
- If two workers both need a shared contract file, merge the narrower change first and rebase the later worker.
- If a worker needs to cross its scope boundary, either:
  - stop and split the work into a new shard
  - or explicitly approve the overlap before launch

## Success Condition

This kit has done its job when you can launch parallel workers with no ambiguity about:

- what each worker owns
- which files each worker must not touch
- what “done” means for that shard
- how the shard will be validated before merge
