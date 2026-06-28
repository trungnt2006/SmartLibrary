-- Remove max_reader_age rule
delete from public.library_rules where key = 'max_reader_age';

-- Add book_compensation_coefficient rule
insert into public.library_rules (key, value, value_type, description)
values ('book_compensation_coefficient', '2', 'number', 'Hệ số đền bù khi mất sách (giá sách × hệ số)')
on conflict (key) do nothing;
