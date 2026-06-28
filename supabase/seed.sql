-- ============================================================
-- SMART LIBRARY - DỮ LIỆU MẪU
-- ============================================================

-- Xoá dữ liệu cũ (giữ lại profiles đã có)
delete from public.inventory_audit_details;
delete from public.inventory_audits;
delete from public.inventory_receipt_details;
delete from public.inventory_receipts;
delete from public.payment_transactions;
delete from public.fine_tickets;
delete from public.borrow_details;
delete from public.borrow_records;
delete from public.renewal_requests;
delete from public.return_request_details;
delete from public.return_requests;
delete from public.borrow_request_details;
delete from public.borrow_requests;
delete from public.book_copies;
delete from public.books;
delete from public.categories;

-- ============================================================
-- 1. TẠO PROFILE CHO USER (nếu chưa có)
-- ============================================================
-- User đã tạo trong Auth bằng email/password: 123456
insert into public.profiles (auth_user_id, role, full_name, email, status, card_issued_at, card_expires_at)
select au.id, 'admin', 'Admin Smart Library', 'admin@smartlib.vn', 'active', now(), now() + interval '5 years'
from auth.users au where au.email = 'admin@smartlib.vn'
and not exists (select 1 from public.profiles p where p.auth_user_id = au.id);

insert into public.profiles (auth_user_id, role, full_name, email, status, card_issued_at, card_expires_at)
select au.id, 'librarian', 'Nguyễn Thị Thư Viện', 'librarian1@smartlib.vn', 'active', now(), now() + interval '5 years'
from auth.users au where au.email = 'librarian1@smartlib.vn'
and not exists (select 1 from public.profiles p where p.auth_user_id = au.id);

insert into public.profiles (auth_user_id, role, full_name, email, status, card_issued_at, card_expires_at)
select au.id, 'librarian', 'Trần Văn Sách', 'librarian2@smartlib.vn', 'active', now(), now() + interval '5 years'
from auth.users au where au.email = 'librarian2@smartlib.vn'
and not exists (select 1 from public.profiles p where p.auth_user_id = au.id);

insert into public.profiles (auth_user_id, role, full_name, email, status, card_issued_at, card_expires_at)
select au.id, 'reader', 'Lê Văn Độc Giả', 'reader1@smartlib.vn', 'active', now() - interval '30 days', now() + interval '5 months'
from auth.users au where au.email = 'reader1@smartlib.vn'
and not exists (select 1 from public.profiles p where p.auth_user_id = au.id);

insert into public.profiles (auth_user_id, role, full_name, email, status, card_issued_at, card_expires_at)
select au.id, 'reader', 'Phạm Thị Bạn Đọc', 'reader2@smartlib.vn', 'active', now() - interval '15 days', now() + interval '5 months 15 days'
from auth.users au where au.email = 'reader2@smartlib.vn'
and not exists (select 1 from public.profiles p where p.auth_user_id = au.id);

insert into public.profiles (auth_user_id, role, full_name, email, status, card_issued_at, card_expires_at)
select au.id, 'reader', 'Hoàng Văn Mượn Sách', 'reader3@smartlib.vn', 'locked', now() - interval '60 days', now() + interval '4 months'
from auth.users au where au.email = 'reader3@smartlib.vn'
and not exists (select 1 from public.profiles p where p.auth_user_id = au.id);

-- ============================================================
-- 2. DANH MỤC SÁCH
-- ============================================================
insert into public.categories (id, name, description) values
  ('a0000000-0000-0000-0000-000000000001', 'Văn học Việt Nam', 'Tác phẩm văn học của các tác giả Việt Nam'),
  ('a0000000-0000-0000-0000-000000000002', 'Văn học nước ngoài', 'Tác phẩm văn học dịch từ nước ngoài'),
  ('a0000000-0000-0000-0000-000000000003', 'Khoa học - Kỹ thuật', 'Sách về khoa học tự nhiên, kỹ thuật, công nghệ'),
  ('a0000000-0000-0000-0000-000000000004', 'Kinh tế - Quản trị', 'Sách về kinh tế, quản trị kinh doanh, khởi nghiệp'),
  ('a0000000-0000-0000-0000-000000000005', 'Lịch sử - Địa lý', 'Sách về lịch sử, địa lý trong nước và thế giới'),
  ('a0000000-0000-0000-0000-000000000006', 'Tâm lý - Kỹ năng sống', 'Sách về tâm lý học, phát triển bản thân, kỹ năng mềm'),
  ('a0000000-0000-0000-0000-000000000007', 'Thiếu nhi', 'Sách dành cho thiếu nhi và tuổi mới lớn'),
  ('a0000000-0000-0000-0000-000000000008', 'Giáo trình - Học thuật', 'Giáo trình đại học, tài liệu học thuật chuyên ngành');

-- ============================================================
-- 3. ĐẦU SÁCH
-- ============================================================
insert into public.books (id, category_id, title, author, publisher, publication_year, description) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Tắt đèn', 'Ngô Tất Tố', 'NXB Văn học', 1939, 'Tiểu thuyết tiêu biểu của dòng văn học hiện thực phê phán Việt Nam'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Số đỏ', 'Vũ Trọng Phụng', 'NXB Văn học', 1936, 'Tác phẩm trào phúng xuất sắc của văn học Việt Nam'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Chí Phèo', 'Nam Cao', 'NXB Văn học', 1941, 'Truyện ngắn kinh điển về người nông dân trước Cách mạng'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Những ngày thơ ấu', 'Nguyên Hồng', 'NXB Văn học', 1938, 'Hồi ký tự truyện đầy xúc động'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Vợ nhặt', 'Kim Lân', 'NXB Văn học', 1962, 'Truyện ngắn xuất sắc về tình người trong nạn đói 1945'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'Nhà giả kim', 'Paulo Coelho', 'NXB Văn hóa', 1988, 'Hành trình đi tìm kho báu và ý nghĩa cuộc sống'),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 'Trăm năm cô đơn', 'Gabriel García Márquez', 'NXB Văn học', 1967, 'Tiểu thuyết kỳ ảo nổi tiếng của văn học Mỹ Latinh'),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', 'Cuốn theo chiều gió', 'Margaret Mitchell', 'NXB Tổng hợp', 1936, 'Tiểu thuyết tình yêu trong bối cảnh nội chiến Mỹ'),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002', 'Ông già và biển cả', 'Ernest Hemingway', 'NXB Văn học', 1952, 'Kiệt tác về ý chí con người'),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000002', 'Hoàng tử bé', 'Antoine de Saint-Exupéry', 'NXB Hội Nhà văn', 1943, 'Tác phẩm văn học thiếu nhi nổi tiếng thế giới'),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000003', 'Vũ trụ trong vỏ hạt dẻ', 'Stephen Hawking', 'NXB Trẻ', 2001, 'Khám phá những bí ẩn của vũ trụ'),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000003', 'Lược sử thời gian', 'Stephen Hawking', 'NXB Trẻ', 1988, 'Tổng quan về vũ trụ học cho đại chúng'),
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000003', 'Hóa học hữu cơ', 'PGS.TS Nguyễn Đình Triệu', 'NXB Giáo dục', 2020, 'Giáo trình hóa học hữu cơ đại cương'),
  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000003', 'Giáo trình Cấu trúc dữ liệu và Giải thuật', 'PGS.TS Đỗ Xuân Lôi', 'NXB Đại học Quốc gia', 2019, 'Giáo trình cơ bản cho sinh viên CNTT'),
  ('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000003', 'Trí tuệ nhân tạo', 'Stuart Russell', 'NXB Khoa học', 2021, 'Giới thiệu toàn diện về AI'),
  ('b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000004', 'Kinh tế học', 'Paul Samuelson', 'NXB Tổng hợp', 2018, 'Giáo trình kinh tế học căn bản'),
  ('b0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000004', 'Từ tốt đến vĩ đại', 'Jim Collins', 'NXB Trẻ', 2001, 'Nghiên cứu về các công ty vươn lên dẫn đầu'),
  ('b0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000004', 'Khởi nghiệp tinh gọn', 'Eric Ries', 'NXB Thế giới', 2011, 'Phương pháp khởi nghiệp hiện đại'),
  ('b0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000005', 'Đại Việt sử ký toàn thư', 'Ngô Sĩ Liên', 'NXB Khoa học Xã hội', 1697, 'Bộ chính sử lớn nhất của Việt Nam thời phong kiến'),
  ('b0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000005', 'Việt Nam sử lược', 'Trần Trọng Kim', 'NXB Tổng hợp', 1920, 'Lịch sử Việt Nam viết bằng chữ quốc ngữ đầu tiên'),
  ('b0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000006', 'Đắc nhân tâm', 'Dale Carnegie', 'NXB Tổng hợp', 1936, 'Nghệ thuật ứng xử và giao tiếp'),
  ('b0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000006', 'Tuổi trẻ đáng giá bao nhiêu', 'Rosie Nguyễn', 'NXB Hội Nhà văn', 2017, 'Sách truyền cảm hứng cho giới trẻ'),
  ('b0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000006', '7 thói quen của người thành đạt', 'Stephen Covey', 'NXB Tổng hợp', 1989, 'Phát triển bản thân toàn diện'),
  ('b0000000-0000-0000-0000-000000000024', 'a0000000-0000-0000-0000-000000000007', 'Dế Mèn phiêu lưu ký', 'Tô Hoài', 'NXB Kim Đồng', 1941, 'Truyện thiếu nhi kinh điển'),
  ('b0000000-0000-0000-0000-000000000025', 'a0000000-0000-0000-0000-000000000007', 'Kính vạn hoa', 'Nguyễn Nhật Ánh', 'NXB Kim Đồng', 1995, 'Bộ truyện dài 9 tập về tuổi học trò'),
  ('b0000000-0000-0000-0000-000000000026', 'a0000000-0000-0000-0000-000000000007', 'Cho tôi xin một vé đi tuổi thơ', 'Nguyễn Nhật Ánh', 'NXB Trẻ', 2008, 'Truyện dài về tuổi thơ'),
  ('b0000000-0000-0000-0000-000000000027', 'a0000000-0000-0000-0000-000000000008', 'Giáo trình Toán cao cấp - Tập 1', 'PGS.TS Nguyễn Đình Trí', 'NXB Giáo dục', 2020, 'Giáo trình toán cao cấp cho sinh viên đại học'),
  ('b0000000-0000-0000-0000-000000000028', 'a0000000-0000-0000-0000-000000000008', 'Giáo trình Vật lý đại cương', 'PGS.TS Lương Duyên Bình', 'NXB Giáo dục', 2019, 'Giáo trình vật lý cho sinh viên khối kỹ thuật'),
  ('b0000000-0000-0000-0000-000000000029', 'a0000000-0000-0000-0000-000000000008', 'Giáo trình Tiếng Anh chuyên ngành', 'TS. Nguyễn Thị Mai', 'NXB Đại học Quốc gia', 2021, 'Giáo trình tiếng Anh học thuật'),
  ('b0000000-0000-0000-0000-000000000030', 'a0000000-0000-0000-0000-000000000003', 'Python cơ bản', 'Lê Mạnh Hùng', 'NXB Thanh niên', 2022, 'Học lập trình Python từ cơ bản đến nâng cao');

-- ============================================================
-- 4. BẢN SAO SÁCH
-- ============================================================
insert into public.book_copies (id, book_id, barcode, status, price, shelf_location) values
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'BOOK-2026-000001', 'available', 85000, 'A1-01'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'BOOK-2026-000002', 'available', 85000, 'A1-01'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'BOOK-2026-000003', 'borrowing', 85000, 'A1-01'),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'BOOK-2026-000004', 'damaged', 85000, 'A1-01'),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'BOOK-2026-000005', 'available', 85000, 'A1-01'),
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'BOOK-2026-000006', 'available', 72000, 'A1-02'),
  ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000002', 'BOOK-2026-000007', 'borrowing', 72000, 'A1-02'),
  ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000002', 'BOOK-2026-000008', 'available', 72000, 'A1-02'),
  ('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000003', 'BOOK-2026-000009', 'available', 65000, 'A1-03'),
  ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000003', 'BOOK-2026-000010', 'available', 65000, 'A1-03'),
  ('c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000003', 'BOOK-2026-000011', 'lost', 65000, 'A1-03'),
  ('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000003', 'BOOK-2026-000012', 'available', 65000, 'A1-03'),
  ('c0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000006', 'BOOK-2026-000013', 'available', 95000, 'B1-01'),
  ('c0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000006', 'BOOK-2026-000014', 'borrowing', 95000, 'B1-01'),
  ('c0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000006', 'BOOK-2026-000015', 'available', 95000, 'B1-01'),
  ('c0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000006', 'BOOK-2026-000016', 'available', 95000, 'B1-01'),
  ('c0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000006', 'BOOK-2026-000017', 'borrowing', 95000, 'B1-01'),
  ('c0000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000010', 'BOOK-2026-000018', 'available', 55000, 'B1-05'),
  ('c0000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000010', 'BOOK-2026-000019', 'available', 55000, 'B1-05'),
  ('c0000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000010', 'BOOK-2026-000020', 'available', 55000, 'B1-05'),
  ('c0000000-0000-0000-0000-000000000021', 'b0000000-0000-0000-0000-000000000010', 'BOOK-2026-000021', 'reserved', 55000, 'B1-05'),
  ('c0000000-0000-0000-0000-000000000022', 'b0000000-0000-0000-0000-000000000011', 'BOOK-2026-000022', 'available', 120000, 'C1-01'),
  ('c0000000-0000-0000-0000-000000000023', 'b0000000-0000-0000-0000-000000000011', 'BOOK-2026-000023', 'available', 120000, 'C1-01'),
  ('c0000000-0000-0000-0000-000000000024', 'b0000000-0000-0000-0000-000000000011', 'BOOK-2026-000024', 'borrowing', 120000, 'C1-01'),
  ('c0000000-0000-0000-0000-000000000025', 'b0000000-0000-0000-0000-000000000021', 'BOOK-2026-000025', 'available', 78000, 'D1-01'),
  ('c0000000-0000-0000-0000-000000000026', 'b0000000-0000-0000-0000-000000000021', 'BOOK-2026-000026', 'borrowing', 78000, 'D1-01'),
  ('c0000000-0000-0000-0000-000000000027', 'b0000000-0000-0000-0000-000000000021', 'BOOK-2026-000027', 'available', 78000, 'D1-01'),
  ('c0000000-0000-0000-0000-000000000028', 'b0000000-0000-0000-0000-000000000021', 'BOOK-2026-000028', 'available', 78000, 'D1-01'),
  ('c0000000-0000-0000-0000-000000000029', 'b0000000-0000-0000-0000-000000000021', 'BOOK-2026-000029', 'available', 78000, 'D1-01'),
  ('c0000000-0000-0000-0000-000000000030', 'b0000000-0000-0000-0000-000000000024', 'BOOK-2026-000030', 'available', 48000, 'E1-01'),
  ('c0000000-0000-0000-0000-000000000031', 'b0000000-0000-0000-0000-000000000024', 'BOOK-2026-000031', 'available', 48000, 'E1-01'),
  ('c0000000-0000-0000-0000-000000000032', 'b0000000-0000-0000-0000-000000000024', 'BOOK-2026-000032', 'available', 48000, 'E1-01'),
  ('c0000000-0000-0000-0000-000000000033', 'b0000000-0000-0000-0000-000000000024', 'BOOK-2026-000033', 'available', 48000, 'E1-01'),
  ('c0000000-0000-0000-0000-000000000034', 'b0000000-0000-0000-0000-000000000030', 'BOOK-2026-000034', 'available', 115000, 'C2-01'),
  ('c0000000-0000-0000-0000-000000000035', 'b0000000-0000-0000-0000-000000000030', 'BOOK-2026-000035', 'available', 115000, 'C2-01'),
  ('c0000000-0000-0000-0000-000000000036', 'b0000000-0000-0000-0000-000000000030', 'BOOK-2026-000036', 'available', 115000, 'C2-01'),
  ('c0000000-0000-0000-0000-000000000037', 'b0000000-0000-0000-0000-000000000015', 'BOOK-2026-000037', 'available', 180000, 'C2-03'),
  ('c0000000-0000-0000-0000-000000000038', 'b0000000-0000-0000-0000-000000000015', 'BOOK-2026-000038', 'available', 180000, 'C2-03');

-- ============================================================
-- 5. DỮ LIỆU NGHIỆP VỤ MẪU
-- ============================================================
do $$
declare
  v_lib1_id uuid;
  v_reader1_id uuid;
  v_reader2_id uuid;
begin
  select id into v_lib1_id from public.profiles where email = 'librarian1@smartlib.vn';
  select id into v_reader1_id from public.profiles where email = 'reader1@smartlib.vn';
  select id into v_reader2_id from public.profiles where email = 'reader2@smartlib.vn';

  if v_lib1_id is not null and v_reader1_id is not null and v_reader2_id is not null then
    -- Phiếu mượn
    insert into public.borrow_records (id, reader_id, librarian_id, borrow_date, due_date, status, source) values
      ('d0000000-0000-0000-0000-000000000001', v_reader1_id, v_lib1_id, current_date - 10, current_date + 4, 'active', 'counter'),
      ('d0000000-0000-0000-0000-000000000002', v_reader1_id, v_lib1_id, current_date - 20, current_date - 6, 'overdue', 'counter'),
      ('d0000000-0000-0000-0000-000000000003', v_reader2_id, v_lib1_id, current_date - 30, current_date - 16, 'returned', 'counter');

    insert into public.borrow_details (borrow_record_id, book_copy_id, due_date, status, renewal_count) values
      ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', current_date + 4, 'active', 0),
      ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000014', current_date + 4, 'active', 0),
      ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000007', current_date - 6, 'overdue', 1),
      ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000026', current_date - 16, 'returned', 0);

    -- Yêu cầu mượn online
    insert into public.borrow_requests (id, reader_id, status, borrow_code, qr_payload, requested_at, approved_by, approved_at, expires_at) values
      ('e0000000-0000-0000-0000-000000000001', v_reader1_id, 'approved', 'BRW-2026-000001', 'SMARTLIB:BRW:BRW-2026-000001', now() - interval '1 day', v_lib1_id, now() - interval '12 hours', now() + interval '2 days'),
      ('e0000000-0000-0000-0000-000000000002', v_reader1_id, 'pending', null, null, now() - interval '2 hours', null, null, null),
      ('e0000000-0000-0000-0000-000000000003', v_reader2_id, 'rejected', null, null, now() - interval '3 days', v_lib1_id, now() - interval '2 days', null);

    insert into public.borrow_request_details (borrow_request_id, book_id, book_copy_id, status) values
      ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000021', 'approved'),
      ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', null, 'pending'),
      ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000006', null, 'pending'),
      ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000011', null, 'rejected');

    -- Phiếu phạt
    insert into public.fine_tickets (id, reader_id, borrow_detail_id, book_copy_id, reason, amount, status, created_by, created_at, paid_at) values
      ('f0000000-0000-0000-0000-000000000001', v_reader1_id,
       (select id from public.borrow_details where borrow_record_id = 'd0000000-0000-0000-0000-000000000002' limit 1),
       'c0000000-0000-0000-0000-000000000007', 'overdue', 30000, 'unpaid', v_lib1_id, now() - interval '6 days', null),
      ('f0000000-0000-0000-0000-000000000002', v_reader2_id,
       (select id from public.borrow_details where borrow_record_id = 'd0000000-0000-0000-0000-000000000003' limit 1),
       'c0000000-0000-0000-0000-000000000026', 'overdue', 15000, 'paid', v_lib1_id, now() - interval '16 days', now() - interval '10 days');

    -- Phiếu nhập kho
    insert into public.inventory_receipts (id, receipt_code, created_by, note) values
      ('g0000000-0000-0000-0000-000000000001', 'INP-2026-000001', v_lib1_id, 'Nhập kho đợt 1 - tháng 6/2026');

    insert into public.inventory_receipt_details (receipt_id, book_id, quantity, unit_price) values
      ('g0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 5, 75000),
      ('g0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 5, 85000),
      ('g0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000021', 5, 70000),
      ('g0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000024', 4, 42000),
      ('g0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000030', 3, 100000);
  end if;
end $$;
