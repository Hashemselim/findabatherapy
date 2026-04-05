# Convex + Clerk Seed Cutover

This cutover intentionally preserves only seeded public provider-directory data and drops
workspace users, clients, inquiries, applications, documents, agreements, and other
operational records.

## What Gets Imported

- `profiles.is_seeded = true` agencies as Convex `workspaces`
- Their `listings`, `locations`, and `listing_attribute_values`
- Their `media_assets` as Convex `files`
- Their `google_reviews`
- Their `custom_domains`
- All `google_places_listings` into Convex `publicReadModels`

## What Does Not Get Imported

- Supabase auth users
- Clerk users
- Workspace memberships/invitations
- Clients, inquiries, pipeline, communications, tasks, documents, agreement packets
- Job posts/applications, notifications, billing records, audit events

## DEV Cutover

1. Export seeded provider data from Supabase:

   ```bash
   npm run seed:export:directory -- --output tmp/dev-seeded-directory.json
   ```

2. Link Convex dev and push backend code:

   ```bash
   npx convex dev --configure existing
   ```

3. Configure the Convex import secret on the dev deployment:

   ```bash
   npx convex env set CONVEX_SEED_IMPORT_SECRET "$(openssl rand -hex 32)"
   ```

   Copy the same secret into `.env.local` as `CONVEX_SEED_IMPORT_SECRET`.

4. Configure Clerk dev with the Convex JWT template:

   - JWT template name: `convex`
   - Audience / `aud`: `convex`
   - Issuer domain must match `CLERK_JWT_ISSUER_DOMAIN`

5. Import the seed artifact into Convex dev:

   ```bash
   npm run seed:import:directory -- --input tmp/dev-seeded-directory.json --confirm-reset
   ```

6. Run validation:

   ```bash
   npx tsc --noEmit
   npm run lint
   npm run test:run
   ```

7. Manual QA:

   - Public therapy search and provider pages
   - Public jobs/employer pages
   - Clerk sign-up/sign-in
   - New workspace onboarding
   - Dashboard listings, locations, media, forms, CRM, documents, referrals, team, billing

## PROD Cutover

Run the same flow against production Convex and Clerk after DEV is green:

1. Export seeded data from Supabase prod.
2. Link Convex prod and deploy backend.
3. Set `CONVEX_SEED_IMPORT_SECRET` on Convex prod.
4. Configure Clerk prod JWT template and production domains.
5. Point Vercel prod env to Clerk prod + Convex prod.
6. Import the seed artifact with `--confirm-reset`.
7. Smoke test all public pages and a fresh Clerk signup/onboarding flow.

## Notes

- The importer wipes all Convex application tables before rebuilding the seed dataset.
- Media files are copied into Convex storage by default. Pass `--skip-media-upload` to
  keep `publicUrl` fallbacks only.
- Existing user-owned workspaces must be re-created through Clerk signup/onboarding after cutover.
