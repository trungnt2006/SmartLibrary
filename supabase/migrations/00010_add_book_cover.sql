-- Add cover_url column to books for book cover images
alter table public.books
add column if not exists cover_url text;

-- Storage policies for book-covers bucket
-- Note: The 'book-covers' bucket must be created manually in Supabase Dashboard (Public bucket)

create policy "Users can upload book covers"
on storage.objects for insert
to authenticated
with check (bucket_id = 'book-covers');

create policy "Users can update book covers"
on storage.objects for update
to authenticated
using (bucket_id = 'book-covers');

create policy "Anyone can view book covers"
on storage.objects for select
to public
using (bucket_id = 'book-covers');

create policy "Users can delete book covers"
on storage.objects for delete
to authenticated
using (bucket_id = 'book-covers');
