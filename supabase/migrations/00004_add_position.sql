-- Add position column to profiles
alter table public.profiles
add column if not exists position text;
