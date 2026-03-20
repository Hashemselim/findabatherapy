DROP POLICY IF EXISTS "Workspace members update client communications" ON public.client_communications;

CREATE POLICY "Workspace members update client communications"
  ON public.client_communications FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients client
      WHERE client.id = client_communications.client_id
        AND client.profile_id = client_communications.profile_id
        AND public.is_profile_member(client.profile_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clients client
      WHERE client.id = client_communications.client_id
        AND client.profile_id = client_communications.profile_id
        AND public.is_profile_member(client.profile_id)
    )
  );
