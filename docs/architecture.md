# Architecture Overview

## Application Layers

- **App Router**: Separates public (`src/app/(site)`) and authenticated (`src/app/(dashboard)`) experiences using route groups.
- **Shared Components**: UI primitives live in `src/components/ui` (shadcn), while higher-level features sit in `src/components/search`, `src/components/listings`, and `src/components/dashboard`.
- **Configuration**: Product metadata is centralized in `src/config/site.ts`, environment validation in `src/env.ts`, and listing metadata in `src/lib/constants/*`.
- **Data Access**: Clerk handles authentication, Convex owns application data/storage, and TanStack Query is used for client-side coordination where needed.

## Filtering Strategy

1. `listing_attribute_definitions` defines each attribute’s variant (text, boolean, range, etc.).
2. `listing_attribute_values` stores normalized values per listing.
3. The frontend consumes the same definitions via `FILTERABLE_ATTRIBUTES` so the UI always matches backend search capabilities.
4. An edge function can hydrate filter options per state/service type for instant search.

## Stripe Integration Points

- Checkout session creation when a user selects Premium or Featured from the dashboard.
- Webhook endpoint updates Convex-backed billing state (`plan_tier`, `featured_orders`, `sponsorships`).
- Stripe Customer Portal link available from `dashboard/billing`.

## Next Steps

- Implement ISR/SSG for state and agency pages with revalidation hooks after data updates.
- Connect the search form to the production search data layer for real query results.
- Build server actions or API routes for listing CRUD operations with form validation.
