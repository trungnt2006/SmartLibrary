-- Add note to borrow_requests
alter table public.borrow_requests
add column if not exists note text;

-- Add quantity to borrow_request_details
alter table public.borrow_request_details
add column if not exists quantity integer not null default 1;
