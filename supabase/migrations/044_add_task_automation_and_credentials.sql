-- Migration: Phase 4 — Automated Task Creation + Credential Tracking
--
-- 1. Add auto_generated flag to client_tasks
-- 2. Create employee_credentials table for future team management
-- 3. Add indexes for automation queries

-- =============================================================================
-- 1. MODIFY client_tasks: Add auto_generated column
-- =============================================================================

ALTER TABLE public.client_tasks
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false;

-- Index for filtering auto-generated tasks
CREATE INDEX IF NOT EXISTS idx_client_tasks_auto_generated
  ON public.client_tasks (profile_id, auto_generated)
  WHERE deleted_at IS NULL;

-- Index for automation duplicate check (title pattern + due_date + client_id)
CREATE INDEX IF NOT EXISTS idx_client_tasks_automation_check
  ON public.client_tasks (profile_id, client_id, due_date)
  WHERE deleted_at IS NULL AND auto_generated = true;

-- =============================================================================
-- 2. CREATE employee_credentials table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.employee_credentials (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- employee_id will reference a team_members table once it's created
  -- For now, store as text (applicant name) or uuid (job_applications.id)
  employee_name text NOT NULL,
  credential_name text NOT NULL,
  expiration_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT emp_cred_name_not_empty CHECK (length(credential_name) > 0),
  CONSTRAINT emp_name_not_empty CHECK (length(employee_name) > 0)
);

-- Indexes for credential queries
CREATE INDEX IF NOT EXISTS idx_emp_cred_profile_deleted
  ON public.employee_credentials (profile_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_emp_cred_expiration
  ON public.employee_credentials (expiration_date)
  WHERE deleted_at IS NULL;

-- =============================================================================
-- 3. RLS POLICIES for employee_credentials
-- =============================================================================

ALTER TABLE public.employee_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own employee credentials"
  ON public.employee_credentials
  FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert their own employee credentials"
  ON public.employee_credentials
  FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their own employee credentials"
  ON public.employee_credentials
  FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can delete their own employee credentials"
  ON public.employee_credentials
  FOR DELETE
  USING (profile_id = auth.uid());

-- =============================================================================
-- 4. Updated_at trigger for employee_credentials
-- =============================================================================

-- Reuse the existing trigger function if available
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_employee_credentials_updated_at
  BEFORE UPDATE ON public.employee_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
