"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, BookOpen, DollarSign, Users, AlertTriangle, TrendingUp } from "lucide-react";

export default function ReportsPage() {
  const [stats, setStats] = useState({
    totalReaders: 0,
    activeBorrows: 0,
    overdueBorrows: 0,
    totalFines: 0,
    paidFines: 0,
    availableBooks: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchStats = async () => {
      const [readers, activeBorrows, overdueBorrows, fines, paidFines, availableBooks] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "reader"),
        supabase.from("borrow_records").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("borrow_records").select("*", { count: "exact", head: true }).eq("status", "overdue"),
        supabase.from("fine_tickets").select("amount").eq("status", "unpaid"),
        supabase.from("fine_tickets").select("amount").eq("status", "paid"),
        supabase.from("book_copies").select("*", { count: "exact", head: true }).eq("status", "available"),
      ]);

      const totalFines = fines.data?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;
      const totalPaid = paidFines.data?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;

      setStats({
        totalReaders: readers.count || 0,
        activeBorrows: activeBorrows.count || 0,
        overdueBorrows: overdueBorrows.count || 0,
        totalFines,
        paidFines: totalPaid,
        availableBooks: availableBooks.count || 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: "Độc giả", value: stats.totalReaders, icon: Users, color: "bg-blue-500" },
    { label: "Đang mượn", value: stats.activeBorrows, icon: BookOpen, color: "bg-green-500" },
    { label: "Quá hạn", value: stats.overdueBorrows, icon: AlertTriangle, color: "bg-red-500" },
    { label: "Sách có sẵn", value: stats.availableBooks, icon: TrendingUp, color: "bg-purple-500" },
    { label: "Tiền phạt chưa thu", value: formatCurrency(stats.totalFines), icon: DollarSign, color: "bg-orange-500" },
    { label: "Đã thu phạt", value: formatCurrency(stats.paidFines), icon: DollarSign, color: "bg-teal-500" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Báo cáo thống kê</h1>
        <p className="text-sm text-gray-500">Tổng quan tình hình hoạt động thư viện</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`rounded-lg p-3 ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
