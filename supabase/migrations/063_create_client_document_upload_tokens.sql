-- =============================================================================
-- CLIENT DOCUMENT UPLOAD TOKENS
-- Secure, shareable links for families to upload supporting documents.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.client_document_upload_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_document_upload_tokens_token
  ON public.client_document_upload_tokens(token);

CREATE INDEX IF NOT EXISTS idx_client_document_upload_tokens_client_id
  ON public.client_document_upload_tokens(client_id);

ALTER TABLE public.client_document_upload_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members manage client document upload tokens"
  ON public.client_document_upload_tokens;

CREATE POLICY "Workspace members manage client document upload tokens"
  ON public.client_document_upload_tokens FOR ALL TO authenticated
  USING (
    public.is_profile_member(profile_id)
    AND EXISTS (
      SELECT 1
      FROM public.clients client
      WHERE client.id = client_document_upload_tokens.client_id
        AND client.profile_id = client_document_upload_tokens.profile_id
    )
  )
  WITH CHECK (
    public.is_profile_member(profile_id)
    AND EXISTS (
      SELECT 1
      FROM public.clients client
      WHERE client.id = client_document_upload_tokens.client_id
        AND client.profile_id = client_document_upload_tokens.profile_id
    )
  );
