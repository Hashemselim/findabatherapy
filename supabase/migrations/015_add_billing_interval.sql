-- Add billing_interval column to profiles table
-- This tracks whether the user is on monthly or annual billing

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS billing_interval text DEFAULT 'month'
CHECK (billing_interval IN ('month', 'year'));

-- Add comment for documentation
COMMENT ON COLUMN profiles.billing_interval IS 'Billing interval: month or year';
