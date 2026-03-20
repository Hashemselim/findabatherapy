ALTER TABLE public.client_communications
  DROP CONSTRAINT IF EXISTS client_communications_status_check;

ALTER TABLE public.client_communications
  ADD CONSTRAINT client_communications_status_check
  CHECK (status IN ('pending', 'sent', 'failed', 'bounced'));
