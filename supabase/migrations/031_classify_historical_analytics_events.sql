-- Migration: Classify historical search_performed and search_impression events
-- by analyzing the userAgent field in metadata to distinguish bot vs user traffic

-- Bot patterns to match (same as in track.ts)
-- googlebot, bingbot, slurp, duckduckbot, baiduspider, yandexbot, facebot,
-- facebookexternalhit, twitterbot, linkedinbot, pinterest, applebot, semrushbot,
-- ahrefsbot, mj12bot, dotbot, petalbot, bytespider, gptbot, claudebot, anthropic,
-- chatgpt, ccbot, crawler, spider, bot, scraper, headless, phantom, selenium,
-- puppeteer, playwright

-- Update search_performed events: mark as 'bot' if userAgent matches bot patterns
UPDATE audit_events
SET metadata = jsonb_set(
  metadata,
  '{source}',
  '"bot"'::jsonb
)
WHERE event_type = 'search_performed'
  AND metadata->>'source' IS NULL
  AND metadata->>'userAgent' IS NOT NULL
  AND (
    metadata->>'userAgent' ~* 'googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot'
    OR metadata->>'userAgent' ~* 'facebot|facebookexternalhit|twitterbot|linkedinbot|pinterest|applebot'
    OR metadata->>'userAgent' ~* 'semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|bytespider'
    OR metadata->>'userAgent' ~* 'gptbot|claudebot|anthropic|chatgpt|ccbot'
    OR metadata->>'userAgent' ~* 'crawler|spider|scraper|headless|phantom|selenium|puppeteer|playwright'
    OR metadata->>'userAgent' ~* '\ybot\y'
  );

-- Update search_performed events: mark remaining as 'unknown' (not detected as bot)
UPDATE audit_events
SET metadata = jsonb_set(
  metadata,
  '{source}',
  '"unknown"'::jsonb
)
WHERE event_type = 'search_performed'
  AND metadata->>'source' IS NULL;

-- Update search_impression events: mark as 'bot' if userAgent matches bot patterns
UPDATE audit_events
SET metadata = jsonb_set(
  metadata,
  '{source}',
  '"bot"'::jsonb
)
WHERE event_type = 'search_impression'
  AND metadata->>'source' IS NULL
  AND metadata->>'userAgent' IS NOT NULL
  AND (
    metadata->>'userAgent' ~* 'googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot'
    OR metadata->>'userAgent' ~* 'facebot|facebookexternalhit|twitterbot|linkedinbot|pinterest|applebot'
    OR metadata->>'userAgent' ~* 'semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|bytespider'
    OR metadata->>'userAgent' ~* 'gptbot|claudebot|anthropic|chatgpt|ccbot'
    OR metadata->>'userAgent' ~* 'crawler|spider|scraper|headless|phantom|selenium|puppeteer|playwright'
    OR metadata->>'userAgent' ~* '\ybot\y'
  );

-- Update search_impression events: mark remaining as 'unknown' (not detected as bot)
UPDATE audit_events
SET metadata = jsonb_set(
  metadata,
  '{source}',
  '"unknown"'::jsonb
)
WHERE event_type = 'search_impression'
  AND metadata->>'source' IS NULL;
