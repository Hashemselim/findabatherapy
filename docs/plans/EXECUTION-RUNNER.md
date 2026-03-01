# Pricing Restructure — Execution Runner

## How This Works

The full restructure is split into **10 sessions**. Each session has its own file in `docs/plans/`. Run them **sequentially** — each session commits before the next starts.

Each file is **self-contained** — the agent does NOT need the master plan. Everything it needs is in its session file.

## Session Order

```
1 → 2 → 3a → 3b → 4 → 5a → 5b → 5c → 6 → 7a+7b [manual] → 7c → 8
```

## Sessions

| #      | What It Does                                           | Prompt to Paste                                                                              |
| ------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| **1**  | Remove enterprise tier from 41+ files                  | `Read docs/plans/session-1-enterprise-removal.md and execute it. Commit when done.`          |
| **2**  | Create profile_addons table + migrate enterprise users | `Read docs/plans/session-2-database-migration.md and execute it. Commit when done.`          |
| **3a** | Expand demo data module                                | `Read docs/plans/session-3a-demo-data.md and execute it. Commit when done.`                  |
| **3b** | Create preview banner, overlay, empty state components | `Read docs/plans/session-3b-preview-components.md and execute it. Commit when done.`         |
| **4**  | Convert dashboard pages to preview mode                | `Read docs/plans/session-4-dashboard-preview-mode.md and execute it. Commit when done.`      |
| **5a** | Redesign upgrade modal as "Go Live" flow               | `Read docs/plans/session-5a-upgrade-modal.md and execute it. Commit when done.`              |
| **5b** | Build add-on checkout + management                     | `Read docs/plans/session-5b-addon-system.md and execute it. Commit when done.`               |
| **5c** | Redesign pricing tables + onboarding + signup          | `Read docs/plans/session-5c-marketing-onboarding.md and execute it. Commit when done.`       |
| **6**  | Email drip sequence + PostHog conversion events        | `Read docs/plans/session-6-drip-and-analytics.md and execute it. Commit when done.`          |
| **7a** | *(MANUAL)* Create Stripe products/prices for add-ons   | —                                                                                            |
| **7b** | *(MANUAL)* Set env vars for add-on price IDs in Vercel | —                                                                                            |
| **7c** | Add-on quantity selection + change management          | `Read docs/plans/session-7c-addon-quantity-management.md and execute it. Commit when done.`  |
| **8**  | Run enterprise→pro Stripe subscription migration       | `Read docs/plans/session-8-enterprise-stripe-migration.md and execute it. Commit when done.` |

## Verification After Each Session

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "e2e/"
npm run lint 2>&1 | tail -20
npm run build 2>&1 | tail -100
```

## After All Sessions

Final grep to confirm zero enterprise references (except the Alabama city):
```bash
grep -r '"enterprise"' src/ --include="*.ts" --include="*.tsx" | grep -v "cities.ts" | grep -v node_modules
```

Push to main:
```bash
git push origin main
```
