"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { formatDateTime } from "@/lib/utils";
import { RotateCcw, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

type Tab = "borrow" | "return" | "renewal";

export default function ReaderRequestsPage() {
  const [tab, setTab] = useState<Tab>("borrow");
  const [requests, setRequests] = useState<any[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [profileId, setProfileId] = useState<string | null>(null);
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

  const fetchRequests = async () => {
    if (!profileId) return;
    setLoading(true);

    if (tab === "borrow") {
      const { data, count } = await supabase
        .from("borrow_requests")
        .select("*, details:borrow_request_details(*, book:books(*))", { count: "exact" })
        .eq("reader_id", profileId)
        .order("requested_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      setRequests(data || []);
      setTotal(count || 0);
    } else if (tab === "return") {
      const { data, count } = await supabase
        .from("return_requests")
        .select("*", { count: "exact" })
        .eq("reader_id", profileId)
        .order("requested_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      setRequests(data || []);
      setTotal(count || 0);
    } else {
      const { data, count } = await supabase
        .from("renewal_requests")
        .select("*", { count: "exact" })
        .eq("reader_id", profileId)
        .order("requested_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      setRequests(data || []);
      setTotal(count || 0);
    }

    setLoading(false);
  };

  const fetchBorrowRecords = async () => {
    if (!profileId) return;
    const { data } = await supabase
      .from("borrow_records")
      .select("*, details:borrow_details(*, book_copy:book_copies(*, book:books(*)))")
      .eq("reader_id", profileId)
      .in("status", ["active", "overdue"]);
    setBorrowRecords(data || []);
  };

  useEffect(() => {
    if (profileId) {
      fetchRequests();
      fetchBorrowRecords();
    }
  }, [profileId, tab, page]);

  const handleCreateReturnRequest = async (borrowRecordId: string) => {
    if (!profileId) { toast.error("Vui lòng đăng nhập"); return; }

    const { error } = await supabase.from("return_requests").insert({
      reader_id: profileId,
      borrow_record_id: borrowRecordId,
      status: "pending",
    });

    if (error) { toast.error("Lỗi: " + error.message); return; }
    toast.success("Gửi yêu cầu trả sách thành công! Chờ thủ thư duyệt.");
    fetchRequests();
    fetchBorrowRecords();
  };

  const handleCreateRenewalRequest = async (borrowDetailId: string, borrowRecordId: string, oldDueDate: string) => {
    if (!profileId) { toast.error("Vui lòng đăng nhập"); return; }

    const { error } = await supabase.from("renewal_requests").insert({
      reader_id: profileId,
      borrow_record_id: borrowRecordId,
      borrow_detail_id: borrowDetailId,
      status: "pending",
      old_due_date: oldDueDate,
    });

    if (error) { toast.error("Lỗi: " + error.message); return; }
    toast.success("Gửi yêu cầu gia hạn thành công! Chờ thủ thư duyệt.");
    fetchRequests();
  };

  const getColumns = () => {
    if (tab === "borrow") {
      return [
        { key: "requested_at", header: "Ngày gửi", render: (item: any) => formatDateTime(item.requested_at) },
        { key: "status", header: "Trạng thái", render: (item: any) => <Badge status={item.status} /> },
        { key: "borrow_code", header: "Mã mượn", render: (item: any) => item.borrow_code || "-" },
        { key: "expires_at", header: "Hết hạn", render: (item: any) => item.expires_at ? formatDateTime(item.expires_at) : "-" },
        { key: "note", header: "Ghi chú", render: (item: any) => item.note || "-" },
      ];
    }
    if (tab === "return") {
      return [
        { key: "requested_at", header: "Ngày gửi", render: (item: any) => formatDateTime(item.requested_at) },
        { key: "status", header: "Trạng thái", render: (item: any) => <Badge status={item.status} /> },
        { key: "return_code", header: "Mã trả", render: (item: any) => item.return_code || "-" },
      ];
    }
    return [
      { key: "requested_at", header: "Ngày gửi", render: (item: any) => formatDateTime(item.requested_at) },
      { key: "old_due_date", header: "Hạn cũ", render: (item: any) => new Date(item.old_due_date).toLocaleDateString("vi-VN") },
      { key: "status", header: "Trạng thái", render: (item: any) => <Badge status={item.status} /> },
    ];
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Yêu cầu của tôi</h1>
        <p className="text-sm text-gray-500 mt-1">Theo dõi yêu cầu mượn, trả và gia hạn sách</p>
      </div>

      <div className="flex gap-1 border-b bg-white rounded-t-xl px-4">
        {(["borrow", "return", "renewal"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "borrow" ? "Mượn" : t === "return" ? "Trả" : "Gia hạn"}
          </button>
        ))}
      </div>

      {tab === "return" && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <h3 className="text-sm font-semibold text-yellow-800">Sách đang mượn</h3>
          <div className="mt-2 space-y-2">
            {borrowRecords.length === 0 ? (
              <p className="text-sm text-yellow-600">Không có sách nào đang mượn</p>
            ) : (
              borrowRecords.map((record) => (
                <div key={record.id} className="rounded-lg bg-white p-3 shadow-sm border border-yellow-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {record.details?.map((d: any) => d.book_copy?.book?.title).join(", ")}
                      </p>
                      <p className="text-xs text-gray-500">Hạn trả: {new Date(record.due_date).toLocaleDateString("vi-VN")}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreateReturnRequest(record.id)}
                    >
                      <RotateCcw className="mr-1 h-4 w-4" /> Yêu cầu trả
                    </Button>
                  </div>
                  {record.details?.filter((d: any) => d.status === "active").map((d: any) => (
                    <div key={d.id} className="mt-2 flex items-center justify-between border-t border-yellow-100 pt-2 text-sm">
                      <span className="text-gray-600">{d.book_copy?.book?.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCreateRenewalRequest(d.id, record.id, d.due_date)}
                      >
                        <RefreshCw className="mr-1 h-4 w-4" /> Gia hạn
                      </Button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table columns={getColumns()} data={requests} keyExtractor={(item) => item.id} loading={loading} emptyMessage="Không có yêu cầu nào" />
        </CardContent>
        <Pagination page={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} />
      </Card>
    </div>
  );
}
