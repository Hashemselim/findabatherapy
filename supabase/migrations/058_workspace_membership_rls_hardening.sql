-- =============================================================================
-- Workspace membership RLS hardening
-- Completes the migration from auth-user-owned records to workspace memberships.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_client_member(target_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clients client
    WHERE client.id = target_client_id
      AND public.is_profile_member(client.profile_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_job_member(target_job_posting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.job_postings job_posting
    WHERE job_posting.id = target_job_posting_id
      AND public.is_profile_member(job_posting.profile_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_location_member(target_location_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.locations location
    JOIN public.listings listing
      ON listing.id = location.listing_id
    WHERE location.id = target_location_id
      AND public.is_profile_member(listing.profile_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_client_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_job_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_location_member(uuid) TO authenticated;

DROP POLICY IF EXISTS "Listing owners can view inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Listing owners can update inquiries" ON public.inquiries;

CREATE POLICY "Workspace members view inquiries"
  ON public.inquiries FOR SELECT TO authenticated
  USING (public.is_listing_member(listing_id));

CREATE POLICY "Workspace members update inquiries"
  ON public.inquiries FOR UPDATE TO authenticated
  USING (public.is_listing_member(listing_id))
  WITH CHECK (public.is_listing_member(listing_id));

DROP POLICY IF EXISTS "Users can view own removal_requests" ON public.removal_requests;
DROP POLICY IF EXISTS "Users can create removal_requests" ON public.removal_requests;

CREATE POLICY "Workspace members view removal requests"
  ON public.removal_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.listings listing
      WHERE listing.id = removal_requests.listing_id
        AND listing.profile_id = removal_requests.profile_id
        AND public.is_profile_member(listing.profile_id)
    )
  );

CREATE POLICY "Workspace members create removal requests"
  ON public.removal_requests FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.listings listing
      WHERE listing.id = removal_requests.listing_id
        AND listing.profile_id = removal_requests.profile_id
        AND public.is_profile_member(listing.profile_id)
    )
  );

DROP POLICY IF EXISTS "Users can view own featured subscriptions" ON public.location_featured_subscriptions;

CREATE POLICY "Workspace members view featured subscriptions"
  ON public.location_featured_subscriptions FOR SELECT TO authenticated
  USING (
    public.is_profile_member(profile_id)
    AND public.is_location_member(location_id)
  );

DROP POLICY IF EXISTS "Users can read own location reviews" ON public.google_reviews;

CREATE POLICY "Workspace members read location reviews"
  ON public.google_reviews FOR SELECT TO authenticated
  USING (public.is_location_member(location_id));

DROP POLICY IF EXISTS "Agencies manage own jobs" ON public.job_postings;
DROP POLICY IF EXISTS "Public can view published jobs" ON public.job_postings;

CREATE POLICY "Public can view published jobs"
  ON public.job_postings FOR SELECT TO public
  USING (status = 'published');

CREATE POLICY "Workspace members manage jobs"
  ON public.job_postings FOR ALL TO authenticated
  USING (public.is_profile_member(profile_id))
  WITH CHECK (public.is_profile_member(profile_id));

DROP POLICY IF EXISTS "Agencies view own applications" ON public.job_applications;

CREATE POLICY "Workspace members manage job applications"
  ON public.job_applications FOR ALL TO authenticated
  USING (public.is_job_member(job_posting_id))
  WITH CHECK (public.is_job_member(job_posting_id));

DROP POLICY IF EXISTS "Users manage own clients" ON public.clients;
DROP POLICY IF EXISTS "Users manage client parents" ON public.client_parents;
DROP POLICY IF EXISTS "Users manage client locations" ON public.client_locations;
DROP POLICY IF EXISTS "Users manage client insurances" ON public.client_insurances;
DROP POLICY IF EXISTS "Users manage client authorizations" ON public.client_authorizations;
DROP POLICY IF EXISTS "Users manage client documents" ON public.client_documents;
DROP POLICY IF EXISTS "Users manage own tasks" ON public.client_tasks;
DROP POLICY IF EXISTS "Users manage client contacts" ON public.client_contacts;

CREATE POLICY "Workspace members manage clients"
  ON public.clients FOR ALL TO authenticated
  USING (public.is_profile_member(profile_id))
  WITH CHECK (public.is_profile_member(profile_id));

CREATE POLICY "Workspace members manage client parents"
  ON public.client_parents FOR ALL TO authenticated
  USING (public.is_client_member(client_id))
  WITH CHECK (public.is_client_member(client_id));

CREATE POLICY "Workspace members manage client locations"
  ON public.client_locations FOR ALL TO authenticated
  USING (public.is_client_member(client_id))
  WITH CHECK (public.is_client_member(client_id));

CREATE POLICY "Workspace members manage client insurances"
  ON public.client_insurances FOR ALL TO authenticated
  USING (public.is_client_member(client_id))
  WITH CHECK (public.is_client_member(client_id));

CREATE POLICY "Workspace members manage client authorizations"
  ON public.client_authorizations FOR ALL TO authenticated
  USING (public.is_client_member(client_id))
  WITH CHECK (public.is_client_member(client_id));

CREATE POLICY "Workspace members manage client documents"
  ON public.client_documents FOR ALL TO authenticated
  USING (public.is_client_member(client_id))
  WITH CHECK (public.is_client_member(client_id));

CREATE POLICY "Workspace members manage client tasks"
  ON public.client_tasks FOR ALL TO authenticated
  USING (
    public.is_profile_member(profile_id)
    AND (
      client_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.clients client
        WHERE client.id = client_tasks.client_id
          AND client.profile_id = client_tasks.profile_id
      )
    )
  )
  WITH CHECK (
    public.is_profile_member(profile_id)
    AND (
      client_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.clients client
        WHERE client.id = client_tasks.client_id
          AND client.profile_id = client_tasks.profile_id
      )
    )
  );

CREATE POLICY "Workspace members manage client contacts"
  ON public.client_contacts FOR ALL TO authenticated
  USING (public.is_client_member(client_id))
  WITH CHECK (public.is_client_member(client_id));

DROP POLICY IF EXISTS "Users can manage authorization services through client ownership" ON public.client_authorization_services;

CREATE POLICY "Workspace members manage authorization services"
  ON public.client_authorization_services FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.client_authorizations authz
      WHERE authz.id = client_authorization_services.authorization_id
        AND public.is_client_member(authz.client_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.client_authorizations authz
      WHERE authz.id = client_authorization_services.authorization_id
        AND public.is_client_member(authz.client_id)
    )
  );

DROP POLICY IF EXISTS "Users can view system and own templates" ON public.communication_templates;
DROP POLICY IF EXISTS "Users can create own templates" ON public.communication_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.communication_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.communication_templates;

CREATE POLICY "Workspace members view system and workspace templates"
  ON public.communication_templates FOR SELECT TO authenticated
  USING (
    profile_id IS NULL
    OR public.is_profile_member(profile_id)
  );

CREATE POLICY "Workspace members create templates"
  ON public.communication_templates FOR INSERT TO authenticated
  WITH CHECK (
    profile_id IS NOT NULL
    AND public.is_profile_member(profile_id)
  );

CREATE POLICY "Workspace members update templates"
  ON public.communication_templates FOR UPDATE TO authenticated
  USING (
    profile_id IS NOT NULL
    AND public.is_profile_member(profile_id)
  )
  WITH CHECK (
    profile_id IS NOT NULL
    AND public.is_profile_member(profile_id)
  );

CREATE POLICY "Workspace members delete templates"
  ON public.communication_templates FOR DELETE TO authenticated
  USING (
    profile_id IS NOT NULL
    AND public.is_profile_member(profile_id)
  );

DROP POLICY IF EXISTS "Users can view own communications" ON public.client_communications;
DROP POLICY IF EXISTS "Users can create own communications" ON public.client_communications;

CREATE POLICY "Workspace members view client communications"
  ON public.client_communications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients client
      WHERE client.id = client_communications.client_id
        AND client.profile_id = client_communications.profile_id
        AND public.is_profile_member(client.profile_id)
    )
  );

CREATE POLICY "Workspace members create client communications"
  ON public.client_communications FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clients client
      WHERE client.id = client_communications.client_id
        AND client.profile_id = client_communications.profile_id
        AND public.is_profile_member(client.profile_id)
    )
  );

DROP POLICY IF EXISTS "Users can view their own employee credentials" ON public.employee_credentials;
DROP POLICY IF EXISTS "Users can insert their own employee credentials" ON public.employee_credentials;
DROP POLICY IF EXISTS "Users can update their own employee credentials" ON public.employee_credentials;
DROP POLICY IF EXISTS "Users can delete their own employee credentials" ON public.employee_credentials;

CREATE POLICY "Workspace members manage employee credentials"
  ON public.employee_credentials FOR ALL TO authenticated
  USING (public.is_profile_member(profile_id))
  WITH CHECK (public.is_profile_member(profile_id));

DROP POLICY IF EXISTS "Users can view own status changes" ON public.client_status_changes;
DROP POLICY IF EXISTS "Users can insert own status changes" ON public.client_status_changes;

CREATE POLICY "Workspace members view client status changes"
  ON public.client_status_changes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients client
      WHERE client.id = client_status_changes.client_id
        AND client.profile_id = client_status_changes.profile_id
        AND public.is_profile_member(client.profile_id)
    )
  );

CREATE POLICY "Workspace members create client status changes"
  ON public.client_status_changes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clients client
      WHERE client.id = client_status_changes.client_id
        AND client.profile_id = client_status_changes.profile_id
        AND public.is_profile_member(client.profile_id)
    )
  );

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Workspace members view notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (public.is_profile_member(profile_id));

CREATE POLICY "Workspace members update notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (public.is_profile_member(profile_id))
  WITH CHECK (public.is_profile_member(profile_id));

DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;

CREATE POLICY "Workspace members view own feedback"
  ON public.feedback FOR SELECT TO authenticated
  USING (
    profile_id IS NOT NULL
    AND public.is_profile_member(profile_id)
  );

DROP POLICY IF EXISTS "Providers can manage own intake tokens" ON public.intake_tokens;

CREATE POLICY "Workspace members manage intake tokens"
  ON public.intake_tokens FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients client
      WHERE client.id = intake_tokens.client_id
        AND client.profile_id = intake_tokens.profile_id
        AND public.is_profile_member(client.profile_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clients client
      WHERE client.id = intake_tokens.client_id
        AND client.profile_id = intake_tokens.profile_id
        AND public.is_profile_member(client.profile_id)
    )
  );

DROP POLICY IF EXISTS "Users can view own custom domains" ON public.custom_domains;
DROP POLICY IF EXISTS "Users can insert own custom domains" ON public.custom_domains;
DROP POLICY IF EXISTS "Users can update own custom domains" ON public.custom_domains;
DROP POLICY IF EXISTS "Users can delete own custom domains" ON public.custom_domains;

CREATE POLICY "Workspace members view custom domains"
  ON public.custom_domains FOR SELECT TO authenticated
  USING (public.is_profile_member(profile_id));

CREATE POLICY "Workspace members manage custom domains"
  ON public.custom_domains FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.listings listing
      WHERE listing.id = custom_domains.listing_id
        AND listing.profile_id = custom_domains.profile_id
        AND public.is_profile_member(listing.profile_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.listings listing
      WHERE listing.id = custom_domains.listing_id
        AND listing.profile_id = custom_domains.profile_id
        AND public.is_profile_member(listing.profile_id)
    )
  );

DROP POLICY IF EXISTS "Users can upload logos to their listing folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload photos to their listing folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own client documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own client documents" ON storage.objects;
DROP POLICY IF EXISTS "Agencies can read their resumes" ON storage.objects;
DROP POLICY IF EXISTS "Agencies can delete their resumes" ON storage.objects;

CREATE POLICY "Workspace members upload logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-logos'
    AND EXISTS (
      SELECT 1
      FROM public.listings listing
      WHERE listing.id::text = (storage.foldername(name))[1]
        AND public.is_profile_member(listing.profile_id)
    )
  );

CREATE POLICY "Workspace members update logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'listing-logos'
    AND EXISTS (
      SELECT 1
      FROM public.listings listing
      WHERE listing.id::text = (storage.foldername(name))[1]
        AND public.is_profile_member(listing.profile_id)
    )
  )
  WITH CHECK (
    bucket_id = 'listing-logos'
    AND EXISTS (
      SELECT 1
      FROM public.listings listing
      WHERE listing.id::text = (storage.foldername(name))[1]
        AND public.is_profile_member(listing.profile_id)
    )
  );

CREATE POLICY "Workspace members delete logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'listing-logos'
    AND EXISTS (
      SELECT 1
      FROM public.listings listing
      WHERE listing.id::text = (storage.foldername(name))[1]
        AND public.is_profile_member(listing.profile_id)
    )
  );

CREATE POLICY "Workspace members upload photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND EXISTS (
      SELECT 1
      FROM public.listings listing
      WHERE listing.id::text = (storage.foldername(name))[1]
        AND public.is_profile_member(listing.profile_id)
    )
  );

CREATE POLICY "Workspace members update photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'listing-photos'
    AND EXISTS (
      SELECT 1
      FROM public.listings listing
      WHERE listing.id::text = (storage.foldername(name))[1]
        AND public.is_profile_member(listing.profile_id)
    )
  )
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND EXISTS (
      SELECT 1
      FROM public.listings listing
      WHERE listing.id::text = (storage.foldername(name))[1]
        AND public.is_profile_member(listing.profile_id)
    )
  );

CREATE POLICY "Workspace members delete photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'listing-photos'
    AND EXISTS (
      SELECT 1
      FROM public.listings listing
      WHERE listing.id::text = (storage.foldername(name))[1]
        AND public.is_profile_member(listing.profile_id)
    )
  );

CREATE POLICY "Workspace members upload client documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1
      FROM public.clients client
      WHERE client.profile_id::text = split_part(name, '/', 1)
        AND client.id::text = split_part(name, '/', 2)
        AND public.is_profile_member(client.profile_id)
    )
  );

CREATE POLICY "Workspace members read client documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1
      FROM public.clients client
      WHERE client.profile_id::text = split_part(name, '/', 1)
        AND client.id::text = split_part(name, '/', 2)
        AND public.is_profile_member(client.profile_id)
    )
  );

CREATE POLICY "Workspace members delete client documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1
      FROM public.clients client
      WHERE client.profile_id::text = split_part(name, '/', 1)
        AND client.id::text = split_part(name, '/', 2)
        AND public.is_profile_member(client.profile_id)
    )
  );

CREATE POLICY "Workspace members read resumes"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'job-resumes'
    AND EXISTS (
      SELECT 1
      FROM public.job_postings job_posting
      WHERE job_posting.id::text = split_part(name, '/', 1)
        AND public.is_profile_member(job_posting.profile_id)
    )
  );

CREATE POLICY "Workspace members delete resumes"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'job-resumes'
    AND EXISTS (
      SELECT 1
      FROM public.job_postings job_posting
      WHERE job_posting.id::text = split_part(name, '/', 1)
        AND public.is_profile_member(job_posting.profile_id)
    )
  );
