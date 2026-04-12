-- Allow notes without a client assignment (dashboard-level quick notes)
ALTER TABLE public.client_notes ALTER COLUMN client_id DROP NOT NULL;
