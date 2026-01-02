-- Migration: Remove unused location override columns
-- These columns are no longer used now that:
-- - Insurances are purely location-level (no fallback to company)
-- - Services are company-level only (not per-location)

-- Drop the index on services_offered first
DROP INDEX IF EXISTS locations_services_offered_idx;

-- Drop the unused columns
ALTER TABLE public.locations DROP COLUMN IF EXISTS use_listing_insurances;
ALTER TABLE public.locations DROP COLUMN IF EXISTS use_listing_services;
ALTER TABLE public.locations DROP COLUMN IF EXISTS services_offered;
