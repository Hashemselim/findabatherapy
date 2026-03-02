-- Prevent duplicate add-on rows for the same Stripe subscription.
-- Keep the earliest row, remove any later duplicates, then enforce uniqueness.

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY stripe_subscription_id
      ORDER BY created_at ASC, id ASC
    ) AS row_num
  FROM profile_addons
  WHERE stripe_subscription_id IS NOT NULL
)
DELETE FROM profile_addons
WHERE id IN (
  SELECT id
  FROM ranked
  WHERE row_num > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_addons_unique_subscription
  ON profile_addons (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
