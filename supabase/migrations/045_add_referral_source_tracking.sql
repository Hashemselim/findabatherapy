-- Migration: Phase 5 — Referral Source Tracking
--
-- 1. Add referral_source_other to clients table
-- 2. Add referral_source to inquiries table
-- 3. Add indexes for referral source analytics queries

-- =============================================================================
-- 1. MODIFY clients: Add referral_source_other column
-- =============================================================================

-- referral_source already exists as text column
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS referral_source_other text;

-- Index for analytics aggregation by referral source
CREATE INDEX IF NOT EXISTS idx_clients_referral_source
  ON public.clients (profile_id, referral_source)
  WHERE deleted_at IS NULL;

-- =============================================================================
-- 2. MODIFY inquiries: Add referral_source and referral_source_other columns
-- =============================================================================

ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS referral_source text,
  ADD COLUMN IF NOT EXISTS referral_source_other text;
