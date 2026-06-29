-- Create announcements table for landing page ticker
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.announcements enable row level security;

-- Policies: admins can do everything, librarians can view, everyone can view active
create policy "Admin full access on announcements"
on public.announcements for all
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Anyone can view active announcements"
on public.announcements for select
to public
using (status = 'active');
