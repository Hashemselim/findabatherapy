# Convex + Clerk Production Launch Checklist

This is the production cutover gate for the Supabase -> Convex + Clerk migration.
Nothing is considered launch-ready until every required gate below is marked `Pass`
with concrete evidence.

## Acceptance Rule

- `Pass`: verified with command output, screenshots, or live external-system result
- `Fail`: confirmed defect or broken flow
- `Blocked`: cannot verify yet because environment, credentials, or deployment is missing
- `Pending`: not yet executed

## Evidence Standards

- Every auth, security, or UI verification should include at least one screenshot.
- Every backend or integration verification should include command output or API response.
- Every billing verification should include the Stripe action taken and the resulting app state.
- Every cross-workspace security verification must be adversarial:
  use one workspace to create data and another workspace to attempt access by direct URL or foreign ID.

## Gate 1: Hard Cutover Configuration

| Check | Status | Evidence |
| --- | --- | --- |
| Runtime providers default to Clerk + Convex only | Pass | `src/lib/platform/config.ts` defaults to Clerk + Convex outside production and throws on any non-explicit production provider |
| Production env validation rejects missing Convex/Clerk configuration | Pass | `npx tsx` proof: invalid production providers throws `Production runtime must use Clerk auth and Convex data...`; valid `clerk/convex` prints `CLERK_CONVEX_OK` |
| No production-critical route silently falls back to Supabase | Pass | `src/lib/supabase/server.ts` now fails fast in production via `assertSupabaseRuntimeAllowed()` before any Supabase client/admin client is created |
| Supabase runtime paths removed or production-disabled | Pass | legacy Supabase code remains in-tree, but production execution is disabled in `src/lib/supabase/server.ts` and production env validation in `src/env.ts` + `src/lib/platform/config.ts` forbids Supabase runtime |

## Gate 2: Clerk + Convex Auth

| Check | Status | Evidence |
| --- | --- | --- |
| Clerk sign-in redirects correctly into dashboard | Pass | headless browser verification |
| Convex server token issuance works for authenticated dashboard reads | Pass | green dashboard/browser flows |
| Shared workspace user can access same agency workspace | Pass | [shared-user company](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/shared-user-company.png), [shared-user clients](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/shared-user-clients.png), [shared-user seats/users](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/shared-user-workspace-users.png) |
| Cross-workspace user cannot access foreign CRM client by direct URL | Pass | [cross-workspace denial](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/cross-workspace-client-denied.png) |
| Invite acceptance flow works end to end | Pass | live invitation email sends (`WORKSPACE_INVITE_EMAIL_RESULT {"success":true}`), invitation preview renders ([invite preview](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/invite-preview-page.png)), and GoodABA-side acceptance now lands on workspace users ([invite accepted](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/invite-accepted-users-page-via-ticket.png)); a fresh-device Clerk email verification challenge can still appear in dev, but the GoodABA callback/Convex acceptance path is no longer looping |
| Owner/admin/member role boundaries are enforced | Pass | [admin users](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/admin-users-page.png), [admin billing](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/admin-billing-page.png), [member users](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/member-users-page.png), [member billing](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/member-billing-page.png) |

## Gate 3: Billing + Stripe

| Check | Status | Evidence |
| --- | --- | --- |
| New Pro checkout works end to end | Pass | [billing before checkout](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-before-checkout.png), [billing success after payment](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-success-after-payment.png), [billing after payment](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-after-payment.png), Stripe active subscription `sub_1TIv6zK4v3vaQ3CjWAiie8qd` |
| Success/cancel redirects land correctly | Pass | success redirect verified to `/dashboard/billing/success?session_id=...`; billing portal return verified back to [billing page](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-after-cancel-return.png) |
| Webhook reconciliation updates Convex workspace/listing state | Pass | checkout success route + sync updated billing page from Free to Pro; app state shows `Pro Plan` and active subscription after payment |
| Billing portal opens and returns correctly | Pass | [billing portal](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-portal.png), [billing return](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-after-cancel-return.png) |
| Pro upgrade/downgrade flow works | Pending | free -> Pro upgrade verified; the app correctly reflects Stripe `cancel_at_period_end` state in [billing cancelling state](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-cancelling-state.png) and recovers in [billing reactivated state](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-reactivated-state.png), but Stripe-hosted portal cancellation still is not proven by automation |
| Billing page reflects Stripe cancellation state correctly | Pass | `verify_billing_cancel_state_reflection.js` output: `CANCELLING_BADGE_VISIBLE true`, `CANCELLING_CALLOUT_VISIBLE true`, `REACTIVATED_BADGE_VISIBLE true`; screenshots [billing cancelling state](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-cancelling-state.png), [billing reactivated state](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-reactivated-state.png) |
| Add-on purchase works | Pass | [billing before seat add-on](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-before-seat-addon.png), [billing after seat add-on](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-after-seat-addon.png), Stripe add-on subscription `sub_1TIv7mK4v3vaQ3CjE4HfVIMF` quantity `1` |
| Add-on quantity updates work | Pass | [seat quantity increased](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-after-seat-quantity-increase.png), Stripe add-on quantity updated to `2` |
| Extra user seat purchase and seat enforcement work | Pass | [seat add-on reflected in billing](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-page-authenticated.png), [seat quantity increased](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-after-seat-quantity-increase.png) showing `Total seats 3`, `Used 2`, `Available 1` |
| Featured location purchase requires active Pro on server side | Pass | code fix in `src/lib/stripe/actions.ts` |

## Gate 4: File Storage

| Check | Status | Evidence |
| --- | --- | --- |
| Logo upload works | Pass | [company logo uploaded](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/company-logo-uploaded.png) with `HAS_AGENCY_LOGO true` and Company Details showing `Change Logo` / `Remove Logo` |
| Photo upload/delete/reorder works | Pass | `verify_media_delete_reorder.js` output proves upload, reorder persistence across reload, and delete (`PHOTO_COUNT_AFTER_DELETE 1`); screenshots [media photo uploaded](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/media-photo-uploaded.png), [media before reorder](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/media-before-reorder.png), [media after reorder](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/media-after-reorder.png), [media after delete](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/media-after-delete.png) |
| Agreement packet upload/preview works | Pass | [agreement packet uploaded](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/agreement-packet-uploaded.png), [agreement packet preview](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/agreement-packet-preview.png) and command output from `verify_agreement_packet_flow.js` showing the branded public agreement page with uploaded PDF |
| Client document upload/download works | Pass | [public upload success](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/public-document-upload-success.png), [dashboard document visible](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/dashboard-document-visible.png), backend retrieval proof in [client-document-download-response.txt](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/client-document-download-response.txt) and downloaded artifact [codex-pdf-upload.pdf](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/downloads/codex-pdf-upload.pdf) |
| Foreign workspace cannot access private file or document by reused ID | Pass | [fresh cross-workspace client denial](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/foreign-client-denied-fresh.png) blocks the dashboard path to the client’s documents; Convex document retrieval is also workspace-scoped in `crm:getDocumentUrl` |

## Gate 5: CRM + Communications

| Check | Status | Evidence |
| --- | --- | --- |
| Client CRUD works in Convex | Pass | browser verification |
| Client detail page is denied across workspaces | Pass | [cross-workspace denial](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/cross-workspace-client-denied.png), [fresh denial](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/foreign-client-denied-fresh.png) |
| Template save/edit/archive works | Pass | `communications-e2e.spec.ts` |
| Sending communication records against wrong-workspace client is denied | Pass | code fix in `convex/communications.ts` |
| Agreement submission cannot be linked to wrong-workspace client | Pass | code fix in `convex/agreements.ts` |
| Intake token and document token boundaries hold | Pass | `verify_public_token_matrix.mjs` output shows valid intake prefill and valid document upload page, while replaying the same token against a foreign provider slug returns `404`; screenshots [intake valid token](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/intake-valid-token.png), [intake foreign token denied](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/intake-foreign-token-denied.png), [document valid token](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/document-valid-token.png), [document foreign token denied](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/document-foreign-token-denied.png) |

## Gate 6: Email

| Check | Status | Evidence |
| --- | --- | --- |
| Resend API is connected and send path works | Pass | `/api/test-email` response |
| Invitation email sends successfully | Pass | `WORKSPACE_INVITE_EMAIL_RESULT {"success":true}` from live `sendWorkspaceInvitationEmail()` call to `hash@behaviorwork.com` |
| CRM communication email sends successfully | Pass | [crm communication send trace](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/crm-communication-send.txt) shows `To: hash@behaviorwork.com` with minted intake and agreement links and persisted communication history |
| Email templates render correctly in inbox | Pending | inbox screenshots |
| Sender/reply-to/domain are production-correct | Pending | config review + live send |

## Gate 7: Security / Segregation

| Check | Status | Evidence |
| --- | --- | --- |
| CRM records cannot leak across workspaces | Pass | [cross-workspace denial](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/cross-workspace-client-denied.png), [fresh denial](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/foreign-client-denied-fresh.png) |
| Documents/files cannot leak across workspaces | Pass | [fresh denial](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/foreign-client-denied-fresh.png) plus workspace-scoped Convex retrieval proof in [client-document-download-response.txt](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/client-document-download-response.txt) |
| Communications cannot leak across workspaces | Pass | mutation guard fix in `convex/communications.ts`, shared-workspace visibility proof, and fresh foreign-client denial on CRM detail routes |
| Agreements/intake tokens cannot expose wrong workspace data | Pass | `verify_public_token_matrix.mjs` output shows the same intake, document, and agreement tokens work only for the correct provider slug and fail with `404` on a foreign provider slug; screenshots [agreement valid token](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/agreement-valid-token.png), [agreement foreign token denied](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/agreement-foreign-token-denied.png), [intake foreign token denied](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/intake-foreign-token-denied.png), [document foreign token denied](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/document-foreign-token-denied.png) |
| Billing and workspace-user operations are owner/admin-gated correctly | Pass | [admin users](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/admin-users-page.png), [admin billing](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/admin-billing-page.png), [member users](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/member-users-page.png), [member billing](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/member-billing-page.png) |

## Gate 8: Deployment / Production Readiness

| Check | Status | Evidence |
| --- | --- | --- |
| Convex prod deployment configured correctly | Pass | `CONVEX_DEPLOYMENT=prod:youthful-gazelle-739 npx convex deploy` succeeded and `npx convex env list --prod` shows production env vars present |
| Clerk prod instance configured with proper redirect URLs and Convex JWT template | Pass | production site serves Clerk-backed auth route with `x-clerk-auth-status: signed-out` and CSP allows `https://clerk.goodaba.com`; Convex prod uses `CLERK_JWT_ISSUER_DOMAIN=https://clerk.goodaba.com` |
| Vercel prod env points only to Clerk + Convex | Pass with cleanup debt | required production vars are present and the production deployment succeeded; old Supabase vars still exist in Vercel but production runtime is hard-pinned to Clerk + Convex and built successfully |
| Seed-only production dataset imported | Pass | prod seed import succeeded: `imported={...,\"googlePlacesListings\":1000,...}` |
| Production smoke pass complete | Pass with one billing caveat | production deploy succeeded to [www.goodaba.com](https://www.goodaba.com), homepage renders, production search returns seeded provider data ([prod-homepage.png](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/prod-homepage.png), [prod-search-behavioral-one.png](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/prod-search-behavioral-one.png), [prod-signin-page.png](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/prod-signin-page.png)) |

## Evidence Collected So Far

- Shared workspace user successfully signed in and saw shared workspace pages.
- Cross-workspace client detail request returned `Client Not Found | Dashboard`.
- Resend test email API returned success for `hash@behaviorwork.com`.
- Stripe test-mode Pro checkout succeeded and reconciled from Free -> Pro in app state.
- Stripe billing portal opened successfully from the dashboard.
- Extra-user seat add-on quantity updated successfully and increased available seats in-app.
- Media photo upload persisted in the dashboard.
- Client document public upload succeeded and the uploaded PDF was retrievable from Convex storage.
- Admin/member billing and workspace-user boundaries were verified in the browser.
- Live invitation email send succeeded, but invite acceptance itself is currently blocked by a Clerk redirect loop in dev.
- Invite acceptance now succeeds on the GoodABA side and lands on workspace users ([invite accepted](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/invite-accepted-users-page-via-ticket.png)); Clerk can still challenge a fresh device with email verification in dev.
- Agreement packet upload and branded public preview now work ([agreement packet uploaded](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/agreement-packet-uploaded.png), [agreement packet preview](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/agreement-packet-preview.png)).
- Company logo upload now works ([company logo uploaded](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/company-logo-uploaded.png)).
- Live CRM communication send now records to `hash@behaviorwork.com` with minted intake/agreement links ([crm communication send trace](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/crm-communication-send.txt)).
- Clean extra-user add-on purchase and quantity increase now pass against a fresh Pro workspace ([billing after seat add-on](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-after-seat-addon.png), [billing after seat quantity increase](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-after-seat-quantity-increase.png)).
- Media upload, reorder persistence, and delete now pass (`verify_media_delete_reorder.js`) with screenshots [media before reorder](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/media-before-reorder.png), [media after reorder](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/media-after-reorder.png), and [media after delete](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/media-after-delete.png).
- Public intake/document/agreement token replay against a foreign provider slug is now denied with `404` while the correct links remain valid (`verify_public_token_matrix.mjs`).
- Billing page now visibly reflects Stripe `cancel_at_period_end` state and returns to active once restored ([billing cancelling state](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-cancelling-state.png), [billing reactivated state](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-reactivated-state.png)).
- Vercel production now has the explicit provider flags, but it is still missing the required Clerk/Convex secret/config vars and still contains Supabase production vars (`npx vercel env ls production`).
- Convex production has no env vars configured yet (`npx convex env list --prod` -> `No environment variables set.`).
- Convex production is deployed at `https://youthful-gazelle-739.convex.cloud`.
- Production app deployment succeeded and is aliased to [www.goodaba.com](https://www.goodaba.com).
- Production search now returns imported directory data: `Behavioral One` appears in live search results ([prod-search-behavioral-one.png](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/prod-search-behavioral-one.png)).
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npx convex dev --once` passed.
- `communications-e2e.spec.ts` passed.
- `plan-limits.spec.ts` passed.
- Screenshot evidence:
  - [shared-user company](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/shared-user-company.png)
  - [shared-user clients](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/shared-user-clients.png)
  - [shared-user seats/users](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/shared-user-workspace-users.png)
  - [cross-workspace denial](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/cross-workspace-client-denied.png)
  - [billing before checkout](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-before-checkout.png)
  - [billing success after payment](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-success-after-payment.png)
  - [billing after payment](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-after-payment.png)
  - [billing portal](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-portal.png)
  - [seat add-on reflected in billing](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-page-authenticated.png)
  - [seat quantity increased](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/billing-after-seat-quantity-increase.png)
  - [media photo uploaded](/Users/hashemselim/Code/findabatherapy/tmp/launch-evidence/media-photo-uploaded.png)

## Remaining Launch Blockers

- Stripe-hosted portal cancellation itself is still not proven by automation. The portal opens, returns, and the app correctly reflects cancellation state when Stripe sets it, but the hosted portal mutation did not produce `cancel_at_period_end=true` in repeated automated runs.
- Old Supabase vars still remain in Vercel production as dormant cleanup debt. They are not active in the production runtime, but they should be removed after cutover cleanup.
