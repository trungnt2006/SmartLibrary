"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { DollarSign, Search, Eye, CreditCard, CheckCircle } from "lucide-react";
import QRCode from "qrcode";
import toast from "react-hot-toast";

const REASON_LABELS: Record<string, string> = {
  overdue: "Quá hạn",
  damaged: "Hư hỏng",
  lost: "Mất sách",
};

const CONDITION_LABELS: Record<string, string> = {
  available: "Đã trả",
  damaged: "Hư hỏng",
  lost: "Mất",
};

export default function FinesPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDetail, setShowDetail] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const supabase = createClient();

  const fetchFines = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("fine_tickets")
      .select("*, reader:profiles!fine_tickets_reader_id_fkey(full_name, email, employee_code), borrow_detail:borrow_details!borrow_detail_id(due_date, return_date, status, book_copy:book_copies(id, barcode, book:books(title)))")
      .order("created_at", { ascending: false })
      .limit(500);

    const all = data || [];
    const grouped: Record<string, any> = {};
    for (const f of all) {
      const rid = f.reader_id;
      if (!grouped[rid]) {
        grouped[rid] = {
          reader_id: rid,
          reader: f.reader,
          fines: [],
          total: 0,
        };
      }
      grouped[rid].fines.push(f);
      if (f.status === "unpaid") grouped[rid].total += Number(f.amount);
    }

    let result = Object.values(grouped);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((g: any) =>
        g.reader?.full_name?.toLowerCase().includes(q) ||
        g.reader?.email?.toLowerCase().includes(q) ||
        g.reader?.employee_code?.toLowerCase().includes(q)
      );
    }

    setGroups(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchFines();
  }, [search]);

  useEffect(() => {
    if (!showDetail || paymentMethod === "cash" || paymentSuccess) { setQrDataUrl(null); return; }
    const content = `SMARTLIB-FINE-${Date.now()}`;
    QRCode.toDataURL(content, { width: 200, margin: 2 }, (err, url) => {
      if (!err) setQrDataUrl(url);
    });
  }, [showDetail, paymentMethod, paymentSuccess]);

  const handlePayAll = async () => {
    if (!showDetail) return;
    const unpaidIds = showDetail.fines.filter((f: any) => f.status === "unpaid").map((f: any) => f.id);
    if (unpaidIds.length === 0) { toast.error("Không có phiếu phạt nào chưa đóng"); return; }

    const payDate = new Date().toISOString();
    const inserts = unpaidIds.map((id: string) => ({
      fine_ticket_id: id,
      amount: showDetail.fines.find((f: any) => f.id === id)?.amount || 0,
      payment_method: paymentMethod,
      status: "success",
      paid_at: payDate,
    }));

    const { error } = await supabase.from("payment_transactions").insert(inserts);
    if (error) { toast.error("Lỗi thanh toán: " + error.message); return; }

    const { error: updErr } = await supabase
      .from("fine_tickets")
      .update({ status: "paid", paid_at: payDate })
      .in("id", unpaidIds);
    if (updErr) { toast.error("Lỗi cập nhật: " + updErr.message); return; }

    setPaymentSuccess(true);
    fetchFines();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Xử lý vi phạm</h1>
          <p className="text-sm text-gray-500">Quản lý phiếu phạt và thu tiền phạt</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none" placeholder="Tìm kiếm độc giả..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center text-gray-400">Đang tải...</div>
          ) : groups.length === 0 ? (
            <div className="p-6 text-center text-gray-400">Không có vi phạm</div>
          ) : (
            <div className="divide-y">
              {groups.map((g: any) => {
                const unpaidCount = g.fines.filter((f: any) => f.status === "unpaid").length;
                return (
                  <div key={g.reader_id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{g.reader?.full_name || "-"}</p>
                      <p className="text-xs text-gray-500">
                        {g.reader?.email} {g.reader?.employee_code ? `· ${g.reader.employee_code}` : ""}
                        <span className="ml-2">Tổng: <strong className="text-red-600">{formatCurrency(g.total)}</strong></span>
                        <span className="ml-2">· {g.fines.length} phiếu</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {unpaidCount > 0 && (
                        <Button variant="primary" size="sm" onClick={() => setShowDetail(g)}>
                          <DollarSign className="mr-1 h-4 w-4" /> Thu {formatCurrency(g.total)}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setShowDetail(g)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={!!showDetail} onClose={() => { setShowDetail(null); setPaymentSuccess(false); setQrDataUrl(null); }} title={showDetail ? `Phiếu phạt - ${showDetail.reader?.full_name}` : ""} size="lg">
        {showDetail && !paymentSuccess ? (
          <div className="space-y-4">
            <div className="text-sm">
              <p>Độc giả: <strong>{showDetail.reader?.full_name}</strong> ({showDetail.reader?.email})</p>
              <p className="mt-1">Tổng tiền phạt: <strong className="text-lg text-red-600">{formatCurrency(showDetail.total)}</strong></p>
            </div>
            <div className="max-h-80 overflow-y-auto border rounded-lg divide-y">
              {showDetail.fines.map((f: any) => (
                <div key={f.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {REASON_LABELS[f.reason] || f.reason}
                    </p>
                    <p className="text-xs text-gray-500">
                      {f.borrow_detail?.book_copy?.book?.title ? `Sách: ${f.borrow_detail.book_copy.book.title} · ` : ""}
                      Barcode: {f.borrow_detail?.book_copy?.barcode || "-"}
                      {f.reason === "overdue" && f.borrow_detail?.due_date ? <><br />Quá hạn từ: {formatDateTime(f.borrow_detail.due_date)}</> : ""}
                      {f.reason === "damaged" && <><br />Hư hỏng ngày: {f.borrow_detail?.return_date ? formatDateTime(f.borrow_detail.return_date) : formatDateTime(f.created_at)}</>}
                      {f.reason === "lost" && <><br />Mất ngày: {f.borrow_detail?.return_date ? formatDateTime(f.borrow_detail.return_date) : formatDateTime(f.created_at)}</>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-red-600">{formatCurrency(f.amount)}</p>
                    <Badge status={f.status} />
                  </div>
                </div>
              ))}
            </div>
            {showDetail.fines.some((f: any) => f.status === "unpaid") && (
              <>
                {paymentMethod !== "cash" && qrDataUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={qrDataUrl} alt="QR thanh toán" className="rounded-lg border" width={200} height={200} />
                    <p className="text-xs text-gray-500">Quét mã để thanh toán (mã test)</p>
                  </div>
                ) : null}
                <div>
                  <label className="text-sm font-medium text-gray-700">Hình thức thanh toán</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[
                      { value: "cash", label: "Tiền mặt", icon: DollarSign },
                      { value: "transfer", label: "Chuyển khoản", icon: CreditCard },
                      { value: "vnpay", label: "VNPay", icon: CreditCard },
                      { value: "momo", label: "MoMo", icon: CreditCard },
                    ].map((m) => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          className={`flex items-center justify-start gap-2 rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                            paymentMethod === m.value
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => setPaymentMethod(m.value)}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => { setShowDetail(null); setPaymentSuccess(false); setQrDataUrl(null); }}>Đóng</Button>
                  <Button onClick={handlePayAll}>
                    <DollarSign className="mr-2 h-4 w-4" /> Thu tất cả {formatCurrency(showDetail.total)}
                  </Button>
                </div>
              </>
            )}
            {!showDetail.fines.some((f: any) => f.status === "unpaid") && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => { setShowDetail(null); setPaymentSuccess(false); setQrDataUrl(null); }}>Đóng</Button>
              </div>
            )}
          </div>
        ) : showDetail && paymentSuccess ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-lg font-semibold text-green-700">Thu tiền thành công!</p>
            <p className="text-sm text-gray-500">{formatCurrency(showDetail.total)} từ {showDetail.reader?.full_name}</p>
            <Button onClick={() => { setShowDetail(null); setPaymentSuccess(false); setQrDataUrl(null); }}>
              Đóng
            </Button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
