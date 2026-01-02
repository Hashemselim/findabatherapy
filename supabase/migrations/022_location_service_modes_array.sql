-- Migration: Change service_mode from single value to service_modes array
-- This allows locations to have multiple service modes (in_home, in_center, telehealth, hybrid)
-- with inheritance from listing-level serviceModes

-- Step 1: Add new service_modes array column
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS service_modes text[] DEFAULT NULL;

-- Step 2: Add use_listing_service_modes toggle for inheritance
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS use_listing_service_modes boolean NOT NULL DEFAULT true;

-- Step 3: Migrate existing service_mode values to new service_modes array
UPDATE public.locations
SET service_modes = CASE
    WHEN service_mode = 'center_based' THEN ARRAY['in_center']::text[]
    WHEN service_mode = 'in_home' THEN ARRAY['in_home']::text[]
    WHEN service_mode = 'both' THEN ARRAY['in_home', 'in_center']::text[]
    ELSE ARRAY['in_home', 'in_center']::text[]
END
WHERE service_modes IS NULL;

-- Step 4: Create index for efficient filtering
CREATE INDEX IF NOT EXISTS locations_service_modes_idx ON public.locations USING gin (service_modes);

-- Step 5: Add comments for documentation
COMMENT ON COLUMN public.locations.service_modes IS 'Location-specific service modes (in_home, in_center, telehealth, hybrid). NULL means inherit from listing.service_modes';
COMMENT ON COLUMN public.locations.use_listing_service_modes IS 'When true, inherit service_modes from listing.service_modes. When false, use location.service_modes';

-- Note: We keep the old service_mode column for now for backward compatibility
-- It can be dropped in a future migration after all code is updated
