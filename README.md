## Find ABA Therapy – Project Scaffold

This repository hosts the MVP for the Find ABA Therapy directory: a high-performance Next.js application backed by Supabase and Stripe. Families can discover ABA providers by state, service type, or any agency attribute; agencies manage listings through a TurboTax-style dashboard with paid upgrade paths.

### Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, React Query
- **Auth/Data:** Supabase (Postgres, RLS, Storage, SSR helpers)
- **Payments:** Stripe Checkout and billing webhooks
- **UI Tokens:** Shared metadata in `src/config/site.ts`, `src/lib/constants/*`

### Getting Started

```bash
nvm use # optional if you have nvm installed (see .nvmrc for the target version)
npm install
cp .env.example .env.local
npm run dev
```

Visit `http://localhost:3000` for the public directory and `http://localhost:3000/dashboard` for the agency dashboard scaffold.

### Environment Variables

Populate `.env.local` with Supabase and Stripe credentials:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only tasks, not exposed to the browser)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SITE_URL` (defaults to `http://localhost:3000`)

`src/env.ts` validates required variables at runtime so misconfiguration fails fast in development and deployment.

### Supabase

- SQL definitions live under `supabase/schema.sql` with supporting seed data in `supabase/seed_attribute_definitions.sql`.
- Run migrations with `supabase db push` once the Supabase CLI is configured.
- Storage buckets to provision: `logos`, `media`, `sponsors` (configure RLS to match in-app policies).
- Use the helper `src/lib/supabase/clients.ts` for browser/server clients.

### Stripe

- `src/lib/stripe.ts` exports a pre-configured Stripe SDK instance (API version pinned).
- Subscription upgrades map to plan tiers (`free`, `premium`, `featured`). Webhook handlers will adjust Supabase records accordingly.
- Add CLI webhook forwarding during development: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

### Project Structure Highlights

- `src/app/(site)/*`: Public marketing, state directory, and agency detail pages with SEO-friendly routing.
- `src/app/(dashboard)/*`: Agency onboarding, listing editor, billing, and partner center.
- `src/components/search/agency-search-form.tsx`: Reusable search/filter entry point referencing attribute metadata.
- `src/lib/constants/listings.ts`: Filterable attribute registry mirrored by Supabase attribute definitions.
- `supabase/`: SQL schema, seeds, and RLS policies.

### UX & Future Work

- Integrate Supabase auth flows (email/password, Google, Microsoft) in the dashboard routes.
- Implement Supabase Edge Functions to refresh the materialized search view after listing updates.
- Wire Stripe Checkout sessions + webhook handlers to mutate `plan_tier`, `featured_orders`, and `sponsorships`.
- Replace placeholder listing data with live queries using Supabase (TanStack Query for client-side filters).
- Add analytics tooling (PostHog) and conversion tracking for agency sign-ups and family searches.

### Commands

| Command          | Purpose                          |
| ---------------- | -------------------------------- |
| `npm run dev`    | Start Next.js dev server         |
| `npm run build`  | Production build                 |
| `npm run start`  | Start production server          |
| `npm run lint`   | Run ESLint checks                |

### Licensing & Legal Content

Legal copy placeholders live under `src/app/(site)/legal`. Replace with finalized content before launch.
