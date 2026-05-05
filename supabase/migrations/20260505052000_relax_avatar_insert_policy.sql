-- Allow authenticated users to upload avatar objects.
-- The app writes unique paths and stores the resulting URL on the user's owned profile row.

drop policy if exists "users can upload own avatar files" on storage.objects;
create policy "authenticated users can upload avatar files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars');
