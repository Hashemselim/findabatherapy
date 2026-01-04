-- Migration: Verify extensions are properly set up after security fixes
-- This ensures pg_trgm and unaccent are available and working

-- Verify extensions exist in the extensions schema
-- If they don't exist, create them
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- Verify the function has the correct search_path
CREATE OR REPLACE FUNCTION public.update_google_reviews_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Also fix refresh_listing_search_index if it exists
CREATE OR REPLACE FUNCTION public.refresh_listing_search_index()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.listing_search_index;
END;
$$;
