-- Add is_accepting_clients column to locations table
-- This allows tracking availability on a per-location basis

ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS is_accepting_clients boolean NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.locations.is_accepting_clients IS 'Whether this location is currently accepting new clients';
