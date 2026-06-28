-- Add avatar_url column to profiles
alter table public.profiles
add column if not exists avatar_url text;
