-- Add metadata column to audit_events (or rename payload to metadata)
-- The code expects 'metadata' but the schema has 'payload'

-- Option 1: Add metadata column if it doesn't exist
ALTER TABLE public.audit_events
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Copy data from payload to metadata if payload exists and metadata is empty
UPDATE public.audit_events
SET metadata = payload
WHERE metadata IS NULL AND payload IS NOT NULL;
