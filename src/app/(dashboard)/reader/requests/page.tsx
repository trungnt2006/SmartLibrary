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
import { FileText, Filter, X, QrCode } from "lucide-react";
import toast from "react-hot-toast";

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  completed: "Hoàn tất",
  expired: "Hết hạn",
  cancelled: "Đã hủy",
};

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
  const [total, setTotal] = useState(0);
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
        supabase.from("return_requests").select("*").eq("reader_id", profileId).limit(200),
        supabase.from("renewal_requests").select("*").eq("reader_id", profileId).limit(200),
      ]);
      const merged: any[] = [];
      (borrowRes.data || []).forEach((r: any) => merged.push({ ...r, _type: "borrow", _code: r.borrow_code }));
      (returnRes.data || []).forEach((r: any) => merged.push({ ...r, _type: "return", _code: r.return_code }));
      (renewalRes.data || []).forEach((r: any) => merged.push({ ...r, _type: "renewal", _code: "" }));

      merged.sort((a, b) => new Date(b.requested_at || b.created_at).getTime() - new Date(a.requested_at || a.created_at).getTime() || 0);
      setTotal(merged.length);
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

      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-gray-400" />
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
              {s === "all" ? "Tất cả" : STATUS_LABELS[s] || s}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center text-gray-400">Đang tải...</div>
          ) : paginated.length === 0 ? (
            <div className="p-6 text-center text-gray-400">Không có yêu cầu nào</div>
          ) : (
            <div className="divide-y">
              {paginated.map((item) => (
                <div key={`${item._type}-${item.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400 uppercase">{TYPE_LABELS[item._type]}</span>
                      <Badge status={item.status} />
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatDateTime(item.requested_at || item.created_at)}
                      {item._code && <span className="ml-2 font-mono text-xs text-gray-400">{item._code}</span>}
                    </p>
                    {item._type === "borrow" && item.details && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {(item.details || []).map((d: any) => d.book?.title).filter(Boolean).join(", ") || "-"}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === "approved" && item._code && (
                      <Button variant="outline" size="sm" onClick={() => setShowQR(item)}>
                        <QrCode className="h-4 w-4 mr-1" /> QR
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <Pagination page={page} totalPages={Math.ceil(filtered.length / pageSize)} onPageChange={setPage} />
      </Card>

      <Modal open={!!showQR} onClose={() => setShowQR(null)} title="Mã QR đến quầy" size="sm">
        {showQR && (
          <div className="flex flex-col items-center gap-4">
            <canvas ref={(el) => {
              if (el) QRCode.toCanvas(el, showQR._code, { width: 200, margin: 2 });
            }} />
            <p className="text-sm text-gray-500">Đưa mã này cho thủ thư để quét</p>
            <p className="font-mono text-xs text-gray-400">{showQR._code}</p>
            <Button variant="outline" onClick={() => setShowQR(null)}>Đóng</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
