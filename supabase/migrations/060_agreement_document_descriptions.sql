ALTER TABLE public.agreement_packet_documents
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.agreement_packet_version_documents
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.agreement_submission_documents
  ADD COLUMN IF NOT EXISTS document_description text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agreement_packet_documents_description_length'
  ) THEN
    ALTER TABLE public.agreement_packet_documents
      ADD CONSTRAINT agreement_packet_documents_description_length CHECK (
        description IS NULL OR char_length(description) <= 4000
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agreement_packet_version_documents_description_length'
  ) THEN
    ALTER TABLE public.agreement_packet_version_documents
      ADD CONSTRAINT agreement_packet_version_documents_description_length CHECK (
        description IS NULL OR char_length(description) <= 4000
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agreement_submission_documents_description_length'
  ) THEN
    ALTER TABLE public.agreement_submission_documents
      ADD CONSTRAINT agreement_submission_documents_description_length CHECK (
        document_description IS NULL OR char_length(document_description) <= 4000
      );
  END IF;
END $$;
