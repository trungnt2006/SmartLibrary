"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { RotateCcw, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

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

  const fetchActive = async () => {
    if (!profileId) return;
    setLoading(true);
    const { data } = await supabase
      .from("borrow_records")
      .select("id, due_date, status, details:borrow_details(id, due_date, status, book_copy:book_copies(id, barcode, book:books(title)))")
      .eq("reader_id", profileId)
      .in("status", ["active", "overdue"])
      .order("created_at", { ascending: false });
    const flattened: any[] = [];
    for (const r of data || []) {
      for (const d of r.details || []) {
        if (d.status === "returned") continue;
        flattened.push({
          id: d.id,
          detail_id: d.id,
          record_id: r.id,
          copy_id: (d as any).book_copy?.id,
          record_status: r.status,
          due_date: d.due_date,
          book_title: (d as any).book_copy?.book?.title || "-",
          barcode: (d as any).book_copy?.barcode || "-",
        });
      }
    }
    setRecords(flattened);
    setLoading(false);
  };

  useEffect(() => {
    fetchActive();
  }, [profileId]);

  const genCode = () => `REQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const handleReturnRequest = async (detailId: string, copyId: string) => {
    const rec = records.find((r) => r.id === detailId);
    if (!rec) return;
    const { data: rr, error: rrErr } = await supabase.from("return_requests").insert({
      reader_id: profileId,
      borrow_record_id: rec.record_id,
      return_code: genCode(),
      status: "pending",
    }).select("id").single();
    if (rrErr) { toast.error("Lỗi: " + rrErr.message); return; }
    const { error } = await supabase.from("return_request_details").insert({
      return_request_id: rr.id,
      borrow_detail_id: detailId,
      book_copy_id: copyId,
    });
    if (error) { toast.error("Lỗi: " + error.message); return; }
    toast.success("Đã gửi yêu cầu trả sách!");
    fetchActive();
  };

  const handleRenewalRequest = async (detailId: string, dueDate: string) => {
    const rec = records.find((r) => r.id === detailId);
    if (!rec) return;
    const newDue = new Date(dueDate);
    newDue.setDate(newDue.getDate() + 14);
    const { error } = await supabase.from("renewal_requests").insert({
      reader_id: profileId,
      borrow_record_id: rec.record_id,
      borrow_detail_id: detailId,
      status: "pending",
      old_due_date: dueDate,
      new_due_date: newDue.toISOString().split("T")[0],
    });
    if (error) { toast.error("Lỗi: " + error.message); return; }
    toast.success("Đã gửi yêu cầu gia hạn!");
    fetchActive();
  };

  const columns = [
    { key: "book_title", header: "Sách" },
    { key: "barcode", header: "Mã vạch" },
    { key: "due_date", header: "Hạn trả", render: (item: any) => formatDate(item.due_date) },
    { key: "status", header: "Trạng thái", render: (item: any) => {
      const s = item.record_status;
      const map: Record<string, { bg: string; text: string; label: string }> = {
        active: { bg: "bg-blue-100", text: "text-blue-800", label: "Đang mượn" },
        overdue: { bg: "bg-red-100", text: "text-red-800", label: "Quá hạn" },
      };
      const c = map[s] || { bg: "bg-gray-100", text: "text-gray-800", label: s };
      return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
    } },
    {
      key: "actions",
      header: "",
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-50 text-xs" onClick={() => handleReturnRequest(item.detail_id, item.copy_id)}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Trả
          </Button>
          <Button size="sm" variant="outline" className="text-orange-700 border-orange-300 hover:bg-orange-50 text-xs" onClick={() => handleRenewalRequest(item.detail_id, item.due_date)}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Gia hạn
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sách đang mượn</h1>
        <p className="text-sm text-gray-500">Các sách đang mượn và quá hạn</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table columns={columns} data={records} keyExtractor={(item: any) => item.id} loading={loading} emptyMessage="Không có sách nào đang mượn" />
        </CardContent>
      </Card>
    </div>
  );
}
