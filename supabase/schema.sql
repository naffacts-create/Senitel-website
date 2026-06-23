-- Sentinel schema. Paste into Supabase Studio > SQL Editor > Run.
-- Safe to re-run: drops are guarded by "if exists".

-- ---------------------------------------------------------------------------
-- profiles : 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  email              text not null,
  plan               text not null default 'free',   -- 'free' | 'pro'
  stripe_customer_id text,
  created_at         timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- sites : many per user (denormalized latest snapshot for fast reads)
-- ---------------------------------------------------------------------------
create table if not exists sites (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references profiles(id) on delete cascade,
  url                text not null,
  name               text,
  last_checked_at    timestamptz,
  is_up              boolean,
  status_code        int,
  response_ms        int,
  ssl_expires_at     timestamptz,
  domain_expires_at  timestamptz,
  last_error         text,
  created_at         timestamptz not null default now(),
  constraint unique_user_site unique(user_id, url)
);
create index if not exists sites_user_id_idx on sites (user_id);

-- ---------------------------------------------------------------------------
-- checks : append-only history (powers future charts)
-- ---------------------------------------------------------------------------
create table if not exists checks (
  id                 uuid primary key default gen_random_uuid(),
  site_id            uuid not null references sites(id) on delete cascade,
  checked_at         timestamptz not null default now(),
  is_up              boolean,
  status_code        int,
  response_ms        int,
  ssl_expires_at     timestamptz,
  domain_expires_at  timestamptz,
  error              text
);
create index if not exists checks_site_id_idx on checks (site_id, checked_at desc);

-- ---------------------------------------------------------------------------
-- alerts : dedupe so we email once per issue per cooldown window
-- ---------------------------------------------------------------------------
create table if not exists alerts (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references sites(id) on delete cascade,
  type        text not null,            -- 'down' | 'ssl_expiring' | 'domain_expiring'
  message     text not null,
  sent_at     timestamptz not null default now()
);
create index if not exists alerts_site_type_idx on alerts (site_id, type, sent_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table sites    enable row level security;
alter table checks   enable row level security;
alter table alerts   enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for select using (auth.uid() = id);

drop policy if exists "own sites" on sites;
create policy "own sites" on sites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- checks/alerts are readable only for sites the user owns.
drop policy if exists "own checks" on checks;
create policy "own checks" on checks
  for select using (
    exists (select 1 from sites s where s.id = checks.site_id and s.user_id = auth.uid())
  );

drop policy if exists "own alerts" on alerts;
create policy "own alerts" on alerts
  for select using (
    exists (select 1 from sites s where s.id = alerts.site_id and s.user_id = auth.uid())
  );

-- Note: the cron sweep and Stripe webhook use the service-role key, which
-- bypasses RLS entirely — no write policies are needed for them.
