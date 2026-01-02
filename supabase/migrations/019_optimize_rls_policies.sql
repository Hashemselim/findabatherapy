-- Optimize RLS policies to avoid re-evaluating auth.uid() for each row
-- The fix is wrapping auth.uid() in (select auth.uid()) for single evaluation

-- ============================================
-- PROFILES
-- ============================================

-- Drop and recreate with optimized version
DROP POLICY IF EXISTS "Profiles are editable by their owners" ON public.profiles;
CREATE POLICY "Profiles are editable by their owners" ON public.profiles
  FOR ALL USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Combine the two SELECT policies into one
DROP POLICY IF EXISTS "Profiles visible for published listings" ON public.profiles;
-- Keep the combined logic: owner can see their own OR anyone can see profiles with published listings
CREATE POLICY "Profiles viewable by owner or public" ON public.profiles
  FOR SELECT USING (
    (select auth.uid()) = id
    OR
    id IN (SELECT profile_id FROM public.listings WHERE status = 'published')
  );

-- ============================================
-- LISTINGS
-- ============================================

DROP POLICY IF EXISTS "Agencies manage own listings" ON public.listings;
CREATE POLICY "Agencies manage own listings" ON public.listings
  FOR ALL USING ((select auth.uid()) = profile_id)
  WITH CHECK ((select auth.uid()) = profile_id);

-- Combine SELECT policies: owner OR published
DROP POLICY IF EXISTS "Listings visible when published" ON public.listings;
CREATE POLICY "Listings viewable by owner or public" ON public.listings
  FOR SELECT USING (
    (select auth.uid()) = profile_id
    OR
    status = 'published'
  );

-- ============================================
-- LOCATIONS
-- ============================================

DROP POLICY IF EXISTS "Agencies manage their locations" ON public.locations;
CREATE POLICY "Agencies manage their locations" ON public.locations
  FOR ALL USING ((select auth.uid()) = (SELECT profile_id FROM public.listings WHERE id = listing_id))
  WITH CHECK ((select auth.uid()) = (SELECT profile_id FROM public.listings WHERE id = listing_id));

-- Combine SELECT policies
DROP POLICY IF EXISTS "Locations visible for published listings" ON public.locations;
CREATE POLICY "Locations viewable by owner or public" ON public.locations
  FOR SELECT USING (
    (select auth.uid()) = (SELECT profile_id FROM public.listings WHERE id = listing_id)
    OR
    listing_id IN (SELECT id FROM public.listings WHERE status = 'published')
  );

-- ============================================
-- MEDIA_ASSETS
-- ============================================

DROP POLICY IF EXISTS "Agencies manage media" ON public.media_assets;
CREATE POLICY "Agencies manage media" ON public.media_assets
  FOR ALL USING ((select auth.uid()) = (SELECT profile_id FROM public.listings WHERE id = listing_id))
  WITH CHECK ((select auth.uid()) = (SELECT profile_id FROM public.listings WHERE id = listing_id));

-- ============================================
-- LISTING_ATTRIBUTE_VALUES
-- ============================================

DROP POLICY IF EXISTS "Agencies manage attributes" ON public.listing_attribute_values;
CREATE POLICY "Agencies manage attributes" ON public.listing_attribute_values
  FOR ALL USING ((select auth.uid()) = (SELECT profile_id FROM public.listings WHERE id = listing_id))
  WITH CHECK ((select auth.uid()) = (SELECT profile_id FROM public.listings WHERE id = listing_id));

-- Combine SELECT policies
DROP POLICY IF EXISTS "Attributes visible for published listings" ON public.listing_attribute_values;
CREATE POLICY "Attributes viewable by owner or public" ON public.listing_attribute_values
  FOR SELECT USING (
    (select auth.uid()) = (SELECT profile_id FROM public.listings WHERE id = listing_id)
    OR
    listing_id IN (SELECT id FROM public.listings WHERE status = 'published')
  );

-- ============================================
-- INQUIRIES
-- ============================================

DROP POLICY IF EXISTS "Listing owners can view inquiries" ON public.inquiries;
CREATE POLICY "Listing owners can view inquiries" ON public.inquiries
  FOR SELECT USING (
    listing_id IN (SELECT id FROM public.listings WHERE profile_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "Listing owners can update inquiries" ON public.inquiries;
CREATE POLICY "Listing owners can update inquiries" ON public.inquiries
  FOR UPDATE USING (
    listing_id IN (SELECT id FROM public.listings WHERE profile_id = (select auth.uid()))
  )
  WITH CHECK (
    listing_id IN (SELECT id FROM public.listings WHERE profile_id = (select auth.uid()))
  );

-- ============================================
-- REMOVAL_REQUESTS
-- ============================================

DROP POLICY IF EXISTS "Users can view own removal_requests" ON public.removal_requests;
CREATE POLICY "Users can view own removal_requests" ON public.removal_requests
  FOR SELECT USING ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can create removal_requests" ON public.removal_requests;
CREATE POLICY "Users can create removal_requests" ON public.removal_requests
  FOR INSERT WITH CHECK (
    (select auth.uid()) = profile_id AND
    listing_id IN (SELECT id FROM public.listings WHERE profile_id = (select auth.uid()))
  );

-- ============================================
-- LOCATION_FEATURED_SUBSCRIPTIONS
-- ============================================

DROP POLICY IF EXISTS "Users can view own featured subscriptions" ON public.location_featured_subscriptions;
CREATE POLICY "Users can view own featured subscriptions" ON public.location_featured_subscriptions
  FOR SELECT USING (profile_id = (select auth.uid()));
