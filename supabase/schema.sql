-- Run once in the Supabase SQL editor. Server credentials stay on the server.
create table if not exists public.invitations (
 id uuid primary key default gen_random_uuid(),
 token text not null unique check (token ~ '^[a-f0-9]{64}$'),
 name text not null check (char_length(name) between 1 and 120),
 max_party integer not null default 2 check (max_party between 1 and 10),
 style text not null default 'glass' check (style in ('glass','clay','neu')),
 attending boolean,
 party_size integer,
 message text not null default '' check (char_length(message) <= 1000),
 created_at timestamptz not null default now(),
 responded_at timestamptz,
 constraint response_valid check (
  (attending is null and party_size is null and responded_at is null)
  or (attending = true and party_size between 1 and max_party and responded_at is not null)
  or (attending = false and party_size = 0 and responded_at is not null)
 )
);
alter table public.invitations enable row level security;
revoke all on public.invitations from anon, authenticated;
grant select, insert, update on public.invitations to service_role;
-- Deliberately no browser policies. Only the server's service-role can access records.
