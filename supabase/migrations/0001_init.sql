-- Photographer Portfolio + CRM: initial schema
-- Single photographer, real Supabase Auth account (authenticated = the photographer).
-- Clients have no accounts; private galleries are accessed via an app-generated
-- access_token (nanoid, generated in application code, not in SQL).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: singleton row for the photographer
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key default gen_random_uuid(),
  notification_email text not null,
  business_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles: authenticated can select"
  on profiles for select
  to authenticated
  using (true);

create policy "profiles: authenticated can update"
  on profiles for update
  to authenticated
  using (true)
  with check (true);

create policy "profiles: authenticated can insert"
  on profiles for insert
  to authenticated
  with check (true);

-- ---------------------------------------------------------------------------
-- albums / portfolio_photos: public marketing portfolio
-- ---------------------------------------------------------------------------
create table albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table albums enable row level security;

create trigger albums_set_updated_at
  before update on albums
  for each row execute function set_updated_at();

create policy "albums: anon can select published"
  on albums for select
  to anon
  using (is_published = true);

create policy "albums: authenticated can select all"
  on albums for select
  to authenticated
  using (true);

create policy "albums: authenticated can insert"
  on albums for insert
  to authenticated
  with check (true);

create policy "albums: authenticated can update"
  on albums for update
  to authenticated
  using (true)
  with check (true);

create policy "albums: authenticated can delete"
  on albums for delete
  to authenticated
  using (true);

create table portfolio_photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table portfolio_photos enable row level security;

create index portfolio_photos_album_id_idx on portfolio_photos(album_id);

create policy "portfolio_photos: anon can select if album published"
  on portfolio_photos for select
  to anon
  using (
    exists (
      select 1 from albums
      where albums.id = portfolio_photos.album_id
        and albums.is_published = true
    )
  );

create policy "portfolio_photos: authenticated can select all"
  on portfolio_photos for select
  to authenticated
  using (true);

create policy "portfolio_photos: authenticated can insert"
  on portfolio_photos for insert
  to authenticated
  with check (true);

create policy "portfolio_photos: authenticated can update"
  on portfolio_photos for update
  to authenticated
  using (true)
  with check (true);

create policy "portfolio_photos: authenticated can delete"
  on portfolio_photos for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- inquiries: CRM kanban. Anon can insert only (public contact form).
-- ---------------------------------------------------------------------------
create table inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  event_type text,
  event_date date,
  message text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'booked', 'completed', 'archived')),
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table inquiries enable row level security;

create trigger inquiries_set_updated_at
  before update on inquiries
  for each row execute function set_updated_at();

create policy "inquiries: anon can insert"
  on inquiries for insert
  to anon
  with check (true);

create policy "inquiries: authenticated can select"
  on inquiries for select
  to authenticated
  using (true);

create policy "inquiries: authenticated can update"
  on inquiries for update
  to authenticated
  using (true)
  with check (true);

create policy "inquiries: authenticated can delete"
  on inquiries for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- bookings: internal calendar, fully authenticated-only
-- ---------------------------------------------------------------------------
create table bookings (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references inquiries(id) on delete set null,
  title text not null,
  event_date date not null,
  start_time time,
  end_time time,
  location text,
  notes text,
  created_at timestamptz not null default now()
);

alter table bookings enable row level security;

create index bookings_event_date_idx on bookings(event_date);

create policy "bookings: authenticated can select"
  on bookings for select
  to authenticated
  using (true);

create policy "bookings: authenticated can insert"
  on bookings for insert
  to authenticated
  with check (true);

create policy "bookings: authenticated can update"
  on bookings for update
  to authenticated
  using (true)
  with check (true);

create policy "bookings: authenticated can delete"
  on bookings for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- galleries / gallery_photos / photo_selections: private client galleries.
-- No anon policies at all — the /gallery/[token] route and /api/selections
-- proxy all access through the service-role client after validating the
-- access_token, is_active, and expires_at server-side.
-- ---------------------------------------------------------------------------
create table galleries (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_email text,
  title text not null,
  access_token text not null unique,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table galleries enable row level security;

create index galleries_access_token_idx on galleries(access_token);

create policy "galleries: authenticated can select"
  on galleries for select
  to authenticated
  using (true);

create policy "galleries: authenticated can insert"
  on galleries for insert
  to authenticated
  with check (true);

create policy "galleries: authenticated can update"
  on galleries for update
  to authenticated
  using (true)
  with check (true);

create policy "galleries: authenticated can delete"
  on galleries for delete
  to authenticated
  using (true);

create table gallery_photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references galleries(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table gallery_photos enable row level security;

create index gallery_photos_gallery_id_idx on gallery_photos(gallery_id);

create policy "gallery_photos: authenticated can select"
  on gallery_photos for select
  to authenticated
  using (true);

create policy "gallery_photos: authenticated can insert"
  on gallery_photos for insert
  to authenticated
  with check (true);

create policy "gallery_photos: authenticated can update"
  on gallery_photos for update
  to authenticated
  using (true)
  with check (true);

create policy "gallery_photos: authenticated can delete"
  on gallery_photos for delete
  to authenticated
  using (true);

create table photo_selections (
  id uuid primary key default gen_random_uuid(),
  gallery_photo_id uuid not null unique references gallery_photos(id) on delete cascade,
  gallery_id uuid not null references galleries(id) on delete cascade,
  is_selected boolean not null default false,
  quantity integer not null default 1,
  print_size text,
  client_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table photo_selections enable row level security;

create index photo_selections_gallery_id_idx on photo_selections(gallery_id);

create trigger photo_selections_set_updated_at
  before update on photo_selections
  for each row execute function set_updated_at();

create policy "photo_selections: authenticated can select"
  on photo_selections for select
  to authenticated
  using (true);

create policy "photo_selections: authenticated can insert"
  on photo_selections for insert
  to authenticated
  with check (true);

create policy "photo_selections: authenticated can update"
  on photo_selections for update
  to authenticated
  using (true)
  with check (true);

create policy "photo_selections: authenticated can delete"
  on photo_selections for delete
  to authenticated
  using (true);

-- Note: there are intentionally NO `anon` policies on galleries,
-- gallery_photos, or photo_selections. The /gallery/[token] page and the
-- /api/selections route handler use the service-role client
-- (src/lib/supabase/admin.ts) to read/write these tables after validating
-- the access_token in application code, bypassing RLS by design.
