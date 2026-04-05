# Clerk and Convex Cutover Validation Matrix

This checklist is the launch gate for the single production cutover. Each item must be explicitly marked complete before reopening the application after maintenance mode.

## Automated Coverage

| Surface | Required coverage | Status |
| --- | --- | --- |
| Auth | Email/password sign-up | Pending |
| Auth | Email/password sign-in | Pending |
| Auth | Sign-out | Pending |
| Auth | Password reset | Pending |
| Auth | Google sign-in | Pending |
| Auth | Microsoft sign-in | Pending |
| Workspace | First workspace creation | Pending |
| Workspace | Invite user | Pending |
| Workspace | Accept invite with matching email | Pending |
| Workspace | Owner, admin, member enforcement | Pending |
| Workspace | Single-workspace enforcement | Pending |
| Provider domain | Listing CRUD | Pending |
| Provider domain | Location CRUD | Pending |
| Provider domain | Attribute CRUD | Pending |
| Provider domain | Provider public pages | Pending |
| Provider domain | Branded/provider-controlled pages | Pending |
| Provider domain | Sitemap and SEO generation | Pending |
| Provider domain | Google Places and reviews flows | Pending |
| Jobs | Job CRUD | Pending |
| Jobs | Search and filters | Pending |
| Jobs | Public job pages | Pending |
| Jobs | Application flows | Pending |
| Jobs | Resume upload and download | Pending |
| CRM and intake | Clients | Pending |
| CRM and intake | Parents | Pending |
| CRM and intake | Locations | Pending |
| CRM and intake | Insurances | Pending |
| CRM and intake | Authorizations | Pending |
| CRM and intake | Tasks | Pending |
| CRM and intake | Contacts | Pending |
| CRM and intake | Documents | Pending |
| CRM and intake | Status history | Pending |
| CRM and intake | Inquiries | Pending |
| CRM and intake | Intake and token flows | Pending |
| Agreements | Packet CRUD | Pending |
| Agreements | Versioning | Pending |
| Agreements | Uploads | Pending |
| Agreements | Submissions and signing | Pending |
| Agreements | Artifact access | Pending |
| Billing | Checkout | Pending |
| Billing | Portal | Pending |
| Billing | Addons | Pending |
| Billing | Featured locations | Pending |
| Billing | Webhook mutation paths | Pending |
| Storage and security | Public file delivery | Pending |
| Storage and security | Private file authorization | Pending |
| Storage and security | Cross-workspace rejection | Pending |
| Storage and security | No raw storage URL assumptions in the client | Pending |

## Manual Full-Product Checklist

| Surface | Manual verification | Status |
| --- | --- | --- |
| Auth | Sign-in, sign-up, sign-out, password reset, invite acceptance, callback/confirm flows | Pending |
| Dashboard | Every launched page loads with correct workspace context | Pending |
| CRUD surfaces | Create, read, update, delete verified where applicable | Pending |
| File workflows | Upload, view, download, delete verified where applicable | Pending |
| Public therapy pages | Search, provider pages, state/city pages, guides, FAQ, pricing | Pending |
| Public jobs pages | Jobs landing, filters, branded career pages, employers pages, applications | Pending |
| CRM and operations | Pipeline, communications, tasks, documents, referrals, notifications | Pending |
| Agreements | Packet editing, publishing, signing, signed artifact retrieval | Pending |
| Billing | Checkout, upgrade paths, addon flows, portal, webhook results | Pending |
| Admin and internal | Analytics, feedback, removal requests, customer analytics, admin-only guards | Pending |

## Launch Gates

- Inventory complete and current.
- Every Supabase dependency mapped to a Clerk or Convex replacement.
- No runtime feature path depends on Supabase.
- Import and reconciliation tooling tested against a realistic export sample.
- Automated critical-path coverage green.
- Manual feature checklist complete.
- Stripe linkage and webhook smoke checks pass.
- Private-file authorization verified.
- Production build contains no Supabase runtime references.

## Rollback Boundary

- Before reopening traffic: rollback means redeploying the Supabase-backed release and serving production from the old stack.
- After reopening traffic: default to forward-fix on Clerk and Convex, not a second migration cycle.
