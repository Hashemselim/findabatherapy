-- =============================================================================
-- Restore public job application insert policy
-- Applicants should be able to submit applications without authentication.
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can apply" ON public.job_applications;

CREATE POLICY "Anyone can apply"
  ON public.job_applications FOR INSERT TO public
  WITH CHECK (true);
