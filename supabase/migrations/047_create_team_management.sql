-- =============================================================================
-- Migration 047: Team Management
-- Creates team_members table, employee_documents table, and links
-- employee_credentials + client_tasks to team_members via FK.
-- =============================================================================

-- =============================================================================
-- 1. TEAM MEMBERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Basic info
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  address text,
  role text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  hired_date date,

  -- Optional link to a converted job applicant
  job_application_id uuid REFERENCES public.job_applications(id) ON DELETE SET NULL,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT team_member_first_name_not_empty CHECK (length(first_name) > 0)
);

-- Indexes
CREATE INDEX idx_team_members_profile ON public.team_members(profile_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_team_members_status ON public.team_members(status) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own team members"
  ON public.team_members FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own team members"
  ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own team members"
  ON public.team_members FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can delete own team members"
  ON public.team_members FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER set_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 2. EMPLOYEE DOCUMENTS TABLE (mirrors client_documents pattern)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.employee_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,

  -- Document info
  label text,
  url text,
  file_path text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes
CREATE INDEX idx_employee_documents_team_member ON public.employee_documents(team_member_id) WHERE deleted_at IS NULL;

-- RLS (secured via team_members join)
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own employee documents"
  ON public.employee_documents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.id = employee_documents.team_member_id
      AND team_members.profile_id = auth.uid()
  ));

CREATE POLICY "Users can insert own employee documents"
  ON public.employee_documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.id = employee_documents.team_member_id
      AND team_members.profile_id = auth.uid()
  ));

CREATE POLICY "Users can update own employee documents"
  ON public.employee_documents FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.id = employee_documents.team_member_id
      AND team_members.profile_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.id = employee_documents.team_member_id
      AND team_members.profile_id = auth.uid()
  ));

CREATE POLICY "Users can delete own employee documents"
  ON public.employee_documents FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.id = employee_documents.team_member_id
      AND team_members.profile_id = auth.uid()
  ));

-- Updated_at trigger
CREATE TRIGGER set_employee_documents_updated_at
  BEFORE UPDATE ON public.employee_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 3. LINK employee_credentials TO team_members
-- =============================================================================

ALTER TABLE public.employee_credentials
  ADD COLUMN IF NOT EXISTS team_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_emp_cred_team_member
  ON public.employee_credentials(team_member_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- 4. LINK client_tasks TO team_members (for employee-assigned tasks)
-- =============================================================================

ALTER TABLE public.client_tasks
  ADD COLUMN IF NOT EXISTS team_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_client_tasks_team_member
  ON public.client_tasks(team_member_id) WHERE deleted_at IS NULL;
