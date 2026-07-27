-- The original schema only granted `anon` insert on `inquiries` (for the
-- public contact form). The admin "+ Add inquiry" button inserts as the
-- authenticated photographer, which had no matching policy.

create policy "inquiries: authenticated can insert"
  on inquiries for insert
  to authenticated
  with check (true);
