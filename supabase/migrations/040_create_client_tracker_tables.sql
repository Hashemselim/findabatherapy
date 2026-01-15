-- Migration: Create client tracker tables
-- Comprehensive client/patient management for ABA therapy providers

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

-- Client status workflow
CREATE TYPE public.client_status AS ENUM (
  'inquiry',
  'intake_pending',
  'waitlist',
  'assessment',
  'active',
  'on_hold',
  'discharged'
);

-- Funding source options
CREATE TYPE public.client_funding_source AS ENUM (
  'insurance',
  'regional_center',
  'school_district',
  'private_pay',
  'medicaid_waiver'
);

-- Parent/guardian relationship
CREATE TYPE public.parent_relationship AS ENUM (
  'mother',
  'father',
  'stepmother',
  'stepfather',
  'guardian',
  'grandparent',
  'other'
);

-- Insurance type
CREATE TYPE public.insurance_type AS ENUM (
  'commercial',
  'medicaid',
  'managed_medicaid',
  'tricare'
);

-- Insurance status
CREATE TYPE public.insurance_status AS ENUM (
  'active',
  'inactive',
  'pending_verification'
);

-- Subscriber relationship to patient
CREATE TYPE public.subscriber_relationship AS ENUM (
  'self',
  'spouse',
  'child',
  'other'
);

-- Authorization payor type
CREATE TYPE public.auth_payor_type AS ENUM (
  'insurance',
  'regional_center',
  'school_district',
  'private_pay'
);

-- Authorization status
CREATE TYPE public.auth_status AS ENUM (
  'pending',
  'submitted',
  'approved',
  'denied',
  'expired',
  'exhausted'
);

-- Document type
CREATE TYPE public.client_document_type AS ENUM (
  'insurance_card',
  'assessment',
  'iep',
  'medical_records',
  'consent',
  'other'
);

-- Task status
CREATE TYPE public.client_task_status AS ENUM (
  'pending',
  'completed'
);

-- Contact type
CREATE TYPE public.client_contact_type AS ENUM (
  'phone',
  'email',
  'fax',
  'address'
);

-- Contact relationship type
CREATE TYPE public.contact_relationship_type AS ENUM (
  'parent',
  'guardian',
  'emergency',
  'physician',
  'school',
  'therapist',
  'other'
);

-- =============================================================================
-- CLIENTS TABLE (Master record with embedded child info)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  inquiry_id uuid REFERENCES public.inquiries(id) ON DELETE SET NULL,

  -- Status and workflow
  status public.client_status NOT NULL DEFAULT 'inquiry',
  referral_source text,
  referral_date date,
  service_start_date date,
  service_end_date date,
  discharge_reason text,
  funding_source public.client_funding_source,
  preferred_language text,

  -- Child information (embedded - one child per client)
  child_first_name text,
  child_last_name text,
  child_date_of_birth date,
  child_diagnosis text[],
  child_diagnosis_codes text[],
  child_diagnosis_date date,
  child_primary_concerns text,
  child_aba_history text,
  child_school_name text,
  child_school_district text,
  child_grade_level text,
  child_other_therapies text,
  child_pediatrician_name text,
  child_pediatrician_phone text,

  -- General notes
  notes text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes for clients
CREATE INDEX idx_clients_profile_id ON public.clients(profile_id);
CREATE INDEX idx_clients_listing_id ON public.clients(listing_id);
CREATE INDEX idx_clients_inquiry_id ON public.clients(inquiry_id);
CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_clients_created_at ON public.clients(created_at DESC);
CREATE INDEX idx_clients_deleted_at ON public.clients(deleted_at) WHERE deleted_at IS NULL;

-- =============================================================================
-- CLIENT PARENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.client_parents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Parent info
  first_name text,
  last_name text,
  date_of_birth date,
  relationship public.parent_relationship,
  phone text,
  email text,
  notes text,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes for client_parents
CREATE INDEX idx_client_parents_client_id ON public.client_parents(client_id);
CREATE INDEX idx_client_parents_deleted_at ON public.client_parents(deleted_at) WHERE deleted_at IS NULL;

-- =============================================================================
-- CLIENT LOCATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.client_locations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Location info
  label text,
  street_address text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'US',
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  place_id text,
  notes text,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes for client_locations
CREATE INDEX idx_client_locations_client_id ON public.client_locations(client_id);
CREATE INDEX idx_client_locations_deleted_at ON public.client_locations(deleted_at) WHERE deleted_at IS NULL;

-- =============================================================================
-- CLIENT INSURANCES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.client_insurances (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Insurance info
  insurance_name text,
  insurance_type public.insurance_type,
  is_primary boolean NOT NULL DEFAULT false,
  effective_date date,
  expiration_date date,
  member_id text,
  group_number text,
  plan_name text,
  subscriber_relationship public.subscriber_relationship,
  status public.insurance_status DEFAULT 'pending_verification',

  -- Benefits info
  copay_amount decimal(10, 2),
  coinsurance_percentage decimal(5, 2),
  deductible_total decimal(10, 2),
  deductible_remaining decimal(10, 2),
  oop_max_total decimal(10, 2),
  oop_max_remaining decimal(10, 2),

  notes text,
  sort_order integer NOT NULL DEFAULT 0,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes for client_insurances
CREATE INDEX idx_client_insurances_client_id ON public.client_insurances(client_id);
CREATE INDEX idx_client_insurances_status ON public.client_insurances(status);
CREATE INDEX idx_client_insurances_deleted_at ON public.client_insurances(deleted_at) WHERE deleted_at IS NULL;

-- =============================================================================
-- CLIENT AUTHORIZATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.client_authorizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  insurance_id uuid REFERENCES public.client_insurances(id) ON DELETE SET NULL,

  -- Authorization info
  payor_type public.auth_payor_type,
  service_type text,
  billing_code text,
  treatment_requested text,
  units_requested integer,
  units_used integer DEFAULT 0,
  units_per_week_authorized integer,
  rate_per_unit decimal(10, 2),
  start_date date,
  end_date date,
  status public.auth_status DEFAULT 'pending',
  auth_reference_number text,
  requires_prior_auth boolean DEFAULT false,
  notes text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes for client_authorizations
CREATE INDEX idx_client_authorizations_client_id ON public.client_authorizations(client_id);
CREATE INDEX idx_client_authorizations_insurance_id ON public.client_authorizations(insurance_id);
CREATE INDEX idx_client_authorizations_status ON public.client_authorizations(status);
CREATE INDEX idx_client_authorizations_dates ON public.client_authorizations(start_date, end_date);
CREATE INDEX idx_client_authorizations_deleted_at ON public.client_authorizations(deleted_at) WHERE deleted_at IS NULL;

-- =============================================================================
-- CLIENT DOCUMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.client_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Document info
  document_type public.client_document_type,
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

-- Indexes for client_documents
CREATE INDEX idx_client_documents_client_id ON public.client_documents(client_id);
CREATE INDEX idx_client_documents_deleted_at ON public.client_documents(deleted_at) WHERE deleted_at IS NULL;

-- =============================================================================
-- CLIENT TASKS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.client_tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Task info
  title text NOT NULL,
  content text,
  status public.client_task_status NOT NULL DEFAULT 'pending',
  due_date timestamptz,
  reminder_at timestamptz,
  reminder_sent_at timestamptz,
  completed_at timestamptz,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes for client_tasks
CREATE INDEX idx_client_tasks_client_id ON public.client_tasks(client_id);
CREATE INDEX idx_client_tasks_profile_id ON public.client_tasks(profile_id);
CREATE INDEX idx_client_tasks_status ON public.client_tasks(status);
CREATE INDEX idx_client_tasks_due_date ON public.client_tasks(due_date) WHERE status = 'pending';
CREATE INDEX idx_client_tasks_deleted_at ON public.client_tasks(deleted_at) WHERE deleted_at IS NULL;

-- =============================================================================
-- CLIENT CONTACTS TABLE (Additional contacts beyond parents)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.client_contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.client_parents(id) ON DELETE CASCADE,

  -- Contact info
  contact_type public.client_contact_type,
  relationship_type public.contact_relationship_type,
  label text,
  value text,
  notes text,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes for client_contacts
CREATE INDEX idx_client_contacts_client_id ON public.client_contacts(client_id);
CREATE INDEX idx_client_contacts_parent_id ON public.client_contacts(parent_id);
CREATE INDEX idx_client_contacts_deleted_at ON public.client_contacts(deleted_at) WHERE deleted_at IS NULL;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_insurances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

-- Clients: Profile owners can manage their own clients
CREATE POLICY "Users manage own clients" ON public.clients
  FOR ALL
  USING ((SELECT auth.uid()) = profile_id);

-- Client Parents: Access through client ownership
CREATE POLICY "Users manage client parents" ON public.client_parents
  FOR ALL
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE profile_id = (SELECT auth.uid())
    )
  );

-- Client Locations: Access through client ownership
CREATE POLICY "Users manage client locations" ON public.client_locations
  FOR ALL
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE profile_id = (SELECT auth.uid())
    )
  );

-- Client Insurances: Access through client ownership
CREATE POLICY "Users manage client insurances" ON public.client_insurances
  FOR ALL
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE profile_id = (SELECT auth.uid())
    )
  );

-- Client Authorizations: Access through client ownership
CREATE POLICY "Users manage client authorizations" ON public.client_authorizations
  FOR ALL
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE profile_id = (SELECT auth.uid())
    )
  );

-- Client Documents: Access through client ownership
CREATE POLICY "Users manage client documents" ON public.client_documents
  FOR ALL
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE profile_id = (SELECT auth.uid())
    )
  );

-- Client Tasks: Profile owners can manage their own tasks
CREATE POLICY "Users manage own tasks" ON public.client_tasks
  FOR ALL
  USING ((SELECT auth.uid()) = profile_id);

-- Client Contacts: Access through client ownership
CREATE POLICY "Users manage client contacts" ON public.client_contacts
  FOR ALL
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE profile_id = (SELECT auth.uid())
    )
  );

-- =============================================================================
-- TRIGGERS FOR updated_at
-- =============================================================================

-- Reusable trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all client tables
CREATE TRIGGER trigger_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_client_parents_updated_at
  BEFORE UPDATE ON public.client_parents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_client_locations_updated_at
  BEFORE UPDATE ON public.client_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_client_insurances_updated_at
  BEFORE UPDATE ON public.client_insurances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_client_authorizations_updated_at
  BEFORE UPDATE ON public.client_authorizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_client_documents_updated_at
  BEFORE UPDATE ON public.client_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_client_tasks_updated_at
  BEFORE UPDATE ON public.client_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_client_contacts_updated_at
  BEFORE UPDATE ON public.client_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- ADD INTAKE COLUMNS TO LISTINGS TABLE
-- =============================================================================

ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS client_intake_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS client_intake_settings jsonb DEFAULT '{}';

-- =============================================================================
-- ADD CONVERTED STATUS TO INQUIRIES
-- =============================================================================

-- Note: This adds 'converted' to the inquiry_status enum
-- We need to do this carefully since PostgreSQL doesn't allow direct enum modification
ALTER TYPE public.inquiry_status ADD VALUE IF NOT EXISTS 'converted';

-- =============================================================================
-- STORAGE BUCKET FOR CLIENT DOCUMENTS
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  20971520, -- 20MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for client-documents bucket

-- Allow authenticated users to upload documents for their clients
CREATE POLICY "Users can upload client documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'client-documents'
    AND auth.uid() IS NOT NULL
    AND (
      -- Path format: {profile_id}/{client_id}/{filename}
      (string_to_array(name, '/'))[1] = auth.uid()::text
    )
  );

-- Allow users to read their own client documents
CREATE POLICY "Users can read own client documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'client-documents'
    AND auth.uid() IS NOT NULL
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- Allow users to delete their own client documents
CREATE POLICY "Users can delete own client documents"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'client-documents'
    AND auth.uid() IS NOT NULL
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );
