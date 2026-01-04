-- Combined migration script for Find ABA Therapy
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- ============================================================
-- PART 1: Base Schema
-- ============================================================

create extension if not exists "uuid-ossp";

-- Create extensions schema for better security
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

create extension if not exists "pg_trgm" WITH SCHEMA extensions;
create extension if not exists "unaccent" WITH SCHEMA extensions;

-- Create types (skip if they already exist)
DO $$ BEGIN
  CREATE TYPE public.plan_tier AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.listing_status AS ENUM ('draft', 'published', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.media_kind AS ENUM ('logo', 'photo', 'video');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sponsorship_placement AS ENUM ('homepage_banner', 'directory_banner', 'dashboard_partner');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.attribute_variant AS ENUM ('text', 'multi_select', 'boolean', 'range', 'number', 'json');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  agency_name text not null,
  contact_email text not null,
  plan_tier plan_tier not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  onboarding_completed_at timestamptz,
  has_featured_addon boolean not null default false,
  featured_addon_subscription_id text,
  is_seeded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Listings table
create table if not exists public.listings (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique,
  headline text,
  description text,
  summary text,
  service_modes text[] not null default array[]::text[],
  plan_tier plan_tier not null default 'free',
  status listing_status not null default 'draft',
  is_accepting_clients boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_search_idx on public.listings using gin ((to_tsvector('english', coalesce(description, '') || ' ' || coalesce(summary, ''))));
create index if not exists listings_service_modes_idx on public.listings using gin (service_modes);

-- Locations table
create table if not exists public.locations (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  label text,
  street text,
  city text not null,
  state text not null,
  postal_code text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  is_primary boolean not null default false,
  service_radius_miles integer default 25,
  created_at timestamptz not null default now()
);

create index if not exists locations_listing_idx on public.locations(listing_id);
create index if not exists locations_state_idx on public.locations(state);

-- Media assets table
create table if not exists public.media_assets (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  media_type media_kind not null,
  title text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Attribute definitions table
create table if not exists public.listing_attribute_definitions (
  id serial primary key,
  attribute_key text unique not null,
  label text not null,
  variant attribute_variant not null,
  description text,
  options jsonb,
  is_filterable boolean not null default true,
  is_required boolean not null default false,
  created_at timestamptz not null default now()
);

-- Attribute values table
create table if not exists public.listing_attribute_values (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  attribute_key text not null references public.listing_attribute_definitions(attribute_key) on delete restrict,
  value_text text,
  value_json jsonb,
  value_number numeric,
  value_boolean boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists attribute_values_listing_idx on public.listing_attribute_values(listing_id);
create index if not exists attribute_values_key_idx on public.listing_attribute_values(attribute_key);
create index if not exists attribute_values_text_idx on public.listing_attribute_values using gin (to_tsvector('english', coalesce(value_text, '')));

-- Featured orders table
create table if not exists public.featured_orders (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  state text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

create index if not exists featured_orders_state_idx on public.featured_orders(state);

-- Sponsorships table
create table if not exists public.sponsorships (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  placement sponsorship_placement not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  asset_path text,
  headline text,
  created_at timestamptz not null default now()
);

-- Partner offers table
create table if not exists public.partner_offers (
  id uuid primary key default uuid_generate_v4(),
  category text not null,
  partner_name text not null,
  headline text,
  offer_details text,
  cta_link text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Audit events table
create table if not exists public.audit_events (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references public.profiles(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Index for seeded profiles
create index if not exists idx_profiles_is_seeded on public.profiles(is_seeded);

-- ============================================================
-- PART 2: Row Level Security Policies
-- ============================================================

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.locations enable row level security;
alter table public.media_assets enable row level security;
alter table public.listing_attribute_values enable row level security;

-- Drop existing policies if they exist (to allow re-running)
drop policy if exists "Profiles are editable by their owners" on public.profiles;
drop policy if exists "Profiles are viewable by service role" on public.profiles;
drop policy if exists "Listings visible when published" on public.listings;
drop policy if exists "Agencies manage own listings" on public.listings;
drop policy if exists "Agencies manage their locations" on public.locations;
drop policy if exists "Locations visible for published listings" on public.locations;
drop policy if exists "Agencies manage media" on public.media_assets;
drop policy if exists "Agencies manage attributes" on public.listing_attribute_values;
drop policy if exists "Attributes visible for published listings" on public.listing_attribute_values;

-- Create policies
create policy "Profiles are editable by their owners" on public.profiles
  for all using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Listings visible when published" on public.listings
  for select using (status = 'published');

create policy "Agencies manage own listings" on public.listings
  for all using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "Agencies manage their locations" on public.locations
  for all using (auth.uid() = (select profile_id from public.listings where id = listing_id))
  with check (auth.uid() = (select profile_id from public.listings where id = listing_id));

create policy "Locations visible for published listings" on public.locations
  for select using (
    listing_id in (select id from public.listings where status = 'published')
  );

create policy "Agencies manage media" on public.media_assets
  for all using (auth.uid() = (select profile_id from public.listings where id = listing_id))
  with check (auth.uid() = (select profile_id from public.listings where id = listing_id));

create policy "Agencies manage attributes" on public.listing_attribute_values
  for all using (auth.uid() = (select profile_id from public.listings where id = listing_id))
  with check (auth.uid() = (select profile_id from public.listings where id = listing_id));

create policy "Attributes visible for published listings" on public.listing_attribute_values
  for select using (
    listing_id in (select id from public.listings where status = 'published')
  );

-- ============================================================
-- PART 3: Seed Attribute Definitions
-- ============================================================

insert into public.listing_attribute_definitions (attribute_key, label, variant, description, options, is_filterable)
values
  ('services', 'Service Type', 'multi_select', 'In-home, in-center, telehealth, and hybrid options.', jsonb_build_object('options', array['in_home','in_center','telehealth','hybrid']), true)
  on conflict (attribute_key) do update set label = excluded.label,
    variant = excluded.variant,
    description = excluded.description,
    options = excluded.options,
    is_filterable = excluded.is_filterable;

insert into public.listing_attribute_definitions (attribute_key, label, variant, description, is_filterable)
values
  ('insurances', 'Insurances Accepted', 'multi_select', 'Commercial, Medicaid, TRICARE, self-pay, and more.', true),
  ('ages_served', 'Ages Served', 'range', 'Filter by early intervention, school-age, or adult services.', true),
  ('languages', 'Languages', 'multi_select', 'Identify multilingual teams and culturally aligned care.', true),
  ('diagnoses', 'Diagnoses Supported', 'multi_select', 'Autism, ADHD, anxiety, and other behavioral needs.', true),
  ('clinical_specialties', 'Clinical Specialties', 'multi_select', 'School consultation, parent training, feeding clinics, occupational therapy, and more.', true),
  ('availability', 'Availability', 'boolean', 'Show agencies accepting new clients now.', true),
  ('telehealth', 'Telehealth', 'boolean', 'Indicates if the agency offers virtual services.', true),
  ('age_min', 'Minimum Age', 'number', 'Lowest age served (in years).', true),
  ('age_max', 'Maximum Age', 'number', 'Highest age served (in years).', true)
  on conflict (attribute_key) do update set label = excluded.label,
    variant = excluded.variant,
    description = excluded.description,
    is_filterable = excluded.is_filterable;

-- ============================================================
-- PART 4: Full-text Search Materialized View
-- ============================================================

drop materialized view if exists public.listing_search_index;

create materialized view public.listing_search_index as
select
  l.id,
  l.slug,
  l.status,
  l.plan_tier,
  l.is_accepting_clients,
  array_agg(distinct loc.state) filter (where loc.state is not null) as states,
  to_tsvector('english', coalesce(l.headline, '') || ' ' || coalesce(l.description, '')) ||
  to_tsvector('simple', coalesce(string_agg(coalesce(av.value_text, ''), ' '), '')) as document
from public.listings l
left join public.locations loc on loc.listing_id = l.id
left join public.listing_attribute_values av on av.listing_id = l.id
where l.status = 'published'
group by l.id;

create index if not exists listing_search_index_document_idx on public.listing_search_index using gin (document);

-- Helper function to refresh materialized view
create or replace function public.refresh_listing_search_index()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  refresh materialized view concurrently public.listing_search_index;
end;
$$;

-- ============================================================
-- Done! Schema is ready for seeding providers.
-- ============================================================
