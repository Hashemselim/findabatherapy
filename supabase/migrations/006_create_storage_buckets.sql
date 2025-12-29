-- Create storage buckets for media uploads

-- Create the listing-logos bucket (public read access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-logos',
  'listing-logos',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create the listing-photos bucket (public read access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-photos',
  'listing-photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for listing-logos bucket
-- Drop existing policies first (safe - does nothing if they don't exist)
DROP POLICY IF EXISTS "Users can upload logos to their listing folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;

-- Allow authenticated users to upload to their own listing folder
CREATE POLICY "Users can upload logos to their listing folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'listing-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.listings WHERE profile_id = auth.uid()
  )
);

-- Allow authenticated users to update their own logos
CREATE POLICY "Users can update their own logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'listing-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.listings WHERE profile_id = auth.uid()
  )
);

-- Allow authenticated users to delete their own logos
CREATE POLICY "Users can delete their own logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'listing-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.listings WHERE profile_id = auth.uid()
  )
);

-- Allow public read access to logos
CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'listing-logos');


-- Storage policies for listing-photos bucket
-- Drop existing policies first (safe - does nothing if they don't exist)
DROP POLICY IF EXISTS "Users can upload photos to their listing folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;

-- Allow authenticated users to upload photos to their own listing folder
CREATE POLICY "Users can upload photos to their listing folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'listing-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.listings WHERE profile_id = auth.uid()
  )
);

-- Allow authenticated users to update their own photos
CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'listing-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.listings WHERE profile_id = auth.uid()
  )
);

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'listing-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.listings WHERE profile_id = auth.uid()
  )
);

-- Allow public read access to photos
CREATE POLICY "Anyone can view photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'listing-photos');
