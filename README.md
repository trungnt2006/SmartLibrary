# Smart Library

Hệ thống quản lý thư viện thông minh — xây dựng với **Next.js** + **Supabase**.

## Tính năng

- **3 vai trò**: Admin, Thủ thư, Độc giả
- **Quản lý kho sách**: Đầu sách, cuốn sách, thể loại, nhập kho, kiểm kê
- **Mượn/Trả**: Quét mã tự động, xử lý sách hư/mất, tính phạt tự động
- **Yêu cầu**: Độc giả gửi yêu cầu mượn/trả/gia hạn, thủ thư duyệt
- **Vi phạm**: Tính tiền phạt quá hạn, hư hỏng, mất sách
- **Báo cáo**: Thống kê kho sách, giao dịch, vi phạm

## Công nghệ

- [Next.js](https://nextjs.org/) (App Router)
- [Supabase](https://supabase.com/) (Auth, Database, Storage)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Lucide React](https://lucide.dev/)

## Bắt đầu

```bash
npm install
npm run dev
```

Truy cập [http://localhost:3000](http://localhost:3000).

## Tài khoản dùng thử

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Admin | admin@ltest.app | Test@123 |
| Thủ thư | lib1@ltest.app | Test@123 |
| Thủ thư | lib2@ltest.app | Test@123 |
| Độc giả | rd1@ltest.app → rd5@ltest.app | Test@123 |

## Seed dữ liệu

```bash
node --env-file=.env.local scripts/create-users-v2.cjs
```

Copy nội dung `supabase/seed.sql` vào Supabase SQL Editor và chạy.

## Triển khai

Deploy trên [Vercel](https://vercel.com/). Biến môi trường cần có:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
