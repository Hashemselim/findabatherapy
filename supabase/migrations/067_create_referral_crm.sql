-- =============================================================================
-- Referral CRM
-- =============================================================================

CREATE TYPE public.referral_source_category AS ENUM (
  'pediatrician',
  'child_psychologist',
  'psychologist',
  'pediatric_neurologist',
  'neurologist',
  'developmental_pediatrician',
  'speech_therapy',
  'occupational_therapy',
  'school',
  'other'
);

CREATE TYPE public.referral_source_stage AS ENUM (
  'discovered',
  'qualified',
  'ready_to_contact',
  'contacted',
  'engaged',
  'active_referrer',
  'nurture',
  'do_not_contact',
  'archived'
);

CREATE TYPE public.referral_contactability AS ENUM (
  'email_verified',
  'email_unverified',
  'phone_only',
  'contact_form_only',
  'no_channel_found'
);

CREATE TYPE public.referral_relationship_health AS ENUM (
  'cold',
  'warming',
  'warm',
  'strong'
);

CREATE TYPE public.referral_contact_role AS ENUM (
  'doctor',
  'office_manager',
  'referral_coordinator',
  'front_desk',
  'administrator',
  'other'
);

CREATE TYPE public.referral_touchpoint_type AS ENUM (
  'email',
  'call',
  'voicemail',
  'contact_form',
  'fax',
  'in_person',
  'note',
  'task'
);

CREATE TYPE public.referral_touchpoint_outcome AS ENUM (
  'queued',
  'sent',
  'delivered',
  'opened',
  'replied',
  'left_message',
  'connected',
  'submitted',
  'completed',
  'bounced',
  'failed',
  'no_answer',
  'other'
);

CREATE TYPE public.referral_task_status AS ENUM (
  'pending',
  'in_progress',
  'completed'
);

CREATE TYPE public.referral_import_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed'
);

CREATE TYPE public.referral_contact_verification_status AS ENUM (
  'unverified',
  'verified_public',
  'verified_manual',
  'invalid'
);

CREATE TYPE public.referral_template_type AS ENUM (
  'intro',
  'follow_up',
  'custom'
);

CREATE TYPE public.referral_campaign_status AS ENUM (
  'draft',
  'queued',
  'completed',
  'failed'
);

CREATE TABLE IF NOT EXISTS public.referral_sources (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  assigned_to_membership_id uuid REFERENCES public.profile_memberships(id) ON DELETE SET NULL,
  google_place_id text,
  external_source text,
  import_job_id uuid,
  name text NOT NULL,
  category public.referral_source_category NOT NULL DEFAULT 'other',
  stage public.referral_source_stage NOT NULL DEFAULT 'discovered',
  contactability public.referral_contactability NOT NULL DEFAULT 'no_channel_found',
  relationship_health public.referral_relationship_health NOT NULL DEFAULT 'cold',
  phone text,
  website text,
  public_email text,
  contact_form_url text,
  fax text,
  street text,
  city text,
  state text,
  postal_code text,
  latitude numeric(10, 8),
  longitude numeric(11, 8),
  distance_miles numeric(8, 2),
  google_rating numeric(3, 2),
  google_rating_count integer,
  fit_score integer NOT NULL DEFAULT 0,
  contactability_score integer NOT NULL DEFAULT 0,
  confidence_score integer NOT NULL DEFAULT 0,
  priority_score integer NOT NULL DEFAULT 0,
  notes_summary text,
  referral_instructions text,
  accepted_insurances text[],
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  do_not_contact boolean NOT NULL DEFAULT false,
  opted_out_at timestamptz,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  last_imported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_sources_unique_google_place
  ON public.referral_sources(profile_id, google_place_id, location_id)
  WHERE google_place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referral_sources_profile_id
  ON public.referral_sources(profile_id);
CREATE INDEX IF NOT EXISTS idx_referral_sources_stage
  ON public.referral_sources(profile_id, stage)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_referral_sources_category
  ON public.referral_sources(profile_id, category)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_referral_sources_priority
  ON public.referral_sources(profile_id, priority_score DESC, updated_at DESC)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.referral_contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id uuid NOT NULL REFERENCES public.referral_sources(id) ON DELETE CASCADE,
  name text NOT NULL,
  role public.referral_contact_role NOT NULL DEFAULT 'other',
  title text,
  email text,
  phone text,
  preferred_contact_method public.referral_touchpoint_type,
  verification_status public.referral_contact_verification_status NOT NULL DEFAULT 'unverified',
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_referral_contacts_source_id
  ON public.referral_contacts(source_id)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.referral_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id uuid NOT NULL REFERENCES public.referral_sources(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_referral_notes_source_id
  ON public.referral_notes(source_id)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.referral_tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id uuid NOT NULL REFERENCES public.referral_sources(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to_membership_id uuid REFERENCES public.profile_memberships(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text,
  status public.referral_task_status NOT NULL DEFAULT 'pending',
  due_date date,
  reminder_at timestamptz,
  completed_at timestamptz,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_referral_tasks_profile_status
  ON public.referral_tasks(profile_id, status, due_date)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_referral_tasks_source_id
  ON public.referral_tasks(source_id)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.referral_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  template_type public.referral_template_type NOT NULL DEFAULT 'custom',
  subject text NOT NULL,
  body text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_referral_templates_profile_id
  ON public.referral_templates(profile_id)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.referral_campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.referral_templates(id) ON DELETE SET NULL,
  name text NOT NULL,
  status public.referral_campaign_status NOT NULL DEFAULT 'draft',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  subject text NOT NULL,
  body text NOT NULL,
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  launched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_referral_campaigns_profile_id
  ON public.referral_campaigns(profile_id)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.referral_import_jobs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  radius_miles integer NOT NULL DEFAULT 25,
  categories text[] NOT NULL DEFAULT ARRAY[]::text[],
  status public.referral_import_status NOT NULL DEFAULT 'pending',
  external_provider text NOT NULL DEFAULT 'google_places',
  discovered_count integer NOT NULL DEFAULT 0,
  inserted_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  enriched_count integer NOT NULL DEFAULT 0,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_import_jobs_profile_id
  ON public.referral_import_jobs(profile_id, created_at DESC);

ALTER TABLE public.referral_sources
  ADD CONSTRAINT referral_sources_import_job_id_fkey
  FOREIGN KEY (import_job_id) REFERENCES public.referral_import_jobs(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.referral_touchpoints (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id uuid NOT NULL REFERENCES public.referral_sources(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.referral_contacts(id) ON DELETE SET NULL,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.referral_campaigns(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.referral_templates(id) ON DELETE SET NULL,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  touchpoint_type public.referral_touchpoint_type NOT NULL,
  outcome public.referral_touchpoint_outcome NOT NULL DEFAULT 'other',
  subject text,
  body text,
  recipient_email text,
  recipient_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  touched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_touchpoints_source_id
  ON public.referral_touchpoints(source_id, touched_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_touchpoints_profile_id
  ON public.referral_touchpoints(profile_id, touched_at DESC);

CREATE OR REPLACE FUNCTION public.is_referral_source_member(target_source_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.referral_sources source
    WHERE source.id = target_source_id
      AND public.is_profile_member(source.profile_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_referral_source_member(uuid) TO authenticated;

ALTER TABLE public.referral_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_touchpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members manage referral sources"
  ON public.referral_sources FOR ALL TO authenticated
  USING (public.is_profile_member(profile_id))
  WITH CHECK (public.is_profile_member(profile_id));

CREATE POLICY "Workspace members manage referral contacts"
  ON public.referral_contacts FOR ALL TO authenticated
  USING (public.is_referral_source_member(source_id))
  WITH CHECK (public.is_referral_source_member(source_id));

CREATE POLICY "Workspace members manage referral notes"
  ON public.referral_notes FOR ALL TO authenticated
  USING (
    public.is_profile_member(profile_id)
    AND public.is_referral_source_member(source_id)
  )
  WITH CHECK (
    public.is_profile_member(profile_id)
    AND public.is_referral_source_member(source_id)
  );

CREATE POLICY "Workspace members manage referral tasks"
  ON public.referral_tasks FOR ALL TO authenticated
  USING (
    public.is_profile_member(profile_id)
    AND public.is_referral_source_member(source_id)
  )
  WITH CHECK (
    public.is_profile_member(profile_id)
    AND public.is_referral_source_member(source_id)
  );

CREATE POLICY "Workspace members manage referral templates"
  ON public.referral_templates FOR ALL TO authenticated
  USING (public.is_profile_member(profile_id))
  WITH CHECK (public.is_profile_member(profile_id));

CREATE POLICY "Workspace members manage referral campaigns"
  ON public.referral_campaigns FOR ALL TO authenticated
  USING (public.is_profile_member(profile_id))
  WITH CHECK (public.is_profile_member(profile_id));

CREATE POLICY "Workspace members manage referral import jobs"
  ON public.referral_import_jobs FOR ALL TO authenticated
  USING (public.is_profile_member(profile_id))
  WITH CHECK (public.is_profile_member(profile_id));

CREATE POLICY "Workspace members manage referral touchpoints"
  ON public.referral_touchpoints FOR ALL TO authenticated
  USING (
    public.is_profile_member(profile_id)
    AND public.is_referral_source_member(source_id)
  )
  WITH CHECK (
    public.is_profile_member(profile_id)
    AND public.is_referral_source_member(source_id)
  );

DROP TRIGGER IF EXISTS trigger_referral_sources_updated_at ON public.referral_sources;
CREATE TRIGGER trigger_referral_sources_updated_at
  BEFORE UPDATE ON public.referral_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_referral_contacts_updated_at ON public.referral_contacts;
CREATE TRIGGER trigger_referral_contacts_updated_at
  BEFORE UPDATE ON public.referral_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_referral_notes_updated_at ON public.referral_notes;
CREATE TRIGGER trigger_referral_notes_updated_at
  BEFORE UPDATE ON public.referral_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_referral_tasks_updated_at ON public.referral_tasks;
CREATE TRIGGER trigger_referral_tasks_updated_at
  BEFORE UPDATE ON public.referral_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_referral_templates_updated_at ON public.referral_templates;
CREATE TRIGGER trigger_referral_templates_updated_at
  BEFORE UPDATE ON public.referral_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_referral_campaigns_updated_at ON public.referral_campaigns;
CREATE TRIGGER trigger_referral_campaigns_updated_at
  BEFORE UPDATE ON public.referral_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_referral_import_jobs_updated_at ON public.referral_import_jobs;
CREATE TRIGGER trigger_referral_import_jobs_updated_at
  BEFORE UPDATE ON public.referral_import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
