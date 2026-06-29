"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error(error.message); setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("email", email)
        .single();

      if (!profile) { toast.error("Không tìm thấy thông tin người dùng"); setLoading(false); return; }

      document.cookie = `user_role=${profile.role}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `user_status=${profile.status}; path=/; max-age=86400; SameSite=Lax`;

      toast.success("Đăng nhập thành công");
      const path = profile.role === "admin" ? "/admin/librarians" : profile.role === "librarian" ? "/librarian/readers" : "/reader/search";
      setTimeout(() => { window.location.href = path; }, 200);
    } catch (err: any) {
      toast.error("Lỗi: " + (err?.message || "Không xác định"));
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
      {/* Pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(30deg, #92400e 12%, transparent 12.5%, transparent 87%, #92400e 87.5%, #92400e),
            linear-gradient(150deg, #92400e 12%, transparent 12.5%, transparent 87%, #92400e 87.5%, #92400e),
            linear-gradient(30deg, #92400e 12%, transparent 12.5%, transparent 87%, #92400e 87.5%, #92400e),
            linear-gradient(150deg, #92400e 12%, transparent 12.5%, transparent 87%, #92400e 87.5%, #92400e),
            linear-gradient(60deg, #78350f 25%, transparent 25.5%, transparent 75%, #78350f 75%, #78350f)
          `,
          backgroundSize: "80px 140px",
          backgroundPosition: "0 0, 0 0, 40px 70px, 40px 70px, 0 0",
        }}
      />

      {/* Decorative circles */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-orange-200/30 blur-3xl" />

      {/* Bookshelf decoration */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex justify-center gap-1.5 px-4 opacity-20">
        {[36, 28, 44, 20, 32, 48, 24, 38, 30, 42, 26, 34, 40, 22, 46].map((h, i) => (
          <div
            key={i}
            className="rounded-t-sm bg-gradient-to-b from-amber-800 to-amber-950"
            style={{
              width: `${12 + ((i * 7) % 8)}px`,
              height: `${h}px`,
              marginTop: `${48 - h}px`,
              borderRadius: "2px 2px 0 0",
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Card */}
        <div className="rounded-2xl border border-amber-200/60 bg-white/90 backdrop-blur-xl shadow-xl shadow-amber-900/5">
          {/* Header with book decoration */}
          <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-amber-800 via-amber-900 to-stone-900 px-8 pt-10 pb-8 text-center">
            <div className="pointer-events-none absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, #fff 2px, #fff 4px)`,
                backgroundSize: "8px 8px",
              }}
            />
            <div className="relative">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center">
                <img src="/favicon.png" alt="Smart Library" className="h-14 w-14" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Smart Library</h1>
              <p className="text-sm text-amber-200/70 mt-1">Hệ thống quản lý thư viện</p>
            </div>
          </div>

          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:bg-white"
                  placeholder="admin@smartlib.vn"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5" htmlFor="password">Mật khẩu</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:bg-white"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-900/20 transition-all duration-200 hover:shadow-xl hover:shadow-amber-900/30 hover:from-amber-800 hover:to-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:from-amber-400 disabled:to-amber-500 disabled:shadow-none active:scale-[0.98]"
              >
                {loading && (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                <span>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</span>
                {!loading && (
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-stone-400">&copy; {new Date().getFullYear()} Smart Library</p>
      </div>
    </div>
  );
}
