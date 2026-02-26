-- Migration: Create intake_tokens table for pre-fill intake links
-- Allows providers to generate a tokenized URL from a client's detail page.
-- When a parent opens the link the form is pre-populated with existing data.

create table if not exists intake_tokens (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  token       text not null unique,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- Index for fast token lookups
create index if not exists idx_intake_tokens_token on intake_tokens(token);

-- Index for listing tokens by client
create index if not exists idx_intake_tokens_client_id on intake_tokens(client_id);

-- RLS
alter table intake_tokens enable row level security;

-- Providers can manage tokens for their own clients
create policy "Providers can manage own intake tokens"
  on intake_tokens
  for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Public read for token validation (anonymous users opening the pre-fill link)
create policy "Anyone can read tokens for validation"
  on intake_tokens
  for select
  using (true);
