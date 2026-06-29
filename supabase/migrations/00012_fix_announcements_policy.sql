-- Fix RLS policy for announcements: profiles.id != auth.uid(), use auth_user_id instead
drop policy if exists "Admin full access on announcements" on public.announcements;

create policy "Admin full access on announcements"
on public.announcements for all
to authenticated
using (exists (select 1 from public.profiles where auth_user_id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where auth_user_id = auth.uid() and role = 'admin'));
