# Supabase Schema Notes

This directory contains the initial SQL schema for the Find ABA Therapy platform.

## Entities

- `profiles`: agency account metadata keyed to Supabase auth users.
- `listings`: primary directory entries with plan tier, slug, and publishing state.
- `locations`: one-to-many geocoded service areas for each listing.
- `listing_attribute_definitions`: registry of filterable attributes (services, insurances, languages, etc.).
- `listing_attribute_values`: flexible storage for attribute values across variants (text, boolean, json, number).
- `media_assets`: references to Supabase Storage paths for logos, photos, and videos.
- `featured_orders` & `sponsorships`: Stripe-driven upgrades for featured placement and banner inventory.
- `partner_offers`: featured partner promotions surfaced inside the dashboard.
- `audit_events`: append-only log for administrative changes.

## Search Indexing

The `listing_search_index` materialized view aggregates full-text vectors across description, attribute values, and location data. Refresh the view via the `public.refresh_listing_search_index()` function (from an Edge Function or scheduled task) whenever listings or attributes change.

## Row-Level Security

Policies limit agencies to their own profiles and listings while keeping published listings publicly readable. Service-role API keys can manage sponsorship inventory and refresh the search index.

## Next Steps

- Convert this schema into versioned migrations using the Supabase CLI.
- Add triggers to keep `updated_at` columns in sync.
- Configure Supabase Storage buckets (`logos`, `media`, `sponsors`) with RLS.
- Wire Stripe webhook handlers to update `plan_tier`, `featured_orders`, and `sponsorships` records.
