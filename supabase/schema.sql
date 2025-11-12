-- Supabase schema for Find ABA Therapy
-- Generated as a starting point for migrations. Adjust types and constraints before production.

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";

create type public.plan_tier as enum ('free', 'premium', 'featured');
create type public.listing_status as enum ('draft', 'published', 'suspended');
create type public.media_kind as enum ('logo', 'photo', 'video');
create type public.sponsorship_placement as enum ('homepage_banner', 'directory_banner', 'dashboard_partner');
create type public.attribute_variant as enum ('text', 'multi_select', 'boolean', 'range', 'number', 'json');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  agency_name text not null,
  contact_email text not null,
  plan_tier plan_tier not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.listings (
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

create index listings_search_idx on public.listings using gin ((to_tsvector('english', coalesce(description, '') || ' ' || coalesce(summary, ''))));
create index listings_service_modes_idx on public.listings using gin (service_modes);

create table public.locations (
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
  created_at timestamptz not null default now()
);

create index locations_listing_idx on public.locations(listing_id);
create index locations_state_idx on public.locations(state);

create table public.media_assets (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  media_type media_kind not null,
  title text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.listing_attribute_definitions (
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

create table public.listing_attribute_values (
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

create index attribute_values_listing_idx on public.listing_attribute_values(listing_id);
create index attribute_values_key_idx on public.listing_attribute_values(attribute_key);
create index attribute_values_text_idx on public.listing_attribute_values using gin (to_tsvector('english', coalesce(value_text, '')));

create table public.featured_orders (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  state text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

create index featured_orders_state_idx on public.featured_orders(state);

create table public.sponsorships (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  placement sponsorship_placement not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  asset_path text,
  headline text,
  created_at timestamptz not null default now()
);

create table public.partner_offers (
  id uuid primary key default uuid_generate_v4(),
  category text not null,
  partner_name text not null,
  headline text,
  offer_details text,
  cta_link text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references public.profiles(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Full text search materialized view placeholder (refresh via edge function)
create materialized view public.listing_search_index as
select
  l.id,
  l.slug,
  l.status,
  l.plan_tier,
  l.is_accepting_clients,
  array_agg(distinct loc.state) as states,
  to_tsvector('english', coalesce(l.headline, '') || ' ' || coalesce(l.description, '')) ||
  to_tsvector('simple', string_agg(coalesce(av.value_text, ''), ' ')) as document
from public.listings l
left join public.locations loc on loc.listing_id = l.id
left join public.listing_attribute_values av on av.listing_id = l.id
where l.status = 'published'
group by l.id;

create index listing_search_index_document_idx on public.listing_search_index using gin (document);

-- Row Level Security policies
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.locations enable row level security;
alter table public.media_assets enable row level security;
alter table public.listing_attribute_values enable row level security;

create policy "Profiles are editable by their owners" on public.profiles
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Listings visible when published" on public.listings
  for select using (status = 'published');

create policy "Agencies manage own listings" on public.listings
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "Agencies manage their locations" on public.locations
  using (auth.uid() = (select profile_id from public.listings where id = listing_id))
  with check (auth.uid() = (select profile_id from public.listings where id = listing_id));

create policy "Agencies manage media" on public.media_assets
  using (auth.uid() = (select profile_id from public.listings where id = listing_id))
  with check (auth.uid() = (select profile_id from public.listings where id = listing_id));

create policy "Agencies manage attributes" on public.listing_attribute_values
  using (auth.uid() = (select profile_id from public.listings where id = listing_id))
  with check (auth.uid() = (select profile_id from public.listings where id = listing_id));

-- Helper function to refresh materialized view
create or replace function public.refresh_listing_search_index()
returns void as $$
begin
  refresh materialized view concurrently public.listing_search_index;
end;
$$ language plpgsql security definer;
