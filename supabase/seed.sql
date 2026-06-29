-- ============================================================
-- SEED SCRIPT — Chạy SAU khi đã tạo auth users bằng
--   node --env-file=.env.local scripts/create-users-v2.cjs
-- Xoá dữ liệu cũ và seed dữ liệu mẫu mới cho toàn bộ bảng public
-- Thiết lập chi tiết profiles cho 8 tài khoản test
-- ============================================================

-- ========================
-- 1. XOÁ DỮ LIỆU CŨ
-- ========================
DELETE FROM public.inventory_audit_details;
DELETE FROM public.inventory_audits;
DELETE FROM public.inventory_receipt_details;
DELETE FROM public.inventory_receipts;
DELETE FROM public.payment_transactions;
DELETE FROM public.fine_tickets;
DELETE FROM public.renewal_requests;
DELETE FROM public.return_request_details;
DELETE FROM public.return_requests;
DELETE FROM public.borrow_request_details;
DELETE FROM public.borrow_details;
DELETE FROM public.borrow_records;
DELETE FROM public.borrow_requests;
DELETE FROM public.book_copies;
DELETE FROM public.books;
DELETE FROM public.categories;
DELETE FROM public.library_rules;

-- Xoá profiles cũ (tạo từ seed lỗi, auth_user_id không tồn tại)
DELETE FROM public.profiles WHERE email IN (
  'admin@test.vn', 'librarian1@test.vn', 'librarian2@test.vn',
  'reader1@test.vn', 'reader2@test.vn', 'reader3@test.vn',
  'reader4@test.vn', 'reader5@test.vn'
);

-- ========================
-- 2. CẬP NHẬT PROFILES (chi tiết cho 8 tài khoản)
-- ========================
UPDATE public.profiles SET
  full_name = 'Admin Hệ Thống', phone = '0901000001', address = 'TP HCM',
  card_issued_at = now(), card_expires_at = now() + interval '5 years',
  employee_code = 'ADM-000001', position = 'Quản trị viên'
WHERE email = 'admin@ltest.app';

UPDATE public.profiles SET
  full_name = 'Nguyễn Văn A', phone = '0901000002', address = 'TP HCM',
  card_issued_at = now(), card_expires_at = now() + interval '5 years',
  employee_code = 'LIB-000001', position = 'Thủ thư chính'
WHERE email = 'lib1@ltest.app';

UPDATE public.profiles SET
  full_name = 'Trần Thị B', phone = '0901000003', address = 'Đà Nẵng',
  card_issued_at = now(), card_expires_at = now() + interval '5 years',
  employee_code = 'LIB-000002', position = 'Thủ thư'
WHERE email = 'lib2@ltest.app';

UPDATE public.profiles SET
  full_name = 'Lê Văn A', phone = '0902000001', address = 'Hà Nội',
  card_issued_at = now() - interval '60 days', card_expires_at = now() + interval '4 months',
  employee_code = 'RD-000001'
WHERE email = 'rd1@ltest.app';

UPDATE public.profiles SET
  full_name = 'Phạm Thị B', phone = '0902000002', address = 'TP HCM',
  card_issued_at = now() - interval '30 days', card_expires_at = now() + interval '5 months',
  employee_code = 'RD-000002'
WHERE email = 'rd2@ltest.app';

UPDATE public.profiles SET
  full_name = 'Hoàng Văn C', phone = '0902000003', address = 'Đà Nẵng',
  card_issued_at = now() - interval '45 days', card_expires_at = now() + interval '4 months 15 days',
  employee_code = 'RD-000003'
WHERE email = 'rd3@ltest.app';

UPDATE public.profiles SET
  full_name = 'Đỗ Thị D', phone = '0902000004', address = 'Hải Phòng',
  card_issued_at = now() - interval '10 days', card_expires_at = now() + interval '5 months 20 days',
  employee_code = 'RD-000004'
WHERE email = 'rd4@ltest.app';

UPDATE public.profiles SET
  full_name = 'Ngô Văn E', phone = '0902000005', address = 'Cần Thơ',
  card_issued_at = now() - interval '90 days', card_expires_at = now() + interval '3 months',
  employee_code = 'RD-000005'
WHERE email = 'rd5@ltest.app';

-- ========================
-- 3. LIBRARY RULES
-- ========================
INSERT INTO public.library_rules (key, value, value_type, description) VALUES
  ('membership_duration_months', '6', 'number', 'Thời hạn thẻ độc giả (tháng)'),
  ('max_borrow_books', '5', 'number', 'Số sách tối đa được mượn cùng lúc'),
  ('max_borrow_days', '14', 'number', 'Số ngày mượn tối đa'),
  ('fine_per_day_overdue', '5000', 'number', 'Phạt quá hạn mỗi ngày (VNĐ)'),
  ('min_reader_age', '15', 'number', 'Tuổi độc giả tối thiểu'),
  ('request_expiry_days', '3', 'number', 'Số ngày yêu cầu mượn/trả còn hiệu lực'),
  ('book_compensation_coefficient', '2', 'number', 'Hệ số đền bù khi mất sách'),
  ('damaged_compensation_percent', '50', 'number', 'Phần trăm giá sách bồi thường khi hư hỏng')
ON CONFLICT (key) DO NOTHING;

-- ========================
-- 4. CATEGORIES
-- ========================
INSERT INTO public.categories (id, name, description) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Văn học Việt Nam', 'Tác phẩm văn học Việt Nam'),
  ('b0000000-0000-0000-0000-000000000002', 'Văn học nước ngoài', 'Tác phẩm văn học nước ngoài'),
  ('b0000000-0000-0000-0000-000000000003', 'Khoa học - Kỹ thuật', 'Sách khoa học và kỹ thuật'),
  ('b0000000-0000-0000-0000-000000000004', 'Kinh tế - Quản trị', 'Sách kinh tế, quản trị kinh doanh'),
  ('b0000000-0000-0000-0000-000000000005', 'Lịch sử - Địa lý', 'Sách lịch sử và địa lý'),
  ('b0000000-0000-0000-0000-000000000006', 'Tâm lý - Kỹ năng sống', 'Sách tâm lý, kỹ năng sống'),
  ('b0000000-0000-0000-0000-000000000007', 'Thiếu nhi', 'Sách dành cho thiếu nhi'),
  ('b0000000-0000-0000-0000-000000000008', 'Giáo trình - Học thuật', 'Giáo trình, sách học thuật'),
  ('b0000000-0000-0000-0000-000000000009', 'Công nghệ thông tin', 'Sách về CNTT, lập trình')
ON CONFLICT (name) DO NOTHING;

-- ========================
-- 5. BOOKS (27 đầu sách)
-- ========================
INSERT INTO public.books (id, category_id, title, author, publisher, publication_year, price, status) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Tắt đèn', 'Ngô Tất Tố', 'NXB Văn học', 1939, 75000, 'active'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Số đỏ', 'Vũ Trọng Phụng', 'NXB Văn học', 1936, 80000, 'active'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Chí Phèo', 'Nam Cao', 'NXB Văn học', 1941, 50000, 'active'),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Dế Mèn phiêu lưu ký', 'Tô Hoài', 'NXB Kim Đồng', 1941, 42000, 'active'),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Vợ nhặt', 'Kim Lân', 'NXB Văn học', 1962, 45000, 'active'),
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'Nhà giả kim', 'Paulo Coelho', 'NXB Văn hóa', 1988, 85000, 'active'),
  ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000002', 'Hoàng tử bé', 'Antoine de Saint-Exupéry', 'NXB Hội Nhà Văn', 1943, 35000, 'active'),
  ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000002', 'Ông già và biển cả', 'Ernest Hemingway', 'NXB Văn học', 1952, 55000, 'active'),
  ('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000002', 'Cuốn theo chiều gió', 'Margaret Mitchell', 'NXB Trẻ', 1936, 120000, 'active'),
  ('c0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000002', 'Trăm năm cô đơn', 'Gabriel García Márquez', 'NXB Văn học', 1967, 95000, 'active'),
  ('c0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-000000000003', 'Lược sử thời gian', 'Stephen Hawking', 'NXB Trẻ', 1988, 110000, 'active'),
  ('c0000000-0000-0000-0000-00000000000c', 'b0000000-0000-0000-0000-000000000003', 'Vũ trụ trong vỏ hạt dẻ', 'Stephen Hawking', 'NXB Trẻ', 2001, 105000, 'active'),
  ('c0000000-0000-0000-0000-00000000000d', 'b0000000-0000-0000-0000-000000000003', 'Thuyết tương đối', 'Albert Einstein', 'NXB Khoa học', 1916, 90000, 'active'),
  ('c0000000-0000-0000-0000-00000000000e', 'b0000000-0000-0000-0000-000000000004', 'Từ tốt đến vĩ đại', 'Jim Collins', 'NXB Trẻ', 2001, 98000, 'active'),
  ('c0000000-0000-0000-0000-00000000000f', 'b0000000-0000-0000-0000-000000000004', 'Khởi nghiệp tinh gọn', 'Eric Ries', 'NXB Kinh tế', 2011, 88000, 'active'),
  ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000005', 'Đại Việt sử ký toàn thư', 'Ngô Sĩ Liên', 'NXB Khoa học XH', 1479, 150000, 'active'),
  ('c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000005', 'Việt Nam sử lược', 'Trần Trọng Kim', 'NXB Văn hóa', 1928, 85000, 'active'),
  ('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000006', 'Đắc nhân tâm', 'Dale Carnegie', 'NXB Tổng hợp', 1936, 70000, 'active'),
  ('c0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000006', '7 thói quen hiệu quả', 'Stephen Covey', 'NXB Tổng hợp', 1989, 82000, 'active'),
  ('c0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000006', 'Rèn luyện tư duy phản biện', 'Albert Rutherford', 'NXB Thế giới', 2020, 95000, 'active'),
  ('c0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000007', 'Kính vạn hoa', 'Nguyễn Nhật Ánh', 'NXB Kim Đồng', 1995, 65000, 'active'),
  ('c0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000007', 'Chuyện xứ Lang Biang', 'Nguyễn Nhật Ánh', 'NXB Kim Đồng', 2023, 72000, 'active'),
  ('c0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000008', 'Cấu trúc dữ liệu và giải thuật', 'Nguyễn Đức Nghĩa', 'NXB Đại học QG', 2015, 120000, 'active'),
  ('c0000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000008', 'Giáo trình Hóa hữu cơ', 'Nguyễn Văn Hùng', 'NXB Giáo dục', 2018, 95000, 'active'),
  ('c0000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000009', 'Python cơ bản', 'Đặng Văn Hùng', 'NXB Khoa học KT', 2020, 100000, 'active'),
  ('c0000000-0000-0000-0000-00000000001a', 'b0000000-0000-0000-0000-000000000009', 'Trí tuệ nhân tạo', 'Stuart Russell', 'NXB Khoa học KT', 2021, 180000, 'active'),
  ('c0000000-0000-0000-0000-00000000001b', 'b0000000-0000-0000-0000-000000000009', 'Học máy (Machine Learning)', 'Nguyễn Thanh Tùng', 'NXB Đại học QG', 2022, 150000, 'active')
ON CONFLICT DO NOTHING;

-- ========================
-- 6. BOOK COPIES (52 bản)
-- ========================
INSERT INTO public.book_copies (id, book_id, barcode, status, price, shelf_location) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'BOOK-2026-000001', 'borrowing', 75000, 'A1-01'),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'BOOK-2026-000002', 'available', 75000, 'A1-01'),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'BOOK-2026-000003', 'borrowing', 75000, 'A1-01'),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'BOOK-2026-000004', 'available', 80000, 'A1-02'),
  ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002', 'BOOK-2026-000005', 'borrowing', 80000, 'A1-02'),
  ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003', 'BOOK-2026-000006', 'available', 50000, 'A1-03'),
  ('d0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000003', 'BOOK-2026-000007', 'lost', 50000, 'A1-03'),
  ('d0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000004', 'BOOK-2026-000008', 'available', 42000, 'A1-04'),
  ('d0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000004', 'BOOK-2026-000009', 'available', 42000, 'A1-04'),
  ('d0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000005', 'BOOK-2026-000010', 'available', 45000, 'A1-05'),
  ('d0000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-000000000005', 'BOOK-2026-000011', 'available', 45000, 'A1-05'),
  ('d0000000-0000-0000-0000-00000000000c', 'c0000000-0000-0000-0000-000000000006', 'BOOK-2026-000012', 'available', 85000, 'B1-01'),
  ('d0000000-0000-0000-0000-00000000000d', 'c0000000-0000-0000-0000-000000000006', 'BOOK-2026-000013', 'borrowing', 85000, 'B1-01'),
  ('d0000000-0000-0000-0000-00000000000e', 'c0000000-0000-0000-0000-000000000006', 'BOOK-2026-000014', 'damaged', 85000, 'B1-01'),
  ('d0000000-0000-0000-0000-00000000000f', 'c0000000-0000-0000-0000-000000000007', 'BOOK-2026-000015', 'available', 35000, 'B1-02'),
  ('d0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000007', 'BOOK-2026-000016', 'available', 35000, 'B1-02'),
  ('d0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000008', 'BOOK-2026-000017', 'available', 55000, 'B1-03'),
  ('d0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000008', 'BOOK-2026-000018', 'borrowing', 55000, 'B1-03'),
  ('d0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000009', 'BOOK-2026-000019', 'available', 120000, 'B1-04'),
  ('d0000000-0000-0000-0000-000000000014', 'c0000000-0000-0000-0000-000000000009', 'BOOK-2026-000020', 'available', 120000, 'B1-04'),
  ('d0000000-0000-0000-0000-000000000015', 'c0000000-0000-0000-0000-00000000000a', 'BOOK-2026-000021', 'available', 95000, 'B1-05'),
  ('d0000000-0000-0000-0000-000000000016', 'c0000000-0000-0000-0000-00000000000b', 'BOOK-2026-000022', 'available', 110000, 'C1-01'),
  ('d0000000-0000-0000-0000-000000000017', 'c0000000-0000-0000-0000-00000000000b', 'BOOK-2026-000023', 'damaged', 110000, 'C1-01'),
  ('d0000000-0000-0000-0000-000000000018', 'c0000000-0000-0000-0000-00000000000c', 'BOOK-2026-000024', 'available', 105000, 'C1-02'),
  ('d0000000-0000-0000-0000-000000000019', 'c0000000-0000-0000-0000-00000000000d', 'BOOK-2026-000025', 'available', 90000, 'C1-03'),
  ('d0000000-0000-0000-0000-00000000001a', 'c0000000-0000-0000-0000-00000000000e', 'BOOK-2026-000026', 'available', 98000, 'D1-01'),
  ('d0000000-0000-0000-0000-00000000001b', 'c0000000-0000-0000-0000-00000000000e', 'BOOK-2026-000027', 'available', 98000, 'D1-01'),
  ('d0000000-0000-0000-0000-00000000001c', 'c0000000-0000-0000-0000-00000000000f', 'BOOK-2026-000028', 'available', 88000, 'D1-02'),
  ('d0000000-0000-0000-0000-00000000001d', 'c0000000-0000-0000-0000-000000000010', 'BOOK-2026-000029', 'available', 150000, 'E1-01'),
  ('d0000000-0000-0000-0000-00000000001e', 'c0000000-0000-0000-0000-000000000010', 'BOOK-2026-000030', 'available', 150000, 'E1-01'),
  ('d0000000-0000-0000-0000-00000000001f', 'c0000000-0000-0000-0000-000000000011', 'BOOK-2026-000031', 'available', 85000, 'E1-02'),
  ('d0000000-0000-0000-0000-000000000020', 'c0000000-0000-0000-0000-000000000011', 'BOOK-2026-000032', 'available', 85000, 'E1-02'),
  ('d0000000-0000-0000-0000-000000000021', 'c0000000-0000-0000-0000-000000000012', 'BOOK-2026-000033', 'available', 70000, 'F1-01'),
  ('d0000000-0000-0000-0000-000000000022', 'c0000000-0000-0000-0000-000000000012', 'BOOK-2026-000034', 'borrowing', 70000, 'F1-01'),
  ('d0000000-0000-0000-0000-000000000023', 'c0000000-0000-0000-0000-000000000012', 'BOOK-2026-000035', 'available', 70000, 'F1-01'),
  ('d0000000-0000-0000-0000-000000000024', 'c0000000-0000-0000-0000-000000000013', 'BOOK-2026-000036', 'available', 82000, 'F1-02'),
  ('d0000000-0000-0000-0000-000000000025', 'c0000000-0000-0000-0000-000000000013', 'BOOK-2026-000037', 'available', 82000, 'F1-02'),
  ('d0000000-0000-0000-0000-000000000026', 'c0000000-0000-0000-0000-000000000014', 'BOOK-2026-000038', 'available', 95000, 'F1-03'),
  ('d0000000-0000-0000-0000-000000000027', 'c0000000-0000-0000-0000-000000000015', 'BOOK-2026-000039', 'available', 65000, 'G1-01'),
  ('d0000000-0000-0000-0000-000000000028', 'c0000000-0000-0000-0000-000000000015', 'BOOK-2026-000040', 'available', 65000, 'G1-01'),
  ('d0000000-0000-0000-0000-000000000029', 'c0000000-0000-0000-0000-000000000016', 'BOOK-2026-000041', 'available', 72000, 'G1-02'),
  ('d0000000-0000-0000-0000-00000000002a', 'c0000000-0000-0000-0000-000000000016', 'BOOK-2026-000042', 'available', 72000, 'G1-02'),
  ('d0000000-0000-0000-0000-00000000002b', 'c0000000-0000-0000-0000-000000000017', 'BOOK-2026-000043', 'available', 120000, 'H1-01'),
  ('d0000000-0000-0000-0000-00000000002c', 'c0000000-0000-0000-0000-000000000017', 'BOOK-2026-000044', 'available', 120000, 'H1-01'),
  ('d0000000-0000-0000-0000-00000000002d', 'c0000000-0000-0000-0000-000000000017', 'BOOK-2026-000045', 'available', 120000, 'H1-01'),
  ('d0000000-0000-0000-0000-00000000002e', 'c0000000-0000-0000-0000-000000000018', 'BOOK-2026-000046', 'available', 95000, 'H1-02'),
  ('d0000000-0000-0000-0000-00000000002f', 'c0000000-0000-0000-0000-000000000019', 'BOOK-2026-000047', 'available', 100000, 'I1-01'),
  ('d0000000-0000-0000-0000-000000000030', 'c0000000-0000-0000-0000-000000000019', 'BOOK-2026-000048', 'available', 100000, 'I1-01'),
  ('d0000000-0000-0000-0000-000000000031', 'c0000000-0000-0000-0000-000000000019', 'BOOK-2026-000049', 'available', 100000, 'I1-01'),
  ('d0000000-0000-0000-0000-000000000032', 'c0000000-0000-0000-0000-00000000001a', 'BOOK-2026-000050', 'available', 180000, 'I1-02'),
  ('d0000000-0000-0000-0000-000000000033', 'c0000000-0000-0000-0000-00000000001a', 'BOOK-2026-000051', 'available', 180000, 'I1-02'),
  ('d0000000-0000-0000-0000-000000000034', 'c0000000-0000-0000-0000-00000000001b', 'BOOK-2026-000052', 'available', 150000, 'I1-03')
ON CONFLICT DO NOTHING;

-- ========================
-- 7. NGHIỆP VỤ (DO block lấy profile_id động)
-- ========================
DO $$
DECLARE
  v_lib1    UUID; v_reader1 UUID; v_reader2 UUID;
  v_reader3 UUID; v_reader4 UUID; v_reader5 UUID;
BEGIN
  SELECT id INTO v_lib1    FROM public.profiles WHERE email = 'lib1@ltest.app';
  SELECT id INTO v_reader1 FROM public.profiles WHERE email = 'rd1@ltest.app';
  SELECT id INTO v_reader2 FROM public.profiles WHERE email = 'rd2@ltest.app';
  SELECT id INTO v_reader3 FROM public.profiles WHERE email = 'rd3@ltest.app';
  SELECT id INTO v_reader4 FROM public.profiles WHERE email = 'rd4@ltest.app';
  SELECT id INTO v_reader5 FROM public.profiles WHERE email = 'rd5@ltest.app';

  -- BORROW RECORDS + DETAILS
  INSERT INTO public.borrow_records (id, reader_id, librarian_id, borrow_date, due_date, status, source) VALUES
    ('e0000000-0000-0000-0000-000000000001', v_reader1, v_lib1, now() - interval '10 days', now() + interval '4 days', 'active', 'counter'),
    ('e0000000-0000-0000-0000-000000000002', v_reader1, v_lib1, now() - interval '20 days', now() - interval '6 days', 'overdue', 'counter'),
    ('e0000000-0000-0000-0000-000000000003', v_reader2, v_lib1, now() - interval '5 days', now() + interval '9 days', 'active', 'counter'),
    ('e0000000-0000-0000-0000-000000000004', v_reader3, v_lib1, now() - interval '7 days', now() + interval '7 days', 'active', 'counter'),
    ('e0000000-0000-0000-0000-000000000005', v_reader3, v_lib1, now() - interval '30 days', now() - interval '16 days', 'returned', 'counter'),
    ('e0000000-0000-0000-0000-000000000006', v_reader5, v_lib1, now() - interval '25 days', now() - interval '11 days', 'returned', 'counter');

  INSERT INTO public.borrow_details (id, borrow_record_id, book_copy_id, due_date, status, renewal_count) VALUES
    ('e0000001-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', now() + interval '4 days', 'active', 0),
    ('e0000001-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-00000000000d', now() + interval '4 days', 'active', 0),
    ('e0000001-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000005', now() - interval '6 days', 'active', 1),
    ('e0000001-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000022', now() + interval '9 days', 'active', 0),
    ('e0000001-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000012', now() + interval '7 days', 'active', 0),
    ('e0000001-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-00000000000f', now() - interval '16 days', 'returned', 0),
    ('e0000001-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000008', now() - interval '11 days', 'returned', 0);

  UPDATE public.borrow_details SET return_date = now() - interval '14 days' WHERE id = 'e0000001-0000-0000-0000-000000000006';
  UPDATE public.borrow_details SET return_date = now() - interval '10 days' WHERE id = 'e0000001-0000-0000-0000-000000000007';

  -- BORROW REQUESTS
  INSERT INTO public.borrow_requests (id, reader_id, status, borrow_code, requested_at, approved_by, approved_at, rejected_by, rejected_at, expires_at) VALUES
    ('f0000000-0000-0000-0000-000000000001', v_reader1, 'approved', 'BRW-2026-000001', now() - interval '2 days', v_lib1, now() - interval '1 day', NULL, NULL, now() + interval '1 day'),
    ('f0000000-0000-0000-0000-000000000002', v_reader2, 'pending', 'BRW-2026-000002', now() - interval '1 day', NULL, NULL, NULL, NULL, now() + interval '2 days'),
    ('f0000000-0000-0000-0000-000000000003', v_reader3, 'rejected', 'BRW-2026-000003', now() - interval '5 days', NULL, NULL, v_lib1, now() - interval '4 days', now() - interval '2 days'),
    ('f0000000-0000-0000-0000-000000000004', v_reader4, 'pending', 'BRW-2026-000004', now() - interval '6 hours', NULL, NULL, NULL, NULL, now() + interval '2 days');

  INSERT INTO public.borrow_request_details (id, borrow_request_id, book_id, book_copy_id, status) VALUES
    ('f0000001-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000010', 'approved'),
    ('f0000001-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-00000000000a', NULL, 'pending'),
    ('f0000001-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000019', NULL, 'pending'),
    ('f0000001-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-00000000001b', NULL, 'rejected'),
    ('f0000001-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000015', NULL, 'pending');

  UPDATE public.borrow_requests SET rejection_reason = 'Hết hạn thẻ độc giả, vui lòng gia hạn thẻ trước khi mượn'
  WHERE id = 'f0000000-0000-0000-0000-000000000003';

  -- RETURN REQUESTS
  INSERT INTO public.return_requests (id, reader_id, borrow_record_id, status, return_code, requested_at, expires_at) VALUES
    ('f0000002-0000-0000-0000-000000000001', v_reader2, 'e0000000-0000-0000-0000-000000000003', 'pending', 'RTN-2026-000001', now() - interval '12 hours', now() + interval '2 days 12 hours'),
    ('f0000002-0000-0000-0000-000000000002', v_reader1, 'e0000000-0000-0000-0000-000000000001', 'completed', 'RTN-2026-000002', now() - interval '3 days', NULL);

  UPDATE public.return_requests SET completed_by = v_lib1, completed_at = now() - interval '2 days'
  WHERE id = 'f0000002-0000-0000-0000-000000000002';

  -- RENEWAL REQUESTS
  INSERT INTO public.renewal_requests (id, reader_id, borrow_record_id, borrow_detail_id, status, requested_at, old_due_date, new_due_date, approved_by, approved_at)
  VALUES ('f0000003-0000-0000-0000-000000000001', v_reader1, 'e0000000-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000003', 'approved', now() - interval '10 days', now() - interval '12 days', now() + interval '2 days', v_lib1, now() - interval '9 days');

  -- FINE TICKETS
  INSERT INTO public.fine_tickets (id, reader_id, borrow_detail_id, book_copy_id, reason, amount, status, created_by) VALUES
    ('f0000004-0000-0000-0000-000000000001', v_reader1, 'e0000001-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000005', 'overdue', 30000, 'unpaid', v_lib1),
    ('f0000004-0000-0000-0000-000000000002', v_reader5, 'e0000001-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000008', 'overdue', 5000, 'paid', v_lib1);

  UPDATE public.fine_tickets SET paid_at = now() - interval '9 days' WHERE id = 'f0000004-0000-0000-0000-000000000002';

  -- PAYMENT TRANSACTIONS
  INSERT INTO public.payment_transactions (id, fine_ticket_id, amount, payment_method, status, received_by, paid_at)
  VALUES ('f0000005-0000-0000-0000-000000000001', 'f0000004-0000-0000-0000-000000000002', 5000, 'cash', 'success', v_lib1, now() - interval '9 days');

  -- INVENTORY RECEIPTS
  INSERT INTO public.inventory_receipts (id, receipt_code, created_by, note)
  VALUES ('f0000006-0000-0000-0000-000000000001', 'INP-2026-000001', v_lib1, 'Nhập sách đầu kỳ');

  INSERT INTO public.inventory_receipt_details (id, receipt_id, book_id, quantity, unit_price) VALUES
    ('f0000007-0000-0000-0000-000000000001', 'f0000006-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 5, 70000),
    ('f0000007-0000-0000-0000-000000000002', 'f0000006-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 5, 80000),
    ('f0000007-0000-0000-0000-000000000003', 'f0000006-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000012', 5, 65000),
    ('f0000007-0000-0000-0000-000000000004', 'f0000006-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 4, 38000),
    ('f0000007-0000-0000-0000-000000000005', 'f0000006-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000019', 3, 95000);

  -- INVENTORY AUDITS
  INSERT INTO public.inventory_audits (id, audit_code, created_by, status, note)
  VALUES ('f0000008-0000-0000-0000-000000000001', 'AUD-2026-000001', v_lib1, 'completed', 'Kiểm kê cuối tháng');

  INSERT INTO public.inventory_audit_details (id, audit_id, book_copy_id, expected_status, actual_status, note) VALUES
    ('f0000009-0000-0000-0000-000000000001', 'f0000008-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'available', 'available', NULL),
    ('f0000009-0000-0000-0000-000000000002', 'f0000008-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000007', 'available', 'lost', 'Mất sách không rõ lý do'),
    ('f0000009-0000-0000-0000-000000000003', 'f0000008-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-00000000000c', 'available', 'available', NULL),
    ('f0000009-0000-0000-0000-000000000004', 'f0000008-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-00000000000e', 'available', 'damaged', NULL);

  -- ========================
  -- 8. THÊM NHIỀU NGHIỆP VỤ (mở rộng)
  -- ========================
  
  -- BORROW RECORDS (thêm)
  INSERT INTO public.borrow_records (id, reader_id, librarian_id, borrow_date, due_date, status, source) VALUES
    ('e0000000-0000-0000-0000-000000000007', v_reader1, v_lib1, now() - interval '40 days', now() - interval '26 days', 'returned', 'counter'),
    ('e0000000-0000-0000-0000-000000000008', v_reader2, v_lib1, now() - interval '50 days', now() - interval '36 days', 'returned', 'counter'),
    ('e0000000-0000-0000-0000-000000000009', v_reader3, v_lib1, now() - interval '35 days', now() - interval '21 days', 'returned', 'counter'),
    ('e0000000-0000-0000-0000-00000000000a', v_reader4, v_lib1, now() - interval '3 days', now() + interval '11 days', 'active', 'counter');

  INSERT INTO public.borrow_details (id, borrow_record_id, book_copy_id, due_date, status, renewal_count) VALUES
    ('e0000001-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000008', now() - interval '26 days', 'returned', 0),
    ('e0000001-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000013', now() - interval '36 days', 'returned', 0),
    ('e0000001-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-00000000001c', now() - interval '21 days', 'returned', 0),
    ('e0000001-0000-0000-0000-00000000000b', 'e0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-000000000025', now() + interval '11 days', 'active', 0);

  UPDATE public.borrow_details SET return_date = now() - interval '28 days' WHERE id = 'e0000001-0000-0000-0000-000000000008';
  UPDATE public.borrow_details SET return_date = now() - interval '10 days' WHERE id = 'e0000001-0000-0000-0000-000000000009';
  UPDATE public.borrow_details SET return_date = now() - interval '15 days' WHERE id = 'e0000001-0000-0000-0000-00000000000a';

  -- BORROW REQUESTS (thêm)
  INSERT INTO public.borrow_requests (id, reader_id, status, borrow_code, requested_at, expires_at) VALUES
    ('f0000000-0000-0000-0000-000000000005', v_reader1, 'expired', 'BRW-2026-000005', now() - interval '10 days', now() - interval '7 days'),
    ('f0000000-0000-0000-0000-000000000006', v_reader2, 'cancelled', 'BRW-2026-000006', now() - interval '8 days', now() + interval '5 days');

  UPDATE public.borrow_requests SET rejected_at = now() - interval '6 days', rejection_reason = 'Độc giả hủy yêu cầu'
  WHERE id = 'f0000000-0000-0000-0000-000000000006';

  INSERT INTO public.borrow_request_details (id, borrow_request_id, book_id, book_copy_id, status) VALUES
    ('f0000001-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000006', NULL, 'expired'),
    ('f0000001-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000012', NULL, 'cancelled');

  -- RETURN REQUESTS (thêm)
  INSERT INTO public.return_requests (id, reader_id, borrow_record_id, status, return_code, requested_at, expires_at) VALUES
    ('f0000002-0000-0000-0000-000000000003', v_reader3, 'e0000000-0000-0000-0000-000000000004', 'expired', 'RTN-2026-000003', now() - interval '10 days', now() - interval '7 days');

  -- RENEWAL REQUESTS (thêm)
  INSERT INTO public.renewal_requests (id, reader_id, borrow_record_id, borrow_detail_id, status, requested_at, old_due_date) VALUES
    ('f0000003-0000-0000-0000-000000000002', v_reader2, 'e0000000-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000004', 'pending', now() - interval '1 day', now() + interval '9 days'),
    ('f0000003-0000-0000-0000-000000000003', v_reader3, 'e0000000-0000-0000-0000-000000000004', 'e0000001-0000-0000-0000-000000000005', 'rejected', now() - interval '3 days', now() + interval '7 days');

  UPDATE public.renewal_requests SET rejected_at = now() - interval '2 days', rejection_reason = 'Sách đã có người đặt trước, không thể gia hạn'
  WHERE id = 'f0000003-0000-0000-0000-000000000003';

  -- FINE TICKETS (thêm)
  INSERT INTO public.fine_tickets (id, reader_id, borrow_detail_id, book_copy_id, reason, amount, status, created_by) VALUES
    ('f0000004-0000-0000-0000-000000000003', v_reader3, 'e0000001-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-00000000001c', 'damaged', 49000, 'unpaid', v_lib1),
    ('f0000004-0000-0000-0000-000000000004', v_reader2, 'e0000001-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000013', 'overdue', 80000, 'paid', v_lib1);

  UPDATE public.fine_tickets SET paid_at = now() - interval '8 days' WHERE id = 'f0000004-0000-0000-0000-000000000004';

  -- PAYMENT TRANSACTIONS (thêm)
  INSERT INTO public.payment_transactions (id, fine_ticket_id, amount, payment_method, status, received_by, paid_at)
  VALUES ('f0000005-0000-0000-0000-000000000002', 'f0000004-0000-0000-0000-000000000004', 80000, 'cash', 'success', v_lib1, now() - interval '8 days');

  -- CẬP NHẬT TRẠNG THÁI BOOK COPIES
  UPDATE public.book_copies SET status = 'damaged' WHERE id = 'd0000000-0000-0000-0000-00000000001c';
  UPDATE public.book_copies SET status = 'borrowing' WHERE id = 'd0000000-0000-0000-0000-000000000025';

END $$;
