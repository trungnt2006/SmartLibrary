-- ============================================================
-- SMART LIBRARY - Database Schema
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES (mở rộng từ auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'librarian', 'reader')) default 'reader',
  full_name text not null,
  email text not null unique,
  phone text,
  date_of_birth date,
  address text,
  status text not null check (status in ('active', 'inactive', 'locked')) default 'active',
  card_issued_at timestamptz,
  card_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on public.profiles(role);
create index idx_profiles_status on public.profiles(status);

-- ============================================================
-- LIBRARY RULES
-- ============================================================
create table public.library_rules (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null,
  value_type text not null check (value_type in ('number', 'string', 'boolean')) default 'string',
  description text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

-- Seed default rules
insert into public.library_rules (key, value, value_type, description) values
  ('membership_duration_months', '6', 'number', 'Thời hạn thẻ độc giả (tháng)'),
  ('max_borrow_books', '5', 'number', 'Số sách tối đa được mượn'),
  ('max_borrow_days', '14', 'number', 'Số ngày mượn tối đa'),
  ('fine_per_day_overdue', '5000', 'number', 'Phạt quá hạn mỗi ngày (VNĐ)'),
  ('min_reader_age', '15', 'number', 'Tuổi độc giả tối thiểu'),
  ('request_expiry_days', '3', 'number', 'Số ngày mã mượn/trả còn hiệu lực'),
  ('book_compensation_coefficient', '2', 'number', 'Hệ số đền bù khi mất sách (giá sách × hệ số)'),
  ('damaged_compensation_percent', '50', 'number', 'Phần trăm giá sách bồi thường khi hư hỏng (%)');

-- ============================================================
-- CATEGORIES
-- ============================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  status text not null check (status in ('active', 'inactive')) default 'active',
  created_at timestamptz not null default now()
);

-- ============================================================
-- BOOKS
-- ============================================================
create table public.books (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  title text not null,
  author text not null,
  publisher text,
  publication_year integer,
  description text,
  status text not null check (status in ('active', 'inactive')) default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_books_title on public.books using gin(to_tsvector('simple', title));
create index idx_books_author on public.books(author);
create index idx_books_category on public.books(category_id);

-- ============================================================
-- BOOK COPIES
-- ============================================================
create table public.book_copies (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id),
  barcode text not null unique,
  status text not null check (status in ('available', 'borrowing', 'reserved', 'damaged', 'lost', 'inactive')) default 'available',
  price numeric(12,0),
  shelf_location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_book_copies_barcode on public.book_copies(barcode);
create index idx_book_copies_status on public.book_copies(status);

-- ============================================================
-- BORROW REQUESTS (online)
-- ============================================================
create table public.borrow_requests (
  id uuid primary key default gen_random_uuid(),
  reader_id uuid not null references public.profiles(id),
  status text not null check (status in ('pending', 'approved', 'rejected', 'completed', 'expired', 'cancelled')) default 'pending',
  borrow_code text unique,
  qr_payload text,
  requested_at timestamptz not null default now(),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  rejected_by uuid references public.profiles(id),
  rejected_at timestamptz,
  rejection_reason text,
  completed_by uuid references public.profiles(id),
  completed_at timestamptz,
  expires_at timestamptz
);

create index idx_borrow_requests_status on public.borrow_requests(status);
create index idx_borrow_requests_reader on public.borrow_requests(reader_id);

create table public.borrow_request_details (
  id uuid primary key default gen_random_uuid(),
  borrow_request_id uuid not null references public.borrow_requests(id) on delete cascade,
  book_id uuid not null references public.books(id),
  book_copy_id uuid references public.book_copies(id),
  status text not null check (status in ('pending', 'approved', 'rejected', 'completed', 'expired', 'cancelled')) default 'pending'
);

-- ============================================================
-- RETURN REQUESTS (online)
-- ============================================================
create table public.return_requests (
  id uuid primary key default gen_random_uuid(),
  reader_id uuid not null references public.profiles(id),
  borrow_record_id uuid not null,
  status text not null check (status in ('pending', 'approved', 'rejected', 'completed', 'expired', 'cancelled')) default 'pending',
  return_code text unique,
  qr_payload text,
  requested_at timestamptz not null default now(),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  rejected_by uuid references public.profiles(id),
  rejected_at timestamptz,
  rejection_reason text,
  completed_by uuid references public.profiles(id),
  completed_at timestamptz,
  expires_at timestamptz
);

create index idx_return_requests_status on public.return_requests(status);
create index idx_return_requests_reader on public.return_requests(reader_id);

create table public.return_request_details (
  id uuid primary key default gen_random_uuid(),
  return_request_id uuid not null references public.return_requests(id) on delete cascade,
  borrow_detail_id uuid not null,
  book_copy_id uuid not null references public.book_copies(id),
  status text not null check (status in ('pending', 'approved', 'rejected', 'completed', 'expired', 'cancelled')) default 'pending'
);

-- ============================================================
-- RENEWAL REQUESTS
-- ============================================================
create table public.renewal_requests (
  id uuid primary key default gen_random_uuid(),
  reader_id uuid not null references public.profiles(id),
  borrow_record_id uuid not null,
  borrow_detail_id uuid not null,
  status text not null check (status in ('pending', 'approved', 'rejected', 'cancelled')) default 'pending',
  requested_at timestamptz not null default now(),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  rejected_by uuid references public.profiles(id),
  rejected_at timestamptz,
  rejection_reason text,
  old_due_date date not null,
  new_due_date date
);

create index idx_renewal_requests_status on public.renewal_requests(status);

-- ============================================================
-- BORROW RECORDS (chính thức)
-- ============================================================
create table public.borrow_records (
  id uuid primary key default gen_random_uuid(),
  reader_id uuid not null references public.profiles(id),
  librarian_id uuid not null references public.profiles(id),
  borrow_date date not null default current_date,
  due_date date not null,
  status text not null check (status in ('active', 'returned', 'overdue')) default 'active',
  source text not null check (source in ('counter', 'online')) default 'counter',
  created_from_request_id uuid references public.borrow_requests(id),
  created_at timestamptz not null default now()
);

create index idx_borrow_records_reader on public.borrow_records(reader_id);
create index idx_borrow_records_status on public.borrow_records(status);

create table public.borrow_details (
  id uuid primary key default gen_random_uuid(),
  borrow_record_id uuid not null references public.borrow_records(id) on delete cascade,
  book_copy_id uuid not null references public.book_copies(id),
  due_date date not null,
  return_date date,
  status text not null check (status in ('active', 'returned', 'overdue')) default 'active',
  renewal_count integer not null default 0
);

-- ============================================================
-- FINE TICKETS
-- ============================================================
create table public.fine_tickets (
  id uuid primary key default gen_random_uuid(),
  reader_id uuid not null references public.profiles(id),
  borrow_detail_id uuid references public.borrow_details(id),
  book_copy_id uuid references public.book_copies(id),
  reason text not null,
  amount numeric(12,0) not null,
  status text not null check (status in ('unpaid', 'paid', 'cancelled')) default 'unpaid',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index idx_fine_tickets_reader on public.fine_tickets(reader_id);
create index idx_fine_tickets_status on public.fine_tickets(status);

-- ============================================================
-- PAYMENT TRANSACTIONS
-- ============================================================
create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  fine_ticket_id uuid not null references public.fine_tickets(id),
  amount numeric(12,0) not null,
  payment_method text not null check (payment_method in ('cash', 'vnpay', 'momo')) default 'cash',
  status text not null check (status in ('pending', 'success', 'failed')) default 'pending',
  paid_by uuid references public.profiles(id),
  received_by uuid references public.profiles(id),
  transaction_ref text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INVENTORY RECEIPTS
-- ============================================================
create table public.inventory_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_code text not null unique,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  note text
);

create table public.inventory_receipt_details (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.inventory_receipts(id) on delete cascade,
  book_id uuid not null references public.books(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,0)
);

-- ============================================================
-- INVENTORY AUDITS
-- ============================================================
create table public.inventory_audits (
  id uuid primary key default gen_random_uuid(),
  audit_code text not null unique,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  status text not null check (status in ('in_progress', 'completed')) default 'in_progress',
  note text
);

create table public.inventory_audit_details (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.inventory_audits(id) on delete cascade,
  book_copy_id uuid not null references public.book_copies(id),
  expected_status text not null check (expected_status in ('available', 'borrowing', 'reserved', 'damaged', 'lost', 'inactive')),
  actual_status text check (actual_status in ('available', 'borrowing', 'reserved', 'damaged', 'lost', 'inactive')),
  note text
);

-- ============================================================
-- AUTO UPDATE updated_at
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger handle_books_updated_at
  before update on public.books
  for each row execute function public.handle_updated_at();

create trigger handle_book_copies_updated_at
  before update on public.book_copies
  for each row execute function public.handle_updated_at();

-- ============================================================
-- AUTO CREATE PROFILE AFTER SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (auth_user_id, role, full_name, email, status)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::text, 'reader'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    'active'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper: get current user role
create or replace function public.current_user_role()
returns text as $$
  select role from public.profiles where auth_user_id = auth.uid();
$$ language sql stable security definer;

-- PROFILES
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth_user_id = auth.uid());

create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.current_user_role() = 'admin');

create policy "Librarians can view readers and librarians"
  on public.profiles for select
  using (public.current_user_role() = 'librarian' and (role in ('reader', 'librarian')));

create policy "Admins can insert librarians"
  on public.profiles for insert
  with check (public.current_user_role() = 'admin' and role = 'librarian');

create policy "Librarians can insert readers"
  on public.profiles for insert
  with check (public.current_user_role() = 'librarian' and role = 'reader');

create policy "Admins can update any profile"
  on public.profiles for update
  using (public.current_user_role() = 'admin');

create policy "Librarians can update readers"
  on public.profiles for update
  using (public.current_user_role() = 'librarian' and role = 'reader');

-- LIBRARY RULES
alter table public.library_rules enable row level security;

create policy "Anyone can view rules"
  on public.library_rules for select
  using (true);

create policy "Only admins can manage rules"
  on public.library_rules for insert
  with check (public.current_user_role() = 'admin');

create policy "Only admins can update rules"
  on public.library_rules for update
  using (public.current_user_role() = 'admin');

-- CATEGORIES
alter table public.categories enable row level security;

create policy "Anyone can view categories"
  on public.categories for select
  using (true);

create policy "Librarians can manage categories"
  on public.categories for insert
  with check (public.current_user_role() = 'librarian');

create policy "Librarians can update categories"
  on public.categories for update
  using (public.current_user_role() = 'librarian');

-- BOOKS
alter table public.books enable row level security;

create policy "Anyone can view books"
  on public.books for select
  using (true);

create policy "Librarians can manage books"
  on public.books for insert
  with check (public.current_user_role() = 'librarian');

create policy "Librarians can update books"
  on public.books for update
  using (public.current_user_role() = 'librarian');

-- BOOK COPIES
alter table public.book_copies enable row level security;

create policy "Anyone can view book copies"
  on public.book_copies for select
  using (true);

create policy "Librarians can manage book copies"
  on public.book_copies for insert
  with check (public.current_user_role() = 'librarian');

create policy "Librarians can update book copies"
  on public.book_copies for update
  using (public.current_user_role() = 'librarian');

-- BORROW REQUESTS
alter table public.borrow_requests enable row level security;

create policy "Readers can view own requests"
  on public.borrow_requests for select
  using (reader_id = (select id from public.profiles where auth_user_id = auth.uid()));

create policy "Librarians can view all requests"
  on public.borrow_requests for select
  using (public.current_user_role() = 'librarian');

create policy "Readers can create requests"
  on public.borrow_requests for insert
  with check (reader_id = (select id from public.profiles where auth_user_id = auth.uid()));

create policy "Librarians can update requests"
  on public.borrow_requests for update
  using (public.current_user_role() = 'librarian');

-- BORROW REQUEST DETAILS
alter table public.borrow_request_details enable row level security;

create policy "Users can view their request details"
  on public.borrow_request_details for select
  using (
    exists (
      select 1 from public.borrow_requests br
      join public.profiles p on p.id = br.reader_id
      where br.id = borrow_request_id
      and (p.auth_user_id = auth.uid() or public.current_user_role() = 'librarian')
    )
  );

create policy "Readers can insert request details"
  on public.borrow_request_details for insert
  with check (
    exists (
      select 1 from public.borrow_requests br
      join public.profiles p on p.id = br.reader_id
      where br.id = borrow_request_id and p.auth_user_id = auth.uid()
    )
  );

-- RETURN REQUESTS
alter table public.return_requests enable row level security;

create policy "Readers can view own return requests"
  on public.return_requests for select
  using (reader_id = (select id from public.profiles where auth_user_id = auth.uid()));

create policy "Librarians can view all return requests"
  on public.return_requests for select
  using (public.current_user_role() = 'librarian');

create policy "Readers can create return requests"
  on public.return_requests for insert
  with check (reader_id = (select id from public.profiles where auth_user_id = auth.uid()));

create policy "Librarians can update return requests"
  on public.return_requests for update
  using (public.current_user_role() = 'librarian');

-- RENEWAL REQUESTS
alter table public.renewal_requests enable row level security;

create policy "Readers can view own renewal requests"
  on public.renewal_requests for select
  using (reader_id = (select id from public.profiles where auth_user_id = auth.uid()));

create policy "Librarians can view all renewal requests"
  on public.renewal_requests for select
  using (public.current_user_role() = 'librarian');

create policy "Readers can create renewal requests"
  on public.renewal_requests for insert
  with check (reader_id = (select id from public.profiles where auth_user_id = auth.uid()));

create policy "Librarians can update renewal requests"
  on public.renewal_requests for update
  using (public.current_user_role() = 'librarian');

-- BORROW RECORDS
alter table public.borrow_records enable row level security;

create policy "Readers can view own records"
  on public.borrow_records for select
  using (reader_id = (select id from public.profiles where auth_user_id = auth.uid()));

create policy "Librarians can view all records"
  on public.borrow_records for select
  using (public.current_user_role() = 'librarian');

create policy "Librarians can insert records"
  on public.borrow_records for insert
  with check (public.current_user_role() = 'librarian');

create policy "Librarians can update records"
  on public.borrow_records for update
  using (public.current_user_role() = 'librarian');

-- BORROW DETAILS
alter table public.borrow_details enable row level security;

create policy "Users can view borrow details"
  on public.borrow_details for select
  using (
    exists (
      select 1 from public.borrow_records br
      join public.profiles p on p.id = br.reader_id
      where br.id = borrow_record_id
      and (p.auth_user_id = auth.uid() or public.current_user_role() = 'librarian')
    )
  );

create policy "Librarians can manage borrow details"
  on public.borrow_details for insert
  with check (public.current_user_role() = 'librarian');

create policy "Librarians can update borrow details"
  on public.borrow_details for update
  using (public.current_user_role() = 'librarian');

-- FINE TICKETS
alter table public.fine_tickets enable row level security;

create policy "Readers can view own fines"
  on public.fine_tickets for select
  using (reader_id = (select id from public.profiles where auth_user_id = auth.uid()));

create policy "Librarians can view all fines"
  on public.fine_tickets for select
  using (public.current_user_role() = 'librarian');

create policy "Librarians can manage fines"
  on public.fine_tickets for insert
  with check (public.current_user_role() = 'librarian');

create policy "Librarians can update fines"
  on public.fine_tickets for update
  using (public.current_user_role() = 'librarian');

-- PAYMENT TRANSACTIONS
alter table public.payment_transactions enable row level security;

create policy "Librarians can manage payments"
  on public.payment_transactions for insert
  with check (public.current_user_role() = 'librarian');

create policy "Librarians can view payments"
  on public.payment_transactions for select
  using (public.current_user_role() = 'librarian');

-- INVENTORY RECEIPTS
alter table public.inventory_receipts enable row level security;

create policy "Librarians can manage receipts"
  on public.inventory_receipts for insert
  with check (public.current_user_role() = 'librarian');

create policy "Librarians can view receipts"
  on public.inventory_receipts for select
  using (public.current_user_role() = 'librarian');

-- INVENTORY AUDITS
alter table public.inventory_audits enable row level security;

create policy "Librarians can manage audits"
  on public.inventory_audits for insert
  with check (public.current_user_role() = 'librarian');

create policy "Librarians can view audits"
  on public.inventory_audits for select
  using (public.current_user_role() = 'librarian');
