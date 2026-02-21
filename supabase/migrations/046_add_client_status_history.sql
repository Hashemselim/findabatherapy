-- =============================================================================
-- Migration 046: Client Status History
-- Tracks client status changes for pipeline activity feed
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.client_status_changes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_client_status_changes_profile ON public.client_status_changes(profile_id);
CREATE INDEX idx_client_status_changes_client ON public.client_status_changes(client_id);
CREATE INDEX idx_client_status_changes_time ON public.client_status_changes(changed_at DESC);

-- RLS
ALTER TABLE public.client_status_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own status changes"
  ON public.client_status_changes FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own status changes"
  ON public.client_status_changes FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());
