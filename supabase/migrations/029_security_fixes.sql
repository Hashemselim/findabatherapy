-- Migration: Security fixes from Supabase linter warnings
-- Fixes:
-- 1. Function search_path mutable on update_google_reviews_updated_at
-- 2. Extensions in public schema (pg_trgm, unaccent)

-- ============================================
-- 1. Fix function search_path vulnerability
-- ============================================
-- Recreate the function with a fixed search_path to prevent search_path injection attacks

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

-- ============================================
-- 2. Move extensions to dedicated schema
-- ============================================
-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Move pg_trgm extension
-- Note: We need to drop and recreate since ALTER EXTENSION ... SET SCHEMA
-- doesn't work for all extensions and can break dependent objects
DROP EXTENSION IF EXISTS pg_trgm CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Move unaccent extension
DROP EXTENSION IF EXISTS unaccent CASCADE;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- Recreate any indexes that depended on pg_trgm
-- (The listings_search_idx uses tsvector, not pg_trgm directly, so it should be fine)

-- ============================================
-- Note on Leaked Password Protection:
-- ============================================
-- This must be enabled in the Supabase Dashboard:
-- Authentication → Providers → Email → Enable "Leaked password protection"
-- This cannot be done via SQL migration.
