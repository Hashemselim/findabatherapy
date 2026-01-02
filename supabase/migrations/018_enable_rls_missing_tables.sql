-- Enable RLS on tables that were missing it
-- These tables were flagged by Supabase linter

-- audit_events: internal logging, no public access needed
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Only service role can insert audit events (from server-side code)
CREATE POLICY "Service role can insert audit events"
  ON public.audit_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only service role can read audit events (for admin dashboard)
CREATE POLICY "Service role can read audit events"
  ON public.audit_events
  FOR SELECT
  TO service_role
  USING (true);

-- featured_orders: internal tracking, no public access
ALTER TABLE public.featured_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage featured orders"
  ON public.featured_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- listing_attribute_definitions: reference data, public read
ALTER TABLE public.listing_attribute_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read attribute definitions"
  ON public.listing_attribute_definitions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage attribute definitions"
  ON public.listing_attribute_definitions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- sponsorships: internal/admin data
ALTER TABLE public.sponsorships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage sponsorships"
  ON public.sponsorships
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public can read current sponsorships (within date range)
CREATE POLICY "Anyone can read current sponsorships"
  ON public.sponsorships
  FOR SELECT
  TO anon, authenticated
  USING (starts_at <= now() AND ends_at > now());

-- partner_offers: public can view, admin manages
ALTER TABLE public.partner_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage partner offers"
  ON public.partner_offers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public can read all partner offers (sorted by sort_order in queries)
CREATE POLICY "Anyone can read partner offers"
  ON public.partner_offers
  FOR SELECT
  TO anon, authenticated
  USING (true);
