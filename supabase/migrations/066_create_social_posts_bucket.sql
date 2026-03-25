-- Create social-posts storage bucket (public read, service-role write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-posts', 'social-posts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read social posts in their own folder
CREATE POLICY "Users can read own social posts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'social-posts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access for social post images (they're served as static URLs)
CREATE POLICY "Public read for social posts"
ON storage.objects FOR SELECT
USING (bucket_id = 'social-posts');
