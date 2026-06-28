"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";

import { formatDate } from "@/lib/utils";
import { BookOpen } from "lucide-react";

export default function MyBorrowsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
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
    const fetchRecords = async () => {
      setLoading(true);
      const { data, count } = await supabase
        .from("borrow_details")
        .select("*, borrow_record:borrow_records!inner(*), book_copy:book_copies(*, book:books(*))", { count: "exact" })
        .eq("borrow_record.reader_id", profileId)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      setRecords(data || []);
      setTotal(count || 0);
      setLoading(false);
    };
    fetchRecords();
  }, [profileId, page]);

  const columns = [
    {
      key: "book",
      header: "Sách",
      render: (item: any) => item.book_copy?.book?.title || "-",
    },
    { key: "borrow_date", header: "Ngày mượn", render: (item: any) => formatDate(item.borrow_record?.borrow_date) },
    { key: "due_date", header: "Hạn trả", render: (item: any) => formatDate(item.due_date) },
    { key: "status", header: "Trạng thái", render: (item: any) => <Badge status={item.status} /> },
    {
      key: "return_date",
      header: "Ngày trả",
      render: (item: any) => (item.return_date ? formatDate(item.return_date) : "-"),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sách của tôi</h1>
        <p className="text-sm text-gray-500">Lịch sử mượn trả sách</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table columns={columns} data={records} keyExtractor={(item) => item.id} loading={loading} emptyMessage="Chưa có lịch sử mượn sách" />
        </CardContent>
        <Pagination page={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} />
      </Card>
    </div>
  );
}
