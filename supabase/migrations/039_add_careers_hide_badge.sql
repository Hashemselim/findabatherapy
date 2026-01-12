-- Add option to hide the "Powered by Find ABA Therapy" badge on careers pages
-- This is a Pro+ feature that allows providers to fully white-label their careers page

ALTER TABLE listings
ADD COLUMN IF NOT EXISTS careers_hide_badge BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN listings.careers_hide_badge IS 'When true, hides the "Powered by" badge on the careers page (Pro+ feature)';
