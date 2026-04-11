-- Create client_notes table for provider-internal session/progress notes
create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category text not null default 'general' check (category in ('session', 'call', 'admin', 'clinical', 'general')),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_client_notes_client_id on public.client_notes(client_id);
create index idx_client_notes_created_at on public.client_notes(client_id, created_at desc);

alter table public.client_notes enable row level security;

create policy "Users can manage notes for their clients"
  on public.client_notes
  for all
  using (
    profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
  )
  with check (
    profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
  );
