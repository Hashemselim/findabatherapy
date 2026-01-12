-- Migration: Add featured jobs support
-- Mirrors the featured locations functionality for the job board

-- Add is_featured column to job_postings table
ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Create index for efficient featured job queries
CREATE INDEX IF NOT EXISTS idx_job_postings_is_featured
ON job_postings(is_featured) WHERE is_featured = true;

-- Add comment for documentation
COMMENT ON COLUMN job_postings.is_featured IS 'Featured jobs appear at the top of search results, above paid tier sorting';
