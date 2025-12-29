-- Migration: 011_create_google_places_listings.sql
-- Creates table for pre-populated provider listings from Google Places API

-- Create the google_places_listings table
CREATE TABLE public.google_places_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Google Places data
  google_place_id text UNIQUE NOT NULL,

  -- Basic info from Google
  name text NOT NULL,
  slug text UNIQUE NOT NULL,

  -- Address components
  street text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  formatted_address text,

  -- Contact info
  phone text,
  website text,

  -- Google rating
  google_rating numeric(2,1),
  google_rating_count integer,

  -- Status: active (visible), removed (hidden after claim approved), claimed (linked to real listing)
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed', 'claimed')),

  -- Tracking
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- If claimed, link to the real listing (optional reference)
  claimed_listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  claimed_at timestamptz
);

-- Indexes for efficient queries
CREATE INDEX google_places_listings_state_idx ON public.google_places_listings(state);
CREATE INDEX google_places_listings_city_state_idx ON public.google_places_listings(city, state);
CREATE INDEX google_places_listings_status_idx ON public.google_places_listings(status) WHERE status = 'active';
CREATE INDEX google_places_listings_google_place_id_idx ON public.google_places_listings(google_place_id);
CREATE INDEX google_places_listings_slug_idx ON public.google_places_listings(slug);
CREATE INDEX google_places_listings_lat_lng_idx ON public.google_places_listings(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Enable RLS
ALTER TABLE public.google_places_listings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active listings (public directory)
CREATE POLICY "Public can view active google_places_listings" ON public.google_places_listings
  FOR SELECT
  USING (status = 'active');

-- Comment on table
COMMENT ON TABLE public.google_places_listings IS 'Pre-populated provider listings sourced from Google Places API. These are "unclaimed" listings that show basic info and external contact links.';
