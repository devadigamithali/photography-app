-- Storage bucket for private client galleries. Unlike `portfolio`, this
-- bucket is NOT public — clients never get a bucket-level read policy.
-- The /gallery/[token] page and /api/selections route handler read photos
-- through the service-role client (src/lib/supabase/admin.ts) after
-- validating the gallery's access_token server-side, generating short-lived
-- signed URLs. Only the authenticated photographer can read/write directly.

insert into storage.buckets (id, name, public)
values ('galleries', 'galleries', false)
on conflict (id) do nothing;

create policy "galleries bucket: authenticated can select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'galleries');

create policy "galleries bucket: authenticated can insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'galleries');

create policy "galleries bucket: authenticated can update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'galleries')
  with check (bucket_id = 'galleries');

create policy "galleries bucket: authenticated can delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'galleries');
