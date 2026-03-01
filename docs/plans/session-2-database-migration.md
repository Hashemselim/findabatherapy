# Session 2: Database Migration (Phase 2)

## Context
This is an ABA therapy SaaS using Supabase (PostgreSQL). We need to:
1. Create a `profile_addons` table for usage-based add-ons (extra users, locations, jobs, storage, homepage placement)
2. Add migration tracking columns to `profiles`
3. Migrate existing enterprise users to pro with grandfathered add-ons

Existing migrations are in `supabase/migrations/`. Check the latest migration number and use the next one.

## What To Do

### Step 1: Find the next migration number
```bash
ls supabase/migrations/ | tail -5
```
Use the next sequential number (e.g., if last is `045_...`, use `046_...`).

### Step 2: Create the migration file

Create `supabase/migrations/[NEXT_NUMBER]_add_profile_addons_and_migrate_enterprise.sql`:

```sql
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
CREATE INDEX idx_profile_addons_profile_id ON profile_addons(profile_id);
CREATE INDEX idx_profile_addons_status ON profile_addons(status);
CREATE INDEX idx_profile_addons_type ON profile_addons(addon_type);

-- RLS
ALTER TABLE profile_addons ENABLE ROW LEVEL SECURITY;

-- Users can read their own add-ons
CREATE POLICY "Users can view own addons"
  ON profile_addons FOR SELECT
  USING (profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

-- Service role can manage all add-ons (for webhook handler)
CREATE POLICY "Service role manages addons"
  ON profile_addons FOR ALL
  USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_profile_addons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
WHERE plan_tier = 'enterprise';

-- Auto-provision homepage_placement addon for former enterprise users
INSERT INTO profile_addons (profile_id, addon_type, quantity, status, grandfathered_until)
SELECT id, 'homepage_placement', 1, 'active', now() + interval '6 months'
FROM profiles WHERE migrated_from_enterprise_at IS NOT NULL;

-- =============================================================================
-- Email drip state tracking (for Phase 9 drip sequence)
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS drip_email_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drip_email_last_sent TIMESTAMPTZ;
```

### Step 3: Verify migration syntax
```bash
# Check it's valid SQL (basic syntax check)
cat supabase/migrations/*_add_profile_addons*.sql | head -5
```

### Step 4: Verify types still pass
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "e2e/"
```

Commit with message: "feat: add profile_addons table and enterprise migration"
