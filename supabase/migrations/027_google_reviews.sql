-- Migration: Add Google Reviews caching and provider selection
-- Allows providers to cache Google reviews and choose which ones to display

-- Create google_reviews table to cache reviews from Google Places API
CREATE TABLE public.google_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  google_review_id text NOT NULL, -- Google's unique identifier for the review
  author_name text NOT NULL,
  author_photo_url text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text text,
  relative_time_description text, -- e.g., "2 months ago"
  published_at timestamptz,
  is_selected boolean NOT NULL DEFAULT false, -- Provider chose to display this review
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Ensure unique reviews per location
  UNIQUE(location_id, google_review_id)
);

-- Add column to locations to control review display
ALTER TABLE public.locations
ADD COLUMN show_google_reviews boolean NOT NULL DEFAULT false;

-- Indexes for efficient lookups
CREATE INDEX google_reviews_location_id_idx ON public.google_reviews(location_id);
CREATE INDEX google_reviews_is_selected_idx ON public.google_reviews(location_id, is_selected) WHERE is_selected = true;

-- Enable RLS
ALTER TABLE public.google_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for google_reviews

-- Public can read selected reviews for locations that have show_google_reviews enabled
CREATE POLICY "Public can read selected reviews"
ON public.google_reviews
FOR SELECT
TO public
USING (
  is_selected = true
  AND EXISTS (
    SELECT 1 FROM public.locations l
    WHERE l.id = google_reviews.location_id
    AND l.show_google_reviews = true
  )
);

-- Authenticated users can read all reviews for their own locations
CREATE POLICY "Users can read own location reviews"
ON public.google_reviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.locations l
    JOIN public.listings lst ON l.listing_id = lst.id
    WHERE l.id = google_reviews.location_id
    AND lst.profile_id = auth.uid()
  )
);

-- Only service role can insert/update/delete reviews (via server actions)
CREATE POLICY "Service role can manage reviews"
ON public.google_reviews
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE public.google_reviews IS 'Cached Google reviews from Google Places API, with provider selection capability';
COMMENT ON COLUMN public.google_reviews.google_review_id IS 'Unique identifier from Google Places API for deduplication';
COMMENT ON COLUMN public.google_reviews.is_selected IS 'Whether the provider has chosen to display this review on their profile';
COMMENT ON COLUMN public.google_reviews.relative_time_description IS 'Human-readable time description from Google (e.g., "2 months ago")';
COMMENT ON COLUMN public.locations.show_google_reviews IS 'Whether to display selected Google reviews on the provider detail page';

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_google_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER google_reviews_updated_at
  BEFORE UPDATE ON public.google_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_google_reviews_updated_at();
