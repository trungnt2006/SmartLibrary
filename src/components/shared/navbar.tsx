"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";
import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";

export function Navbar() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("*")
        .eq("auth_user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const roleLabels: Record<string, string> = {
    admin: "Quản trị viên",
    librarian: "Thủ thư",
    reader: "Độc giả",
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-end border-b border-gray-200/80 bg-white/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        {profile && (
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
              <span className="text-sm font-semibold">
                {profile.full_name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-900 leading-tight">{profile.full_name}</p>
              <p className="text-xs text-gray-500">
                {roleLabels[profile.role] || profile.role}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
          title="Đăng xuất"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
