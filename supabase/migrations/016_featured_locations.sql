-- Migration: Featured Locations
-- Description: Add per-location featured subscription tracking

-- 1. Add is_featured column to locations table (denormalized for query performance)
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Index for quick filtering of featured locations in search
CREATE INDEX IF NOT EXISTS idx_locations_featured
ON public.locations(is_featured) WHERE is_featured = true;

-- 2. Create table to track featured location subscriptions
CREATE TABLE IF NOT EXISTS public.location_featured_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL,
  stripe_subscription_item_id text,
  billing_interval text NOT NULL DEFAULT 'month', -- 'month' or 'year'
  status text NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'past_due'
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- One featured subscription per location
  CONSTRAINT unique_location_featured UNIQUE (location_id),
  -- Each stripe subscription maps to exactly one location
  CONSTRAINT unique_stripe_subscription UNIQUE (stripe_subscription_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_location_featured_profile
ON public.location_featured_subscriptions(profile_id);

CREATE INDEX IF NOT EXISTS idx_location_featured_status
ON public.location_featured_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_location_featured_stripe_sub
ON public.location_featured_subscriptions(stripe_subscription_id);

-- 3. Enable RLS
ALTER TABLE public.location_featured_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own featured subscriptions
CREATE POLICY "Users can view own featured subscriptions"
ON public.location_featured_subscriptions
FOR SELECT
USING (profile_id = auth.uid());

-- Service role handles all modifications (via webhooks and server actions)
-- No INSERT/UPDATE/DELETE policies for regular users - only service role can modify

-- 4. Grant permissions
GRANT SELECT ON public.location_featured_subscriptions TO authenticated;
GRANT ALL ON public.location_featured_subscriptions TO service_role;
