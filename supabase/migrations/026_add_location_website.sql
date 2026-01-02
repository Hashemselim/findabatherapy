-- Migration: Add website column to locations table
-- This allows each location to have its own website URL (following the same pattern as phone/email)
-- When use_company_contact is true, the location uses the profile's website
-- When false, the location can have its own contact_website

ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS contact_website text;

-- Add comment for documentation
COMMENT ON COLUMN public.locations.contact_website IS 'Location-specific website URL. Used when use_company_contact is false.';
