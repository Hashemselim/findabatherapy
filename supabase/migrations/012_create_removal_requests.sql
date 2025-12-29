-- Migration: 012_create_removal_requests.sql
-- Creates table for tracking removal/claim requests from providers

-- Create enum for request status
CREATE TYPE public.removal_request_status AS ENUM ('pending', 'approved', 'denied');

-- Create the removal_requests table
CREATE TABLE public.removal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The pre-populated listing being requested for removal
  google_places_listing_id uuid NOT NULL REFERENCES public.google_places_listings(id) ON DELETE CASCADE,

  -- The user making the request (must have a listing)
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,

  -- Request details
  reason text,
  status removal_request_status NOT NULL DEFAULT 'pending',

  -- Admin response
  admin_notes text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,

  -- Tracking
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX removal_requests_status_idx ON public.removal_requests(status);
CREATE INDEX removal_requests_profile_idx ON public.removal_requests(profile_id);
CREATE INDEX removal_requests_google_listing_idx ON public.removal_requests(google_places_listing_id);
CREATE INDEX removal_requests_pending_idx ON public.removal_requests(status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.removal_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own requests
CREATE POLICY "Users can view own removal_requests" ON public.removal_requests
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Policy: Users can create requests for listings they own
CREATE POLICY "Users can create removal_requests" ON public.removal_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = profile_id AND
    listing_id IN (SELECT id FROM public.listings WHERE profile_id = auth.uid())
  );

-- Comment on table
COMMENT ON TABLE public.removal_requests IS 'Tracks requests from providers to remove pre-populated Google Places listings that represent their business.';
