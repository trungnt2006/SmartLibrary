-- Add missing RLS policies for inventory_audits

create policy "Librarians can update audits"
  on public.inventory_audits for update
  using (public.current_user_role() = 'librarian');
