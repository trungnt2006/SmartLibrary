"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { formatDateTime } from "@/lib/utils";
import QRCode from "qrcode";
import { QrCode } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  borrow: "Mượn sách",
  return: "Trả sách",
  renewal: "Gia hạn",
};

export default function ReaderRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [showQR, setShowQR] = useState<any>(null);
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
    const fetchAll = async () => {
      setLoading(true);

      const [borrowRes, returnRes, renewalRes] = await Promise.all([
        supabase.from("borrow_requests").select("*").eq("reader_id", profileId).limit(200),
        supabase.from("return_requests").select("*").eq("reader_id", profileId).limit(200),
        supabase.from("renewal_requests").select("*").eq("reader_id", profileId).limit(200),
      ]);

      // Resolve book titles in parallel
      const borrowRows = borrowRes.data || [];
      const returnRows = returnRes.data || [];
      const renewalRows = renewalRes.data || [];

      const borrowIds = borrowRows.map((r: any) => r.id);
      const returnIds = returnRows.map((r: any) => r.id);
      const detailIds = renewalRows.map((r: any) => r.borrow_detail_id).filter(Boolean);

      const [bDetailsRes, rDetailsRes, detRes] = await Promise.all([
        borrowIds.length ? supabase.from("borrow_request_details").select("borrow_request_id, book:books!inner(title)").in("borrow_request_id", borrowIds) : Promise.resolve({ data: [] }),
        returnIds.length ? supabase.from("return_request_details").select("return_request_id, book_copy:book_copies!inner(book:books!inner(title))").in("return_request_id", returnIds) : Promise.resolve({ data: [] }),
        detailIds.length ? supabase.from("borrow_details").select("id, book_copy:book_copies!inner(book:books!inner(title))").in("id", detailIds) : Promise.resolve({ data: [] }),
      ]);

      const borrowTitleMap: Record<string, string> = {};
      (bDetailsRes.data || []).forEach((d: any) => {
        const cur = borrowTitleMap[d.borrow_request_id] || "";
        borrowTitleMap[d.borrow_request_id] = cur ? cur + ", " + d.book.title : d.book.title;
      });
      const returnTitleMap: Record<string, string> = {};
      (rDetailsRes.data || []).forEach((d: any) => {
        const cur = returnTitleMap[d.return_request_id] || "";
        returnTitleMap[d.return_request_id] = cur ? cur + ", " + d.book_copy.book.title : d.book_copy.book.title;
      });
      const renewalTitleMap: Record<string, string> = {};
      (detRes.data || []).forEach((d: any) => { renewalTitleMap[d.id] = d.book_copy?.book?.title || ""; });

      const merged: any[] = [
        ...borrowRows.map((r: any) => ({ ...r, _type: "borrow", _code: r.borrow_code, _book_titles: borrowTitleMap[r.id] || "" })),
        ...returnRows.map((r: any) => ({ ...r, _type: "return", _code: r.return_code, _book_titles: returnTitleMap[r.id] || "" })),
        ...renewalRows.map((r: any) => ({ ...r, _type: "renewal", _code: "", _book_titles: renewalTitleMap[r.borrow_detail_id] || "" })),
      ];
      merged.sort((a, b) => new Date(b.requested_at || b.created_at).getTime() - new Date(a.requested_at || a.created_at).getTime());
      setRequests(merged);
      setLoading(false);
    };
    fetchAll();
  }, [profileId]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter((r) => r.status === statusFilter);
  }, [requests, statusFilter]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const getBookTitle = (item: any) => item._book_titles || "";

  const columns = [
    { key: "type", header: "Loại", render: (item: any) => (
      <span className="text-sm font-medium text-gray-900">{TYPE_LABELS[item._type] || item._type}</span>
    )},
    { key: "book", header: "Sách", render: (item: any) => {
      const t = getBookTitle(item);
      return <span className="text-sm text-gray-600 line-clamp-1">{t || "-"}</span>;
    }},
    { key: "date", header: "Ngày gửi", render: (item: any) => <span className="text-sm text-gray-500">{formatDateTime(item.requested_at || item.created_at)}</span>},
    { key: "code", header: "Mã", render: (item: any) => item._code ? <span className="text-sm font-mono text-gray-800 font-semibold">{item._code}</span> : "-"},
    { key: "status", header: "Trạng thái", render: (item: any) => <Badge status={item.status} /> },
    {
      key: "actions",
      header: "",
      render: (item: any) => item.status === "approved" && item._code ? (
        <Button variant="ghost" size="sm" onClick={() => setShowQR(item)} title="Mã QR" className="text-blue-600">
          <QrCode className="h-4 w-4" />
        </Button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Yêu cầu của tôi</h1>
        <p className="text-sm text-gray-500">Tất cả yêu cầu mượn, trả và gia hạn</p>
      </div>

      <div className="flex gap-1 flex-wrap">
        {["all", "pending", "approved", "rejected", "completed", "expired", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              statusFilter === s
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {s === "all" ? "Tất cả" : s === "pending" ? "Chờ duyệt" : s === "approved" ? "Đã duyệt" : s === "rejected" ? "Từ chối" : s === "completed" ? "Hoàn tất" : s === "expired" ? "Hết hạn" : "Đã hủy"}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table columns={columns} data={paginated} keyExtractor={(item: any) => `${item._type}-${item.id}`} loading={loading} emptyMessage="Không có yêu cầu nào" />
        </CardContent>
        <Pagination page={page} totalPages={Math.ceil(filtered.length / pageSize)} onPageChange={setPage} />
      </Card>

      <Modal open={!!showQR} onClose={() => setShowQR(null)} title="Mã QR đến quầy" size="sm">
        {showQR && (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-4 bg-gray-50">
              <canvas ref={(el) => { if (el) QRCode.toCanvas(el, showQR._code, { width: 220, margin: 2 }); }} />
            </div>
            <p className="text-sm font-medium text-gray-700">Đưa mã này cho thủ thư quét</p>
            <p className="font-mono text-sm text-gray-800 font-semibold bg-gray-100 px-3 py-1 rounded-lg">{showQR._code}</p>
            <Button variant="outline" onClick={() => setShowQR(null)}>Đóng</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
