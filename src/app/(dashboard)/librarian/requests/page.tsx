"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { Modal } from "@/components/ui/modal";
import { formatDateTime, generateBorrowCode, generateReturnCode, generateQRPayload } from "@/lib/utils";
import { generateQR } from "@/lib/qr";
import { CheckCircle, XCircle, QrCode, Zap } from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

type UnifiedRequest = {
  id: string;
  request_type: "borrow" | "return" | "renewal";
  reader_id: string;
  reader: { full_name: string; email: string } | null;
  status: string;
  requested_at: string;
  borrow_code?: string | null;
  return_code?: string | null;
  old_due_date?: string;
  new_due_date?: string | null;
  rejection_reason?: string | null;
};

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "pending", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "rejected", label: "Từ chối" },
  { value: "completed", label: "Hoàn tất" },
  { value: "expired", label: "Hết hạn" },
  { value: "cancelled", label: "Đã hủy" },
];

const TYPE_OPTIONS = [
  { value: "", label: "Tất cả loại" },
  { value: "borrow", label: "Mượn sách" },
  { value: "return", label: "Trả sách" },
  { value: "renewal", label: "Gia hạn" },
];

const TABLE_MAP: Record<string, string> = {
  borrow: "borrow_requests",
  return: "return_requests",
  renewal: "renewal_requests",
};

export default function RequestsPage() {
  const [allRequests, setAllRequests] = useState<UnifiedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showQR, setShowQR] = useState<{ code: string; qr: string }>({ code: "", qr: "" });
  const [autoApprove, setAutoApprove] = useState(false);
  const pageSize = 15;
  const supabase = createClient();

  const fetchAll = useCallback(async () => {
    setLoading(true);

    const queries = [
      supabase.from("borrow_requests").select("*, reader:profiles!borrow_requests_reader_id_fkey(full_name, email)").order("requested_at", { ascending: false }).limit(200),
      supabase.from("return_requests").select("*, reader:profiles!return_requests_reader_id_fkey(full_name, email)").order("requested_at", { ascending: false }).limit(200),
      supabase.from("renewal_requests").select("*, reader:profiles!renewal_requests_reader_id_fkey(full_name, email)").order("requested_at", { ascending: false }).limit(200),
    ];
    const results = await Promise.all(queries);

    const merged: UnifiedRequest[] = [];
    for (const [idx, { data }] of results.entries()) {
      if (!data) continue;
      const type = ["borrow", "return", "renewal"][idx] as UnifiedRequest["request_type"];
      for (const item of data) {
        merged.push({
          id: item.id,
          request_type: type,
          reader_id: item.reader_id,
          reader: item.reader,
          status: item.status,
          requested_at: item.requested_at,
          borrow_code: item.borrow_code,
          return_code: item.return_code,
          old_due_date: item.old_due_date,
          new_due_date: item.new_due_date,
          rejection_reason: item.rejection_reason,
        });
      }
    }

    merged.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime();
    });

    setAllRequests(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = useMemo(() => {
    let list = allRequests;
    if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    if (typeFilter) list = list.filter((r) => r.request_type === typeFilter);
    return list;
  }, [allRequests, statusFilter, typeFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter]);

  const handleApprove = async (item: UnifiedRequest) => {
    const { data: profile } = await supabase.auth.getUser();
    const { data: librarian } = await supabase.from("profiles").select("id").eq("auth_user_id", profile.user!.id).single();
    if (!librarian) { toast.error("Không xác định thủ thư"); return; }

    if (item.request_type === "borrow") {
      const { data: rule } = await supabase.from("library_rules").select("value").eq("key", "max_borrow_books").single();
      const maxBorrow = parseInt(rule?.value || "5");
      const { count: reqCount } = await supabase
        .from("borrow_request_details")
        .select("*", { count: "exact", head: true })
        .eq("borrow_request_id", item.id);
      const { data: activeRecords } = await supabase
        .from("borrow_records")
        .select("id")
        .eq("reader_id", item.reader_id)
        .in("status", ["active", "overdue"]);
      const recordIds = activeRecords?.map((r) => r.id) || [];
      let activeCount = 0;
      if (recordIds.length > 0) {
        const { count } = await supabase
          .from("borrow_details")
          .select("*", { count: "exact", head: true })
          .in("borrow_record_id", recordIds)
          .eq("status", "active");
        activeCount = count || 0;
      }
      if (activeCount + (reqCount || 0) > maxBorrow) {
        toast.error(`Độc giả chỉ được mượn tối đa ${maxBorrow} cuốn. Hiện đang mượn ${activeCount} cuốn.`);
        return;
      }
    }

    const year = new Date().getFullYear();
    const isBorrow = item.request_type === "borrow";
    const code = isBorrow
      ? generateBorrowCode(year, Math.floor(Math.random() * 999999))
      : generateReturnCode(year, Math.floor(Math.random() * 999999));
    const qrType = isBorrow ? "BRW" : "RTN";
    const qrPayload = generateQRPayload(qrType, code);
    const qrDataUrl = await generateQR(qrPayload);

    const updateData: Record<string, any> = {
      status: "approved",
      approved_by: librarian.id,
      approved_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    };

    if (isBorrow) {
      updateData.borrow_code = code;
      updateData.qr_payload = qrPayload;
    } else {
      updateData.return_code = code;
      updateData.qr_payload = qrPayload;
    }

    const { error } = await supabase.from(TABLE_MAP[item.request_type]).update(updateData).eq("id", item.id);
    if (error) { toast.error("Lỗi: " + error.message); return; }

    toast.success("Đã duyệt yêu cầu");
    setShowQR({ code, qr: qrDataUrl });
    fetchAll();
  };

  const canAutoApprove = useCallback(async (item: UnifiedRequest): Promise<string | null> => {
    const { data: reader } = await supabase
      .from("profiles")
      .select("status, card_expires_at, date_of_birth")
      .eq("id", item.reader_id)
      .single();
    if (!reader) return "Không tìm thấy thông tin độc giả";
    if (reader.status === "locked") return "Độc giả đang bị khóa";
    if (reader.card_expires_at && new Date(reader.card_expires_at) < new Date()) return "Thẻ độc giả đã hết hạn";

    if (item.request_type === "borrow") {
      const { data: rule } = await supabase.from("library_rules").select("value").eq("key", "max_borrow_books").single();
      const maxBorrow = parseInt(rule?.value || "5");
      const { count: reqCount } = await supabase
        .from("borrow_request_details")
        .select("*", { count: "exact", head: true })
        .eq("borrow_request_id", item.id);
      const { data: activeRecords } = await supabase
        .from("borrow_records")
        .select("id")
        .eq("reader_id", item.reader_id)
        .in("status", ["active", "overdue"]);
      const recordIds = activeRecords?.map((r) => r.id) || [];
      let activeCount = 0;
      if (recordIds.length > 0) {
        const { count } = await supabase
          .from("borrow_details")
          .select("*", { count: "exact", head: true })
          .in("borrow_record_id", recordIds)
          .eq("status", "active");
        activeCount = count || 0;
      }
      if (activeCount + (reqCount || 0) > maxBorrow) return `Độc giả chỉ được mượn tối đa ${maxBorrow} cuốn (hiện mượn ${activeCount})`;

      const { data: ageRule } = await supabase.from("library_rules").select("value").eq("key", "min_reader_age").single();
      const minAge = parseInt(ageRule?.value || "0");
      if (minAge > 0 && reader.date_of_birth) {
        const age = Math.floor((Date.now() - new Date(reader.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < minAge) return `Độc giả chưa đủ ${minAge} tuổi`;
      }
    }

    return null;
  }, []);

  const handleAutoApproveAll = useCallback(async () => {
    const pending = allRequests.filter((r) => r.status === "pending");
    if (pending.length === 0) { toast("Không có yêu cầu nào chờ duyệt"); return; }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: librarian } = await supabase.from("profiles").select("id").eq("auth_user_id", user!.id).single();
    if (!librarian) { toast.error("Không xác định thủ thư"); return; }

    let approved = 0, rejected = 0;

    for (const item of pending) {
      const reason = await canAutoApprove(item);
      if (reason) {
        const { error } = await supabase
          .from(TABLE_MAP[item.request_type])
          .update({
            status: "rejected",
            rejected_by: librarian.id,
            rejected_at: new Date().toISOString(),
            rejection_reason: reason,
          })
          .eq("id", item.id);
        if (!error) rejected++;
      } else {
        const year = new Date().getFullYear();
        const isBorrow = item.request_type === "borrow";
        const code = isBorrow
          ? generateBorrowCode(year, Math.floor(Math.random() * 999999))
          : generateReturnCode(year, Math.floor(Math.random() * 999999));
        const qrType = isBorrow ? "BRW" : "RTN";
        const qrPayload = generateQRPayload(qrType, code);
        const qrDataUrl = await generateQR(qrPayload);

        const updateData: Record<string, any> = {
          status: "approved",
          approved_by: librarian.id,
          approved_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          qr_payload: qrPayload,
        };
        if (isBorrow) updateData.borrow_code = code;
        else updateData.return_code = code;

        const { error } = await supabase.from(TABLE_MAP[item.request_type]).update(updateData).eq("id", item.id);
        if (!error) approved++;
      }
    }

    toast.success(`Tự động duyệt: ${approved} chấp nhận, ${rejected} từ chối`);
    fetchAll();
  }, [allRequests, canAutoApprove, fetchAll]);

  const handleReject = async (item: UnifiedRequest) => {
    const reason = prompt("Lý do từ chối:");
    if (!reason) return;

    const { data: profile } = await supabase.auth.getUser();
    const { data: librarian } = await supabase.from("profiles").select("id").eq("auth_user_id", profile.user!.id).single();
    if (!librarian) { toast.error("Không xác định thủ thư"); return; }

    const { error } = await supabase
      .from(TABLE_MAP[item.request_type])
      .update({
        status: "rejected",
        rejected_by: librarian.id,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq("id", item.id);

    if (error) { toast.error("Lỗi: " + error.message); return; }
    toast.success("Đã từ chối yêu cầu");
    fetchAll();
  };

  const getCode = (item: UnifiedRequest) => {
    if (item.request_type === "borrow") return item.borrow_code;
    if (item.request_type === "return") return item.return_code;
    return item.old_due_date ? `Hạn cũ: ${new Date(item.old_due_date).toLocaleDateString("vi-VN")}` : "";
  };

  const columns = [
    {
      key: "type",
      header: "Loại",
      render: (item: UnifiedRequest) => (
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {item.request_type === "borrow" ? "Mượn" : item.request_type === "return" ? "Trả" : "Gia hạn"}
        </span>
      ),
    },
    { key: "reader", header: "Độc giả", render: (item: UnifiedRequest) => item.reader?.full_name || "-" },
    {
      key: "status",
      header: "Trạng thái",
      render: (item: UnifiedRequest) => <Badge status={item.status} />,
    },
    {
      key: "requested_at",
      header: "Ngày yêu cầu",
      render: (item: UnifiedRequest) => formatDateTime(item.requested_at),
    },
    {
      key: "code",
      header: "Mã / Chi tiết",
      render: (item: UnifiedRequest) => (
        <span className="text-sm font-mono text-gray-600">{getCode(item) || "-"}</span>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (item: UnifiedRequest) => (
        <div className="flex gap-2">
          {item.status === "pending" && (
            <>
              <Button variant="primary" size="sm" onClick={() => handleApprove(item)}>
                <CheckCircle className="mr-1 h-4 w-4" /> Duyệt
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleReject(item)}>
                <XCircle className="mr-1 h-4 w-4" /> Từ chối
              </Button>
            </>
          )}
          {(item.borrow_code || item.return_code) && (
            <Button variant="ghost" size="sm" onClick={() => {
              const qrType = item.request_type === "borrow" ? "BRW" : "RTN";
              const code = item.borrow_code || item.return_code || "";
              const qrPayload = generateQRPayload(qrType, code);
              generateQR(qrPayload).then((qr) => setShowQR({ code, qr }));
            }}>
              <QrCode className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Yêu cầu</h1>
        <p className="text-sm text-gray-500">Duyệt yêu cầu mượn, trả và gia hạn từ độc giả</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-36">
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={TYPE_OPTIONS} />
            </div>
            <div className="w-44">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={STATUS_OPTIONS} />
            </div>
            <button
              onClick={() => {
                setAutoApprove(!autoApprove);
                if (!autoApprove) setTimeout(() => handleAutoApproveAll(), 0);
              }}
              className={`ml-auto flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                autoApprove
                  ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              <Zap className={`h-4 w-4 ${autoApprove ? "text-blue-500" : "text-gray-400"}`} />
              {autoApprove ? "Đang tự động duyệt" : "Tự động duyệt"}
            </button>
            <div className="text-sm text-gray-500">
              {allRequests.filter((r) => r.status === "pending").length} yêu cầu chưa duyệt
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={paged}
            keyExtractor={(item) => `${item.request_type}-${item.id}`}
            loading={loading}
            emptyMessage="Không có yêu cầu nào"
          />
        </CardContent>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </Card>

      <Modal open={!!showQR.qr} onClose={() => setShowQR({ code: "", qr: "" })} title="Mã xử lý & QR" size="sm">
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg font-bold text-blue-600">{showQR.code}</p>
          {showQR.qr && (
            <Image src={showQR.qr} alt="QR Code" width={200} height={200} className="rounded-lg border" />
          )}
          <p className="text-sm text-gray-500">Độc giả xuất trình mã này tại quầy</p>
        </div>
      </Modal>
    </div>
  );
}
