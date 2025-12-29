-- Add phone and website columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS website text;

-- Add index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_profiles_website ON public.profiles(website) WHERE website IS NOT NULL;
