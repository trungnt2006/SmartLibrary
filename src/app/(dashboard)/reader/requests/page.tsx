"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/shared/pagination";
import { formatDateTime } from "@/lib/utils";
import QRCode from "qrcode";
import { BookOpen, RotateCcw, RefreshCw, QrCode, Filter, Clock, CheckCircle, XCircle, AlertTriangle, Ban, Archive } from "lucide-react";

const TYPE_ICONS: Record<string, any> = {
  borrow: BookOpen,
  return: RotateCcw,
  renewal: RefreshCw,
};

const TYPE_LABELS: Record<string, string> = {
  borrow: "Mượn sách",
  return: "Trả sách",
  renewal: "Gia hạn",
};

const TYPE_COLORS: Record<string, string> = {
  borrow: "text-blue-600 bg-blue-50 border-blue-200",
  return: "text-emerald-600 bg-emerald-50 border-emerald-200",
  renewal: "text-amber-600 bg-amber-50 border-amber-200",
};

const STATUS_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "approved", label: "Đã duyệt" },
  { key: "rejected", label: "Từ chối" },
  { key: "completed", label: "Hoàn tất" },
  { key: "expired", label: "Hết hạn" },
  { key: "cancelled", label: "Đã hủy" },
];

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
        supabase.from("borrow_requests").select("*, details:borrow_request_details(*, book:books(*))").eq("reader_id", profileId).limit(200),
        supabase.from("return_requests").select("*, borrow_record:borrow_records(id, details:borrow_details(*, book_copy:book_copies(*, book:books(*))))").eq("reader_id", profileId).limit(200),
        supabase.from("renewal_requests").select("*, borrow_detail:borrow_details(*, book_copy:book_copies(*, book:books(*)))").eq("reader_id", profileId).limit(200),
      ]);
      const merged: any[] = [];
      (borrowRes.data || []).forEach((r: any) => merged.push({ ...r, _type: "borrow", _code: r.borrow_code }));
      (returnRes.data || []).forEach((r: any) => merged.push({ ...r, _type: "return", _code: r.return_code }));
      (renewalRes.data || []).forEach((r: any) => merged.push({ ...r, _type: "renewal", _code: "" }));

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Yêu cầu của tôi</h1>
        <p className="text-sm text-gray-500">Tất cả yêu cầu mượn, trả và gia hạn</p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="h-4 w-4 text-gray-400 shrink-0" />
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.key}
            onClick={() => { setStatusFilter(s.key); setPage(1); }}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              statusFilter === s.key
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : paginated.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Archive className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">Không có yêu cầu nào</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paginated.map((item) => {
            const TypeIcon = TYPE_ICONS[item._type];
            let bookTitle = "";
            if (item._type === "borrow" && item.details) {
              bookTitle = item.details.map((d: any) => d.book?.title).filter(Boolean).join(", ");
            } else if (item._type === "return" && item.borrow_record?.details) {
              bookTitle = item.borrow_record.details.map((d: any) => d.book_copy?.book?.title).filter(Boolean).join(", ");
            } else if (item._type === "renewal" && item.borrow_detail?.book_copy?.book?.title) {
              bookTitle = item.borrow_detail.book_copy.book.title;
            }

            return (
              <Card key={`${item._type}-${item.id}`} hover className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${TYPE_COLORS[item._type]}`}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{TYPE_LABELS[item._type]}</span>
                        <Badge status={item.status} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDateTime(item.requested_at || item.created_at)}
                        {item._code && <span className="ml-2 font-mono text-gray-300">{item._code}</span>}
                      </p>
                      {bookTitle && (
                        <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">{bookTitle}</p>
                      )}
                      {item._type === "renewal" && item.old_due_date && (
                        <p className="text-xs text-gray-400 mt-1">
                          Hạn cũ: {new Date(item.old_due_date).toLocaleDateString("vi-VN")}
                          {item.new_due_date && <> → Hạn mới: {new Date(item.new_due_date).toLocaleDateString("vi-VN")}</>}
                        </p>
                      )}
                      {item.status === "rejected" && item.rejection_reason && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg">
                          <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>{item.rejection_reason}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === "approved" && item._code && (
                        <Button variant="outline" size="sm" onClick={() => setShowQR(item)}
                          className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          <QrCode className="h-4 w-4 mr-1" /> Mã QR
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <Pagination page={page} totalPages={Math.ceil(filtered.length / pageSize)} onPageChange={setPage} />
        </div>
      )}

      <Modal open={!!showQR} onClose={() => setShowQR(null)} title="Mã QR đến quầy" size="sm">
        {showQR && (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-4 bg-gray-50">
              <canvas ref={(el) => {
                if (el) QRCode.toCanvas(el, showQR._code, { width: 220, margin: 2 });
              }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Đưa mã này cho thủ thư quét</p>
              <p className="mt-1 font-mono text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-lg inline-block">{showQR._code}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowQR(null)}>Đóng</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
