-- =============================================================================
-- ADD COLUMN CONSTRAINTS TO CLIENT DOCUMENTS
-- Enforces length limits at DB level to match Zod validation schemas
-- =============================================================================

-- file_name: max 255 chars (matches Zod max(255))
ALTER TABLE public.client_documents
  ADD CONSTRAINT client_documents_file_name_length
  CHECK (char_length(file_name) <= 255);

-- file_description: max 2000 chars (matches Zod max(2000))
ALTER TABLE public.client_documents
  ADD CONSTRAINT client_documents_file_description_length
  CHECK (char_length(file_description) <= 2000);

-- file_type: max 100 chars (matches Zod max(100))
ALTER TABLE public.client_documents
  ADD CONSTRAINT client_documents_file_type_length
  CHECK (char_length(file_type) <= 100);

-- label: max 200 chars (matches Zod max(200))
ALTER TABLE public.client_documents
  ADD CONSTRAINT client_documents_label_length
  CHECK (char_length(label) <= 200);

-- notes: max 2000 chars (matches Zod max(2000))
ALTER TABLE public.client_documents
  ADD CONSTRAINT client_documents_notes_length
  CHECK (char_length(notes) <= 2000);
