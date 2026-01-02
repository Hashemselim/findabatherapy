-- Migration: Add location-level override flags for insurances and services
-- This enables the toggle-per-field UX pattern where locations can inherit
-- from listing/profile defaults or have their own values

-- Add services_offered column for location-specific services
-- When NULL and use_listing_services=true, inherit from listing.service_modes
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS services_offered text[] DEFAULT NULL;

-- Add override flag for insurances
-- When true (default), inherit from listing_attribute_values.insurances
-- When false, use location.insurances
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS use_listing_insurances boolean NOT NULL DEFAULT true;

-- Add override flag for services
-- When true (default), inherit from listing.service_modes
-- When false, use location.services_offered
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS use_listing_services boolean NOT NULL DEFAULT true;

-- Index for service filtering (only index non-null values)
CREATE INDEX IF NOT EXISTS locations_services_offered_idx
ON public.locations USING gin (services_offered)
WHERE services_offered IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.locations.services_offered IS 'Location-specific services (ABA, OT, Speech, etc). NULL means inherit from listing.service_modes';
COMMENT ON COLUMN public.locations.use_listing_insurances IS 'When true, inherit insurances from listing_attribute_values. When false, use location.insurances';
COMMENT ON COLUMN public.locations.use_listing_services IS 'When true, inherit services from listing.service_modes. When false, use location.services_offered';
