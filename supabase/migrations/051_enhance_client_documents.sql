-- =============================================================================
-- ENHANCE CLIENT DOCUMENTS
-- Adds file upload metadata columns and expands document type enum
-- =============================================================================

-- 1. Expand client_document_type enum with new values
ALTER TYPE public.client_document_type ADD VALUE IF NOT EXISTS 'diagnosis_report';
ALTER TYPE public.client_document_type ADD VALUE IF NOT EXISTS 'referral';
ALTER TYPE public.client_document_type ADD VALUE IF NOT EXISTS 'authorization';
ALTER TYPE public.client_document_type ADD VALUE IF NOT EXISTS 'treatment_plan';
ALTER TYPE public.client_document_type ADD VALUE IF NOT EXISTS 'legal';
ALTER TYPE public.client_document_type ADD VALUE IF NOT EXISTS 'administrative';

-- 2. Add file upload metadata columns to client_documents
ALTER TABLE public.client_documents
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_description text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS upload_source text NOT NULL DEFAULT 'dashboard',
  ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users(id);

-- 3. Add constraint for upload_source values
ALTER TABLE public.client_documents
  ADD CONSTRAINT client_documents_upload_source_check
  CHECK (upload_source IN ('dashboard', 'intake_form'));

-- 4. Update client-documents bucket file_size_limit from 20MB to 10MB
UPDATE storage.buckets
SET file_size_limit = 10485760 -- 10MB
WHERE id = 'client-documents';

-- 5. Add composite index for efficient document listing
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id_active
  ON public.client_documents(client_id, created_at DESC)
  WHERE deleted_at IS NULL;
