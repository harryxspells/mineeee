-- Happy Birthday — shared storage for one private gift.
-- Run this once in the Supabase SQL editor for your project.
--
-- Security model:
--   * The browser uses the public anon key plus a single Supabase Auth account.
--   * The account password is the gift's private key.
--   * Only that one account can read or write these tables and buckets, even if
--     public sign-ups are enabled in the Supabase project.
--   * Anonymous visitors cannot list or download anything.
--
-- BEFORE RUNNING: replace the placeholder email below with the exact email of
-- the Supabase Auth user you created for this gift. It is not a secret — the
-- password is the gift key.

-- ---------------------------------------------------------------------------
-- The only account allowed to read or write this gift
-- ---------------------------------------------------------------------------
create table if not exists public.gift_access (
  id text primary key check (id = 'gift'),
  email text not null check (position('@' in email) > 1)
);

alter table public.gift_access enable row level security;

insert into public.gift_access (id, email)
values ('gift', 'birthday-gift@example.com')
on conflict (id) do nothing;

-- If you already ran this file, set the real account email with:
--   update public.gift_access set email = 'you@example.com' where id = 'gift';

create or replace function public.birthday_gift_is_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.gift_access
    where lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );
$$;

revoke all on function public.birthday_gift_is_account() from public;
grant execute on function public.birthday_gift_is_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Gift text (one row, id = 'main')
-- ---------------------------------------------------------------------------
create table if not exists public.gift_content (
  id text primary key,
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.gift_content enable row level security;

drop policy if exists "birthday gift content read" on public.gift_content;
create policy "birthday gift content read"
  on public.gift_content for select
  to authenticated
  using (public.birthday_gift_is_account());

drop policy if exists "birthday gift content insert" on public.gift_content;
create policy "birthday gift content insert"
  on public.gift_content for insert
  to authenticated
  with check (public.birthday_gift_is_account());

drop policy if exists "birthday gift content update" on public.gift_content;
create policy "birthday gift content update"
  on public.gift_content for update
  to authenticated
  using (public.birthday_gift_is_account())
  with check (public.birthday_gift_is_account());

-- ---------------------------------------------------------------------------
-- Photo metadata. The image bytes live in the private gift-photos bucket.
-- ---------------------------------------------------------------------------
create table if not exists public.gift_photos (
  id uuid primary key,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

alter table public.gift_photos enable row level security;

drop policy if exists "birthday gift photos read" on public.gift_photos;
create policy "birthday gift photos read"
  on public.gift_photos for select
  to authenticated
  using (public.birthday_gift_is_account());

drop policy if exists "birthday gift photos insert" on public.gift_photos;
create policy "birthday gift photos insert"
  on public.gift_photos for insert
  to authenticated
  with check (public.birthday_gift_is_account());

drop policy if exists "birthday gift photos delete" on public.gift_photos;
create policy "birthday gift photos delete"
  on public.gift_photos for delete
  to authenticated
  using (public.birthday_gift_is_account());

-- ---------------------------------------------------------------------------
-- Soundtrack metadata (one row, id = 'theme')
-- ---------------------------------------------------------------------------
create table if not exists public.gift_audio (
  id text primary key,
  name text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table public.gift_audio enable row level security;

drop policy if exists "birthday gift audio read" on public.gift_audio;
create policy "birthday gift audio read"
  on public.gift_audio for select
  to authenticated
  using (public.birthday_gift_is_account());

drop policy if exists "birthday gift audio insert" on public.gift_audio;
create policy "birthday gift audio insert"
  on public.gift_audio for insert
  to authenticated
  with check (public.birthday_gift_is_account());

drop policy if exists "birthday gift audio update" on public.gift_audio;
create policy "birthday gift audio update"
  on public.gift_audio for update
  to authenticated
  using (public.birthday_gift_is_account())
  with check (public.birthday_gift_is_account());

drop policy if exists "birthday gift audio delete" on public.gift_audio;
create policy "birthday gift audio delete"
  on public.gift_audio for delete
  to authenticated
  using (public.birthday_gift_is_account());

-- ---------------------------------------------------------------------------
-- Private storage buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gift-photos',
  'gift-photos',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gift-audio',
  'gift-audio',
  false,
  20971520,
  array[
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/aac'
  ]::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "birthday gift photos storage read" on storage.objects;
create policy "birthday gift photos storage read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'gift-photos' and public.birthday_gift_is_account());

drop policy if exists "birthday gift photos storage insert" on storage.objects;
create policy "birthday gift photos storage insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'gift-photos' and public.birthday_gift_is_account());

drop policy if exists "birthday gift photos storage delete" on storage.objects;
create policy "birthday gift photos storage delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'gift-photos' and public.birthday_gift_is_account());

drop policy if exists "birthday gift audio storage read" on storage.objects;
create policy "birthday gift audio storage read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'gift-audio' and public.birthday_gift_is_account());

drop policy if exists "birthday gift audio storage insert" on storage.objects;
create policy "birthday gift audio storage insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'gift-audio' and public.birthday_gift_is_account());

drop policy if exists "birthday gift audio storage delete" on storage.objects;
create policy "birthday gift audio storage delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'gift-audio' and public.birthday_gift_is_account());
