"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { formatDate } from "@/lib/utils";
import { Clock } from "lucide-react";

export default function HistoryPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 15;
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("id").eq("auth_user_id", user.id).single().then(({ data }) => {
        if (data) setProfileId(data.id);
      });
    });
  }, []);

  useEffect(() => {
    if (!profileId) return;
    const fetchHistory = async () => {
      setLoading(true);
      const { data, count } = await supabase
        .from("borrow_records")
        .select("*, details:borrow_details(*, book_copy:book_copies(*, book:books(*)))", { count: "exact" })
        .eq("reader_id", profileId)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      const flattened: any[] = [];
      for (const r of data || []) {
        for (const d of r.details || []) {
          flattened.push({
            id: d.id,
            book_title: d.book_copy?.book?.title || "-",
            barcode: d.book_copy?.barcode || "-",
            borrow_date: r.borrow_date,
            due_date: d.due_date,
            return_date: d.return_date,
            status: d.status,
            source: r.source,
          });
        }
      }
      setRecords(flattened);
      setTotal(count || 0);
      setLoading(false);
    };
    fetchHistory();
  }, [profileId, page]);

  const columns = [
    { key: "book_title", header: "Sách" },
    { key: "barcode", header: "Mã vạch" },
    { key: "borrow_date", header: "Ngày mượn", render: (item: any) => formatDate(item.borrow_date) },
    { key: "due_date", header: "Hạn trả", render: (item: any) => formatDate(item.due_date) },
    { key: "return_date", header: "Ngày trả", render: (item: any) => item.return_date ? formatDate(item.return_date) : "-" },
    { key: "status", header: "Trạng thái", render: (item: any) => {
      const s = item.status;
      const map: Record<string, { bg: string; text: string; label: string }> = {
        active: { bg: "bg-blue-100", text: "text-blue-800", label: "Đang mượn" },
        overdue: { bg: "bg-red-100", text: "text-red-800", label: "Quá hạn" },
        returned: { bg: "bg-green-100", text: "text-green-800", label: "Đã trả" },
      };
      const c = map[s] || { bg: "bg-gray-100", text: "text-gray-800", label: s };
      return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
    } },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lịch sử mượn sách</h1>
        <p className="text-sm text-gray-500">Toàn bộ lịch sử mượn trả sách</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table columns={columns} data={records} keyExtractor={(item: any) => item.id} loading={loading} emptyMessage="Chưa có lịch sử mượn sách" />
        </CardContent>
        <Pagination page={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} />
      </Card>
    </div>
  );
}
