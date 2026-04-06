## Find ABA Therapy

This repository hosts the Find ABA Therapy directory and GoodABA dashboard: a Next.js application backed by Convex, Clerk, Stripe, and Resend. Families can discover ABA providers by state, service type, or agency attributes; agencies manage listings, CRM workflows, communications, jobs, intake, agreements, and billing through the dashboard.

### Stack

- **Frontend:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Auth:** Clerk
- **Data + Functions:** Convex
- **Payments:** Stripe Checkout and billing webhooks
- **Email:** Resend

### Getting Started

```bash
nvm use # optional if you have nvm installed (see .nvmrc for the target version)
npm install
cp .env.example .env.local
npm run dev
```

Visit `http://localhost:3000` for the public directory and `http://localhost:3000/dashboard` for the agency dashboard scaffold.

### Environment Variables

Populate `.env.local` with the runtime and service credentials from `.env.example`:

- `NEXT_PUBLIC_AUTH_PROVIDER=clerk`
- `NEXT_PUBLIC_DATA_PROVIDER=convex`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_JWT_ISSUER_DOMAIN`
- `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_SITE_URL`

`src/env.ts` validates required variables at runtime so misconfiguration fails fast in development and deployment.

### Convex + Clerk

- Convex backend code lives in `convex/`.
- Auth is configured in `convex/auth.config.ts` and app-side auth helpers under `src/lib/platform/auth`.
- Link a deployment with `npx convex dev --configure existing`.
- Seed/cutover helpers live under `scripts/` and `convex/seed.ts`.

### Stripe

- Stripe actions live under `src/lib/stripe/actions.ts`.
- Subscription upgrades and add-ons reconcile into Convex workspace state through `/api/stripe/webhooks`.
- Add CLI webhook forwarding during development: `stripe listen --forward-to localhost:3000/api/stripe/webhooks`.

### Project Structure Highlights

- `src/app/(site)/*`: Public marketing, state directory, and agency detail pages with SEO-friendly routing.
- `src/app/(dashboard)/*`: Agency onboarding, listing editor, billing, and partner center.
- `src/app/(intake)/*`: Public intake, document upload, and agreement signing routes.
- `src/lib/platform/*`: Runtime abstractions for Clerk/Convex and legacy Supabase fallbacks.
- `convex/`: schemas, queries, mutations, seed helpers, and billing/auth integration.

### UX & Future Work

- Finalize production Clerk, Convex, Stripe, Resend, and Vercel environment wiring.
- Complete production smoke verification after cutover.
- Remove remaining dormant Supabase code once production cutover is complete.

### Commands

| Command          | Purpose                          |
| ---------------- | -------------------------------- |
| `npm run dev`    | Start Next.js dev server         |
| `npm run build`  | Production build                 |
| `npm run start`  | Start production server          |
| `npm run lint`   | Run ESLint checks                |

### Licensing & Legal Content

Legal copy placeholders live under `src/app/(site)/legal`. Replace with finalized content before launch.
