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
      const { data } = await supabase
        .from("borrow_records")
        .select("*, details:borrow_details(*, book_copy:book_copies(*, book:books(*)))")
        .eq("reader_id", profileId)
        .order("created_at", { ascending: false });
      const flattened: any[] = [];
      for (const r of data || []) {
        for (const d of r.details || []) {
          flattened.push({
            id: d.id,
            book_copy: d.book_copy,
            due_date: d.due_date,
            status: d.status,
            return_date: d.return_date,
            borrow_date: r.borrow_date,
          });
        }
      }
      setRecords(flattened);
      setLoading(false);
    };
    fetchRecords();
  }, [profileId]);

  const columns = [
    {
      key: "book",
      header: "Sách",
      render: (item: any) => item.book_copy?.book?.title || "-",
    },
    { key: "borrow_date", header: "Ngày mượn", render: (item: any) => formatDate(item.borrow_date) },
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
      </Card>
    </div>
  );
}
