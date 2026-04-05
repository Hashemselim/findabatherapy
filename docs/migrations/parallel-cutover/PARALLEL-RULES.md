# Parallel Migration Rules

These rules apply to every worker launched from this kit.

## Shared Rules

- You are not alone in the codebase.
- Do not revert edits made by other workers.
- Stay inside your owned paths unless the prompt explicitly names a shared contract file.
- If you hit a cross-scope blocker, stop and report it instead of broadening your write set.
- Prefer adding new Convex modules and platform helpers inside your shard instead of editing unrelated older Supabase code elsewhere.
- Remove Supabase runtime usage only where your shard owns the behavior.
- Leave cleanup-only deletions for the `tooling-cleanup` shard unless your prompt explicitly requires removal.

## Validation Rules

Every worker must run, at minimum:

```bash
npx tsc --noEmit
```

If the shard changes inventory-visible Supabase usage, also run:

```bash
node scripts/generate-cutover-inventory.mjs
```

## Output Rules

Each worker should return:

- what changed
- exact files changed
- validation run
- remaining blockers inside the shard
- any follow-up contract changes needed from another shard

## Conflict Rules

- `auth-workspace` owns auth and workspace spine changes.
- `billing-stripe` owns Stripe actions and webhook writes.
- `tooling-cleanup` owns dependency and env removal.
- `search-public` owns public read models and sitemap wiring.
- `provider-core` owns provider dashboard mutations and settings.
- `crm-intake` owns client, intake, pipeline, communications, and private CRM documents.
- `agreements` owns agreement data and artifact delivery.
- `jobs` owns job data, applications, and resumes.
- `admin-analytics-referrals` owns admin, analytics, referrals, feedback, and support surfaces.

## Escalation Rules

Stop and report immediately if:

- you need to edit `src/lib/platform/contracts.ts`
- you need to delete `src/lib/supabase/*`
- you need to change the branch integration order
- your shard depends on a missing Convex schema that belongs to another shard
