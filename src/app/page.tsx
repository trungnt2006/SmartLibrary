"use client";

import Link from "next/link";
import { BookOpen, Library, Users, BarChart3, ArrowRight, Shield, Search, BookMarked } from "lucide-react";

const features = [
  { icon: BookOpen, title: "Quản lý kho sách", desc: "Theo dõi toàn bộ đầu sách, bản sao, tình trạng mượn/trả theo thời gian thực." },
  { icon: Users, title: "Quản lý độc giả", desc: "Hồ sơ độc giả chi tiết, lịch sử mượn trả, tiền phạt và yêu cầu gia hạn." },
  { icon: BarChart3, title: "Báo cáo thống kê", desc: "Biểu đồ xu hướng mượn trả, doanh thu phạt, top sách được mượn nhiều nhất." },
  { icon: Shield, title: "Phân quyền 3 cấp", desc: "Admin, thủ thư và độc giả — mỗi vai trò có giao diện và quyền hạn riêng." },
  { icon: Search, title: "Tra cứu thông minh", desc: "Tìm kiếm sách theo tên, tác giả, mã vạch. Hỗ trợ quét mã QR nhanh chóng." },
  { icon: BookMarked, title: "Mượn trả linh hoạt", desc: "Mượn tại quầy, đặt trước online, gia hạn và xử lý sách hư hỏng/thất lạc." },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(30deg, #92400e 12%, transparent 12.5%, transparent 87%, #92400e 87.5%, #92400e),
            linear-gradient(150deg, #92400e 12%, transparent 12.5%, transparent 87%, #92400e 87.5%, #92400e),
            linear-gradient(60deg, #78350f 25%, transparent 25.5%, transparent 75%, #78350f 75%, #78350f)
          `,
          backgroundSize: "80px 140px",
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between border-b border-amber-200/40 bg-white/70 backdrop-blur-xl px-6 py-3 sm:px-10">
        <div className="flex items-center gap-2">
          <img src="/favicon.png" alt="" className="h-8 w-8" />
          <span className="text-lg font-bold text-stone-800">Smart Library</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-900/20 transition-all hover:from-amber-800 hover:to-amber-900 hover:shadow-xl active:scale-[0.98]"
          >
            Đăng nhập
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-20 pb-16 text-center sm:pt-28 sm:pb-20">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 shadow-lg shadow-amber-900/20">
            <Library className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
            Hệ thống quản lý thư viện
            <span className="block mt-2 bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent">
              thông minh & hiện đại
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-500 sm:text-xl">
            Smart Library giúp bạn quản lý kho sách, theo dõi mượn trả, xử lý phạt và báo cáo thống kê
            — tất cả trong một nền tảng duy nhất.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-amber-900/20 transition-all hover:from-amber-800 hover:to-amber-900 hover:shadow-xl active:scale-[0.98]"
            >
              Bắt đầu ngay
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">Tính năng nổi bật</h2>
          <p className="mt-2 text-stone-500">Mọi thứ bạn cần để vận hành thư viện hiệu quả</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={i}
              className="group rounded-2xl border border-amber-200/40 bg-white/80 p-6 backdrop-blur-sm transition-all hover:border-amber-300/60 hover:shadow-lg hover:shadow-amber-900/5"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-800 group-hover:from-amber-200 group-hover:to-amber-300 transition-colors">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-stone-800">{f.title}</h3>
              <p className="mt-2 text-sm text-stone-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-amber-200/40 bg-white/50 backdrop-blur-md py-6 text-center">
        <p className="text-xs text-stone-400">&copy; {new Date().getFullYear()} Smart Library. All rights reserved.</p>
      </footer>
    </div>
  );
}
