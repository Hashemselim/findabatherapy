-- Add subscription_status column to profiles table
-- This tracks the current Stripe subscription status for feature gating
-- Values: NULL (no subscription), 'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'

ALTER TABLE profiles
ADD COLUMN subscription_status TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.subscription_status IS 'Current Stripe subscription status. NULL means no subscription exists. Updated by Stripe webhooks.';

-- Create index for faster queries on subscription status
CREATE INDEX idx_profiles_subscription_status ON profiles(subscription_status);
