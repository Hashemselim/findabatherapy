CREATE UNIQUE INDEX IF NOT EXISTS idx_agreement_submissions_assigned_link_unique
  ON public.agreement_submissions(agreement_link_id)
  WHERE agreement_link_id IS NOT NULL
    AND link_type = 'assigned';
