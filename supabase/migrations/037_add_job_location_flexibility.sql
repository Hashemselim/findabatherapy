-- Migration: Add location flexibility to job postings
-- Supports: remote/telehealth jobs with service states, custom job locations

-- =============================================================================
-- 1. SERVICE STATES - For remote/telehealth job filtering
-- =============================================================================

-- service_states array allows specifying which states a remote job serves
-- NULL = use location-based filtering (current behavior)
-- ['*'] = nationwide (all states)
-- ['NY', 'NJ', 'CT'] = specific states only
ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS service_states text[] DEFAULT NULL;

-- GIN index for efficient array contains queries
CREATE INDEX IF NOT EXISTS idx_job_postings_service_states
ON job_postings USING GIN (service_states);

-- =============================================================================
-- 2. CUSTOM LOCATION - For jobs at different locations than agency HQ
-- =============================================================================

-- Custom location fields allow typing a location without creating an agency location
-- Used for: satellite offices, client sites, jobs at different addresses
ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS custom_city text,
ADD COLUMN IF NOT EXISTS custom_state text;

-- Index for custom_state queries
CREATE INDEX IF NOT EXISTS idx_job_postings_custom_state
ON job_postings(custom_state) WHERE custom_state IS NOT NULL;

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

COMMENT ON COLUMN job_postings.service_states IS
  'States this job serves (for remote/telehealth). NULL=use location, [''*'']=nationwide, [''NY'',''NJ'']=specific states';

COMMENT ON COLUMN job_postings.custom_city IS
  'Custom city for job location (alternative to location_id)';

COMMENT ON COLUMN job_postings.custom_state IS
  'Custom state for job location (alternative to location_id). Used for search filtering.';
