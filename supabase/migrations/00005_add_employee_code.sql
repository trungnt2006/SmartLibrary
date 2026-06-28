-- Add employee_code column to profiles
alter table public.profiles
add column if not exists employee_code text;

-- Auto-generate employee_code for existing librarians where null
update public.profiles
set employee_code = 'LIB-' || upper(substr(md5(id::text), 1, 6))
where role = 'librarian' and employee_code is null;

-- Add unique constraint
alter table public.profiles
add constraint profiles_employee_code_key unique (employee_code);
