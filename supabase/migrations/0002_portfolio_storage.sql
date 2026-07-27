-- Storage bucket for the public portfolio. Public read (the marketing site
-- renders published album photos directly from storage URLs); writes are
-- restricted to the authenticated photographer.

insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

create policy "portfolio bucket: public can read"
  on storage.objects for select
  to public
  using (bucket_id = 'portfolio');

create policy "portfolio bucket: authenticated can insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'portfolio');

create policy "portfolio bucket: authenticated can update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'portfolio')
  with check (bucket_id = 'portfolio');

create policy "portfolio bucket: authenticated can delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'portfolio');
