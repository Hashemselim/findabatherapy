# Session 1: Remove Enterprise Tier

## Context
ABA therapy SaaS (Next.js 15 + Supabase + Stripe). Removing `"enterprise"` plan tier. After this session, `PlanTier = "free" | "pro"` everywhere.

3 core files are already done: `features.ts`, `guards.ts`, `config.ts` (partial).

**DO NOT touch `src/lib/data/cities.ts`** — "Enterprise" there is a real city in Alabama.

## How to Work

**Do NOT read all files upfront.** Work one file at a time:

1. Run this grep to get the full file list:
```bash
grep -rn '"enterprise"' src/ --include="*.ts" --include="*.tsx" -l | grep -v "cities.ts" | grep -v node_modules | grep -v ".test."
```

2. For EACH file in the grep output: read it, make the edit, move to the next file. Do not batch-read.

3. After every ~10 files, run: `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "e2e/" | head -20`

## What to Change in Each File

Apply whichever of these patterns match:

- `"free" | "pro" | "enterprise"` → `"free" | "pro"`
- `"pro" | "enterprise"` → `"pro"`
- `x === "pro" || x === "enterprise"` → `x === "pro"`
- `x !== "enterprise"` → remove the conditional (it's always true now)
- `Record<"pro" | "enterprise", ...>` → `Record<"pro", ...>` and delete the enterprise entry
- `z.enum(["free", "pro", "enterprise"])` → `z.enum(["free", "pro"])`
- `.in("plan_tier", ["enterprise", "pro"])` → `.eq("plan_tier", "pro")`
- `.eq("plan_tier", "enterprise")` → `.eq("plan_tier", "pro")`
- `case "enterprise":` in switch → delete the case
- `<SelectItem value="enterprise">` → delete the element
- Enterprise plan card objects in arrays → delete the entire object
- `validPlans` arrays containing `"enterprise"` → remove it
- `isPaidPlan` or `isEnterprise` checks → simplify to `=== "pro"`

## Special Cases

**`src/lib/stripe/config.ts`** — also add this export after STRIPE_PLANS:
```typescript
export const ADDON_PRICE_IDS = {
  extra_users: process.env.STRIPE_ADDON_EXTRA_USERS_PRICE_ID,
  location_pack: process.env.STRIPE_ADDON_LOCATION_PACK_PRICE_ID,
  job_pack: process.env.STRIPE_ADDON_JOB_PACK_PRICE_ID,
  storage_pack: process.env.STRIPE_ADDON_STORAGE_PACK_PRICE_ID,
  homepage_placement: process.env.STRIPE_ADDON_HOMEPAGE_PLACEMENT_PRICE_ID,
};
```

**`src/lib/actions/locations.ts`** — enterprise had `featured: 999`. Limits should be `{ free: 3, pro: 10 }`.

**`src/lib/queries/search.ts`** — where you change `.eq("plan_tier", "enterprise")` to `"pro"`, add comment: `// TODO: migrate to profile_addons table query`

**Test files** — after fixing all source files, run the grep again with `.test.` included and fix those too.

## Verification

```bash
# Zero enterprise refs (except Alabama city)
grep -rn '"enterprise"' src/ --include="*.ts" --include="*.tsx" | grep -v "cities.ts" | grep -v node_modules

# Zero type errors
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "e2e/"

# Lint clean
npm run lint 2>&1 | tail -30

# Build passes
npm run build 2>&1 | tail -100
```

All 4 must pass. Commit: `chore: remove enterprise tier, simplify to free/pro pricing model`
