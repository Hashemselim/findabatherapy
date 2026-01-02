-- Migration: Rename service_modes to service_types
-- This renames the column for better clarity and consistency
-- service_types defines HOW services are delivered at a location (in_home, in_center, telehealth, hybrid)

-- Step 1: Add new service_types column (if not exists from previous migration)
-- Note: We're replacing service_modes with service_types

-- First, check if service_types already exists; if not, rename service_modes
DO $$
BEGIN
    -- If service_modes exists but service_types doesn't, rename it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'locations' AND column_name = 'service_modes'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'locations' AND column_name = 'service_types'
    ) THEN
        ALTER TABLE public.locations RENAME COLUMN service_modes TO service_types;
    END IF;

    -- Drop use_listing_service_modes if it exists (no longer needed)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'locations' AND column_name = 'use_listing_service_modes'
    ) THEN
        ALTER TABLE public.locations DROP COLUMN use_listing_service_modes;
    END IF;
END $$;

-- Step 2: Ensure service_types has default values for any NULL entries
UPDATE public.locations
SET service_types = ARRAY['in_home', 'in_center']::text[]
WHERE service_types IS NULL;

-- Step 3: Rename the index if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'locations_service_modes_idx'
    ) THEN
        ALTER INDEX locations_service_modes_idx RENAME TO locations_service_types_idx;
    END IF;
END $$;

-- Step 4: Update column comment
COMMENT ON COLUMN public.locations.service_types IS 'Service types available at this location (in_home, in_center, telehealth, school_based)';

-- Note: The old service_mode column (singular, for legacy center_based/in_home/both)
-- can be dropped in a future migration after verifying all code is updated
