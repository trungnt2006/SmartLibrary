"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  BookCopy,
  Box,
  ChevronLeft,
  ClipboardCheck,
  FileText,
  Library,
  LogOut,
  Menu,
  Receipt,
  Search,
  Settings,
  Shield,
  Users,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  group?: string;
}

const adminNav: NavItem[] = [
  { label: "Thủ thư", href: "/admin/librarians", icon: Shield, group: "Quản trị" },
  { label: "Quy định", href: "/admin/rules", icon: Settings, group: "Quản trị" },
];

const librarianNav: NavItem[] = [
  { label: "Độc giả", href: "/librarian/readers", icon: Users, group: "Bạn đọc" },
  { label: "Danh mục", href: "/librarian/books/categories", icon: BookCopy, group: "Danh mục" },
  { label: "Đầu sách", href: "/librarian/books/titles", icon: BookOpen, group: "Danh mục" },
  { label: "Cuốn sách", href: "/librarian/books/copies", icon: BookCopy, group: "Danh mục" },
  { label: "Nhập kho", href: "/librarian/inventory", icon: Box, group: "Kho" },
  { label: "Kiểm kê", href: "/librarian/audits", icon: ClipboardCheck, group: "Kho" },
  { label: "Yêu cầu", href: "/librarian/requests", icon: FileText, group: "Giao dịch" },
  { label: "Mượn/Trả", href: "/librarian/borrow-return", icon: Library, group: "Giao dịch" },
  { label: "Vi phạm", href: "/librarian/fines", icon: Receipt, group: "Giao dịch" },
  { label: "Báo cáo", href: "/librarian/reports", icon: BarChart3, group: "Báo cáo" },
];

const readerNav: NavItem[] = [
  { label: "Tra cứu", href: "/reader/search", icon: Search, group: "Danh mục" },
  { label: "Yêu cầu", href: "/reader/requests", icon: FileText, group: "Giao dịch" },
  { label: "Đang mượn", href: "/reader/my-borrows", icon: BookOpen, group: "Giao dịch" },
  { label: "Vi phạm", href: "/reader/my-fines", icon: Receipt, group: "Giao dịch" },
];

const roleNavMap: Record<string, NavItem[]> = {
  admin: adminNav,
  librarian: librarianNav,
  reader: readerNav,
};

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const navItems = roleNavMap[role] || [];

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    document.cookie = "user_role=; path=/; max-age=0";
    document.cookie = "user_status=; path=/; max-age=0";
    router.push("/login");
  };

  const groups = [...new Set(navItems.map((i) => i.group))];

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      <div className={cn(
        "flex h-16 items-center border-b border-gray-100",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-bold shadow-sm">
              S
            </div>
            <span className="text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">SmartLib</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          {collapsed ? (
            <Menu className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {groups.map((group) => (
          <div key={group} className="mb-2">
            {!collapsed && (
              <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {group}
              </p>
            )}
            {navItems
              .filter((item) => item.group === group)
              .map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center rounded-lg text-sm font-medium transition-all duration-150",
                      collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                      active
                        ? "bg-gradient-to-r from-blue-50 to-indigo-50/80 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-blue-500 to-indigo-500" />
                    )}
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] flex-shrink-0 transition-colors duration-150",
                        active
                          ? "text-blue-600"
                          : "text-gray-400 group-hover:text-gray-600"
                      )}
                      strokeWidth={active ? 2.5 : 2}
                    />
                    {!collapsed && (
                      <span className="ml-3 truncate">{item.label}</span>
                    )}
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-100 p-2">
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-all duration-150 hover:bg-red-50 hover:text-red-600 group",
            collapsed && "justify-center"
          )}
          title="Đăng xuất"
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0 text-gray-400 group-hover:text-red-500 transition-colors" />
          {!collapsed && <span className="ml-3">Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
}
