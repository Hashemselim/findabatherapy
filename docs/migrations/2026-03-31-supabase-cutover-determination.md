# Supabase Cutover Remaining-Work Determination

Generated from the current repository state on `2026-03-31` using:

- `docs/migrations/2026-03-29-supabase-clerk-convex-inventory.md`
- `docs/migrations/2026-03-29-supabase-clerk-convex-validation-matrix.md`
- direct code inspection of unresolved Supabase-backed runtime surfaces

## Current State

- Convex runtime coverage currently exists for `workspaces`, `listings`, `locations`, and listing media files.
- Convex schema placeholders exist for jobs, CRM, agreements, billing, notifications, referrals, public read models, audit events, and files, but most of those domains do not yet have production runtime behavior implemented.
- Supabase still ships in runtime code through auth compatibility helpers, middleware, direct table queries, direct storage access, signed URL generation, Stripe webhook mutations, E2E auth helpers, and seed/debug scripts.
- The inventory script previously undercounted storage buckets. `job-resumes` is a live Supabase bucket and must be included in the cutover plan.
- `team_members` is a separate employee roster domain, not just workspace membership. It cannot be treated as already covered by `workspaceMemberships`.

## Canonical Cutover Blocker Ledger

| Subsystem | User-facing surface | Current Supabase dependency type | Current entrypoint | Target Convex or Clerk replacement | Current status | Cutover class | Acceptance proof required |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Auth and session | Shared auth compatibility layer | helper, env, package | `src/lib/supabase/server.ts` | `src/lib/platform/auth/*` and `src/lib/platform/workspace/*` only | partial bridge | runtime blocker | No runtime imports of `@/lib/supabase/server`; Clerk auth and Convex workspace guards pass automated auth and dashboard smoke tests |
| Auth and session | Session refresh middleware | middleware, auth, env | `src/middleware.ts`, `src/lib/supabase/middleware.ts` | Clerk-only middleware and route protection | partial bridge | runtime blocker | Dashboard auth, redirect, and onboarding flows pass without `updateSession()` |
| Auth and session | Auth actions, callback, confirm, profile, invite bridge | auth, helper, route | `src/lib/auth/actions.ts`, `src/app/auth/callback/route.ts`, `src/app/auth/confirm/route.ts`, `src/app/api/auth/profile/route.ts`, `src/app/api/auth/invite/route.ts` | Clerk-first auth flows plus Convex-backed invite acceptance and profile bootstrap | partial bridge | runtime blocker | Email/password, OAuth, sign-out, reset, callback, confirm, invite acceptance all green |
| Workspace and team | Workspace members, invitations, seat summary | table, helper | `src/lib/actions/workspace-users.ts`, `src/app/(dashboard)/dashboard/settings/users/page.tsx` | Convex `workspaceMemberships`, `workspaceInvitations`, and `billingRecords` seat accounting | not started | runtime blocker | Owner, admin, member enforcement and invite lifecycle pass automated and manual validation |
| Workspace and team | Team roster, credentials, employee documents | table, bucket, helper | `src/lib/actions/team.ts`, `src/components/dashboard/team/team-page-data.ts` | New Convex team domain plus `files` for employee documents | not started | runtime blocker | Team member CRUD, credential tracking, employee document access, and task linkage pass |
| Provider core | Onboarding and company setup | table, helper | `src/lib/actions/onboarding.ts`, `src/app/(dashboard)/dashboard/company/page.tsx`, `src/app/(dashboard)/dashboard/forms/agency/page.tsx`, `src/app/(dashboard)/dashboard/forms/contact/page.tsx` | Convex listing and workspace mutations behind platform facades | backend exists but callers unmigrated | runtime blocker | Onboarding create, update, publish, and resume flows run without Supabase |
| Provider core | Listing attributes and listing configuration still outside migrated slice | table | `src/lib/actions/attributes.ts`, remaining Supabase paths in `src/lib/actions/listings.ts` | Convex `listingAttributes` and listing metadata mutations | partial bridge | runtime blocker | Attribute CRUD and listing settings CRUD pass on dashboard and public pages |
| Provider core | Forms pages, provider website settings, intake form settings | table, helper | `src/app/(dashboard)/dashboard/forms/intake/page.tsx`, `src/app/(dashboard)/dashboard/forms/resources/page.tsx`, `src/app/(dashboard)/dashboard/forms/website/page.tsx`, `src/lib/actions/provider-website.ts` | Convex workspace and listing settings plus public read models | partial bridge | runtime blocker | Provider-controlled forms and site settings render and persist through Convex only |
| Provider core | Google Places and Google reviews | table, admin helper | `src/lib/actions/google-business.ts`, `src/lib/actions/google-places.ts` | Convex `googlePlacesRecords` and `googleReviewRecords` with server-side Google API actions | not started | runtime blocker | Link, sync, refresh, and public display of Google data pass |
| Provider core | Social assets and provider media assumptions | bucket, storage URL assumption | `src/lib/actions/social.ts`, `src/lib/storage/config.ts` | Convex `files` and server-side media URL resolution | partial bridge | runtime blocker | No runtime `getPublicUrl` or raw Supabase storage URL assumptions remain |
| Search and public read models | Therapy search | table, join-heavy read | `src/lib/queries/search.ts` | Convex `publicReadModels` search projection plus location/listing projections | not started | runtime blocker | Search filters, pagination, sorting, and SEO landing pages pass |
| Search and public read models | Provider sitemap and therapy public route generation | table, helper | `src/app/sitemap.ts` | Convex-generated sitemap inputs from `publicReadModels` | not started | runtime blocker | Sitemaps build from Convex with no Supabase reads |
| Search and public read models | Inquiry public-read and submission paths | table, helper | `src/lib/actions/inquiries.ts` | Convex `inquiryRecords` plus public read models | not started | runtime blocker | Inquiry creation, listing branding, and follow-up paths pass |
| Jobs | Dashboard job CRUD | table, helper | `src/lib/actions/jobs.ts`, `src/app/(dashboard)/dashboard/jobs/*` | Convex `jobPostings` mutations and dashboard queries | not started | runtime blocker | Job create, edit, publish, archive, and limits pass |
| Jobs | Public jobs search, employer pages, state pages, branded careers pages | table, join-heavy read | `src/lib/queries/jobs.ts`, `src/app/(jobs)/jobs/*`, `src/app/(jobs)/employers/*`, `src/app/(careers)/careers/*`, `src/app/(website)/site/[slug]/careers/*` | Convex `jobPostings` plus `publicReadModels` search and employer projections | not started | runtime blocker | Public job pages and employer pages render from Convex only |
| Jobs | Job applications and applicant inbox | table, helper | `src/lib/actions/applications.ts`, `src/app/(dashboard)/dashboard/team/applicants/page.tsx`, `src/app/(dashboard)/dashboard/employees/[id]/page.tsx` | Convex `jobApplications` and team/admin read models | not started | runtime blocker | Application submission, inbox filtering, status updates, and applicant detail pass |
| Jobs | Resume upload and signed download | bucket, signed URL | `src/lib/actions/applications.ts` | Convex `files` private storage plus authorized download helper | not started | runtime blocker | Resume upload, download, auth rejection, and cleanup pass |
| Jobs | Jobs sitemap legacy table dependency | table | `src/app/(jobs)/jobs/sitemap.ts` | Convex job projections | not started | runtime blocker | Jobs sitemap no longer queries legacy `jobs` table |
| CRM and intake | Client core records and pipeline | table, helper | `src/lib/actions/clients.ts`, `src/lib/actions/pipeline.ts`, `src/app/(dashboard)/dashboard/clients/*` | Convex CRM domain using `crmRecords` or dedicated child documents | not started | runtime blocker | Client CRUD and pipeline reads/writes pass |
| CRM and intake | Contacts, tasks, communications, notifications | table, helper | `src/lib/actions/communications.ts`, `src/lib/actions/notifications.ts`, `src/lib/actions/task-automation.ts`, `src/app/(dashboard)/dashboard/clients/communications/page.tsx`, `src/app/(dashboard)/dashboard/notifications/page.tsx` | Convex `communicationRecords`, `notificationRecords`, and CRM task records | not started | runtime blocker | Communication template usage, task flows, and notifications pass |
| CRM and intake | Intake tokens and public intake/document pages | table, helper | `src/lib/actions/intake.ts`, `src/app/(dashboard)/dashboard/resources/clients/page.tsx`, public intake routes | Convex `intakeTokens`, CRM records, and authorized files | not started | runtime blocker | Intake token issuance, consumption, and document flows pass |
| CRM and intake | Client documents and private file access | bucket, signed URL | `src/lib/actions/clients.ts`, `src/app/(dashboard)/dashboard/forms/documents/page.tsx` | Convex `files` private storage with workspace authorization | not started | runtime blocker | Upload, preview, download, delete, and cross-workspace rejection pass |
| Agreements | Agreement packet CRUD, versions, links, submission metadata | table, helper | `src/lib/actions/agreements.ts`, `src/app/(dashboard)/dashboard/forms/agreements/page.tsx` | Convex `agreementPackets` plus explicit version and submission data model | not started | runtime blocker | Packet CRUD, versioning, publishing, and submission lifecycle pass |
| Agreements | Agreement documents, preview route, signed artifacts | bucket, signed URL, route | `src/lib/actions/agreements.ts`, `src/app/api/agreements/document-preview/route.ts` | Convex `agreementArtifacts` plus `files` and authorized preview/download routes | not started | runtime blocker | Document preview, signed PDF retrieval, artifact authorization, and upload/delete pass |
| Billing and Stripe | Billing dashboard reads and checkout or portal flows | table, helper | `src/lib/actions/billing.ts`, `src/lib/actions/addons.ts`, `src/lib/stripe/actions.ts`, `src/app/(dashboard)/dashboard/billing/page.tsx` | Convex `billingRecords` plus Clerk/Convex workspace context | not started | runtime blocker | Checkout, portal, addon purchase, featured-location billing, and billing UI pass |
| Billing and Stripe | Stripe webhook mutations | table, admin helper | `src/app/api/stripe/webhooks/route.ts` | Convex billing mutations and idempotent webhook handlers | not started | runtime blocker | Webhook smoke suite shows no Supabase writes and correct revalidation side effects |
| Admin and internal | Analytics and reporting | table, admin helper | `src/lib/actions/analytics.ts`, `src/lib/analytics/track.ts`, `src/app/(dashboard)/dashboard/analytics/page.tsx` | Convex `auditEvents` and analytics read models | not started | runtime blocker | Event capture and analytics dashboards pass |
| Admin and internal | Admin actions, support records, feedback, removal requests | table, admin helper | `src/lib/actions/admin.ts`, `src/lib/actions/feedback.ts`, admin and feedback pages | Convex admin/support data model using `auditEvents`, `crmRecords`, and dedicated admin payloads | not started | runtime blocker | Admin-only surfaces and support queues pass |
| Admin and internal | Referrals and referral analytics | table | `src/lib/actions/referrals.ts`, `src/lib/actions/referral-analytics.ts`, referral pages | Convex `referralRecords` plus referral projections | not started | runtime blocker | Referral sources, campaigns, contacts, touchpoints, tasks, notes, and analytics pass |
| Admin and internal | GoodABA marketing and social render surfaces with Supabase state | helper, table, bucket | `src/app/(site)/_goodaba/*`, `src/app/api/social/render/[templateId]/route.tsx` | Convex-backed marketing reads and file URLs | not started | validation blocker | Marketing pages and social rendering pass without Supabase lookups |
| Tooling and cleanup | E2E auth helper | test, auth | `e2e/lib/auth-helper.ts` | Clerk provisioning helper and test-session bootstrap | not started | validation blocker | E2E suite authenticates without Supabase REST token flow |
| Tooling and cleanup | Seed, debug, migration, and verification scripts | script, helper, table | `scripts/*.ts`, `src/lib/scripts/migrate-enterprise-subscriptions.ts` | Convex import/export tooling and Clerk provisioning scripts | not started | cleanup-only | Required operational scripts work without Supabase credentials |
| Tooling and cleanup | Env examples, Supabase packages, lockfiles, storage URL helpers, `supabase/` tree | env, package, config | `.env.example`, `package.json`, lockfiles, `src/lib/storage/config.ts`, `supabase/*` | Convex and Clerk env only; Supabase archived or removed after final export tooling is verified | not started | cleanup-only | No shipped Supabase envs or packages remain; historical SQL retained only if explicitly archived |

## Legacy Source-of-Truth Map

### Tables

| Legacy table | Current runtime behavior still depending on it | Target replacement | Classification | Remaining work required before Supabase removal |
| --- | --- | --- | --- | --- |
| `listings` | Provider profile core, publishing, public pages | `listings` | already covered by specific Convex table | Finish migrating remaining callers and public/job-facing read models |
| `profiles` | Workspace identity, plan, billing, onboarding, account metadata | `workspaces` plus `users` and `billingRecords` | intended to collapse into generic or split Convex tables | Split profile fields into workspace, user, and billing ownership; migrate every caller |
| `locations` | Provider locations, service settings, Google linkage | `locations` | already covered by specific Convex table | Migrate remaining location callers and public search projections |
| `clients` | CRM client records | `crmRecords(recordType=client)` | intended to collapse into generic Convex table | Build CRM runtime and migrate dashboard callers |
| `audit_events` | Analytics and internal audit trail | `auditEvents` | already covered by specific Convex table | Implement analytics writes and reads in Convex |
| `listing_attribute_values` | Provider listing attributes | `listingAttributes` | already covered by specific Convex table | Finish caller migration and public projection rebuilds |
| `job_postings` | Jobs dashboard and public jobs | `jobPostings` | already covered by specific Convex table | Implement full jobs runtime and migrate callers |
| `client_tasks` | CRM tasks and employee tasks | `crmRecords(recordType=client_task)` | intended to collapse into generic Convex table | Build task runtime with ownership, status, and due-date behavior |
| `profile_memberships` | Workspace seats and role enforcement | `workspaceMemberships` | already covered by specific Convex table | Migrate settings and seat summary callers |
| `communication_templates` | Message templates | `communicationRecords(recordType=template)` | intended to collapse into generic Convex table | Model template library and migrate communications UI |
| `google_places_listings` | Linked Google Business profiles | `googlePlacesRecords` | already covered by specific Convex table | Implement Google sync and caller migration |
| `job_applications` | Public applications and applicant inbox | `jobApplications` | already covered by specific Convex table | Implement application runtime and inbox queries |
| `agreement_packets` | Agreement packet definitions | `agreementPackets` | already covered by specific Convex table | Implement packet CRUD and packet query surface |
| `inquiries` | Public contact and intake inquiries | `inquiryRecords` | already covered by specific Convex table | Implement inquiry runtime and public-read integration |
| `location_featured_subscriptions` | Featured location billing | `billingRecords(recordType=featured_location_subscription)` | intended to collapse into generic Convex table | Move featured-location checkout, renewals, and status reads |
| `profile_addons` | Addon billing and limits | `billingRecords(recordType=addon)` | intended to collapse into generic Convex table | Move addon ownership, quantities, and guard logic |
| `client_documents` | Private clinical and CRM files | `files` plus CRM entity linkage | intended to collapse into generic Convex table | Build private file metadata, auth checks, and document UI |
| `referral_sources` | Referral source directory | `referralRecords(recordType=source)` | intended to collapse into generic Convex table | Build referral source runtime |
| `agreement_packet_documents` | Agreement source documents | `agreementArtifacts(artifactType=packet_document)` plus `files` | intended to collapse into generic Convex table | Build artifact storage and packet-document retrieval |
| `profile_invitations` | Workspace invitations | `workspaceInvitations` | already covered by specific Convex table | Finish settings UI and acceptance flow migration |
| `team_members` | Employee roster | dedicated team domain or `crmRecords(recordType=team_member)` | missing Convex model | Define employee roster model before migrating team pages |
| `client_locations` | Client-specific location records | `crmRecords(recordType=client_location)` | intended to collapse into generic Convex table | Model child location records and UI |
| `client_parents` | Parent or guardian records | `crmRecords(recordType=client_parent)` | intended to collapse into generic Convex table | Model parent relationships and CRUD |
| `removal_requests` | Support and moderation records | admin support model | missing Convex model | Define support queue and admin surface target |
| `client_authorizations` | Authorization tracking | `crmRecords(recordType=client_authorization)` | intended to collapse into generic Convex table | Model authorization lifecycle and reporting |
| `client_communications` | Client comms log | `communicationRecords(recordType=client_communication)` | intended to collapse into generic Convex table | Build logged communications runtime |
| `agreement_packet_versions` | Agreement version history | `agreementPackets.payload.versions` or dedicated version model | missing Convex model | Decide concrete version storage and implement it |
| `agreement_submissions` | Signed submission records | agreement submission domain | missing Convex model | Define submission lifecycle model and queries |
| `client_insurances` | Client insurance records | `crmRecords(recordType=client_insurance)` | intended to collapse into generic Convex table | Build insurance CRUD and linkage |
| `employee_credentials` | Employee credential tracking | dedicated team credential model | missing Convex model | Define credential model and expiration logic |
| `feedback` | Feedback intake and admin review | admin feedback model | missing Convex model | Define feedback runtime and admin reads |
| `google_reviews` | Google reviews | `googleReviewRecords` | already covered by specific Convex table | Build sync and public-display runtime |
| `media_assets` | Public listing photos and other media assets | `files` | intended to collapse into generic Convex table | Finish caller migration and order metadata handling |
| `referral_tasks` | Referral tasks | `referralRecords(recordType=task)` | intended to collapse into generic Convex table | Build referral task runtime |
| `referral_templates` | Referral templates | `referralRecords(recordType=template)` | intended to collapse into generic Convex table | Build template runtime for referral workflows |
| `client_authorization_services` | Authorization service lines | `crmRecords(recordType=client_authorization_service)` | intended to collapse into generic Convex table | Model child service lines |
| `notifications` | In-app notifications | `notificationRecords` | already covered by specific Convex table | Implement notification writes, reads, and dismissals |
| `referral_import_jobs` | Referral import jobs | `referralRecords(recordType=import_job)` | intended to collapse into generic Convex table | Build import job state tracking if still required |
| `agreement_links` | Share and signing links | agreement packet or submission link model | missing Convex model | Define link token and expiration storage |
| `client_contacts` | CRM contact records | `crmRecords(recordType=client_contact)` | intended to collapse into generic Convex table | Build contact CRUD and relation mapping |
| `employee_documents` | Employee private files | `files` plus team entity linkage | intended to collapse into generic Convex table | Build private employee document authorization |
| `referral_contacts` | Referral contact directory | `referralRecords(recordType=contact)` | intended to collapse into generic Convex table | Build referral contact runtime |
| `referral_touchpoints` | Referral touchpoint log | `referralRecords(recordType=touchpoint)` | intended to collapse into generic Convex table | Build touchpoint runtime and chronology views |
| `agreement_packet_version_documents` | Version-scoped agreement documents | `agreementArtifacts(artifactType=version_document)` plus `files` | intended to collapse into generic Convex table | Build version-document artifact runtime |
| `intake_tokens` | Public intake access tokens | `intakeTokens` | already covered by specific Convex table | Implement token issuance, redemption, and expiry checks |
| `client_status_changes` | Client status history | `crmRecords(recordType=client_status_change)` | intended to collapse into generic Convex table | Build status history timeline behavior |
| `referral_campaigns` | Referral campaigns | `referralRecords(recordType=campaign)` | intended to collapse into generic Convex table | Build campaign runtime and analytics |
| `referral_notes` | Referral notes | `referralRecords(recordType=note)` | intended to collapse into generic Convex table | Build notes runtime and visibility rules |
| `client_document_upload_tokens` | Secure client-upload links | `intakeTokens(payload=document_upload)` | intended to collapse into generic Convex table | Implement secure upload token issuance and redemption |
| `agreement_submission_documents` | Signed submission support docs | `agreementArtifacts(artifactType=submission_document)` plus `files` | intended to collapse into generic Convex table | Build submission-document storage and access |
| `custom_domains` | Provider custom domains | `customDomains` | already covered by specific Convex table | Implement runtime reads and domain verification writes |
| `intake_form_settings` | Intake brand settings | `workspaces.settings.intakeFormSettings` | intended to collapse into generic Convex table | Migrate settings reads and writes off profile table |
| `jobs` | Legacy jobs sitemap reads | `jobPostings` and `publicReadModels` | rebuildable projection only | Replace remaining legacy sitemap query and stop reading this historical table |
| `listing_attributes` | Historical predecessor to listing attribute values | `listingAttributes` | cutover tooling only | Ignore at runtime; include only if historical import requires it |
| `listing_photos` | Historical predecessor to media assets | `files` | cutover tooling only | Ignore at runtime; include only if historical import requires it |

### Storage buckets

| Legacy bucket | Current runtime behavior still depending on it | Target replacement | Classification | Remaining work required before Supabase removal |
| --- | --- | --- | --- | --- |
| `listing-logos` | Public provider logos | `files` with public visibility | already covered by specific Convex table | Finish removing residual public URL assumptions |
| `listing-photos` | Public gallery photos | `files` with public visibility | already covered by specific Convex table | Finish migrating public callers and projection rebuilds |
| `client-documents` | Private clinical and CRM documents | `files` with private visibility | missing Convex model | Build document auth and download helpers |
| `agreement-documents` | Agreement uploads and signed artifacts | `files` plus `agreementArtifacts` | missing Convex model | Build agreement artifact storage and access |
| `social-posts` | Generated social images | `files` with public visibility | missing Convex model | Move social asset generation and cleanup |
| `job-resumes` | Uploaded resumes | `files` with private visibility | missing Convex model | Build resume upload and download authorization |

## Caller Migration Map

| Runtime surface | Current backing path | Backend replacement exists | Caller still pointed at Supabase | Supabase bridge still required | Remaining migration action |
| --- | --- | --- | --- | --- | --- |
| Auth and session | Clerk plus Supabase compatibility layer | partial | yes | yes | Finish Clerk-only callback, confirm, profile, invite, and middleware behavior |
| Workspace membership and invites | `workspace-users.ts`, settings users page, workspace helpers | partial | yes | yes | Implement Convex workspace seats, members, and invitation UI reads/writes |
| Team roster | `team.ts`, team page data | no | yes | yes | Build dedicated team backend and migrate team UI |
| Listing and location dashboard CRUD | `listings.ts`, `locations.ts`, `storage/actions.ts` | partial | partially | yes | Finish remaining dashboard callers and remove fallback paths |
| Onboarding and forms | `onboarding.ts`, forms pages | partial | yes | yes | Move onboarding and form settings to Convex |
| Provider website and branded pages | `provider-website.ts`, website pages, careers pages | partial | yes | yes | Replace remaining public reads with Convex projections |
| Therapy search and sitemap | `queries/search.ts`, `app/sitemap.ts` | no | yes | no | Build public search and sitemap projections |
| Jobs dashboard | `actions/jobs.ts`, dashboard jobs pages | schema only | yes | no | Build Convex job mutations and dashboard reads |
| Jobs public pages and queries | `queries/jobs.ts`, public jobs pages, employers pages | schema only | yes | no | Build search and employer projections in Convex |
| Applications and resumes | `actions/applications.ts`, applicant pages | schema only | yes | no | Build job application runtime and private resume files |
| CRM core | `clients.ts`, `pipeline.ts`, client pages | placeholder schema only | yes | no | Build client domain on Convex |
| CRM comms and notifications | `communications.ts`, `notifications.ts`, intake and document pages | placeholder schema only | yes | no | Build communications, notifications, and document auth runtime |
| Agreements | `agreements.ts`, agreements page, preview route | placeholder schema only | yes | no | Build agreement runtime, versions, files, and preview/download routes |
| Billing and Stripe actions | `billing.ts`, `addons.ts`, `stripe/actions.ts`, billing page | placeholder schema only | yes | no | Build Convex billing runtime and migrate page/actions |
| Stripe webhooks | `api/stripe/webhooks/route.ts` | placeholder schema only | yes | no | Replace direct Supabase writes with Convex billing mutations |
| Analytics and admin | `analytics.ts`, `admin.ts`, `feedback.ts`, analytics page | partial placeholder | yes | no | Build admin and analytics read or write models |
| Referrals | `referrals.ts`, `referral-analytics.ts`, referral pages | partial placeholder | yes | no | Build referral runtime and analytics |
| Social rendering and marketing internals | `social.ts`, social render API, GoodABA internal pages | no | yes | no | Move media-backed rendering and any remaining state lookups |
| E2E auth and operational scripts | `e2e/lib/auth-helper.ts`, `scripts/*.ts` | no | yes | no | Replace with Clerk and Convex tooling before package cleanup |
| Supabase support layer | `src/lib/supabase/*`, env, packages, lockfiles | not applicable until all callers move | yes | yes | Delete only after every runtime, test, and required script caller is migrated |

## Removal Map

| Item | Current dependency location | Deletion timing | Blockers |
| --- | --- | --- | --- |
| `@supabase/ssr` | `package.json`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts` | final cleanup | Remove server and middleware compatibility layer first |
| `@supabase/supabase-js` | `package.json`, runtime helpers, scripts, tests | final cleanup | Remove runtime callers, scripts, and E2E helper first |
| Supabase env vars | `.env.example`, `src/env.ts`, `src/lib/supabase/*`, scripts | final cleanup | No runtime, test, or script path may require them |
| `src/lib/supabase/*` | runtime auth, workspace, admin, and storage helpers | final cleanup | Replace all helper callers with platform and Convex equivalents |
| Supabase auth middleware | `src/lib/supabase/middleware.ts`, `src/middleware.ts` | after auth and session migration | Clerk-only middleware must fully own session behavior |
| Storage URL helpers | `src/lib/storage/config.ts` and any raw URL assumptions | after all file flows migrate | All file delivery must use Convex URLs or authorized routes |
| Supabase-backed E2E helper | `e2e/lib/auth-helper.ts` | after Clerk test provisioning exists | E2E auth and user setup must stop using Supabase REST and service-role credentials |
| Supabase seed and debug scripts | `scripts/*.ts`, `src/lib/scripts/migrate-enterprise-subscriptions.ts` | after Convex import/export and Clerk provisioning scripts exist | Required operational workflows must be replaced or explicitly archived |
| `supabase/` migrations and config | `supabase/config.toml`, `supabase/migrations/*` | final cleanup or explicit archive step | Final export tooling and historical-retention decision must be complete |

## Validation Ownership Map

| Area | Automated proof required | Manual proof required |
| --- | --- | --- |
| Auth and session | Clerk sign-up, sign-in, sign-out, password reset, Google, Microsoft, callback, confirm, invite acceptance | Full auth smoke across dashboard and public auth entrypoints |
| Workspace and team | Workspace creation, invite issuance, accept invite, role enforcement, seat summary | Settings users page, team pages, team CRUD |
| Provider core | Listing CRUD, location CRUD, attribute CRUD, provider website settings, Google sync flows, provider media | Company, branding, media, forms, public provider pages, site pages |
| Search and public read models | Search filters, pagination, sitemap generation, SEO route data | Public search pages, state or city pages, sitemap inspection |
| Jobs | Job CRUD, search, public job pages, employer pages, application submission, resume upload and download | Dashboard jobs, applicant inbox, employer pages, branded careers pages |
| CRM and intake | Client CRUD, tasks, contacts, communications, notifications, intake tokens, client documents | Dashboard clients, pipeline, notifications, communications, intake and document pages |
| Agreements | Packet CRUD, versioning, uploads, previews, signing, signed artifact retrieval | Agreements dashboard, document preview, signed download verification |
| Billing and Stripe | Checkout, portal, addons, featured locations, webhook mutation paths, post-payment state sync | Billing page, purchase flows, Stripe smoke tests |
| Admin and internal | Analytics event writes, feedback CRUD, referral CRUD and analytics, admin guards | Analytics, feedback, referrals, admin-only surfaces |
| Storage and security | Public file delivery, private-file authorization, cross-workspace rejection, no raw Supabase URL assumptions | Upload, preview, download, delete, and unauthorized-access attempts |
| Tooling and cleanup | E2E auth setup, import/export or reconciliation scripts, no Supabase runtime imports in shipped build | Verify runbooks, env templates, and operator scripts |

## Ordered Final Cutover Blockers

1. Remove the Supabase auth and workspace support layer from runtime.
   - Finish Clerk-only callback, confirm, profile, invite, and middleware behavior.
   - Move workspace users, invitations, and seat accounting to Convex.

2. Finish provider-core runtime migration.
   - Complete onboarding, attributes, forms, provider website settings, Google integrations, and residual listing or location callers.
   - Remove all remaining Supabase storage URL assumptions.

3. Build search and public read models.
   - Replace therapy search, public provider pages, public sitemap generation, and inquiry public reads with Convex projections.

4. Build the jobs domain on Convex end to end.
   - Dashboard CRUD.
   - Public jobs search and employer pages.
   - Applications and applicant inbox.
   - Resume private file delivery.

5. Build the CRM and intake domain on Convex.
   - Clients, parents, locations, insurances, authorizations, contacts, tasks, pipeline, communications, notifications, intake tokens, and client documents.

6. Build the agreements domain on Convex.
   - Packets, versions, links, uploads, preview, submissions, and signed artifacts.

7. Move billing and Stripe runtime to Convex.
   - Billing page reads and actions.
   - Addons and featured-location billing.
   - Stripe webhook mutations and idempotent reconciliation.

8. Migrate admin, analytics, referrals, feedback, and support surfaces.
   - Analytics event capture and read models.
   - Referral sources, campaigns, contacts, touchpoints, tasks, notes, and analytics.
   - Feedback and removal/support records.

9. Replace test and operational tooling.
   - E2E auth helper.
   - Seed, debug, import, export, and verification scripts.
   - Any remaining one-off operator flows still requiring Supabase credentials.

10. Remove Supabase from the shipped codebase and runtime.
   - Delete `src/lib/supabase/*`, Supabase middleware, raw storage URL helpers, env vars, packages, and lockfile entries.
   - Archive or remove `supabase/` only after final export and reconciliation tooling is confirmed.

11. Prove the end state.
   - Zero Supabase runtime imports in shipped code.
   - Zero Supabase storage URL assumptions in clients.
   - Zero required Supabase env vars.
   - Validation matrix fully green.

## Definition of Complete Migration

The migration is complete only when all of the following are true:

- No shipped route, page, server action, query, mutation bridge, or route handler depends on Supabase auth, Postgres, storage, or env.
- No required test or operator workflow depends on Supabase credentials.
- Every legacy source record and file that must survive cutover has a concrete Convex destination or an explicit reconciliation rule.
- The shipped build contains no `@supabase/*` runtime dependency and no raw Supabase file URL construction.
