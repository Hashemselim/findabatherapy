-- Add new filter columns to job_postings table
ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS therapy_settings text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS schedule_types text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS age_groups text[] DEFAULT '{}';

-- Create GIN indexes for efficient array overlap queries
CREATE INDEX IF NOT EXISTS idx_job_postings_therapy_settings ON job_postings USING GIN (therapy_settings);
CREATE INDEX IF NOT EXISTS idx_job_postings_schedule_types ON job_postings USING GIN (schedule_types);
CREATE INDEX IF NOT EXISTS idx_job_postings_age_groups ON job_postings USING GIN (age_groups);

-- Add comments for documentation
COMMENT ON COLUMN job_postings.therapy_settings IS 'Work settings: in_home, in_center, school_based, telehealth';
COMMENT ON COLUMN job_postings.schedule_types IS 'Schedule types: daytime, after_school, evening';
COMMENT ON COLUMN job_postings.age_groups IS 'Age groups served: early_intervention, preschool, school_age, teens, adults';
