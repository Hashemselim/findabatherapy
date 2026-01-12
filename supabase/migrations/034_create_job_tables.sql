-- Migration: Create job board tables
-- Job Postings and Job Applications for findabajobs.org

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- JOB POSTINGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS job_postings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,

  -- Job details
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,

  -- Position type (ABA-specific)
  position_type text NOT NULL, -- bcba, bcaba, rbt, bt, clinical_director, regional_director, executive_director, admin, other
  employment_type text[], -- full_time, part_time, contract, per_diem, internship

  -- Compensation
  salary_min integer,
  salary_max integer,
  salary_type text, -- hourly, annual

  -- Options
  remote_option boolean DEFAULT false,

  -- Requirements (flexible JSON)
  requirements jsonb,
  benefits jsonb, -- Array of benefit codes

  -- Status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'filled', 'closed')),
  published_at timestamptz,
  expires_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for job_postings
CREATE INDEX IF NOT EXISTS idx_job_postings_profile_id ON job_postings(profile_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_location_id ON job_postings(location_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_position_type ON job_postings(position_type);
CREATE INDEX IF NOT EXISTS idx_job_postings_slug ON job_postings(slug);
CREATE INDEX IF NOT EXISTS idx_job_postings_published_at ON job_postings(published_at DESC);

-- =============================================================================
-- JOB APPLICATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS job_applications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_posting_id uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,

  -- Applicant info
  applicant_name text NOT NULL,
  applicant_email text NOT NULL,
  applicant_phone text,

  -- Application materials
  resume_path text,
  cover_letter text,
  linkedin_url text,

  -- Tracking
  status text DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'phone_screen', 'interview', 'offered', 'hired', 'rejected')),
  rating integer CHECK (rating >= 1 AND rating <= 5),
  notes text,
  source text, -- direct, careers_page, linkedin, indeed, other

  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes for job_applications
CREATE INDEX IF NOT EXISTS idx_job_applications_job_posting_id ON job_applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON job_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant_email ON job_applications(applicant_email);

-- Unique constraint to prevent duplicate applications from same email to same job
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_applications_unique_applicant ON job_applications(job_posting_id, applicant_email);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Job Postings Policies

-- Agencies can manage their own jobs (select, insert, update, delete)
CREATE POLICY "Agencies manage own jobs"
  ON job_postings
  FOR ALL
  USING (auth.uid() = profile_id);

-- Public can view published jobs
CREATE POLICY "Public can view published jobs"
  ON job_postings
  FOR SELECT
  USING (status = 'published');

-- Job Applications Policies

-- Agencies view applications for their jobs
CREATE POLICY "Agencies view own applications"
  ON job_applications
  FOR ALL
  USING (
    job_posting_id IN (
      SELECT id FROM job_postings WHERE profile_id = auth.uid()
    )
  );

-- Anyone can submit applications (insert only, no auth required)
CREATE POLICY "Anyone can apply"
  ON job_applications
  FOR INSERT
  WITH CHECK (true);

-- =============================================================================
-- STORAGE BUCKET FOR RESUMES
-- =============================================================================

-- Create storage bucket for job resumes (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-resumes',
  'job-resumes',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for job-resumes bucket

-- Allow anyone to upload resumes (for job applications)
CREATE POLICY "Anyone can upload resumes"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'job-resumes');

-- Allow authenticated users to read resumes for their job postings
CREATE POLICY "Agencies can read their resumes"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'job-resumes'
    AND (
      -- Extract job_posting_id from path (format: {job_id}/{applicant_email}/{filename})
      EXISTS (
        SELECT 1 FROM job_postings
        WHERE job_postings.profile_id = auth.uid()
        AND job_postings.id::text = (string_to_array(name, '/'))[1]
      )
    )
  );

-- Allow authenticated users to delete resumes for their job postings
CREATE POLICY "Agencies can delete their resumes"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'job-resumes'
    AND (
      EXISTS (
        SELECT 1 FROM job_postings
        WHERE job_postings.profile_id = auth.uid()
        AND job_postings.id::text = (string_to_array(name, '/'))[1]
      )
    )
  );

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to generate unique job slug
CREATE OR REPLACE FUNCTION generate_job_slug(job_title text, agency_name text)
RETURNS text AS $$
DECLARE
  base_slug text;
  new_slug text;
  counter integer := 0;
BEGIN
  -- Create base slug from title and agency
  base_slug := lower(regexp_replace(
    job_title || '-' || agency_name,
    '[^a-zA-Z0-9]+', '-', 'g'
  ));
  base_slug := trim(both '-' from base_slug);
  base_slug := substring(base_slug from 1 for 80);

  new_slug := base_slug;

  -- Check for uniqueness and add counter if needed
  WHILE EXISTS (SELECT 1 FROM job_postings WHERE slug = new_slug) LOOP
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN new_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_job_postings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_job_postings_updated_at
  BEFORE UPDATE ON job_postings
  FOR EACH ROW
  EXECUTE FUNCTION update_job_postings_updated_at();
