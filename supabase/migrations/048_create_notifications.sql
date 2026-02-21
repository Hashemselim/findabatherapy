-- =============================================================================
-- Migration 048: Create notifications table
-- =============================================================================
-- Unified notification center for all event types:
-- contact forms, intake submissions, job applications, task alerts, etc.
-- =============================================================================

-- Notification type enum
CREATE TYPE public.notification_type AS ENUM (
  'contact_form',
  'intake_submission',
  'job_application',
  'task_overdue',
  'auth_expiring',
  'credential_expiring',
  'status_change',
  'system'
);

-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  entity_id uuid,
  entity_type text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_notifications_profile_id ON public.notifications(profile_id);
CREATE INDEX idx_notifications_unread ON public.notifications(profile_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON public.notifications(profile_id, created_at DESC);
CREATE INDEX idx_notifications_type ON public.notifications(profile_id, type);

-- Prevent duplicate notifications for the same entity
CREATE UNIQUE INDEX idx_notifications_entity_unique
  ON public.notifications(profile_id, entity_id, entity_type)
  WHERE entity_id IS NOT NULL;

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid());

-- Service role inserts (for public submission flows using admin client)
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);
