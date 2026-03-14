-- =============================================================================
-- Agreement packet signing
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.agreement_packets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  slug text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT agreement_packets_title_length CHECK (char_length(title) <= 200),
  CONSTRAINT agreement_packets_description_length CHECK (
    description IS NULL OR char_length(description) <= 4000
  ),
  CONSTRAINT agreement_packets_slug_length CHECK (char_length(slug) <= 120)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agreement_packets_profile_slug_active
  ON public.agreement_packets(profile_id, slug)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_agreement_packets_profile_id
  ON public.agreement_packets(profile_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.agreement_packet_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id uuid NOT NULL REFERENCES public.agreement_packets(id) ON DELETE CASCADE,
  label text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  sha256 text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT agreement_packet_documents_label_length CHECK (
    label IS NULL OR char_length(label) <= 200
  ),
  CONSTRAINT agreement_packet_documents_file_name_length CHECK (char_length(file_name) <= 255),
  CONSTRAINT agreement_packet_documents_file_type_check CHECK (file_type = 'application/pdf'),
  CONSTRAINT agreement_packet_documents_sha256_check CHECK (sha256 ~ '^[A-Fa-f0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_agreement_packet_documents_packet_id
  ON public.agreement_packet_documents(packet_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.agreement_packet_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id uuid NOT NULL REFERENCES public.agreement_packets(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agreement_packet_versions_title_length CHECK (char_length(title) <= 200),
  CONSTRAINT agreement_packet_versions_description_length CHECK (
    description IS NULL OR char_length(description) <= 4000
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agreement_packet_versions_packet_number
  ON public.agreement_packet_versions(packet_id, version_number);

CREATE INDEX IF NOT EXISTS idx_agreement_packet_versions_profile_id
  ON public.agreement_packet_versions(profile_id, published_at DESC);

CREATE TABLE IF NOT EXISTS public.agreement_packet_version_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_version_id uuid NOT NULL REFERENCES public.agreement_packet_versions(id) ON DELETE CASCADE,
  label text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  sha256 text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agreement_packet_version_documents_label_length CHECK (
    label IS NULL OR char_length(label) <= 200
  ),
  CONSTRAINT agreement_packet_version_documents_file_name_length CHECK (char_length(file_name) <= 255),
  CONSTRAINT agreement_packet_version_documents_file_type_check CHECK (file_type = 'application/pdf'),
  CONSTRAINT agreement_packet_version_documents_sha256_check CHECK (sha256 ~ '^[A-Fa-f0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_agreement_packet_version_documents_version_id
  ON public.agreement_packet_version_documents(packet_version_id);

CREATE TABLE IF NOT EXISTS public.agreement_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  packet_id uuid NOT NULL REFERENCES public.agreement_packets(id) ON DELETE CASCADE,
  packet_version_id uuid NOT NULL REFERENCES public.agreement_packet_versions(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE,
  link_type text NOT NULL,
  reusable boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  used_at timestamptz,
  last_used_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agreement_links_type_check CHECK (link_type IN ('generic', 'assigned')),
  CONSTRAINT agreement_links_token_length CHECK (char_length(token) <= 255)
);

CREATE INDEX IF NOT EXISTS idx_agreement_links_packet_id
  ON public.agreement_links(packet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agreement_links_profile_id
  ON public.agreement_links(profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.agreement_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  packet_id uuid NOT NULL REFERENCES public.agreement_packets(id) ON DELETE CASCADE,
  packet_version_id uuid NOT NULL REFERENCES public.agreement_packet_versions(id) ON DELETE CASCADE,
  agreement_link_id uuid REFERENCES public.agreement_links(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_document_id uuid REFERENCES public.client_documents(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  signer_first_name text NOT NULL,
  signer_last_name text NOT NULL,
  signature_path text NOT NULL,
  signed_pdf_path text NOT NULL,
  link_type text NOT NULL,
  final_attested_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  electronic_consent boolean NOT NULL DEFAULT true,
  authority_confirmed boolean NOT NULL DEFAULT true,
  intent_to_sign_confirmed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agreement_submissions_link_type_check CHECK (link_type IN ('generic', 'assigned')),
  CONSTRAINT agreement_submissions_client_name_length CHECK (char_length(client_name) <= 200),
  CONSTRAINT agreement_submissions_signer_first_name_length CHECK (char_length(signer_first_name) <= 100),
  CONSTRAINT agreement_submissions_signer_last_name_length CHECK (char_length(signer_last_name) <= 100)
);

CREATE INDEX IF NOT EXISTS idx_agreement_submissions_profile_id
  ON public.agreement_submissions(profile_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_agreement_submissions_packet_id
  ON public.agreement_submissions(packet_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_agreement_submissions_client_id
  ON public.agreement_submissions(client_id, submitted_at DESC)
  WHERE client_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.agreement_submission_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.agreement_submissions(id) ON DELETE CASCADE,
  packet_version_document_id uuid NOT NULL REFERENCES public.agreement_packet_version_documents(id) ON DELETE RESTRICT,
  document_label text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  sha256 text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  acknowledged boolean NOT NULL DEFAULT true,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agreement_submission_documents_label_length CHECK (
    document_label IS NULL OR char_length(document_label) <= 200
  ),
  CONSTRAINT agreement_submission_documents_file_name_length CHECK (char_length(file_name) <= 255),
  CONSTRAINT agreement_submission_documents_sha256_check CHECK (sha256 ~ '^[A-Fa-f0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_agreement_submission_documents_submission_id
  ON public.agreement_submission_documents(submission_id, sort_order);

ALTER TABLE public.agreement_packets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_packet_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_packet_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_packet_version_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_submission_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members manage agreement packets" ON public.agreement_packets;
CREATE POLICY "Workspace members manage agreement packets"
  ON public.agreement_packets FOR ALL TO authenticated
  USING (public.is_profile_member(profile_id))
  WITH CHECK (public.is_profile_member(profile_id));

DROP POLICY IF EXISTS "Workspace members manage agreement packet documents" ON public.agreement_packet_documents;
CREATE POLICY "Workspace members manage agreement packet documents"
  ON public.agreement_packet_documents FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.agreement_packets packet
      WHERE packet.id = agreement_packet_documents.packet_id
        AND public.is_profile_member(packet.profile_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.agreement_packets packet
      WHERE packet.id = agreement_packet_documents.packet_id
        AND public.is_profile_member(packet.profile_id)
    )
  );

DROP POLICY IF EXISTS "Workspace members manage agreement packet versions" ON public.agreement_packet_versions;
CREATE POLICY "Workspace members manage agreement packet versions"
  ON public.agreement_packet_versions FOR ALL TO authenticated
  USING (public.is_profile_member(profile_id))
  WITH CHECK (public.is_profile_member(profile_id));

DROP POLICY IF EXISTS "Workspace members view agreement packet version documents" ON public.agreement_packet_version_documents;
CREATE POLICY "Workspace members view agreement packet version documents"
  ON public.agreement_packet_version_documents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.agreement_packet_versions version
      WHERE version.id = agreement_packet_version_documents.packet_version_id
        AND public.is_profile_member(version.profile_id)
    )
  );

DROP POLICY IF EXISTS "Workspace members manage agreement links" ON public.agreement_links;
CREATE POLICY "Workspace members manage agreement links"
  ON public.agreement_links FOR ALL TO authenticated
  USING (public.is_profile_member(profile_id))
  WITH CHECK (public.is_profile_member(profile_id));

DROP POLICY IF EXISTS "Workspace members manage agreement submissions" ON public.agreement_submissions;
CREATE POLICY "Workspace members manage agreement submissions"
  ON public.agreement_submissions FOR ALL TO authenticated
  USING (public.is_profile_member(profile_id))
  WITH CHECK (public.is_profile_member(profile_id));

DROP POLICY IF EXISTS "Workspace members view agreement submission documents" ON public.agreement_submission_documents;
CREATE POLICY "Workspace members view agreement submission documents"
  ON public.agreement_submission_documents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.agreement_submissions submission
      WHERE submission.id = agreement_submission_documents.submission_id
        AND public.is_profile_member(submission.profile_id)
    )
  );

DROP TRIGGER IF EXISTS set_agreement_packets_updated_at ON public.agreement_packets;
CREATE TRIGGER set_agreement_packets_updated_at
  BEFORE UPDATE ON public.agreement_packets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_agreement_packet_documents_updated_at ON public.agreement_packet_documents;
CREATE TRIGGER set_agreement_packet_documents_updated_at
  BEFORE UPDATE ON public.agreement_packet_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_agreement_packet_versions_updated_at ON public.agreement_packet_versions;
CREATE TRIGGER set_agreement_packet_versions_updated_at
  BEFORE UPDATE ON public.agreement_packet_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_agreement_links_updated_at ON public.agreement_links;
CREATE TRIGGER set_agreement_links_updated_at
  BEFORE UPDATE ON public.agreement_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_agreement_submissions_updated_at ON public.agreement_submissions;
CREATE TRIGGER set_agreement_submissions_updated_at
  BEFORE UPDATE ON public.agreement_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agreement-documents',
  'agreement-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Workspace members upload agreement documents" ON storage.objects;
CREATE POLICY "Workspace members upload agreement documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'agreement-documents'
    AND EXISTS (
      SELECT 1
      FROM public.profiles profile
      WHERE profile.id::text = split_part(name, '/', 1)
        AND public.is_profile_member(profile.id)
    )
  );

DROP POLICY IF EXISTS "Workspace members read agreement documents" ON storage.objects;
CREATE POLICY "Workspace members read agreement documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'agreement-documents'
    AND EXISTS (
      SELECT 1
      FROM public.profiles profile
      WHERE profile.id::text = split_part(name, '/', 1)
        AND public.is_profile_member(profile.id)
    )
  );

DROP POLICY IF EXISTS "Workspace members delete agreement documents" ON storage.objects;
CREATE POLICY "Workspace members delete agreement documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'agreement-documents'
    AND EXISTS (
      SELECT 1
      FROM public.profiles profile
      WHERE profile.id::text = split_part(name, '/', 1)
        AND public.is_profile_member(profile.id)
    )
  );
