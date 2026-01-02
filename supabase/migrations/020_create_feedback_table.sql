-- Create feedback table for user feedback submissions
-- This allows users (providers/customers) to send feedback to the platform

-- Create feedback category type
CREATE TYPE public.feedback_category AS ENUM ('feature_request', 'bug_report', 'general_feedback', 'question', 'compliment');

-- Create feedback status type
CREATE TYPE public.feedback_status AS ENUM ('unread', 'read', 'replied', 'archived');

-- Create feedback table
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Submitter info (can be anonymous or from registered user)
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  -- Feedback content
  category feedback_category NOT NULL DEFAULT 'general_feedback',
  rating smallint CHECK (rating >= 1 AND rating <= 5),
  message text NOT NULL,
  -- Status tracking
  status feedback_status NOT NULL DEFAULT 'unread',
  read_at timestamptz,
  replied_at timestamptz,
  -- Metadata
  page_url text, -- Which page they submitted from
  user_agent text, -- Browser info for debugging bugs
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX feedback_status_idx ON public.feedback(status);
CREATE INDEX feedback_category_idx ON public.feedback(category);
CREATE INDEX feedback_created_at_idx ON public.feedback(created_at DESC);
CREATE INDEX feedback_profile_id_idx ON public.feedback(profile_id);
CREATE INDEX feedback_rating_idx ON public.feedback(rating);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all feedback
CREATE POLICY "Admins can view all feedback" ON public.feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Admins can update feedback (mark as read, replied, archived)
CREATE POLICY "Admins can update feedback" ON public.feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Anyone can submit feedback
CREATE POLICY "Anyone can submit feedback" ON public.feedback
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT
  USING (profile_id = auth.uid());
