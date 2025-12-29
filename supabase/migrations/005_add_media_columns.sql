-- Add video_url and logo_url columns to listings table
-- Also add contact_form_enabled attribute definition

-- Add video_url column to listings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'listings'
    AND column_name = 'video_url'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN video_url text;
  END IF;
END $$;

-- Add logo_url column to listings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'listings'
    AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN logo_url text;
  END IF;
END $$;

-- Add contact_form_enabled attribute definition (if not exists)
INSERT INTO public.listing_attribute_definitions (attribute_key, label, variant, description, is_filterable)
VALUES ('contact_form_enabled', 'Contact Form Enabled', 'boolean', 'Whether the listing has the contact form enabled for direct inquiries.', false)
ON CONFLICT (attribute_key) DO NOTHING;
