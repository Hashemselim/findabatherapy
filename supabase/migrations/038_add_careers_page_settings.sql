-- Add careers page branding settings to listings table
-- This allows providers to customize their branded careers page appearance

-- Add careers page settings columns to listings table
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS careers_brand_color TEXT DEFAULT '#10B981',
ADD COLUMN IF NOT EXISTS careers_headline TEXT,
ADD COLUMN IF NOT EXISTS careers_cta_text TEXT DEFAULT 'Join Our Team';

-- Add comment for documentation
COMMENT ON COLUMN listings.careers_brand_color IS 'Hex color code for careers page branding (e.g., #10B981)';
COMMENT ON COLUMN listings.careers_headline IS 'Custom headline text shown on the careers page hero section';
COMMENT ON COLUMN listings.careers_cta_text IS 'Call-to-action button text for job applications';
