-- Migration: Move service_mode and insurances to location level
-- This enables each location to have its own service type and accepted insurances

-- Step 1: Add new columns to locations table (IF NOT EXISTS for idempotency)
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS service_mode text CHECK (service_mode IN ('center_based', 'in_home', 'both')),
  ADD COLUMN IF NOT EXISTS insurances text[] DEFAULT array[]::text[];

-- Step 2: Create indexes for efficient filtering (IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS locations_insurances_idx ON public.locations USING gin (insurances);
CREATE INDEX IF NOT EXISTS locations_service_mode_idx ON public.locations (service_mode);
CREATE INDEX IF NOT EXISTS locations_city_idx ON public.locations (city);

-- Step 3: Migrate existing data from listing_attribute_values and listings.service_modes
-- Copy insurances from listing_attribute_values to all locations of that listing
UPDATE public.locations l
SET insurances = COALESCE(
  (
    SELECT ARRAY(SELECT jsonb_array_elements_text(value_json))
    FROM public.listing_attribute_values lav
    WHERE lav.listing_id = l.listing_id
      AND lav.attribute_key = 'insurances'
      AND lav.value_json IS NOT NULL
  ),
  array[]::text[]
)
WHERE l.insurances IS NULL OR l.insurances = array[]::text[];

-- Map existing service_modes array to the new single service_mode value
-- Logic: if both in_home and in_center -> 'both', else map directly
UPDATE public.locations l
SET service_mode = (
  SELECT CASE
    WHEN 'in_home' = ANY(li.service_modes) AND 'in_center' = ANY(li.service_modes) THEN 'both'
    WHEN 'in_home' = ANY(li.service_modes) THEN 'in_home'
    WHEN 'in_center' = ANY(li.service_modes) THEN 'center_based'
    ELSE 'both'
  END
  FROM public.listings li
  WHERE li.id = l.listing_id
)
WHERE l.service_mode IS NULL;

-- Step 4: Set default for any locations that still have NULL service_mode
UPDATE public.locations
SET service_mode = 'both'
WHERE service_mode IS NULL;

-- Step 5: Make service_mode NOT NULL now that all rows have values
-- Use DO block to check if already NOT NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'locations'
    AND column_name = 'service_mode'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.locations ALTER COLUMN service_mode SET NOT NULL;
  END IF;
END $$;

-- Note: We keep listings.service_modes for backward compatibility
-- It can be removed in a future migration after all code is updated
