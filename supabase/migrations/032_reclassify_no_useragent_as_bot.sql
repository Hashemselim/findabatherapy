-- Migration: Reclassify events with no userAgent as bot traffic
-- Real browsers always send a user agent, so missing = likely automated/bot traffic

-- Reclassify search_performed events with no userAgent from 'unknown' to 'bot'
UPDATE audit_events
SET metadata = jsonb_set(
  metadata,
  '{source}',
  '"bot"'::jsonb
)
WHERE event_type = 'search_performed'
  AND (metadata->>'source' = 'unknown' OR metadata->>'source' IS NULL)
  AND (
    metadata->>'userAgent' IS NULL
    OR metadata->>'userAgent' = ''
    OR NOT (metadata ? 'userAgent')
  );

-- Reclassify search_impression events with no userAgent from 'unknown' to 'bot'
UPDATE audit_events
SET metadata = jsonb_set(
  metadata,
  '{source}',
  '"bot"'::jsonb
)
WHERE event_type = 'search_impression'
  AND (metadata->>'source' = 'unknown' OR metadata->>'source' IS NULL)
  AND (
    metadata->>'userAgent' IS NULL
    OR metadata->>'userAgent' = ''
    OR NOT (metadata ? 'userAgent')
  );
