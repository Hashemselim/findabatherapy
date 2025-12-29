-- Migration: Add location-level contact info and Google Business integration
-- This allows each location to have its own contact details and link to Google Business for ratings

-- Location-level contact info
-- When use_company_contact is true (default), the location uses the profile's contact info
-- When false, the location uses its own contact_phone and contact_email
ALTER TABLE public.locations
ADD COLUMN contact_phone text,
ADD COLUMN contact_email text,
ADD COLUMN use_company_contact boolean NOT NULL DEFAULT true;

-- Google Business integration
-- Allows linking a location to a Google Place for rating display
ALTER TABLE public.locations
ADD COLUMN google_place_id text,
ADD COLUMN google_rating numeric(2,1),
ADD COLUMN google_rating_count integer;

-- Index for Google Place ID lookups (sparse index - only for non-null values)
CREATE INDEX locations_google_place_id_idx
ON public.locations(google_place_id)
WHERE google_place_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.locations.use_company_contact IS 'When true, use profile contact info. When false, use location-specific contact_phone and contact_email.';
COMMENT ON COLUMN public.locations.google_place_id IS 'Google Places API place_id for linking to Google Business profile';
COMMENT ON COLUMN public.locations.google_rating IS 'Cached Google rating (1-5 stars) from linked Google Business';
COMMENT ON COLUMN public.locations.google_rating_count IS 'Cached number of Google reviews from linked Google Business';
