-- Add location_id to inquiries table
-- This allows tracking which location an inquiry was submitted from

-- Add the column (nullable to support existing data)
ALTER TABLE public.inquiries
ADD COLUMN location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;

-- Create index for efficient filtering by location
CREATE INDEX inquiries_location_id_idx ON public.inquiries(location_id);

-- Add comment explaining the field
COMMENT ON COLUMN public.inquiries.location_id IS 'The location the inquiry was submitted for (from the provider detail page)';
