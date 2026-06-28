"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import type { BorrowRecord } from "@/types";
import { formatDate } from "@/lib/utils";
import { Scan, BookOpen, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function BorrowReturnPage() {
  const [tab, setTab] = useState<"borrow" | "return">("borrow");
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanCode, setScanCode] = useState("");
  const pageSize = 10;
  const supabase = createClient();

  const fetchRecords = async () => {
    setLoading(true);
    let query = supabase
      .from("borrow_records")
      .select("*, reader:profiles!borrow_records_reader_id_fkey(full_name, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (tab === "borrow") {
      query = query.in("status", ["active", "overdue"]);
    } else {
      query = query.eq("status", "returned");
    }

    const { data, count } = await query;
    setRecords(data || []);
    setTotal(count || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, [tab, page]);

  const handleScanComplete = async () => {
    if (!scanCode.trim()) return;

    if (tab === "borrow") {
      const { data: request } = await supabase
        .from("borrow_requests")
        .select("*, reader:profiles!borrow_requests_reader_id_fkey(*)")
        .eq("borrow_code", scanCode.trim())
        .single();

      if (!request) {
        toast.error("Không tìm thấy mã mượn");
        return;
      }

      if (request.status !== "approved") {
        toast.error("Yêu cầu chưa được duyệt hoặc đã hết hạn");
        return;
      }

      const { data: profile } = await supabase.auth.getUser();
      const { data: librarian } = await supabase.from("profiles").select("id").eq("auth_user_id", profile.user!.id).single();
      if (!librarian) { toast.error("Không xác định thủ thư"); return; }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const { data: record, error } = await supabase.from("borrow_records").insert({
        reader_id: request.reader_id,
        librarian_id: librarian.id,
        borrow_date: new Date().toISOString().split("T")[0],
        due_date: dueDate.toISOString().split("T")[0],
        status: "active",
        source: "online",
        created_from_request_id: request.id,
      }).select().single();

      if (error) { toast.error("Lỗi: " + error.message); return; }

      const { data: details } = await supabase.from("borrow_request_details").select("*").eq("borrow_request_id", request.id);
      if (details) {
        const borrowDetails = await Promise.all(details.map(async (d) => {
          const { data: availableCopy } = await supabase.from("book_copies").select("id").eq("book_id", d.book_id).eq("status", "available").limit(1).single();
          if (availableCopy) {
            await supabase.from("book_copies").update({ status: "borrowing" }).eq("id", availableCopy.id);
            return { borrow_record_id: record.id, book_copy_id: availableCopy.id, due_date: record.due_date, status: "active" };
          }
          return null;
        }));

        const validDetails = borrowDetails.filter((d): d is NonNullable<typeof d> => d != null);
        await supabase.from("borrow_details").insert(validDetails);
      }

      await supabase.from("borrow_requests").update({ status: "completed", completed_by: librarian.id, completed_at: new Date().toISOString() }).eq("id", request.id);

      toast.success("Xác nhận cho mượn sách thành công");
    } else {
      const { data: request } = await supabase
        .from("return_requests")
        .select("*")
        .eq("return_code", scanCode.trim())
        .single();

      if (!request) {
        toast.error("Không tìm thấy mã trả");
        return;
      }

      if (request.status !== "approved") {
        toast.error("Yêu cầu chưa được duyệt");
        return;
      }

      const { data: profile } = await supabase.auth.getUser();
      const { data: librarian } = await supabase.from("profiles").select("id").eq("auth_user_id", profile.user!.id).single();
      if (!librarian) { toast.error("Không xác định thủ thư"); return; }

      await supabase.from("borrow_details").update({ return_date: new Date().toISOString().split("T")[0], status: "returned" }).eq("borrow_record_id", request.borrow_record_id);

      const { data: details } = await supabase.from("borrow_details").select("book_copy_id").eq("borrow_record_id", request.borrow_record_id);
      if (details) {
        for (const d of details) {
          await supabase.from("book_copies").update({ status: "available" }).eq("id", d.book_copy_id);
        }
      }

      const allReturned = await supabase.from("borrow_details").select("*").eq("borrow_record_id", request.borrow_record_id).eq("status", "returned");
      const totalDetails = await supabase.from("borrow_details").select("*", { count: "exact", head: true }).eq("borrow_record_id", request.borrow_record_id);

      if (allReturned.data?.length === totalDetails.count) {
        await supabase.from("borrow_records").update({ status: "returned" }).eq("id", request.borrow_record_id);
      }

      await supabase.from("return_requests").update({ status: "completed", completed_by: librarian.id, completed_at: new Date().toISOString() }).eq("id", request.id);

      toast.success("Xác nhận trả sách thành công");
    }

    setScanCode("");
    setShowScanModal(false);
    fetchRecords();
  };

  const columns = [
    { key: "reader", header: "Độc giả", render: (item: BorrowRecord) => item.reader?.full_name || "-" },
    { key: "borrow_date", header: "Ngày mượn", render: (item: BorrowRecord) => formatDate(item.borrow_date) },
    { key: "due_date", header: "Hạn trả", render: (item: BorrowRecord) => formatDate(item.due_date) },
    { key: "status", header: "Trạng thái", render: (item: BorrowRecord) => <Badge status={item.status} /> },
    { key: "source", header: "Nguồn", render: (item: BorrowRecord) => item.source === "online" ? "Online" : "Tại quầy" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mượn / Trả sách</h1>
          <p className="text-sm text-gray-500">Xác nhận mượn/trả sách tại quầy</p>
        </div>
        <Button onClick={() => setShowScanModal(true)}>
          <Scan className="mr-2 h-4 w-4" /> Quét mã / Nhập mã
        </Button>
      </div>

      <div className="flex gap-2 border-b">
        {(["borrow", "return"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "borrow" ? "Đang mượn" : "Đã trả"}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table columns={columns} data={records} keyExtractor={(item) => item.id} loading={loading} emptyMessage="Không có phiếu mượn nào" />
        </CardContent>
        <Pagination page={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} />
      </Card>

      <Modal open={showScanModal} onClose={() => { setShowScanModal(false); setScanCode(""); }} title="Quét hoặc nhập mã" size="sm">
        <div className="space-y-4">
          <Input
            id="scanCode"
            label="Mã mượn/trả"
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value)}
            placeholder="VD: BRW-2026-xxxxxx hoặc RTN-2026-xxxxxx"
          />
          <Button className="w-full" onClick={handleScanComplete}>
            <CheckCircle className="mr-2 h-4 w-4" /> Xác nhận
          </Button>
        </div>
      </Modal>
    </div>
  );
}
