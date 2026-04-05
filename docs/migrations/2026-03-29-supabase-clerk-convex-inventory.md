# Supabase to Clerk and Convex Inventory

Generated on `2026-04-03T02:12:52.525Z` from the current repository state.

## Summary

- Runtime files with Supabase references: 121
- App and middleware route surfaces with Supabase references: 50
- Source files with Supabase references: 101
- E2E files with Supabase references: 1
- Scripts with Supabase references: 17
- Supabase config and migration files: 986
- Referenced Postgres tables: 80
- Referenced storage buckets: 15
- Referenced Supabase env vars: 25

## Frozen Replacement Map

| Surface | Current dependency | Target replacement |
| --- | --- | --- |
| Auth and session | Supabase Auth cookies, session refresh middleware, auth server actions, browser auth subscriptions | Clerk users and sessions only, exposed through the platform auth facade |
| Workspace and role model | Supabase profiles, profile_memberships, profile_invitations, synthetic owner fallback | Convex users, workspaces, memberships, invitations, single active workspace guards |
| Primary domain data | Supabase Postgres tables queried directly from page components, actions, and route handlers | Convex queries, mutations, actions, and denormalized read models |
| Files and document access | Supabase Storage buckets plus public URL construction in app code | Convex File Storage plus file metadata documents and authorized delivery helpers |
| Billing linkage | Supabase profile and addon records mutated inside Stripe handlers | Convex billing-supporting records with preserved Stripe customer and subscription linkage |
| Search and public pages | Join-heavy Supabase reads powering provider pages, jobs pages, and sitemaps | Convex-maintained search and public read model documents |
| Tests and seed flows | Supabase-backed E2E auth helper, seed scripts, and direct data cleanup scripts | Clerk + Convex provisioning helpers, import tooling, and reconciliation scripts |

## Referenced Tables

| Surface | Count |
| --- | ---: |
| `e2e/dashboard/communications-e2e.spec.ts` | 1 |
| `e2e/lib/fixtures.ts` | 1 |
| `scripts/apply-migration.ts` | 1 |
| `scripts/cleanup-seeded.ts` | 1 |
| `scripts/debug-anon.ts` | 1 |
| `scripts/debug-impressions.ts` | 1 |
| `scripts/debug-search.ts` | 1 |
| `scripts/list-profiles.ts` | 1 |
| `scripts/run-migration.ts` | 1 |
| `scripts/seed-20-providers.ts` | 1 |
| `scripts/seed-google-places.ts` | 1 |
| `scripts/seed-providers.ts` | 1 |
| `scripts/seed-test-user.ts` | 1 |
| `scripts/set-admin.ts` | 1 |
| `scripts/sync-featured-subscriptions.ts` | 1 |
| `scripts/test-search.ts` | 1 |
| `scripts/update-existing-providers.ts` | 1 |
| `scripts/verify-user-write-contracts.mjs` | 1 |
| `src/app/(careers)/careers/[slug]/[jobSlug]/page.tsx` | 1 |
| `src/app/(careers)/careers/[slug]/page.tsx` | 1 |
| `src/app/(dashboard)/dashboard/billing/page.tsx` | 1 |
| `src/app/(dashboard)/dashboard/branding/page.tsx` | 1 |
| `src/app/(dashboard)/dashboard/forms/agency/page.tsx` | 1 |
| `src/app/(dashboard)/dashboard/forms/agreements/page.tsx` | 1 |
| `src/app/(dashboard)/dashboard/forms/contact/page.tsx` | 1 |
| `src/app/(dashboard)/dashboard/forms/documents/page.tsx` | 1 |
| `src/app/(dashboard)/dashboard/forms/intake/page.tsx` | 1 |
| `src/app/(dashboard)/dashboard/forms/resources/page.tsx` | 1 |
| `src/app/(dashboard)/dashboard/forms/website/page.tsx` | 1 |
| `src/app/(dashboard)/dashboard/resources/clients/page.tsx` | 1 |
| `src/app/(jobs)/employers/[slug]/page.tsx` | 1 |
| `src/app/(jobs)/jobs/sitemap.ts` | 1 |
| `src/app/api/agreements/document-preview/route.ts` | 1 |
| `src/app/api/social/render/[templateId]/route.tsx` | 1 |
| `src/app/api/stripe/webhooks/route.ts` | 1 |
| `src/app/auth/callback/route.ts` | 1 |
| `src/app/auth/confirm/route.ts` | 1 |
| `src/app/sitemap.ts` | 1 |
| `src/contexts/auth-context.tsx` | 1 |
| `src/lib/actions/addons.ts` | 1 |
| `src/lib/actions/admin.ts` | 1 |
| `src/lib/actions/agreements.ts` | 1 |
| `src/lib/actions/analytics.ts` | 1 |
| `src/lib/actions/applications.ts` | 1 |
| `src/lib/actions/attributes.ts` | 1 |
| `src/lib/actions/billing.ts` | 1 |
| `src/lib/actions/clients.ts` | 1 |
| `src/lib/actions/communications.ts` | 1 |
| `src/lib/actions/drip-emails.ts` | 1 |
| `src/lib/actions/feedback.ts` | 1 |
| `src/lib/actions/google-business.ts` | 1 |
| `src/lib/actions/google-places.ts` | 1 |
| `src/lib/actions/inquiries.ts` | 1 |
| `src/lib/actions/intake.ts` | 1 |
| `src/lib/actions/jobs.ts` | 1 |
| `src/lib/actions/listings.ts` | 1 |
| `src/lib/actions/locations.ts` | 1 |
| `src/lib/actions/notifications.ts` | 1 |
| `src/lib/actions/onboarding.ts` | 1 |
| `src/lib/actions/pipeline.ts` | 1 |
| `src/lib/actions/provider-website.ts` | 1 |
| `src/lib/actions/referral-analytics.ts` | 1 |
| `src/lib/actions/referrals.ts` | 1 |
| `src/lib/actions/social.ts` | 1 |
| `src/lib/actions/task-automation.ts` | 1 |
| `src/lib/actions/team.ts` | 1 |
| `src/lib/actions/workspace-users.ts` | 1 |
| `src/lib/analytics/track.ts` | 1 |
| `src/lib/auth/actions.ts` | 1 |
| `src/lib/onboarding/server.ts` | 1 |
| `src/lib/plans/guards.ts` | 1 |
| `src/lib/queries/jobs.ts` | 1 |
| `src/lib/queries/search.ts` | 1 |
| `src/lib/scripts/migrate-enterprise-subscriptions.ts` | 1 |
| `src/lib/storage/actions.ts` | 1 |
| `src/lib/stripe/actions.ts` | 1 |
| `src/lib/supabase/server.ts` | 1 |
| `src/lib/workspace/current-profile.ts` | 1 |
| `src/lib/workspace/memberships.ts` | 1 |
| `src/middleware.ts` | 1 |

## Referenced Storage Buckets

- `docs/migrations/2026-03-29-supabase-clerk-convex-inventory.md`
- `docs/migrations/2026-03-31-supabase-cutover-determination.md`
- `docs/plans/2026-03-19-social-posts-design.md`
- `docs/plans/2026-03-19-social-posts-plan.md`
- `src/app/(dashboard)/dashboard/social/page.tsx`
- `src/components/dashboard/social/social-posts-client.tsx`
- `src/lib/actions/applications.ts`
- `src/lib/storage/config.ts`
- `supabase/migrations/006_create_storage_buckets.sql`
- `supabase/migrations/034_create_job_tables.sql`
- `supabase/migrations/040_create_client_tracker_tables.sql`
- `supabase/migrations/051_enhance_client_documents.sql`
- `supabase/migrations/058_workspace_membership_rls_hardening.sql`
- `supabase/migrations/059_create_agreement_packet_signing.sql`
- `supabase/migrations/066_create_social_posts_bucket.sql`

## Referenced Env Vars

- `e2e/lib/auth-helper.ts`
- `scripts/apply-migration.ts`
- `scripts/cleanup-seeded.ts`
- `scripts/debug-anon.ts`
- `scripts/debug-impressions.ts`
- `scripts/debug-search.ts`
- `scripts/generate-cutover-inventory.mjs`
- `scripts/list-profiles.ts`
- `scripts/run-migration.ts`
- `scripts/seed-20-providers.ts`
- `scripts/seed-google-places.ts`
- `scripts/seed-providers.ts`
- `scripts/seed-test-user.ts`
- `scripts/set-admin.ts`
- `scripts/sync-featured-subscriptions.ts`
- `scripts/test-search.ts`
- `scripts/update-existing-providers.ts`
- `scripts/verify-user-write-contracts.mjs`
- `src/components/dashboard/social/social-posts-client.tsx`
- `src/env.ts`
- `src/lib/scripts/migrate-enterprise-subscriptions.ts`
- `src/lib/supabase/clients.ts`
- `src/lib/supabase/middleware.ts`
- `src/lib/supabase/server.ts`
- `supabase/config.toml`

## Route and Runtime Surfaces

- `src/middleware.ts`
- `src/app/auth/confirm/route.ts`
- `src/app/auth/callback/route.ts`
- `src/app/(site)/_goodaba/goodaba-pricing-page.tsx`
- `src/app/(site)/_goodaba/goodaba-landing-page.tsx`
- `src/app/sitemap.ts`
- `src/app/api/places/search/route.ts`
- `src/app/api/agreements/document-preview/route.ts`
- `src/app/api/social/render/[templateId]/route.tsx`
- `src/app/api/stripe/webhooks/route.ts`
- `src/app/(careers)/careers/[slug]/page.tsx`
- `src/app/(careers)/careers/[slug]/[jobSlug]/page.tsx`
- `src/app/(jobs)/employers/[slug]/page.tsx`
- `src/app/(jobs)/jobs/sitemap.ts`
- `src/app/(dashboard)/dashboard/clients/pipeline/page.tsx`
- `src/app/(dashboard)/dashboard/clients/new/page.tsx`
- `src/app/(dashboard)/dashboard/clients/[id]/edit/page.tsx`
- `src/app/(dashboard)/dashboard/clients/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/clients/page.tsx`
- `src/app/(dashboard)/dashboard/clients/communications/page.tsx`
- `src/app/(dashboard)/dashboard/settings/page.tsx`
- `src/app/(dashboard)/dashboard/branding/page.tsx`
- `src/app/(dashboard)/dashboard/tasks/page.tsx`
- `src/app/(dashboard)/dashboard/forms/contact/page.tsx`
- `src/app/(dashboard)/dashboard/forms/resources/page.tsx`
- `src/app/(dashboard)/dashboard/forms/agency/page.tsx`
- `src/app/(dashboard)/dashboard/forms/website/page.tsx`
- `src/app/(dashboard)/dashboard/forms/agreements/page.tsx`
- `src/app/(dashboard)/dashboard/forms/intake/page.tsx`
- `src/app/(dashboard)/dashboard/forms/documents/page.tsx`
- `src/app/(dashboard)/dashboard/referrals/settings/page.tsx`
- `src/app/(dashboard)/dashboard/referrals/sources/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/referrals/sources/page.tsx`
- `src/app/(dashboard)/dashboard/referrals/campaigns/page.tsx`
- `src/app/(dashboard)/dashboard/resources/clients/page.tsx`
- `src/app/(dashboard)/dashboard/feedback/page.tsx`
- `src/app/(dashboard)/dashboard/careers/page.tsx`
- `src/app/(dashboard)/dashboard/social/page.tsx`
- `src/app/(dashboard)/dashboard/locations/page.tsx`
- `src/app/(dashboard)/dashboard/layout.tsx`
- `src/app/(dashboard)/dashboard/jobs/new/page.tsx`
- `src/app/(dashboard)/dashboard/jobs/[id]/edit/page.tsx`
- `src/app/(dashboard)/dashboard/jobs/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/jobs/page.tsx`
- `src/app/(dashboard)/dashboard/account/page.tsx`
- `src/app/(dashboard)/dashboard/notifications/page.tsx`
- `src/app/(dashboard)/dashboard/billing/page.tsx`
- `src/app/(dashboard)/dashboard/analytics/page.tsx`
- `src/app/(dashboard)/dashboard/company/page.tsx`
- `src/app/(dashboard)/dashboard/media/page.tsx`

## Supabase-Backed Scripts

- `scripts/seed-20-providers.ts`
- `scripts/verify-user-write-contracts.mjs`
- `scripts/seed-test-user.ts`
- `scripts/sync-featured-subscriptions.ts`
- `scripts/generate-cutover-inventory.mjs`
- `scripts/seed-providers.ts`
- `scripts/apply-migration.ts`
- `scripts/debug-impressions.ts`
- `scripts/set-admin.ts`
- `scripts/list-profiles.ts`
- `scripts/debug-anon.ts`
- `scripts/run-migration.ts`
- `scripts/debug-search.ts`
- `scripts/update-existing-providers.ts`
- `scripts/test-search.ts`
- `scripts/cleanup-seeded.ts`
- `scripts/seed-google-places.ts`

## Supabase-Backed E2E Helpers

- `e2e/lib/auth-helper.ts`

## Supabase Config and Migrations

- `./.claude/settings.local.json`
- `./.claude/worktrees/competent-lewin/.next/server/static/webpack/85632d99cb545c98.edge-runtime-webpack.hot-update.json`
- `./.claude/worktrees/competent-lewin/.next/static/chunks/app/layout.js`
- `./.claude/worktrees/competent-lewin/.next/static/webpack/1edd79833171d1db.webpack.hot-update.json`
- `./.claude/worktrees/great-mayer/.next/app-build-manifest.json`
- `./.claude/worktrees/great-mayer/.next/server/edge/chunks/[root-of-the-server]__01b57fe4._.js`
- `./.claude/worktrees/great-mayer/.next/server/edge/chunks/[root-of-the-server]__01b57fe4._.js.map`
- `./.claude/worktrees/great-mayer/.next/server/edge/chunks/144c4_findabatherapy__claude_worktrees_great-mayer_edge-wrapper_92ffa560.js`
- `./.claude/worktrees/great-mayer/.next/server/edge/chunks/7b964_@supabase_auth-js_dist_module_23708dae._.js`
- `./.claude/worktrees/great-mayer/.next/server/edge/chunks/7b964_@supabase_auth-js_dist_module_23708dae._.js.map`
- `./.claude/worktrees/great-mayer/.next/server/edge/chunks/7b964_@supabase_storage-js_dist_module_79365504._.js`
- `./.claude/worktrees/great-mayer/.next/server/edge/chunks/7b964_@supabase_storage-js_dist_module_79365504._.js.map`
- `./.claude/worktrees/great-mayer/.next/server/edge/chunks/7b964_74890f9c._.js`
- `./.claude/worktrees/great-mayer/.next/server/edge/chunks/7b964_74890f9c._.js.map`
- `./.claude/worktrees/great-mayer/.next/server/middleware/middleware-manifest.json`
- `./.env.example`
- `./.env.local`
- `./.git/index`
- `./.git/logs/refs/heads/codex/multiuser-clean`
- `./.git/logs/refs/heads/codex/snapshot-4647-auth-billing-refactor`
- `./.git/objects/pack/pack-99de1a4a92b5ff74ecb453c249fa8d25afc7f7b8.pack`
- `./.git/worktrees/findabatherapy-main-integration-20260308/index`
- `./.git/worktrees/findabatherapy-multiuser-clean/index`
- `./.git/worktrees/findabatherapy-multiuser-clean/logs/HEAD`
- `./.git/worktrees/findabatherapy-onboarding-rewrite/index`
- `./.git/worktrees/findabatherapy-recovery-integration-20260310/index`
- `./.git/worktrees/findabatherapy4/index`
- `./.git/worktrees/mystifying-chebyshev/index`
- `./.next/app-build-manifest.json`
- `./.next/cache/.tsbuildinfo`
- `./.next/cache/eslint/.cache_jbh26d`
- `./.next/cache/webpack/client-production/0.pack`
- `./.next/cache/webpack/client-production/10.pack`
- `./.next/cache/webpack/client-production/11.pack`
- `./.next/cache/webpack/client-production/13.pack`
- `./.next/cache/webpack/client-production/4.pack`
- `./.next/cache/webpack/client-production/5.pack`
- `./.next/cache/webpack/client-production/8.pack`
- `./.next/cache/webpack/client-production/index.pack`
- `./.next/cache/webpack/client-production/index.pack.old`
- `./.next/cache/webpack/edge-server-production/0.pack`
- `./.next/cache/webpack/edge-server-production/1.pack`
- `./.next/cache/webpack/edge-server-production/2.pack`
- `./.next/cache/webpack/edge-server-production/3.pack`
- `./.next/cache/webpack/edge-server-production/4.pack`
- `./.next/cache/webpack/edge-server-production/index.pack`
- `./.next/cache/webpack/edge-server-production/index.pack.old`
- `./.next/cache/webpack/server-production/0.pack`
- `./.next/cache/webpack/server-production/1.pack`
- `./.next/cache/webpack/server-production/10.pack`
- `./.next/cache/webpack/server-production/11.pack`
- `./.next/cache/webpack/server-production/12.pack`
- `./.next/cache/webpack/server-production/2.pack`
- `./.next/cache/webpack/server-production/3.pack`
- `./.next/cache/webpack/server-production/4.pack`
- `./.next/cache/webpack/server-production/5.pack`
- `./.next/cache/webpack/server-production/6.pack`
- `./.next/cache/webpack/server-production/7.pack`
- `./.next/cache/webpack/server-production/9.pack`
- `./.next/cache/webpack/server-production/index.pack`
- `./.next/cache/webpack/server-production/index.pack.old`
- `./.next/images-manifest.json`
- `./.next/required-server-files.json`
- `./.next/routes-manifest.json`
- `./.next/server/app/(auth)/auth/accept-invite/page.js`
- `./.next/server/app/(careers)/apple-icon-1hg28v/route.js`
- `./.next/server/app/(careers)/apple-icon-1hg28v/route.js.map`
- `./.next/server/app/(dashboard)/dashboard/billing/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/billing/page.js`
- `./.next/server/app/(dashboard)/dashboard/billing/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/branding/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/branding/page.js`
- `./.next/server/app/(dashboard)/dashboard/branding/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/clients/[id]/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/clients/[id]/page.js`
- `./.next/server/app/(dashboard)/dashboard/clients/[id]/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/clients/communications/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/clients/communications/page.js`
- `./.next/server/app/(dashboard)/dashboard/clients/communications/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/clients/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/clients/page.js`
- `./.next/server/app/(dashboard)/dashboard/clients/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/clients/pipeline/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/clients/pipeline/page.js`
- `./.next/server/app/(dashboard)/dashboard/clients/pipeline/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/forms/agency/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/forms/agency/page.js`
- `./.next/server/app/(dashboard)/dashboard/forms/agency/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/forms/agreements/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/forms/agreements/page.js`
- `./.next/server/app/(dashboard)/dashboard/forms/agreements/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/forms/contact/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/forms/contact/page.js`
- `./.next/server/app/(dashboard)/dashboard/forms/contact/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/forms/documents/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/forms/documents/page.js`
- `./.next/server/app/(dashboard)/dashboard/forms/documents/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/forms/intake/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/forms/intake/page.js`
- `./.next/server/app/(dashboard)/dashboard/forms/intake/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/forms/resources/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/forms/resources/page.js`
- `./.next/server/app/(dashboard)/dashboard/forms/resources/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/forms/website/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/forms/website/page.js`
- `./.next/server/app/(dashboard)/dashboard/forms/website/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/notifications/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/notifications/page.js`
- `./.next/server/app/(dashboard)/dashboard/notifications/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/onboarding/details/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/onboarding/details/page.js`
- `./.next/server/app/(dashboard)/dashboard/onboarding/details/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/referrals/sources/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/referrals/sources/page.js`
- `./.next/server/app/(dashboard)/dashboard/referrals/sources/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/settings/analytics/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/settings/analytics/page.js`
- `./.next/server/app/(dashboard)/dashboard/settings/analytics/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/settings/locations/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/settings/locations/page.js`
- `./.next/server/app/(dashboard)/dashboard/settings/locations/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/settings/profile/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/settings/profile/page.js`
- `./.next/server/app/(dashboard)/dashboard/settings/profile/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/settings/users/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/settings/users/page.js`
- `./.next/server/app/(dashboard)/dashboard/settings/users/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/social/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/social/page.js`
- `./.next/server/app/(dashboard)/dashboard/social/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/tasks/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/tasks/page.js`
- `./.next/server/app/(dashboard)/dashboard/tasks/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/team/applicants/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/team/applicants/page.js`
- `./.next/server/app/(dashboard)/dashboard/team/applicants/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/team/careers/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/team/careers/page.js`
- `./.next/server/app/(dashboard)/dashboard/team/careers/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/team/employees/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/team/employees/page.js`
- `./.next/server/app/(dashboard)/dashboard/team/employees/page/app-build-manifest.json`
- `./.next/server/app/(dashboard)/dashboard/team/jobs/page_client-reference-manifest.js`
- `./.next/server/app/(dashboard)/dashboard/team/jobs/page.js`
- `./.next/server/app/(dashboard)/dashboard/team/jobs/page/app-build-manifest.json`
- `./.next/server/app/(intake)/agreements/[slug]/[packetSlug]/page.js`
- `./.next/server/app/(jobs)/apple-icon-12hrsc/route.js`
- `./.next/server/app/(jobs)/apple-icon-12hrsc/route.js.map`
- `./.next/server/app/(jobs)/jobs/sitemap.xml/route.js`
- `./.next/server/app/(site)/behaviorwork/get-started/page.js`
- `./.next/server/app/(site)/behaviorwork/page.js`
- `./.next/server/app/(site)/faq/page.js`
- `./.next/server/app/(site)/get-listed/page.js`
- `./.next/server/app/(site)/insurance/page.js`
- `./.next/server/app/(site)/learn/[slug]/page.js`
- `./.next/server/app/(site)/learn/glossary/page.js`
- `./.next/server/app/(site)/learn/page.js`
- `./.next/server/app/(site)/legal/privacy/page.js`
- `./.next/server/app/(site)/legal/terms/page.js`
- `./.next/server/app/(site)/page_client-reference-manifest.js`
- `./.next/server/app/(site)/page.js`
- `./.next/server/app/(site)/page/app-build-manifest.json`
- `./.next/server/app/(site)/provider/p/[slug]/page.js`
- `./.next/server/app/(site)/states/page.js`
- `./.next/server/app/api/agreements/document-preview/route.js`
- `./.next/server/app/api/analytics/track/route.js`
- `./.next/server/app/api/og/route.js`
- `./.next/server/app/api/og/route.js.map`
- `./.next/server/app/api/places/search/route.js`
- `./.next/server/app/api/social/render/[templateId]/route.js`
- `./.next/server/app/auth/callback/route.js`
- `./.next/server/app/auth/confirm/route.js`
- `./.next/server/app/sitemap.xml/route.js`
- `./.next/server/chunks/1440.js`
- `./.next/server/chunks/2353.js`
- `./.next/server/chunks/2672.js`
- `./.next/server/chunks/268.js`
- `./.next/server/chunks/2951.js`
- `./.next/server/chunks/4377.js`
- `./.next/server/chunks/4471.js`
- `./.next/server/chunks/4828.js`
- `./.next/server/chunks/5407.js`
- `./.next/server/chunks/5444.js`
- `./.next/server/chunks/6031.js`
- `./.next/server/chunks/605.js`
- `./.next/server/chunks/6194.js`
- `./.next/server/chunks/6852.js`
- `./.next/server/chunks/765.js`
- `./.next/server/chunks/8040.js`
- `./.next/server/chunks/953.js`
- `./.next/server/chunks/9871.js`
- `./.next/server/chunks/ssr/_24e1b8c9._.js`
- `./.next/server/chunks/ssr/_440f015e._.js`
- `./.next/server/chunks/ssr/_b78d59b9._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__005b4aa4._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__005b4aa4._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__055e267e._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__055e267e._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__088cd93c._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__088cd93c._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__14b66752._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__14b66752._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__15dd832a._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__15dd832a._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__214ed2ba._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__214ed2ba._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__4949c3e1._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__4949c3e1._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__49b68cc1._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__49b68cc1._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__55aded56._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__55aded56._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__59577cc5._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__59577cc5._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__5b89dbfe._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__5b89dbfe._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__5cfee0c2._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__5cfee0c2._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__61deabe9._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__61deabe9._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__724909de._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__724909de._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__818f3952._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__818f3952._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__8386b166._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__8386b166._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__8fdfdf68._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__8fdfdf68._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__97a6cfe6._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__97a6cfe6._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__99cdde44._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__99cdde44._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__a2f6d593._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__a2f6d593._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__a7153174._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__a7153174._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__c8ad75b0._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__c8ad75b0._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__ca4007e8._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__ca4007e8._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__cd3b9f53._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__cd3b9f53._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__dd70a5a6._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__dd70a5a6._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__e1c176dd._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__e1c176dd._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__eadcd777._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__eadcd777._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__f002f30c._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__f002f30c._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__f2e62c0a._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__f2e62c0a._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__f5aac308._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__f5aac308._.js.map`
- `./.next/server/chunks/ssr/[root-of-the-server]__f983fcba._.js`
- `./.next/server/chunks/ssr/[root-of-the-server]__f983fcba._.js.map`
- `./.next/server/chunks/ssr/2c612_next_dist_96346e0c._.js`
- `./.next/server/chunks/ssr/2c612_next_dist_client_a0fbbb62._.js`
- `./.next/server/chunks/ssr/2c612_next_ebe56b1a._.js`
- `./.next/server/chunks/ssr/c77de_@supabase_auth-js_dist_module_a825751e._.js`
- `./.next/server/chunks/ssr/c77de_@supabase_auth-js_dist_module_a825751e._.js.map`
- `./.next/server/chunks/ssr/c77de_@supabase_auth-js_dist_module_bc7d0e73._.js`
- `./.next/server/chunks/ssr/c77de_@supabase_auth-js_dist_module_bc7d0e73._.js.map`
- `./.next/server/chunks/ssr/node_modules__pnpm_691fd451._.js`
- `./.next/server/chunks/ssr/node_modules__pnpm_691fd451._.js.map`
- `./.next/server/chunks/ssr/node_modules__pnpm_bfef1c73._.js`
- `./.next/server/chunks/ssr/node_modules__pnpm_bfef1c73._.js.map`
- `./.next/server/chunks/ssr/node_modules__pnpm_d1424fc4._.js`
- `./.next/server/chunks/ssr/node_modules__pnpm_d1424fc4._.js.map`
- `./.next/server/chunks/ssr/src_02582181._.js`
- `./.next/server/chunks/ssr/src_02582181._.js.map`
- `./.next/server/chunks/ssr/src_04a9265c._.js.map`
- `./.next/server/chunks/ssr/src_08170628._.js`
- `./.next/server/chunks/ssr/src_1d574322._.js`
- `./.next/server/chunks/ssr/src_1d574322._.js.map`
- `./.next/server/chunks/ssr/src_208b5321._.js`
- `./.next/server/chunks/ssr/src_208b5321._.js.map`
- `./.next/server/chunks/ssr/src_27d9ee12._.js.map`
- `./.next/server/chunks/ssr/src_329ea327._.js`
- `./.next/server/chunks/ssr/src_7e9b4a90._.js.map`
- `./.next/server/chunks/ssr/src_86d7a876._.js.map`
- `./.next/server/chunks/ssr/src_8b7ec55c._.js`
- `./.next/server/chunks/ssr/src_8b7ec55c._.js.map`
- `./.next/server/chunks/ssr/src_9636333d._.js.map`
- `./.next/server/chunks/ssr/src_ab847cc9._.js.map`
- `./.next/server/chunks/ssr/src_bbde77d5._.js.map`
- `./.next/server/chunks/ssr/src_be859051._.js`
- `./.next/server/chunks/ssr/src_be859051._.js.map`
- `./.next/server/chunks/ssr/src_c1be70bb._.js.map`
- `./.next/server/chunks/ssr/src_d24ae258._.js`
- `./.next/server/chunks/ssr/src_d24ae258._.js.map`
- `./.next/server/chunks/ssr/src_d2c158a7._.js`
- `./.next/server/chunks/ssr/src_d2c158a7._.js.map`
- `./.next/server/chunks/ssr/src_d75d004e._.js.map`
- `./.next/server/chunks/ssr/src_f18fd60a._.js`
- `./.next/server/chunks/ssr/src_f2c9880e._.js.map`
- `./.next/server/chunks/ssr/src_ff8d8ef2._.js`
- `./.next/server/chunks/ssr/src_ff8d8ef2._.js.map`
- `./.next/server/chunks/ssr/src_lib_23ba1725._.js`
- `./.next/server/chunks/ssr/src_lib_23ba1725._.js.map`
- `./.next/server/chunks/ssr/src_lib_2dc3bc00._.js.map`
- `./.next/server/chunks/ssr/src_lib_757043cd._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_b2aa6cd7._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_c1a25a4d._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:19a390_97fd9b80._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:1b90f9_63b3c247._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:1c21d4_0224a128._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:20f031_2663adbd._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:2bd741_91025577._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:315622_1902fb6a._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:327887_4ee749ed._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:33278e_9d677885._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:34adf0_041bc834._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:3a044a_98c7ef72._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:3c5a36_4732c2c7._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:417a8d_3477d78b._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:459ee8_4666736b._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:5c42d5_d18df54f._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:5de70c_2c75c7bd._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:678f20_d49be6cd._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:7731f4_98b644c1._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:846c2c_0a73b771._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:909320_de689081._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:984e22_709b928b._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:a729b9_be2b34b0._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:b6a954_a55317dc._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:bcfb60_f7e0037f._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:cc6d05_299d7e61._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:d3bb2f_9132b9c7._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:dd08af_8d6cdd5b._.js.map`
- `./.next/server/chunks/ssr/src_lib_actions_data:fa89fe_d52738d0._.js.map`
- `./.next/server/chunks/ssr/src_lib_e0ed4f40._.js.map`
- `./.next/server/chunks/ssr/src_lib_fd15a279._.js.map`
- `./.next/server/edge/chunks/[root-of-the-server]__45e87c07._.js`
- `./.next/server/edge/chunks/[root-of-the-server]__45e87c07._.js.map`
- `./.next/server/edge/chunks/5442f_@supabase_realtime-js_dist_module_98fa1cd4._.js`
- `./.next/server/edge/chunks/5442f_@supabase_realtime-js_dist_module_98fa1cd4._.js.map`
- `./.next/server/edge/chunks/c77de_@supabase_auth-js_dist_module_1aee045b._.js`
- `./.next/server/edge/chunks/c77de_@supabase_auth-js_dist_module_1aee045b._.js.map`
- `./.next/server/edge/chunks/node_modules__pnpm_9738e7fc._.js`
- `./.next/server/edge/chunks/node_modules__pnpm_9738e7fc._.js.map`
- `./.next/server/edge/chunks/turbopack-edge-wrapper_f9463f8d.js`
- `./.next/server/middleware-manifest.json`
- `./.next/server/middleware/middleware-manifest.json`
- `./.next/server/src/middleware.js`
- `./.next/server/src/middleware.js.map`
- `./.next/static/chunks/_b00e7d1d._.js.map`
- `./.next/static/chunks/2c612_next_9d5a22bd._.js`
- `./.next/static/chunks/6981-a975e338c8d4853b.js`
- `./.next/static/chunks/app/(dashboard)/dashboard/social/page-c684c52a93190b7c.js`
- `./.next/static/chunks/app/layout-251caa5774f4e446.js`
- `./.next/static/chunks/c77de_@supabase_auth-js_dist_module_7bb1b1b6._.js`
- `./.next/static/chunks/c77de_@supabase_auth-js_dist_module_7bb1b1b6._.js.map`
- `./.next/static/chunks/node_modules__pnpm_739ba2f3._.js`
- `./.next/static/chunks/node_modules__pnpm_754c3001._.js`
- `./.next/static/chunks/node_modules__pnpm_754c3001._.js.map`
- `./.next/static/chunks/src_096f2d68._.js`
- `./.next/static/chunks/src_096f2d68._.js.map`
- `./.next/static/chunks/src_0a756ad8._.js.map`
- `./.next/static/chunks/src_283a20ba._.js.map`
- `./.next/static/chunks/src_36ee8afc._.js`
- `./.next/static/chunks/src_36ee8afc._.js.map`
- `./.next/static/chunks/src_39f3afe0._.js.map`
- `./.next/static/chunks/src_5f36df20._.js`
- `./.next/static/chunks/src_5f36df20._.js.map`
- `./.next/static/chunks/src_7dc35fb0._.js.map`
- `./.next/static/chunks/src_89acd9fb._.js`
- `./.next/static/chunks/src_89acd9fb._.js.map`
- `./.next/static/chunks/src_9278f0f7._.js.map`
- `./.next/static/chunks/src_9cb0146a._.js.map`
- `./.next/static/chunks/src_app_layout_tsx_0b7d70ee._.js`
- `./.next/static/chunks/src_b13fe64f._.js`
- `./.next/static/chunks/src_b13fe64f._.js.map`
- `./.next/static/chunks/src_bb22dcfe._.js.map`
- `./.next/static/chunks/src_c355696e._.js.map`
- `./.next/static/chunks/src_d1705337._.js.map`
- `./.next/static/chunks/src_dd846e01._.js`
- `./.next/static/chunks/src_dd846e01._.js.map`
- `./.next/static/chunks/src_e03391bd._.js`
- `./.next/static/chunks/src_e03391bd._.js.map`
- `./.next/static/chunks/src_e412455e._.js.map`
- `./.next/static/chunks/src_lib_236f0ad3._.js`
- `./.next/static/chunks/src_lib_236f0ad3._.js.map`
- `./.next/static/chunks/src_lib_38357a1d._.js.map`
- `./.next/static/chunks/src_lib_7366c070._.js.map`
- `./.next/static/chunks/src_lib_actions_433d2dd1._.js.map`
- `./.next/static/chunks/src_lib_actions_9ad0494f._.js.map`
- `./.next/static/chunks/src_lib_actions_data:19a390_8ca758c7._.js.map`
- `./.next/static/chunks/src_lib_actions_data:1b90f9_87b61736._.js.map`
- `./.next/static/chunks/src_lib_actions_data:1c21d4_4926ef73._.js.map`
- `./.next/static/chunks/src_lib_actions_data:20f031_c81eeb39._.js.map`
- `./.next/static/chunks/src_lib_actions_data:2bd741_28c8ddf1._.js.map`
- `./.next/static/chunks/src_lib_actions_data:315622_ca6e64a9._.js.map`
- `./.next/static/chunks/src_lib_actions_data:327887_7c42a0c5._.js.map`
- `./.next/static/chunks/src_lib_actions_data:33278e_499fc3fa._.js.map`
- `./.next/static/chunks/src_lib_actions_data:34adf0_0d6088ff._.js.map`
- `./.next/static/chunks/src_lib_actions_data:3a044a_2b15cb29._.js.map`
- `./.next/static/chunks/src_lib_actions_data:3c5a36_6d28be61._.js.map`
- `./.next/static/chunks/src_lib_actions_data:417a8d_1fac6485._.js.map`
- `./.next/static/chunks/src_lib_actions_data:459ee8_8244462d._.js.map`
- `./.next/static/chunks/src_lib_actions_data:5c42d5_9e715771._.js.map`
- `./.next/static/chunks/src_lib_actions_data:5de70c_d8da794d._.js.map`
- `./.next/static/chunks/src_lib_actions_data:678f20_e4fb48da._.js.map`
- `./.next/static/chunks/src_lib_actions_data:7731f4_47650312._.js.map`
- `./.next/static/chunks/src_lib_actions_data:846c2c_01c3be2c._.js.map`
- `./.next/static/chunks/src_lib_actions_data:909320_5caeea14._.js.map`
- `./.next/static/chunks/src_lib_actions_data:984e22_dee987d3._.js.map`
- `./.next/static/chunks/src_lib_actions_data:a729b9_fda39504._.js.map`
- `./.next/static/chunks/src_lib_actions_data:b6a954_9a691385._.js.map`
- `./.next/static/chunks/src_lib_actions_data:bcfb60_63158e6a._.js.map`
- `./.next/static/chunks/src_lib_actions_data:cc6d05_fd0aa2fd._.js.map`
- `./.next/static/chunks/src_lib_actions_data:d3bb2f_8e8d8fc6._.js.map`
- `./.next/static/chunks/src_lib_actions_data:dd08af_2787ae08._.js.map`
- `./.next/static/chunks/src_lib_actions_data:fa89fe_09bbb9e0._.js.map`
- `./.next/static/chunks/src_lib_ae938a49._.js.map`
- `./.next/static/chunks/src_lib_ffcc4c9d._.js.map`
- `./.next/trace`
- `./.obsidian/workspace.json`
- `./.playwright-mcp/console-2026-03-19T17-12-30-318Z.log`
- `./.playwright-mcp/console-2026-03-19T17-15-26-328Z.log`
- `./.playwright-mcp/console-2026-03-19T18-14-16-592Z.log`
- `./.playwright-mcp/console-2026-03-19T18-16-24-375Z.log`
- `./convex/schema.ts`
- `./docs/architecture.md`
- `./docs/migrations/2026-03-29-supabase-clerk-convex-inventory.md`
- `./docs/migrations/2026-03-31-supabase-cutover-determination.md`
- `./docs/migrations/parallel-cutover/agent-manifest.json`
- `./docs/migrations/parallel-cutover/COMMON-WORKER-PROMPT.md`
- `./docs/migrations/parallel-cutover/PARALLEL-RULES.md`
- `./docs/migrations/parallel-cutover/prompts/01-auth-workspace.md`
- `./docs/migrations/parallel-cutover/prompts/09-tooling-cleanup.md`
- `./docs/migrations/parallel-cutover/README.md`
- `./docs/migrations/parallel-cutover/shards/09-tooling-cleanup-tasks.md`
- `./docs/plans/2026-03-19-social-posts-plan.md`
- `./e2e/auth.setup.ts`
- `./e2e/lib/auth-helper.ts`
- `./next.config.mjs`
- `./node_modules/.ignored/@supabase/ssr/CHANGELOG.md`
- `./node_modules/.ignored/@supabase/ssr/dist/main/cookies.js`
- `./node_modules/.ignored/@supabase/ssr/dist/main/createBrowserClient.d.ts`
- `./node_modules/.ignored/@supabase/ssr/dist/main/createBrowserClient.js`
- `./node_modules/.ignored/@supabase/ssr/dist/main/createServerClient.d.ts`
- `./node_modules/.ignored/@supabase/ssr/dist/main/createServerClient.js`
- `./node_modules/.ignored/@supabase/ssr/dist/main/utils/base64url.d.ts`
- `./node_modules/.ignored/@supabase/ssr/dist/main/utils/base64url.js`
- `./node_modules/.ignored/@supabase/ssr/dist/main/utils/helpers.d.ts`
- `./node_modules/.ignored/@supabase/ssr/dist/main/utils/helpers.js`
- `./node_modules/.ignored/@supabase/ssr/dist/module/cookies.js`
- `./node_modules/.ignored/@supabase/ssr/dist/module/createBrowserClient.d.ts`
- `./node_modules/.ignored/@supabase/ssr/dist/module/createBrowserClient.js`
- `./node_modules/.ignored/@supabase/ssr/dist/module/createServerClient.d.ts`
- `./node_modules/.ignored/@supabase/ssr/dist/module/createServerClient.js`
- `./node_modules/.ignored/@supabase/ssr/dist/module/utils/base64url.d.ts`
- `./node_modules/.ignored/@supabase/ssr/dist/module/utils/base64url.js`
- `./node_modules/.ignored/@supabase/ssr/dist/module/utils/helpers.d.ts`
- `./node_modules/.ignored/@supabase/ssr/dist/module/utils/helpers.js`
- `./node_modules/.ignored/@supabase/ssr/package.json`
- `./node_modules/.ignored/@supabase/ssr/README.md`
- `./node_modules/.ignored/@supabase/ssr/src/cookies.ts`
- `./node_modules/.ignored/@supabase/ssr/src/createBrowserClient.ts`
- `./node_modules/.ignored/@supabase/ssr/src/createServerClient.ts`
- `./node_modules/.ignored/@supabase/ssr/src/utils/base64url.ts`
- `./node_modules/.ignored/@supabase/ssr/src/utils/helpers.ts`
- `./node_modules/.ignored/@supabase/supabase-js/dist/main/index.d.ts`
- `./node_modules/.ignored/@supabase/supabase-js/dist/main/index.js`
- `./node_modules/.ignored/@supabase/supabase-js/dist/main/lib/constants.d.ts`
- `./node_modules/.ignored/@supabase/supabase-js/dist/main/lib/constants.js`
- `./node_modules/.ignored/@supabase/supabase-js/dist/main/lib/fetch.d.ts`
- `./node_modules/.ignored/@supabase/supabase-js/dist/main/lib/fetch.js`
- `./node_modules/.ignored/@supabase/supabase-js/dist/main/lib/helpers.d.ts`
- `./node_modules/.ignored/@supabase/supabase-js/dist/main/lib/helpers.js`
- `./node_modules/.ignored/@supabase/supabase-js/dist/main/lib/rest/types/common/common.d.ts`
- `./node_modules/.ignored/@supabase/supabase-js/dist/main/lib/rest/types/common/common.js`
- `./node_modules/.ignored/@supabase/supabase-js/dist/main/lib/rest/types/common/rpc.d.ts`
- `./node_modules/.ignored/@supabase/supabase-js/dist/main/lib/rest/types/common/rpc.js`
- `./node_modules/.ignored/@supabase/supabase-js/dist/main/lib/SupabaseAuthClient.d.ts`
- `./node_modules/.ignored/@supabase/supabase-js/dist/main/lib/SupabaseAuthClient.js`
- `./node_modules/.ignored/@supabase/supabase-js/dist/main/lib/types.d.ts`
- `./node_modules/.ignored/@supabase/supabase-js/dist/main/SupabaseClient.d.ts`
- `./node_modules/.ignored/@supabase/supabase-js/dist/main/SupabaseClient.js`
- `./node_modules/.ignored/@supabase/supabase-js/dist/module/index.d.ts`
- `./node_modules/.ignored/@supabase/supabase-js/dist/module/index.js`
- `./node_modules/.ignored/@supabase/supabase-js/dist/module/lib/constants.d.ts`
- `./node_modules/.ignored/@supabase/supabase-js/dist/module/lib/constants.js`
- `./node_modules/.ignored/@supabase/supabase-js/dist/module/lib/fetch.d.ts`
- `./node_modules/.ignored/@supabase/supabase-js/dist/module/lib/fetch.js`
- `./node_modules/.ignored/@supabase/supabase-js/dist/module/lib/helpers.d.ts`
- `./node_modules/.ignored/@supabase/supabase-js/dist/module/lib/helpers.js`
- `./node_modules/.ignored/@supabase/supabase-js/dist/module/lib/rest/types/common/common.d.ts`
- `./node_modules/.ignored/@supabase/supabase-js/dist/module/lib/rest/types/common/common.js`
- `./node_modules/.ignored/@supabase/supabase-js/dist/module/lib/rest/types/common/rpc.d.ts`
- `./node_modules/.ignored/@supabase/supabase-js/dist/module/lib/rest/types/common/rpc.js`
- `./node_modules/.ignored/@supabase/supabase-js/dist/module/lib/SupabaseAuthClient.d.ts`
- `./node_modules/.ignored/@supabase/supabase-js/dist/module/lib/SupabaseAuthClient.js`
- `./node_modules/.ignored/@supabase/supabase-js/dist/module/lib/types.d.ts`
- `./node_modules/.ignored/@supabase/supabase-js/dist/module/SupabaseClient.d.ts`
- `./node_modules/.ignored/@supabase/supabase-js/dist/module/SupabaseClient.js`
- `./node_modules/.ignored/@supabase/supabase-js/dist/umd/supabase.js`
- `./node_modules/.ignored/@supabase/supabase-js/package.json`
- `./node_modules/.ignored/@supabase/supabase-js/README.md`
- `./node_modules/.ignored/@supabase/supabase-js/src/index.ts`
- `./node_modules/.ignored/@supabase/supabase-js/src/lib/constants.ts`
- `./node_modules/.ignored/@supabase/supabase-js/src/lib/fetch.ts`
- `./node_modules/.ignored/@supabase/supabase-js/src/lib/helpers.ts`
- `./node_modules/.ignored/@supabase/supabase-js/src/lib/rest/types/common/common.ts`
- `./node_modules/.ignored/@supabase/supabase-js/src/lib/rest/types/common/rpc.ts`
- `./node_modules/.ignored/@supabase/supabase-js/src/lib/SupabaseAuthClient.ts`
- `./node_modules/.ignored/@supabase/supabase-js/src/lib/types.ts`
- `./node_modules/.ignored/@supabase/supabase-js/src/SupabaseClient.ts`
- `./node_modules/.modules.yaml`
- `./node_modules/.package-lock.json`
- `./node_modules/.pnpm/@clerk+backend@3.2.3_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/@clerk/backend/dist/chunk-7KLH7JRZ.mjs.map`
- `./node_modules/.pnpm/@clerk+backend@3.2.3_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/@clerk/backend/dist/index.js.map`
- `./node_modules/.pnpm/@clerk+backend@3.2.3_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/@clerk/backend/dist/internal.js.map`
- `./node_modules/.pnpm/@clerk+backend@3.2.3_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/@clerk/backend/dist/jwt/index.js.map`
- `./node_modules/.pnpm/@clerk+nextjs@7.0.7_next@15.5.9_@babel+core@7.28.6_@opentelemetry+api@1.9.0_@playwright_e7ff72dbc82f8c298292ba9ed6e55a12/node_modules/@clerk/nextjs/dist/cjs/server/createGetAuth.js.map`
- `./node_modules/.pnpm/@clerk+nextjs@7.0.7_next@15.5.9_@babel+core@7.28.6_@opentelemetry+api@1.9.0_@playwright_e7ff72dbc82f8c298292ba9ed6e55a12/node_modules/@clerk/nextjs/dist/esm/server/createGetAuth.js.map`
- `./node_modules/.pnpm/@clerk+nextjs@7.0.7_next@15.5.9_@babel+core@7.28.6_@opentelemetry+api@1.9.0_@playwright_e7ff72dbc82f8c298292ba9ed6e55a12/node_modules/@clerk/nextjs/dist/types/server/createGetAuth.d.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/main/GoTrueAdminApi.d.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/main/GoTrueAdminApi.js`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/main/GoTrueClient.d.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/main/GoTrueClient.js`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/main/lib/base64url.d.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/main/lib/base64url.js`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/main/lib/constants.d.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/main/lib/constants.js`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/main/lib/errors.d.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/main/lib/errors.js`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/main/lib/helpers.js`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/main/lib/locks.d.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/main/lib/locks.js`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/main/lib/types.d.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/main/lib/web3/ethereum.js`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.d.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.js`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/module/GoTrueClient.d.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/module/GoTrueClient.js`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/module/lib/base64url.d.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/module/lib/base64url.js`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/module/lib/constants.d.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/module/lib/constants.js`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/module/lib/errors.d.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/module/lib/errors.js`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/module/lib/helpers.js`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/module/lib/locks.d.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/module/lib/locks.js`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/module/lib/types.d.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/dist/module/lib/web3/ethereum.js`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/package.json`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/README.md`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/src/GoTrueAdminApi.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/src/GoTrueClient.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/src/lib/base64url.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/src/lib/constants.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/src/lib/errors.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/src/lib/helpers.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/src/lib/locks.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/src/lib/types.ts`
- `./node_modules/.pnpm/@supabase+auth-js@2.90.1/node_modules/@supabase/auth-js/src/lib/web3/ethereum.ts`
- `./node_modules/.pnpm/@supabase+functions-js@2.90.1/node_modules/@supabase/functions-js/dist/main/FunctionsClient.d.ts`
- `./node_modules/.pnpm/@supabase+functions-js@2.90.1/node_modules/@supabase/functions-js/dist/main/FunctionsClient.js`
- `./node_modules/.pnpm/@supabase+functions-js@2.90.1/node_modules/@supabase/functions-js/dist/main/types.d.ts`
- `./node_modules/.pnpm/@supabase+functions-js@2.90.1/node_modules/@supabase/functions-js/dist/main/types.js`
- `./node_modules/.pnpm/@supabase+functions-js@2.90.1/node_modules/@supabase/functions-js/dist/module/FunctionsClient.d.ts`
- `./node_modules/.pnpm/@supabase+functions-js@2.90.1/node_modules/@supabase/functions-js/dist/module/FunctionsClient.js`
- `./node_modules/.pnpm/@supabase+functions-js@2.90.1/node_modules/@supabase/functions-js/dist/module/types.d.ts`
- `./node_modules/.pnpm/@supabase+functions-js@2.90.1/node_modules/@supabase/functions-js/dist/module/types.js`
- `./node_modules/.pnpm/@supabase+functions-js@2.90.1/node_modules/@supabase/functions-js/package.json`
- `./node_modules/.pnpm/@supabase+functions-js@2.90.1/node_modules/@supabase/functions-js/README.md`
- `./node_modules/.pnpm/@supabase+functions-js@2.90.1/node_modules/@supabase/functions-js/src/FunctionsClient.ts`
- `./node_modules/.pnpm/@supabase+functions-js@2.90.1/node_modules/@supabase/functions-js/src/types.ts`
- `./node_modules/.pnpm/@supabase+postgrest-js@2.90.1/node_modules/@supabase/postgrest-js/dist/index.cjs`
- `./node_modules/.pnpm/@supabase+postgrest-js@2.90.1/node_modules/@supabase/postgrest-js/dist/index.cjs.map`
- `./node_modules/.pnpm/@supabase+postgrest-js@2.90.1/node_modules/@supabase/postgrest-js/dist/index.d.cts`
- `./node_modules/.pnpm/@supabase+postgrest-js@2.90.1/node_modules/@supabase/postgrest-js/dist/index.d.mts`
- `./node_modules/.pnpm/@supabase+postgrest-js@2.90.1/node_modules/@supabase/postgrest-js/dist/index.mjs`
- `./node_modules/.pnpm/@supabase+postgrest-js@2.90.1/node_modules/@supabase/postgrest-js/dist/index.mjs.map`
- `./node_modules/.pnpm/@supabase+postgrest-js@2.90.1/node_modules/@supabase/postgrest-js/package.json`
- `./node_modules/.pnpm/@supabase+postgrest-js@2.90.1/node_modules/@supabase/postgrest-js/README.md`
- `./node_modules/.pnpm/@supabase+postgrest-js@2.90.1/node_modules/@supabase/postgrest-js/src/index.ts`
- `./node_modules/.pnpm/@supabase+postgrest-js@2.90.1/node_modules/@supabase/postgrest-js/src/PostgrestBuilder.ts`
- `./node_modules/.pnpm/@supabase+postgrest-js@2.90.1/node_modules/@supabase/postgrest-js/src/PostgrestClient.ts`
- `./node_modules/.pnpm/@supabase+postgrest-js@2.90.1/node_modules/@supabase/postgrest-js/src/PostgrestError.ts`
- `./node_modules/.pnpm/@supabase+postgrest-js@2.90.1/node_modules/@supabase/postgrest-js/src/PostgrestQueryBuilder.ts`
- `./node_modules/.pnpm/@supabase+postgrest-js@2.90.1/node_modules/@supabase/postgrest-js/src/PostgrestTransformBuilder.ts`
- `./node_modules/.pnpm/@supabase+postgrest-js@2.90.1/node_modules/@supabase/postgrest-js/src/select-query-parser/utils.ts`
- `./node_modules/.pnpm/@supabase+postgrest-js@2.90.1/node_modules/@supabase/postgrest-js/src/types/common/common.ts`
- `./node_modules/.pnpm/@supabase+postgrest-js@2.90.1/node_modules/@supabase/postgrest-js/src/types/types.ts`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/dist/main/lib/transformers.d.ts`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/dist/main/lib/transformers.js`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/dist/main/lib/websocket-factory.d.ts`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/dist/main/lib/websocket-factory.js`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/dist/main/RealtimeChannel.d.ts`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/dist/main/RealtimeChannel.js`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/dist/main/RealtimeClient.d.ts`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/dist/main/RealtimeClient.js`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/dist/module/lib/transformers.d.ts`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/dist/module/lib/transformers.js`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/dist/module/lib/websocket-factory.d.ts`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/dist/module/lib/websocket-factory.js`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/dist/module/RealtimeChannel.d.ts`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/dist/module/RealtimeChannel.js`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/dist/module/RealtimeClient.d.ts`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/dist/module/RealtimeClient.js`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/package.json`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/README.md`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/src/lib/transformers.ts`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/src/lib/websocket-factory.ts`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/src/RealtimeChannel.ts`
- `./node_modules/.pnpm/@supabase+realtime-js@2.90.1/node_modules/@supabase/realtime-js/src/RealtimeClient.ts`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/CHANGELOG.md`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/dist/main/cookies.js`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/dist/main/createBrowserClient.d.ts`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/dist/main/createBrowserClient.js`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/dist/main/createServerClient.d.ts`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/dist/main/createServerClient.js`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/dist/main/utils/base64url.d.ts`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/dist/main/utils/base64url.js`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/dist/main/utils/helpers.d.ts`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/dist/main/utils/helpers.js`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/dist/module/cookies.js`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/dist/module/createBrowserClient.d.ts`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/dist/module/createBrowserClient.js`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/dist/module/createServerClient.d.ts`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/dist/module/createServerClient.js`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/dist/module/utils/base64url.d.ts`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/dist/module/utils/base64url.js`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/dist/module/utils/helpers.d.ts`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/dist/module/utils/helpers.js`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/package.json`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/README.md`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/src/cookies.ts`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/src/createBrowserClient.ts`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/src/createServerClient.ts`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/src/utils/base64url.ts`
- `./node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.90.1/node_modules/@supabase/ssr/src/utils/helpers.ts`
- `./node_modules/.pnpm/@supabase+storage-js@2.90.1/node_modules/@supabase/storage-js/dist/index.cjs`
- `./node_modules/.pnpm/@supabase+storage-js@2.90.1/node_modules/@supabase/storage-js/dist/index.cjs.map`
- `./node_modules/.pnpm/@supabase+storage-js@2.90.1/node_modules/@supabase/storage-js/dist/index.d.cts`
- `./node_modules/.pnpm/@supabase+storage-js@2.90.1/node_modules/@supabase/storage-js/dist/index.d.mts`
- `./node_modules/.pnpm/@supabase+storage-js@2.90.1/node_modules/@supabase/storage-js/dist/index.mjs`
- `./node_modules/.pnpm/@supabase+storage-js@2.90.1/node_modules/@supabase/storage-js/dist/index.mjs.map`
- `./node_modules/.pnpm/@supabase+storage-js@2.90.1/node_modules/@supabase/storage-js/dist/umd/supabase.js`
- `./node_modules/.pnpm/@supabase+storage-js@2.90.1/node_modules/@supabase/storage-js/package.json`
- `./node_modules/.pnpm/@supabase+storage-js@2.90.1/node_modules/@supabase/storage-js/README.md`
- `./node_modules/.pnpm/@supabase+storage-js@2.90.1/node_modules/@supabase/storage-js/src/lib/vectors/StorageVectorsClient.ts`
- `./node_modules/.pnpm/@supabase+storage-js@2.90.1/node_modules/@supabase/storage-js/src/lib/vectors/VectorBucketApi.ts`
- `./node_modules/.pnpm/@supabase+storage-js@2.90.1/node_modules/@supabase/storage-js/src/lib/vectors/VectorDataApi.ts`
- `./node_modules/.pnpm/@supabase+storage-js@2.90.1/node_modules/@supabase/storage-js/src/lib/vectors/VectorIndexApi.ts`
- `./node_modules/.pnpm/@supabase+storage-js@2.90.1/node_modules/@supabase/storage-js/src/packages/StorageAnalyticsClient.ts`
- `./node_modules/.pnpm/@supabase+storage-js@2.90.1/node_modules/@supabase/storage-js/src/packages/StorageBucketApi.ts`
- `./node_modules/.pnpm/@supabase+storage-js@2.90.1/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts`
- `./node_modules/.pnpm/@supabase+storage-js@2.90.1/node_modules/@supabase/storage-js/src/StorageClient.ts`
- `./node_modules/.pnpm/@supabase+supabase-js@2.90.1/node_modules/@supabase/supabase-js/dist/index.cjs`
- `./node_modules/.pnpm/@supabase+supabase-js@2.90.1/node_modules/@supabase/supabase-js/dist/index.cjs.map`
- `./node_modules/.pnpm/@supabase+supabase-js@2.90.1/node_modules/@supabase/supabase-js/dist/index.d.cts`
- `./node_modules/.pnpm/@supabase+supabase-js@2.90.1/node_modules/@supabase/supabase-js/dist/index.d.mts`
- `./node_modules/.pnpm/@supabase+supabase-js@2.90.1/node_modules/@supabase/supabase-js/dist/index.mjs`
- `./node_modules/.pnpm/@supabase+supabase-js@2.90.1/node_modules/@supabase/supabase-js/dist/index.mjs.map`
- `./node_modules/.pnpm/@supabase+supabase-js@2.90.1/node_modules/@supabase/supabase-js/dist/umd/supabase.js`
- `./node_modules/.pnpm/@supabase+supabase-js@2.90.1/node_modules/@supabase/supabase-js/package.json`
- `./node_modules/.pnpm/@supabase+supabase-js@2.90.1/node_modules/@supabase/supabase-js/README.md`
- `./node_modules/.pnpm/@supabase+supabase-js@2.90.1/node_modules/@supabase/supabase-js/src/index.ts`
- `./node_modules/.pnpm/@supabase+supabase-js@2.90.1/node_modules/@supabase/supabase-js/src/lib/constants.ts`
- `./node_modules/.pnpm/@supabase+supabase-js@2.90.1/node_modules/@supabase/supabase-js/src/lib/fetch.ts`
- `./node_modules/.pnpm/@supabase+supabase-js@2.90.1/node_modules/@supabase/supabase-js/src/lib/helpers.ts`
- `./node_modules/.pnpm/@supabase+supabase-js@2.90.1/node_modules/@supabase/supabase-js/src/lib/rest/types/common/common.ts`
- `./node_modules/.pnpm/@supabase+supabase-js@2.90.1/node_modules/@supabase/supabase-js/src/lib/rest/types/common/rpc.ts`
- `./node_modules/.pnpm/@supabase+supabase-js@2.90.1/node_modules/@supabase/supabase-js/src/lib/SupabaseAuthClient.ts`
- `./node_modules/.pnpm/@supabase+supabase-js@2.90.1/node_modules/@supabase/supabase-js/src/lib/types.ts`
- `./node_modules/.pnpm/@supabase+supabase-js@2.90.1/node_modules/@supabase/supabase-js/src/SupabaseClient.ts`
- `./node_modules/.pnpm/iceberg-js@0.8.1/node_modules/iceberg-js/package.json`
- `./node_modules/.pnpm/iceberg-js@0.8.1/node_modules/iceberg-js/README.md`
- `./node_modules/.pnpm/lock.yaml`
- `./node_modules/.pnpm/tldts@7.0.19/node_modules/tldts/dist/cjs/index.js`
- `./node_modules/.pnpm/tldts@7.0.19/node_modules/tldts/dist/cjs/index.js.map`
- `./node_modules/.pnpm/tldts@7.0.19/node_modules/tldts/dist/cjs/src/data/trie.js`
- `./node_modules/.pnpm/tldts@7.0.19/node_modules/tldts/dist/es6/src/data/trie.js`
- `./node_modules/.pnpm/tldts@7.0.19/node_modules/tldts/dist/index.cjs.min.js`
- `./node_modules/.pnpm/tldts@7.0.19/node_modules/tldts/dist/index.cjs.min.js.map`
- `./node_modules/.pnpm/tldts@7.0.19/node_modules/tldts/dist/index.esm.min.js`
- `./node_modules/.pnpm/tldts@7.0.19/node_modules/tldts/dist/index.esm.min.js.map`
- `./node_modules/.pnpm/tldts@7.0.19/node_modules/tldts/dist/index.umd.min.js`
- `./node_modules/.pnpm/tldts@7.0.19/node_modules/tldts/dist/index.umd.min.js.map`
- `./node_modules/.pnpm/tldts@7.0.19/node_modules/tldts/src/data/trie.ts`
- `./node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json`
- `./node_modules/@supabase/.ignored_ssr/CHANGELOG.md`
- `./node_modules/@supabase/.ignored_ssr/dist/main/cookies.js`
- `./node_modules/@supabase/.ignored_ssr/dist/main/createBrowserClient.d.ts`
- `./node_modules/@supabase/.ignored_ssr/dist/main/createBrowserClient.js`
- `./node_modules/@supabase/.ignored_ssr/dist/main/createServerClient.d.ts`
- `./node_modules/@supabase/.ignored_ssr/dist/main/createServerClient.js`
- `./node_modules/@supabase/.ignored_ssr/dist/main/utils/base64url.d.ts`
- `./node_modules/@supabase/.ignored_ssr/dist/main/utils/base64url.js`
- `./node_modules/@supabase/.ignored_ssr/dist/main/utils/helpers.d.ts`
- `./node_modules/@supabase/.ignored_ssr/dist/main/utils/helpers.js`
- `./node_modules/@supabase/.ignored_ssr/dist/module/cookies.js`
- `./node_modules/@supabase/.ignored_ssr/dist/module/createBrowserClient.d.ts`
- `./node_modules/@supabase/.ignored_ssr/dist/module/createBrowserClient.js`
- `./node_modules/@supabase/.ignored_ssr/dist/module/createServerClient.d.ts`
- `./node_modules/@supabase/.ignored_ssr/dist/module/createServerClient.js`
- `./node_modules/@supabase/.ignored_ssr/dist/module/utils/base64url.d.ts`
- `./node_modules/@supabase/.ignored_ssr/dist/module/utils/base64url.js`
- `./node_modules/@supabase/.ignored_ssr/dist/module/utils/helpers.d.ts`
- `./node_modules/@supabase/.ignored_ssr/dist/module/utils/helpers.js`
- `./node_modules/@supabase/.ignored_ssr/package.json`
- `./node_modules/@supabase/.ignored_ssr/README.md`
- `./node_modules/@supabase/.ignored_ssr/src/cookies.ts`
- `./node_modules/@supabase/.ignored_ssr/src/createBrowserClient.ts`
- `./node_modules/@supabase/.ignored_ssr/src/createServerClient.ts`
- `./node_modules/@supabase/.ignored_ssr/src/utils/base64url.ts`
- `./node_modules/@supabase/.ignored_ssr/src/utils/helpers.ts`
- `./node_modules/@supabase/.ignored_supabase-js/dist/main/index.d.ts`
- `./node_modules/@supabase/.ignored_supabase-js/dist/main/index.js`
- `./node_modules/@supabase/.ignored_supabase-js/dist/main/lib/constants.d.ts`
- `./node_modules/@supabase/.ignored_supabase-js/dist/main/lib/constants.js`
- `./node_modules/@supabase/.ignored_supabase-js/dist/main/lib/fetch.d.ts`
- `./node_modules/@supabase/.ignored_supabase-js/dist/main/lib/fetch.js`
- `./node_modules/@supabase/.ignored_supabase-js/dist/main/lib/helpers.d.ts`
- `./node_modules/@supabase/.ignored_supabase-js/dist/main/lib/helpers.js`
- `./node_modules/@supabase/.ignored_supabase-js/dist/main/lib/rest/types/common/common.d.ts`
- `./node_modules/@supabase/.ignored_supabase-js/dist/main/lib/rest/types/common/common.js`
- `./node_modules/@supabase/.ignored_supabase-js/dist/main/lib/rest/types/common/rpc.d.ts`
- `./node_modules/@supabase/.ignored_supabase-js/dist/main/lib/rest/types/common/rpc.js`
- `./node_modules/@supabase/.ignored_supabase-js/dist/main/lib/SupabaseAuthClient.d.ts`
- `./node_modules/@supabase/.ignored_supabase-js/dist/main/lib/SupabaseAuthClient.js`
- `./node_modules/@supabase/.ignored_supabase-js/dist/main/lib/types.d.ts`
- `./node_modules/@supabase/.ignored_supabase-js/dist/main/SupabaseClient.d.ts`
- `./node_modules/@supabase/.ignored_supabase-js/dist/main/SupabaseClient.js`
- `./node_modules/@supabase/.ignored_supabase-js/dist/module/index.d.ts`
- `./node_modules/@supabase/.ignored_supabase-js/dist/module/index.js`
- `./node_modules/@supabase/.ignored_supabase-js/dist/module/lib/constants.d.ts`
- `./node_modules/@supabase/.ignored_supabase-js/dist/module/lib/constants.js`
- `./node_modules/@supabase/.ignored_supabase-js/dist/module/lib/fetch.d.ts`
- `./node_modules/@supabase/.ignored_supabase-js/dist/module/lib/fetch.js`
- `./node_modules/@supabase/.ignored_supabase-js/dist/module/lib/helpers.d.ts`
- `./node_modules/@supabase/.ignored_supabase-js/dist/module/lib/helpers.js`
- `./node_modules/@supabase/.ignored_supabase-js/dist/module/lib/rest/types/common/common.d.ts`
- `./node_modules/@supabase/.ignored_supabase-js/dist/module/lib/rest/types/common/common.js`
- `./node_modules/@supabase/.ignored_supabase-js/dist/module/lib/rest/types/common/rpc.d.ts`
- `./node_modules/@supabase/.ignored_supabase-js/dist/module/lib/rest/types/common/rpc.js`
- `./node_modules/@supabase/.ignored_supabase-js/dist/module/lib/SupabaseAuthClient.d.ts`
- `./node_modules/@supabase/.ignored_supabase-js/dist/module/lib/SupabaseAuthClient.js`
- `./node_modules/@supabase/.ignored_supabase-js/dist/module/lib/types.d.ts`
- `./node_modules/@supabase/.ignored_supabase-js/dist/module/SupabaseClient.d.ts`
- `./node_modules/@supabase/.ignored_supabase-js/dist/module/SupabaseClient.js`
- `./node_modules/@supabase/.ignored_supabase-js/dist/umd/supabase.js`
- `./node_modules/@supabase/.ignored_supabase-js/package.json`
- `./node_modules/@supabase/.ignored_supabase-js/README.md`
- `./node_modules/@supabase/.ignored_supabase-js/src/index.ts`
- `./node_modules/@supabase/.ignored_supabase-js/src/lib/constants.ts`
- `./node_modules/@supabase/.ignored_supabase-js/src/lib/fetch.ts`
- `./node_modules/@supabase/.ignored_supabase-js/src/lib/helpers.ts`
- `./node_modules/@supabase/.ignored_supabase-js/src/lib/rest/types/common/common.ts`
- `./node_modules/@supabase/.ignored_supabase-js/src/lib/rest/types/common/rpc.ts`
- `./node_modules/@supabase/.ignored_supabase-js/src/lib/SupabaseAuthClient.ts`
- `./node_modules/@supabase/.ignored_supabase-js/src/lib/types.ts`
- `./node_modules/@supabase/.ignored_supabase-js/src/SupabaseClient.ts`
- `./node_modules/@supabase/auth-js/dist/main/GoTrueAdminApi.js`
- `./node_modules/@supabase/auth-js/dist/main/GoTrueClient.js`
- `./node_modules/@supabase/auth-js/dist/main/lib/base64url.d.ts`
- `./node_modules/@supabase/auth-js/dist/main/lib/base64url.js`
- `./node_modules/@supabase/auth-js/dist/main/lib/constants.d.ts`
- `./node_modules/@supabase/auth-js/dist/main/lib/constants.js`
- `./node_modules/@supabase/auth-js/dist/main/lib/helpers.js`
- `./node_modules/@supabase/auth-js/dist/main/lib/locks.d.ts`
- `./node_modules/@supabase/auth-js/dist/main/lib/locks.js`
- `./node_modules/@supabase/auth-js/dist/main/lib/web3/ethereum.js`
- `./node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.js`
- `./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js`
- `./node_modules/@supabase/auth-js/dist/module/lib/base64url.d.ts`
- `./node_modules/@supabase/auth-js/dist/module/lib/base64url.js`
- `./node_modules/@supabase/auth-js/dist/module/lib/constants.d.ts`
- `./node_modules/@supabase/auth-js/dist/module/lib/constants.js`
- `./node_modules/@supabase/auth-js/dist/module/lib/helpers.js`
- `./node_modules/@supabase/auth-js/dist/module/lib/locks.d.ts`
- `./node_modules/@supabase/auth-js/dist/module/lib/locks.js`
- `./node_modules/@supabase/auth-js/dist/module/lib/web3/ethereum.js`
- `./node_modules/@supabase/auth-js/package.json`
- `./node_modules/@supabase/auth-js/README.md`
- `./node_modules/@supabase/auth-js/src/GoTrueAdminApi.ts`
- `./node_modules/@supabase/auth-js/src/GoTrueClient.ts`
- `./node_modules/@supabase/auth-js/src/lib/base64url.ts`
- `./node_modules/@supabase/auth-js/src/lib/constants.ts`
- `./node_modules/@supabase/auth-js/src/lib/helpers.ts`
- `./node_modules/@supabase/auth-js/src/lib/locks.ts`
- `./node_modules/@supabase/auth-js/src/lib/web3/ethereum.ts`
- `./node_modules/@supabase/functions-js/dist/main/helper.js`
- `./node_modules/@supabase/functions-js/dist/module/helper.js`
- `./node_modules/@supabase/functions-js/package.json`
- `./node_modules/@supabase/functions-js/README.md`
- `./node_modules/@supabase/functions-js/src/helper.ts`
- `./node_modules/@supabase/node-fetch/package.json`
- `./node_modules/@supabase/postgrest-js/dist/cjs/PostgrestBuilder.d.ts`
- `./node_modules/@supabase/postgrest-js/dist/cjs/PostgrestBuilder.js`
- `./node_modules/@supabase/postgrest-js/dist/cjs/PostgrestClient.d.ts`
- `./node_modules/@supabase/postgrest-js/dist/cjs/PostgrestClient.js`
- `./node_modules/@supabase/postgrest-js/dist/cjs/PostgrestTransformBuilder.d.ts`
- `./node_modules/@supabase/postgrest-js/dist/cjs/PostgrestTransformBuilder.js`
- `./node_modules/@supabase/postgrest-js/dist/cjs/types/common/common.js`
- `./node_modules/@supabase/postgrest-js/dist/cjs/types/types.d.ts`
- `./node_modules/@supabase/postgrest-js/package.json`
- `./node_modules/@supabase/postgrest-js/README.md`
- `./node_modules/@supabase/postgrest-js/src/index.ts`
- `./node_modules/@supabase/postgrest-js/src/PostgrestBuilder.ts`
- `./node_modules/@supabase/postgrest-js/src/PostgrestClient.ts`
- `./node_modules/@supabase/postgrest-js/src/PostgrestTransformBuilder.ts`
- `./node_modules/@supabase/postgrest-js/src/select-query-parser/utils.ts`
- `./node_modules/@supabase/postgrest-js/src/types/common/common.ts`
- `./node_modules/@supabase/postgrest-js/src/types/types.ts`
- `./node_modules/@supabase/realtime-js/dist/main/lib/transformers.d.ts`
- `./node_modules/@supabase/realtime-js/dist/main/lib/transformers.js`
- `./node_modules/@supabase/realtime-js/dist/main/RealtimeChannel.d.ts`
- `./node_modules/@supabase/realtime-js/dist/main/RealtimeClient.d.ts`
- `./node_modules/@supabase/realtime-js/dist/main/RealtimeClient.js`
- `./node_modules/@supabase/realtime-js/dist/module/lib/transformers.d.ts`
- `./node_modules/@supabase/realtime-js/dist/module/lib/transformers.js`
- `./node_modules/@supabase/realtime-js/dist/module/RealtimeChannel.d.ts`
- `./node_modules/@supabase/realtime-js/dist/module/RealtimeClient.d.ts`
- `./node_modules/@supabase/realtime-js/dist/module/RealtimeClient.js`
- `./node_modules/@supabase/realtime-js/package.json`
- `./node_modules/@supabase/realtime-js/README.md`
- `./node_modules/@supabase/realtime-js/src/lib/transformers.ts`
- `./node_modules/@supabase/realtime-js/src/RealtimeChannel.ts`
- `./node_modules/@supabase/realtime-js/src/RealtimeClient.ts`
- `./node_modules/@supabase/storage-js/dist/main/lib/helpers.js`
- `./node_modules/@supabase/storage-js/dist/main/lib/vectors/helpers.d.ts`
- `./node_modules/@supabase/storage-js/dist/main/lib/vectors/helpers.js`
- `./node_modules/@supabase/storage-js/dist/main/lib/vectors/StorageVectorsClient.d.ts`
- `./node_modules/@supabase/storage-js/dist/main/lib/vectors/StorageVectorsClient.js`
- `./node_modules/@supabase/storage-js/dist/main/packages/StorageBucketApi.js`
- `./node_modules/@supabase/storage-js/dist/module/lib/helpers.js`
- `./node_modules/@supabase/storage-js/dist/module/lib/vectors/helpers.d.ts`
- `./node_modules/@supabase/storage-js/dist/module/lib/vectors/helpers.js`
- `./node_modules/@supabase/storage-js/dist/module/lib/vectors/StorageVectorsClient.d.ts`
- `./node_modules/@supabase/storage-js/dist/module/lib/vectors/StorageVectorsClient.js`
- `./node_modules/@supabase/storage-js/dist/module/packages/StorageBucketApi.js`
- `./node_modules/@supabase/storage-js/dist/umd/supabase.js`
- `./node_modules/@supabase/storage-js/package.json`
- `./node_modules/@supabase/storage-js/README.md`
- `./node_modules/@supabase/storage-js/src/lib/helpers.ts`
- `./node_modules/@supabase/storage-js/src/lib/vectors/helpers.ts`
- `./node_modules/@supabase/storage-js/src/lib/vectors/StorageVectorsClient.ts`
- `./node_modules/@supabase/storage-js/src/packages/StorageBucketApi.ts`
- `./node_modules/tldts/dist/cjs/index.js`
- `./node_modules/tldts/dist/cjs/index.js.map`
- `./node_modules/tldts/dist/cjs/src/data/trie.js`
- `./node_modules/tldts/dist/es6/src/data/trie.js`
- `./node_modules/tldts/dist/index.cjs.min.js`
- `./node_modules/tldts/dist/index.cjs.min.js.map`
- `./node_modules/tldts/dist/index.esm.min.js`
- `./node_modules/tldts/dist/index.esm.min.js.map`
- `./node_modules/tldts/dist/index.umd.min.js`
- `./node_modules/tldts/dist/index.umd.min.js.map`
- `./node_modules/tldts/src/data/trie.ts`
- `./output/playwright/dashboard-plan-capture/capture.mjs`
- `./package-lock.json`
- `./package.json`
- `./pnpm-lock.yaml`
- `./README.md`
- `./scripts/apply-migration.ts`
- `./scripts/cleanup-seeded.ts`
- `./scripts/debug-anon.ts`
- `./scripts/debug-impressions.ts`
- `./scripts/debug-search.ts`
- `./scripts/generate-cutover-inventory.mjs`
- `./scripts/list-profiles.ts`
- `./scripts/run-migration.ts`
- `./scripts/seed-20-providers.ts`
- `./scripts/seed-google-places.ts`
- `./scripts/seed-providers.ts`
- `./scripts/seed-test-user.ts`
- `./scripts/set-admin.ts`
- `./scripts/sync-featured-subscriptions.ts`
- `./scripts/test-search.ts`
- `./scripts/update-existing-providers.ts`
- `./scripts/verify-user-write-contracts.mjs`
- `./src/app/(careers)/careers/[slug]/[jobSlug]/page.tsx`
- `./src/app/(careers)/careers/[slug]/page.tsx`
- `./src/app/(dashboard)/dashboard/account/page.tsx`
- `./src/app/(dashboard)/dashboard/analytics/page.tsx`
- `./src/app/(dashboard)/dashboard/billing/page.tsx`
- `./src/app/(dashboard)/dashboard/branding/page.tsx`
- `./src/app/(dashboard)/dashboard/careers/page.tsx`
- `./src/app/(dashboard)/dashboard/clients/[id]/edit/page.tsx`
- `./src/app/(dashboard)/dashboard/clients/[id]/page.tsx`
- `./src/app/(dashboard)/dashboard/clients/communications/page.tsx`
- `./src/app/(dashboard)/dashboard/clients/new/page.tsx`
- `./src/app/(dashboard)/dashboard/clients/page.tsx`
- `./src/app/(dashboard)/dashboard/clients/pipeline/page.tsx`
- `./src/app/(dashboard)/dashboard/company/page.tsx`
- `./src/app/(dashboard)/dashboard/feedback/page.tsx`
- `./src/app/(dashboard)/dashboard/forms/agency/page.tsx`
- `./src/app/(dashboard)/dashboard/forms/agreements/page.tsx`
- `./src/app/(dashboard)/dashboard/forms/contact/page.tsx`
- `./src/app/(dashboard)/dashboard/forms/documents/page.tsx`
- `./src/app/(dashboard)/dashboard/forms/intake/page.tsx`
- `./src/app/(dashboard)/dashboard/forms/resources/page.tsx`
- `./src/app/(dashboard)/dashboard/forms/website/page.tsx`
- `./src/app/(dashboard)/dashboard/jobs/[id]/edit/page.tsx`
- `./src/app/(dashboard)/dashboard/jobs/[id]/page.tsx`
- `./src/app/(dashboard)/dashboard/jobs/new/page.tsx`
- `./src/app/(dashboard)/dashboard/jobs/page.tsx`
- `./src/app/(dashboard)/dashboard/layout.tsx`
- `./src/app/(dashboard)/dashboard/locations/page.tsx`
- `./src/app/(dashboard)/dashboard/media/page.tsx`
- `./src/app/(dashboard)/dashboard/notifications/page.tsx`
- `./src/app/(dashboard)/dashboard/referrals/campaigns/page.tsx`
- `./src/app/(dashboard)/dashboard/referrals/settings/page.tsx`
- `./src/app/(dashboard)/dashboard/referrals/sources/[id]/page.tsx`
- `./src/app/(dashboard)/dashboard/referrals/sources/page.tsx`
- `./src/app/(dashboard)/dashboard/resources/clients/page.tsx`
- `./src/app/(dashboard)/dashboard/settings/page.tsx`
- `./src/app/(dashboard)/dashboard/social/page.tsx`
- `./src/app/(dashboard)/dashboard/tasks/page.tsx`
- `./src/app/(jobs)/employers/[slug]/page.tsx`
- `./src/app/(jobs)/jobs/sitemap.ts`
- `./src/app/(site)/_goodaba/goodaba-landing-page.tsx`
- `./src/app/(site)/_goodaba/goodaba-pricing-page.tsx`
- `./src/app/api/agreements/document-preview/route.ts`
- `./src/app/api/places/search/route.ts`
- `./src/app/api/social/render/[templateId]/route.tsx`
- `./src/app/api/stripe/webhooks/route.ts`
- `./src/app/auth/callback/route.ts`
- `./src/app/auth/confirm/route.ts`
- `./src/app/sitemap.ts`
- `./src/components/dashboard/social/social-posts-client.tsx`
- `./src/components/dashboard/team/team-page-data.ts`
- `./src/components/jobs/jobs-header.tsx`
- `./src/components/layout/site-header.tsx`
- `./src/contexts/auth-context.tsx`
- `./src/lib/actions/addons.ts`
- `./src/lib/actions/admin.ts`
- `./src/lib/actions/agreements.ts`
- `./src/lib/actions/analytics.ts`
- `./src/lib/actions/applications.ts`
- `./src/lib/actions/attributes.ts`
- `./src/lib/actions/billing.ts`
- `./src/lib/actions/clients.ts`
- `./src/lib/actions/communications.ts`
- `./src/lib/actions/drip-emails.ts`
- `./src/lib/actions/feedback.ts`
- `./src/lib/actions/google-business.ts`
- `./src/lib/actions/google-places.ts`
- `./src/lib/actions/inquiries.ts`
- `./src/lib/actions/intake.ts`
- `./src/lib/actions/jobs.ts`
- `./src/lib/actions/listings.ts`
- `./src/lib/actions/locations.ts`
- `./src/lib/actions/notifications.ts`
- `./src/lib/actions/onboarding.test.ts`
- `./src/lib/actions/onboarding.ts`
- `./src/lib/actions/pipeline.ts`
- `./src/lib/actions/provider-website.ts`
- `./src/lib/actions/referral-analytics.ts`
- `./src/lib/actions/referrals.ts`
- `./src/lib/actions/social.ts`
- `./src/lib/actions/task-automation.ts`
- `./src/lib/actions/team.ts`
- `./src/lib/actions/workspace-users.ts`
- `./src/lib/analytics/track.ts`
- `./src/lib/auth/actions.ts`
- `./src/lib/auth/hooks.ts`
- `./src/lib/onboarding/server.ts`
- `./src/lib/plans/guards.ts`
- `./src/lib/platform/auth/server.ts`
- `./src/lib/platform/config.ts`
- `./src/lib/platform/contracts.ts`
- `./src/lib/platform/workspace/server.ts`
- `./src/lib/queries/jobs.ts`
- `./src/lib/queries/search.ts`
- `./src/lib/scripts/migrate-enterprise-subscriptions.ts`
- `./src/lib/storage/actions.ts`
- `./src/lib/storage/config.ts`
- `./src/lib/stripe/actions.ts`
- `./src/lib/supabase/clients.ts`
- `./src/lib/supabase/middleware.ts`
- `./src/lib/supabase/server.ts`
- `./src/lib/supabase/user-facing-errors.test.ts`
- `./src/lib/workspace/current-profile.ts`
- `./src/lib/workspace/memberships.ts`
- `./src/middleware.ts`
- `./supabase/.temp/pooler-url`
- `./supabase/config.toml`
- `./supabase/run_all_migrations.sql`
- `./tsconfig.tsbuildinfo`

## Immediate Cutover Risks

- The current repo still depends on Supabase auth middleware and browser session listeners for dashboard access control.
- The current repo still exposes Supabase public storage URL assumptions in runtime code and config.
- Stripe webhooks and billing actions still persist directly into Supabase profile and addon records.
- Public search, public pages, jobs pages, CRM flows, referrals, agreements, and notifications still execute direct table queries instead of going through a backend facade.
- E2E auth setup and seed scripts still require Supabase service-role credentials.
