-- Migration: Provider Websites
-- Adds website settings to listings and custom domain management

-- ============================================================================
-- 1. New columns on listings for website settings
-- ============================================================================

ALTER TABLE listings ADD COLUMN IF NOT EXISTS website_settings jsonb DEFAULT '{
  "template": "modern",
  "show_gallery": true,
  "show_reviews": true,
  "show_careers": true,
  "show_resources": true,
  "hero_cta_text": "Get Started",
  "sections_order": ["hero","about","services","insurance","locations","gallery","reviews"]
}'::jsonb;

ALTER TABLE listings ADD COLUMN IF NOT EXISTS website_published boolean DEFAULT false;

-- ============================================================================
-- 2. Custom domains table
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_domains (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  domain text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending_dns'
    CHECK (status IN ('pending_dns', 'verifying', 'active', 'failed', 'removed')),
  verification_token text,
  verified_at timestamptz,
  vercel_domain_id text,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_domains_profile_id ON custom_domains(profile_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_listing_id ON custom_domains(listing_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain);
CREATE INDEX IF NOT EXISTS idx_custom_domains_status ON custom_domains(status);

-- ============================================================================
-- 3. RLS policies for custom_domains
-- ============================================================================

ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;

-- Users can view their own custom domains
CREATE POLICY "Users can view own custom domains"
  ON custom_domains
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Users can insert their own custom domains
CREATE POLICY "Users can insert own custom domains"
  ON custom_domains
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Users can update their own custom domains
CREATE POLICY "Users can update own custom domains"
  ON custom_domains
  FOR UPDATE
  USING (auth.uid() = profile_id);

-- Users can delete their own custom domains
CREATE POLICY "Users can delete own custom domains"
  ON custom_domains
  FOR DELETE
  USING (auth.uid() = profile_id);

-- Public read for active domains (needed for middleware domain lookup)
CREATE POLICY "Public can read active custom domains"
  ON custom_domains
  FOR SELECT
  USING (status = 'active');

-- ============================================================================
-- 4. Updated_at trigger for custom_domains
-- ============================================================================

CREATE OR REPLACE FUNCTION update_custom_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_custom_domains_updated_at
  BEFORE UPDATE ON custom_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_domains_updated_at();

-- ============================================================================
-- 5. Index on listings for website lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_listings_website_published ON listings(website_published) WHERE website_published = true;
