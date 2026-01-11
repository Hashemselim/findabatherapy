-- Add intake form settings to profiles and source tracking to inquiries

-- Add intake_form_settings column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS intake_form_settings jsonb DEFAULT '{
  "background_color": "#5788FF",
  "show_powered_by": true
}'::jsonb;

-- Add source column to inquiries table
-- Tracks where the inquiry came from: listing_page, intake_standalone
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS source text DEFAULT 'listing_page';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.intake_form_settings IS 'Settings for the standalone intake form page: background_color (hex), show_powered_by (boolean)';
COMMENT ON COLUMN public.inquiries.source IS 'Where the inquiry originated: listing_page, intake_standalone';

-- Create index on source for analytics queries
CREATE INDEX IF NOT EXISTS inquiries_source_idx ON public.inquiries(source);
