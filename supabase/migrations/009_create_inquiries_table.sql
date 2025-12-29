-- Create inquiries table for contact form submissions
-- This allows families to send messages to providers

-- Create inquiry status type
CREATE TYPE public.inquiry_status AS ENUM ('unread', 'read', 'replied', 'archived');

-- Create inquiries table
CREATE TABLE public.inquiries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  family_name text NOT NULL,
  family_email text NOT NULL,
  family_phone text,
  child_age text,
  message text NOT NULL,
  status inquiry_status NOT NULL DEFAULT 'unread',
  read_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX inquiries_listing_id_idx ON public.inquiries(listing_id);
CREATE INDEX inquiries_status_idx ON public.inquiries(status);
CREATE INDEX inquiries_created_at_idx ON public.inquiries(created_at DESC);

-- Enable RLS
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Policy: Listing owners can view their inquiries
CREATE POLICY "Listing owners can view inquiries" ON public.inquiries
  FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM public.listings WHERE profile_id = auth.uid()
    )
  );

-- Policy: Listing owners can update their inquiries (mark as read, replied, archived)
CREATE POLICY "Listing owners can update inquiries" ON public.inquiries
  FOR UPDATE
  USING (
    listing_id IN (
      SELECT id FROM public.listings WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    listing_id IN (
      SELECT id FROM public.listings WHERE profile_id = auth.uid()
    )
  );

-- Policy: Allow public inserts (for contact form submissions)
-- Note: We use service role/admin client in the server action for inserts,
-- but this policy allows authenticated users to submit as well if needed
CREATE POLICY "Anyone can submit inquiries" ON public.inquiries
  FOR INSERT
  WITH CHECK (true);
