-- =============================================================================
-- Profile Add-ons table for usage-based pricing
-- =============================================================================

CREATE TABLE IF NOT EXISTS profile_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addon_type TEXT NOT NULL CHECK (addon_type IN (
    'extra_users', 'location_pack', 'job_pack', 'storage_pack', 'homepage_placement'
  )),
  quantity INTEGER NOT NULL DEFAULT 1,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  cancel_at_period_end BOOLEAN DEFAULT false,
  current_period_end TIMESTAMPTZ,
  grandfathered_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profile_addons_profile_id ON profile_addons(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_addons_status ON profile_addons(status);
CREATE INDEX IF NOT EXISTS idx_profile_addons_type ON profile_addons(addon_type);

-- RLS
ALTER TABLE profile_addons ENABLE ROW LEVEL SECURITY;

-- Users can read their own add-ons (profiles.id = auth.uid())
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own addons' AND tablename = 'profile_addons') THEN
    CREATE POLICY "Users can view own addons"
      ON profile_addons FOR SELECT
      USING (profile_id = auth.uid());
  END IF;
END $$;

-- Service role can manage all add-ons (for webhook handler)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role manages addons' AND tablename = 'profile_addons') THEN
    CREATE POLICY "Service role manages addons"
      ON profile_addons FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_profile_addons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_profile_addons_updated_at ON profile_addons;
CREATE TRIGGER trigger_update_profile_addons_updated_at
  BEFORE UPDATE ON profile_addons
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_addons_updated_at();

-- =============================================================================
-- Enterprise migration tracking columns
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS migrated_from_enterprise_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enterprise_grandfathered_until TIMESTAMPTZ;

-- =============================================================================
-- Migrate enterprise → pro
-- =============================================================================

UPDATE profiles SET
  plan_tier = 'pro',
  migrated_from_enterprise_at = now(),
  enterprise_grandfathered_until = now() + interval '6 months'
WHERE plan_tier = 'enterprise'
  AND migrated_from_enterprise_at IS NULL;

-- Auto-provision homepage_placement addon for former enterprise users (skip if already provisioned)
INSERT INTO profile_addons (profile_id, addon_type, quantity, status, grandfathered_until)
SELECT id, 'homepage_placement', 1, 'active', now() + interval '6 months'
FROM profiles
WHERE migrated_from_enterprise_at IS NOT NULL
  AND id NOT IN (SELECT profile_id FROM profile_addons WHERE addon_type = 'homepage_placement');

-- =============================================================================
-- Email drip state tracking (for Phase 9 drip sequence)
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS drip_email_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drip_email_last_sent TIMESTAMPTZ;
