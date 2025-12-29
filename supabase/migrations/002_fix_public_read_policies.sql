-- Migration: Fix RLS policies for public read access
-- The profiles table needs a public SELECT policy so visitors can see agency info on published listings

-- Add public read policy for profiles that have published listings
create policy "Profiles visible for published listings" on public.profiles
  for select using (
    id in (select profile_id from public.listings where status = 'published')
  );
