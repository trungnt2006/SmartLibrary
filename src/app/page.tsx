"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, Library, Users, BarChart3, ArrowRight, Shield, Search, BookMarked, Activity, Megaphone } from "lucide-react";

const features = [
  { icon: BookOpen, title: "Quản lý kho sách", desc: "Theo dõi toàn bộ đầu sách, bản sao và tình trạng mượn/trả theo thời gian thực." },
  { icon: Users, title: "Quản lý độc giả", desc: "Hồ sơ độc giả chi tiết, lịch sử mượn trả, tiền phạt và yêu cầu gia hạn." },
  { icon: BarChart3, title: "Báo cáo thống kê", desc: "Xu hướng mượn trả, doanh thu phạt, top sách được mượn nhiều nhất." },
  { icon: Shield, title: "Phân quyền 3 cấp", desc: "Admin, thủ thư và độc giả — mỗi vai trò có giao diện và quyền hạn riêng biệt." },
  { icon: Search, title: "Tra cứu thông minh", desc: "Tìm kiếm sách nhanh theo tên, tác giả, mã vạch. Hỗ trợ quét mã QR." },
  { icon: BookMarked, title: "Mượn trả linh hoạt", desc: "Mượn tại quầy, đặt trước online, gia hạn và xử lý sách hư hỏng/thất lạc." },
];

const roles = [
  { role: "Admin", color: "from-red-500 to-rose-700", shadow: "shadow-red-500/20", desc: "Quản trị hệ thống, tạo tài khoản thủ thư, giám sát toàn bộ hoạt động." },
  { role: "Thủ thư", color: "from-amber-600 to-amber-800", shadow: "shadow-amber-500/20", desc: "Thao tác mượn/trả, quản lý đầu sách, kiểm kê, xử lý phạt và báo cáo." },
  { role: "Độc giả", color: "from-emerald-500 to-emerald-700", shadow: "shadow-emerald-500/20", desc: "Tra cứu sách, đặt mượn online, theo dõi lịch sử và thanh toán phạt." },
];

const steps = [
  { num: "01", title: "Đăng ký tài khoản", desc: "Quản trị viên tạo tài khoản cho thủ thư và độc giả với thông tin đầy đủ." },
  { num: "02", title: "Quản lý kho sách", desc: "Nhập đầu sách, tạo bản sao, phân loại theo danh mục và theo dõi số lượng." },
  { num: "03", title: "Vận hành mượn trả", desc: "Cho mượn, nhận trả, xử lý quá hạn, hư hỏng và thất lạc tự động tính phạt." },
  { num: "04", title: "Báo cáo & thống kê", desc: "Xem báo cáo trực quan với biểu đồ, xuất Excel và theo dõi hiệu suất." },
];

function RevealSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'} ${className}`}>{children}</div>;
}

export default function LandingPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("announcements").select("title, content").eq("status", "active").order("created_at", { ascending: false }).then(({ data }) => {
      if (data && data.length > 0) {
        setAnnouncements(data);
        setShowAnnouncement(true);
      }
    });
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-orange-300/10 blur-3xl" />
        {/* Floating books */}
        {[
          { top: "15%", left: "5%", delay: "0s", rotate: "-12deg", h: "36px" },
          { top: "25%", right: "8%", delay: "0.5s", rotate: "8deg", h: "28px" },
          { top: "55%", left: "3%", delay: "1s", rotate: "20deg", h: "40px" },
          { top: "70%", right: "5%", delay: "0.3s", rotate: "-5deg", h: "32px" },
          { top: "40%", left: "10%", delay: "0.8s", rotate: "15deg", h: "24px" },
          { top: "80%", left: "50%", delay: "0.6s", rotate: "-20deg", h: "30px" },
        ].map((b, i) => (
          <div
            key={i}
            className="absolute rounded-sm bg-gradient-to-b from-amber-700/30 to-amber-900/30 backdrop-blur-sm animate-float"
            style={{ top: b.top, left: b.left, right: b.right, height: b.h, width: `${10 + ((i * 5) % 10)}px`, animationDelay: b.delay, transform: `rotate(${b.rotate})`, animationDuration: `${4 + (i % 3)}s` }}
          />
        ))}
      </div>

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between border-b border-amber-200/40 bg-white/70 backdrop-blur-xl px-6 py-3 sm:px-10">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 shadow-sm transition-transform group-hover:scale-105">
            <img src="/favicon.png" alt="" className="h-6 w-6 brightness-0 invert" />
          </div>
          <span className="text-lg font-bold text-stone-800">Smart Library</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-900/20 transition-all hover:from-amber-800 hover:to-amber-900 hover:shadow-xl active:scale-[0.98]">
            Đăng nhập
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-20 pb-16 text-center sm:pt-28 sm:pb-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/50 bg-amber-100/50 px-4 py-1.5 text-xs font-medium text-amber-800 backdrop-blur-sm mb-8 animate-fade-in">
          <Activity className="h-3.5 w-3.5" />
          Phiên bản 2.0 — Hoàn toàn mới
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
          Hệ thống quản lý thư viện
          <span className="mt-3 block animate-gradient bg-gradient-to-r from-amber-600 via-amber-800 to-stone-900 bg-[length:200%_auto] bg-clip-text text-transparent">
            thông minh &amp; hiện đại
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-500 sm:text-xl">
          Smart Library giúp bạn quản lý kho sách, theo dõi mượn trả, xử lý phạt và báo cáo thống kê
          — tất cả gọn nhẹ trong một nền tảng duy nhất.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/login" className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-amber-900/30 transition-all hover:from-amber-800 hover:to-amber-900 hover:shadow-xl hover:shadow-amber-900/40 active:scale-[0.98]">
            Bắt đầu ngay
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Announcement modal */}
      {showAnnouncement && announcements.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30" onClick={() => setShowAnnouncement(false)} />
          <div className="relative z-10 mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl animate-scale-in text-left">
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-md">
                  <Megaphone className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{announcements[0].title}</h3>
              </div>
              <div className="text-sm text-gray-600 leading-relaxed space-y-1 [&_a]:text-blue-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5" dangerouslySetInnerHTML={{ __html: announcements[0].content }} />
              <button
                onClick={() => setShowAnnouncement(false)}
                className="mt-5 inline-flex items-center rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-900/20 transition-all hover:from-amber-800 hover:to-amber-900 active:scale-[0.98]"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
        <RevealSection>
          <div className="mb-12 text-center">
            <span className="inline-block rounded-full bg-amber-100 px-4 py-1 text-xs font-semibold text-amber-800 mb-3">QUY TRÌNH</span>
            <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">Cách Smart Library vận hành</h2>
            <p className="mt-2 text-stone-500">Bốn bước đơn giản để quản lý thư viện của bạn</p>
          </div>
        </RevealSection>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <RevealSection key={i}>
              <div className="group relative rounded-2xl border border-amber-200/40 bg-white/80 p-6 backdrop-blur-sm transition-all hover:border-amber-300/60 hover:shadow-lg hover:shadow-amber-900/5">
                <span className="text-5xl font-black text-amber-200 transition-colors group-hover:text-amber-300">0{i + 1}</span>
                <h3 className="mt-3 text-lg font-semibold text-stone-800">{s.title}</h3>
                <p className="mt-2 text-sm text-stone-500 leading-relaxed">{s.desc}</p>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
        <RevealSection>
          <div className="mb-12 text-center">
            <span className="inline-block rounded-full bg-amber-100 px-4 py-1 text-xs font-semibold text-amber-800 mb-3">TÍNH NĂNG</span>
            <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">Mọi thứ bạn cần</h2>
            <p className="mt-2 text-stone-500">Smart Library được xây dựng để đáp ứng mọi nhu cầu vận hành thư viện</p>
          </div>
        </RevealSection>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <RevealSection key={i}>
              <div className="group rounded-2xl border border-amber-200/40 bg-white/80 p-6 backdrop-blur-sm transition-all hover:border-amber-300/60 hover:shadow-lg hover:shadow-amber-900/5">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-800 group-hover:from-amber-200 group-hover:to-amber-300 transition-colors">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-stone-800">{f.title}</h3>
                <p className="mt-2 text-sm text-stone-500 leading-relaxed">{f.desc}</p>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
        <RevealSection>
          <div className="mb-12 text-center">
            <span className="inline-block rounded-full bg-amber-100 px-4 py-1 text-xs font-semibold text-amber-800 mb-3">VAI TRÒ</span>
            <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">Phân quyền rõ ràng</h2>
            <p className="mt-2 text-stone-500">Ba cấp vai trò với giao diện và quyền hạn được thiết kế riêng</p>
          </div>
        </RevealSection>
        <div className="grid gap-6 sm:grid-cols-3">
          {roles.map((r, i) => (
            <RevealSection key={i}>
              <div className="group rounded-2xl border border-amber-200/40 bg-white/80 p-6 backdrop-blur-sm transition-all hover:border-amber-300/60 hover:shadow-xl hover:shadow-amber-900/5">
                <div className={`mb-4 h-2 w-full rounded-full bg-gradient-to-r ${r.color}`} />
                <h3 className="text-xl font-bold text-stone-800">{r.role}</h3>
                <p className="mt-2 text-sm text-stone-500 leading-relaxed">{r.desc}</p>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24">
        <RevealSection>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-800 via-amber-900 to-stone-900 px-8 py-14 text-center shadow-2xl shadow-amber-900/20 sm:px-16">
            <div className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, #fff 2px, #fff 4px)`, backgroundSize: "8px 8px" }} />
            <h2 className="relative text-2xl font-bold text-white sm:text-3xl">Sẵn sàng trải nghiệm?</h2>
            <p className="relative mx-auto mt-3 max-w-lg text-amber-200/70">Đăng nhập ngay để bắt đầu quản lý thư viện thông minh cùng Smart Library.</p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/login" className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-amber-900 shadow-lg transition-all hover:bg-amber-50 hover:shadow-xl active:scale-[0.98]">
                Đăng nhập ngay
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-amber-200/40 bg-white/50 backdrop-blur-md py-8 text-center">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-stone-400">
            <Library className="h-4 w-4" />
            Smart Library
          </div>
          <p className="text-xs text-stone-400">&copy; {new Date().getFullYear()} Smart Library. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
