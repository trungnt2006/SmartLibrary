"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart3, BookOpen, DollarSign, Users, AlertTriangle, TrendingUp,
  Download, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

const statusLabels: Record<string, string> = {
  available: "Có sẵn", borrowing: "Đang mượn", reserved: "Đã đặt",
  damaged: "Hư hỏng", lost: "Mất", inactive: "Ngừng KD",
};

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), 0, 1);
    return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
  });
  const [tempRange, setTempRange] = useState(dateRange);
  const [stats, setStats] = useState({
    totalReaders: 0, activeBorrows: 0, overdueBorrows: 0,
    totalFines: 0, paidFines: 0, availableBooks: 0,
  });
  const [borrowTrend, setBorrowTrend] = useState<any[]>([]);
  const [borrowSummary, setBorrowSummary] = useState({ total: 0, active: 0, overdue: 0, returned: 0 });
  const [fineTrend, setFineTrend] = useState<any[]>([]);
  const [bookStatusData, setBookStatusData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [topBooks, setTopBooks] = useState<any[]>([]);
  const supabase = createClient();

  const quickRanges = [
    { label: "7 ngày", days: 7 },
    { label: "30 ngày", days: 30 },
    { label: "90 ngày", days: 90 },
    { label: "Năm nay", days: 0 },
    { label: "Tất cả", days: -1 },
  ];

  const applyQuickRange = (days: number) => {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    let from: string;
    if (days === 0) {
      from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    } else if (days === -1) {
      from = "2000-01-01";
    } else {
      from = new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10);
    }
    setTempRange({ from, to });
    setDateRange({ from, to });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { from, to } = dateRange;

    const [
      readersR, activeR, overdueR, finesUnpaidR, finesPaidR, availR,
      borrowRecsR,
      paidFinesR,
      copiesR,
      detailsForCatR, detailsForTrendR,
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "reader"),
      supabase.from("borrow_records").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("borrow_records").select("*", { count: "exact", head: true }).eq("status", "overdue"),
      supabase.from("fine_tickets").select("amount").eq("status", "unpaid"),
      supabase.from("fine_tickets").select("amount").eq("status", "paid"),
      supabase.from("book_copies").select("*", { count: "exact", head: true }).eq("status", "available"),
      supabase.from("borrow_records").select("borrow_date,status").gte("borrow_date", from).lte("borrow_date", to),
      supabase.from("fine_tickets").select("amount,paid_at,status").gte("paid_at", from).lte("paid_at", to),
      supabase.from("book_copies").select("status"),
      supabase.from("borrow_details").select(`
        borrow_record_id,
        book_copy_id,
        borrow_records!inner(borrow_date,status),
        book_copies!inner(book_id, books!inner(id,title,category_id,categories!inner(name)))
      `),
      supabase.from("borrow_details").select(`
        id,
        return_date,
        status,
        borrow_records!inner(borrow_date)
      `).gte("borrow_records.borrow_date", from).lte("borrow_records.borrow_date", to),
    ]);

    if (detailsForTrendR.data) {
      const summary = { total: detailsForTrendR.data.length, active: 0, overdue: 0, returned: 0 };
      detailsForTrendR.data.forEach((d: any) => {
        if (d.status === "returned") summary.returned++;
        else if (d.status === "overdue") summary.overdue++;
        else summary.active++;
      });
      setBorrowSummary(summary);
    }

    if (detailsForTrendR.data) {
      const months: Record<string, { month: string; dangMuon: number; quaHan: number; daTra: number }> = {};
      detailsForTrendR.data.forEach((d: any) => {
        const borrowDate = d.borrow_records?.borrow_date;
        if (!borrowDate) return;
        const m = borrowDate.slice(0, 7);
        if (!months[m]) months[m] = { month: m, dangMuon: 0, quaHan: 0, daTra: 0 };
        if (d.status === "returned") months[m].daTra++;
        else if (d.status === "overdue") months[m].quaHan++;
        else months[m].dangMuon++;
      });
      setBorrowTrend(Object.values(months).sort((a, b) => a.month.localeCompare(b.month)));
    }

    if (paidFinesR.data) {
      const months: Record<string, { month: string; amount: number }> = {};
      paidFinesR.data.filter((f: any) => f.status === "paid").forEach((f: any) => {
        if (!f.paid_at) return;
        const m = f.paid_at.slice(0, 7);
        if (!months[m]) months[m] = { month: m, amount: 0 };
        months[m].amount += Number(f.amount);
      });
      setFineTrend(Object.values(months).sort((a, b) => a.month.localeCompare(b.month)));
    }

    if (copiesR.data) {
      const counts: Record<string, number> = {};
      copiesR.data.forEach((c: any) => { counts[c.status] = (counts[c.status] || 0) + 1; });
      setBookStatusData(Object.entries(counts).map(([k, v]) => ({ name: statusLabels[k] || k, value: v })));
    }

    if (detailsForCatR.data) {
      const catCounts: Record<string, number> = {};
      const bookCounts: Record<string, { title: string; count: number }> = {};
      detailsForCatR.data.forEach((d: any) => {
        const cat = d.book_copies?.books?.categories?.name;
        if (cat) catCounts[cat] = (catCounts[cat] || 0) + 1;
        const title = d.book_copies?.books?.title;
        if (title) {
          if (!bookCounts[title]) bookCounts[title] = { title, count: 0 };
          bookCounts[title].count++;
        }
      });
      setCategoryData(Object.entries(catCounts).map(([k, v]) => ({ name: k, value: v })));
      setTopBooks(Object.values(bookCounts).sort((a, b) => b.count - a.count).slice(0, 10));
    }

    setStats({
      totalReaders: readersR.count || 0,
      activeBorrows: activeR.count || 0,
      overdueBorrows: overdueR.count || 0,
      totalFines: finesUnpaidR.data?.reduce((s: number, f: any) => s + Number(f.amount), 0) || 0,
      paidFines: finesPaidR.data?.reduce((s: number, f: any) => s + Number(f.amount), 0) || 0,
      availableBooks: availR.count || 0,
    });
    setLoading(false);
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const rows = [
      ["Thống kê thư viện", `Từ ${dateRange.from} đến ${dateRange.to}`],
      [],
      ["Chỉ số", "Giá trị"],
      ["Độc giả", stats.totalReaders],
      ["Đang mượn", stats.activeBorrows],
      ["Quá hạn", stats.overdueBorrows],
      ["Sách có sẵn", stats.availableBooks],
      ["Tiền phạt chưa thu", stats.totalFines],
      ["Đã thu phạt", stats.paidFines],
      [],
      ["Xu hướng mượn theo tháng"],
      ["Tháng", "Đang mượn", "Quá hạn", "Đã trả"],
      ...borrowTrend.map((m: any) => [m.month, m.dangMuon, m.quaHan, m.daTra]),
      [],
      ["Doanh thu phạt theo tháng"],
      ["Tháng", "Số tiền"],
      ...fineTrend.map((m: any) => [m.month, m.amount]),
      [],
      ["Sách mượn nhiều nhất"],
      ["Tên sách", "Lượt mượn"],
      ...topBooks.map((b: any) => [b.title, b.count]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Báo cáo");
    XLSX.writeFile(wb, `bao-cao-thu-vien_${dateRange.from}_${dateRange.to}.xlsx`);
    toast.success("Xuất Excel thành công!");
  };

  const statCards = [
    { label: "Độc giả", value: stats.totalReaders, icon: Users, color: "bg-blue-500" },
    { label: "Sách có sẵn", value: stats.availableBooks, icon: TrendingUp, color: "bg-purple-500" },
    { label: "Tiền phạt chưa thu", value: formatCurrency(stats.totalFines), icon: DollarSign, color: "bg-orange-500" },
    { label: "Đã thu phạt", value: formatCurrency(stats.paidFines), icon: DollarSign, color: "bg-teal-500" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="rounded-lg bg-white px-3 py-2 shadow-lg border text-sm">
        <p className="font-medium text-gray-900 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="text-gray-600">
            {p.name}: <span className="font-semibold">{typeof p.value === "number" && p.name.includes("VNĐ") ? formatCurrency(p.value) : p.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo cáo thống kê</h1>
          <p className="text-sm text-gray-500">Tổng quan tình hình hoạt động thư viện</p>
        </div>
        <div className="flex items-center gap-2">
          {quickRanges.map((q) => (
            <Button key={q.label} variant="outline" size="sm" onClick={() => applyQuickRange(q.days)}
              className={dateRange.from === (q.days === 0 ? new Date().getFullYear() + "-01-01" : q.days === -1 ? "2000-01-01" : new Date(Date.now() - q.days * 86400000).toISOString().slice(0, 10)) ? "border-blue-500 text-blue-600" : ""}>
              {q.label}
            </Button>
          ))}
          <div className="h-6 w-px bg-gray-200" />
          <input type="date" className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" value={tempRange.from}
            onChange={(e) => setTempRange({ ...tempRange, from: e.target.value })} />
          <span className="text-gray-400">→</span>
          <input type="date" className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" value={tempRange.to}
            onChange={(e) => setTempRange({ ...tempRange, to: e.target.value })} />
          <Button size="sm" onClick={() => setDateRange(tempRange)}>Lọc</Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1.5 h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Tổng mượn", value: borrowSummary.total, color: "bg-blue-500" },
              { label: "Đang mượn", value: borrowSummary.active, color: "bg-green-500" },
              { label: "Quá hạn", value: borrowSummary.overdue, color: "bg-red-500" },
              { label: "Đã trả", value: borrowSummary.returned, color: "bg-teal-500" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500">{s.label}</p>
                      <p className="mt-0.5 text-2xl font-bold text-gray-900">{s.value}</p>
                    </div>
                    <div className={`rounded-lg p-3 ${s.color}`}>
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><h3 className="text-sm font-medium text-gray-700">Xu hướng mượn sách</h3></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={borrowTrend.length ? borrowTrend : [{ month: "Không có dữ liệu", dangMuon: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="dangMuon" stackId="a" fill="#3b82f6" name="Đang mượn" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="quaHan" stackId="a" fill="#ef4444" name="Quá hạn" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="daTra" stackId="a" fill="#10b981" name="Đã trả" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><h3 className="text-sm font-medium text-gray-700">Doanh thu phạt theo tháng</h3></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fineTrend.length ? fineTrend : [{ month: "Không có dữ liệu", amount: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="amount" fill="#f97316" name="Tiền phạt (VNĐ)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><h3 className="text-sm font-medium text-gray-700">Tình trạng sách</h3></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={bookStatusData.length ? bookStatusData : [{ name: "Chưa có dữ liệu", value: 1 }]}
                      cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                      paddingAngle={3} dataKey="value"
                      label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                      {bookStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><h3 className="text-sm font-medium text-gray-700">Thể loại sách được mượn</h3></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData.length ? categoryData : [{ name: "Chưa có dữ liệu", value: 1 }]}
                      cx="50%" cy="50%" outerRadius={100}
                      paddingAngle={3} dataKey="value"
                      label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><h3 className="text-sm font-medium text-gray-700">Top sách được mượn nhiều nhất</h3></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Tên sách</th>
                      <th className="pb-2 font-medium text-right">Lượt mượn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topBooks.length === 0 ? (
                      <tr><td colSpan={3} className="py-8 text-center text-gray-400">Chưa có dữ liệu</td></tr>
                    ) : topBooks.map((b, i) => (
                      <tr key={b.title} className="border-b last:border-0">
                        <td className="py-2.5 text-gray-400">{i + 1}</td>
                        <td className="py-2.5 font-medium text-gray-900">{b.title}</td>
                        <td className="py-2.5 text-right font-semibold text-blue-600">{b.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
