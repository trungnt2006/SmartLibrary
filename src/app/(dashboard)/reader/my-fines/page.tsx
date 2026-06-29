"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { AlertTriangle, DollarSign, CreditCard, Banknote, CheckCircle } from "lucide-react";
import QRCode from "qrcode";
import toast from "react-hot-toast";

const REASON_LABELS: Record<string, string> = {
  overdue: "Quá hạn",
  damaged: "Hư hỏng",
  lost: "Mất sách",
};

const PAYMENT_METHODS = [
  { value: "cash", label: "Tiền mặt (tại quầy)", icon: Banknote },
  { value: "transfer", label: "Chuyển khoản ngân hàng", icon: CreditCard },
  { value: "vnpay", label: "VNPay", icon: CreditCard },
  { value: "momo", label: "MoMo", icon: CreditCard },
];

export default function MyFinesPage() {
  const [fines, setFines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [payingFine, setPayingFine] = useState<any>(null);
  const [payMethod, setPayMethod] = useState("transfer");
  const [paying, setPaying] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);
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
    const fetchFines = async () => {
      setLoading(true);
      const { data, count } = await supabase
        .from("fine_tickets")
        .select("*, borrow_detail:borrow_details!borrow_detail_id(due_date, return_date, status, book_copy:book_copies(id, barcode, book:books(title)))", { count: "exact" })
        .eq("reader_id", profileId)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      setFines(data || []);
      setTotal(count || 0);
      setLoading(false);
    };
    fetchFines();
  }, [profileId, page]);

  const unpaidTotal = fines.filter((f) => f.status === "unpaid").reduce((sum, f) => sum + Number(f.amount), 0);

  useEffect(() => {
    if (!payingFine || payMethod === "cash" || paid) { setQrDataUrl(null); return; }
    const content = `SMARTLIB-FINE-${payingFine.id}-${payingFine.amount}-${Date.now()}`;
    QRCode.toDataURL(content, { width: 200, margin: 2 }, (err, url) => {
      if (!err) setQrDataUrl(url);
    });
  }, [payingFine, payMethod, paid]);

  const handlePay = async () => {
    if (!payingFine) return;
    if (payMethod === "cash") {
      toast.success("Vui lòng đến quầy thủ thư để thanh toán tiền mặt!");
      setPayingFine(null);
      return;
    }
    setPaying(true);
    const now = new Date().toISOString();
    const { error: txErr } = await supabase.from("payment_transactions").insert({
      fine_ticket_id: payingFine.id,
      amount: payingFine.amount,
      payment_method: payMethod,
      status: "success",
      paid_at: now,
    });
    if (txErr) { toast.error("Lỗi thanh toán: " + txErr.message); setPaying(false); return; }
    const { error: updErr } = await supabase
      .from("fine_tickets")
      .update({ status: "paid", paid_at: now })
      .eq("id", payingFine.id);
    if (updErr) { toast.error("Lỗi cập nhật: " + updErr.message); setPaying(false); return; }
    setPaid(true);
    setPaying(false);
  };

  const columns = [
    {
      key: "reason", header: "Lý do", render: (item: any) => (
        <div>
          <div>{REASON_LABELS[item.reason] || item.reason}</div>
          <div className="text-xs text-gray-400">
            {item.reason === "overdue" && item.borrow_detail?.due_date ? `Quá hạn từ ${formatDateTime(item.borrow_detail.due_date)}` : ""}
            {item.reason === "damaged" ? `Hư hỏng ngày ${item.borrow_detail?.return_date ? formatDateTime(item.borrow_detail.return_date) : formatDateTime(item.created_at)}` : ""}
            {item.reason === "lost" ? `Mất ngày ${item.borrow_detail?.return_date ? formatDateTime(item.borrow_detail.return_date) : formatDateTime(item.created_at)}` : ""}
          </div>
        </div>
      ),
    },
    { key: "book", header: "Sách", render: (item: any) => item.borrow_detail?.book_copy?.book?.title || "-" },
    { key: "barcode", header: "Mã vạch", render: (item: any) => item.borrow_detail?.book_copy?.barcode || "-" },
    { key: "amount", header: "Số tiền", render: (item: any) => <span className="font-medium text-red-600">{formatCurrency(item.amount)}</span> },
    { key: "status", header: "Trạng thái", render: (item: any) => <Badge status={item.status} /> },
    { key: "created_at", header: "Ngày tạo", render: (item: any) => formatDateTime(item.created_at) },
    {
      key: "actions",
      header: "",
      render: (item: any) =>
        item.status === "unpaid" ? (
          <Button variant="ghost" size="sm" onClick={() => { setPayingFine(item); setPayMethod("transfer"); }}>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vi phạm & Phạt</h1>
        <p className="text-sm text-gray-500">Các phiếu phạt của tôi</p>
      </div>

      {unpaidTotal > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Tổng tiền phạt chưa thanh toán: {formatCurrency(unpaidTotal)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table columns={columns} data={fines} keyExtractor={(item: any) => item.id} loading={loading} emptyMessage="Không có phiếu phạt" />
        </CardContent>
        <Pagination page={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} />
      </Card>

      <Modal open={!!payingFine} onClose={() => { setPayingFine(null); setPaid(false); setQrDataUrl(null); }} title="Thanh toán vi phạm" size="sm">
        {payingFine && !paid ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <p>Lý do: <strong>{REASON_LABELS[payingFine.reason] || payingFine.reason}</strong></p>
              <p className="text-xs text-gray-500">
                {payingFine.reason === "overdue" && payingFine.borrow_detail?.due_date ? `Quá hạn từ ${formatDateTime(payingFine.borrow_detail.due_date)}` : ""}
                {payingFine.reason === "damaged" ? `Hư hỏng ngày ${payingFine.borrow_detail?.return_date ? formatDateTime(payingFine.borrow_detail.return_date) : formatDateTime(payingFine.created_at)}` : ""}
                {payingFine.reason === "lost" ? `Mất ngày ${payingFine.borrow_detail?.return_date ? formatDateTime(payingFine.borrow_detail.return_date) : formatDateTime(payingFine.created_at)}` : ""}
              </p>
              <p className="mt-1">Số tiền: <strong className="text-red-600">{formatCurrency(payingFine.amount)}</strong></p>
              {payingFine.borrow_detail?.book_copy?.book?.title && (
                <p className="mt-1 text-gray-500">Sách: {payingFine.borrow_detail.book_copy.book.title}</p>
              )}
            </div>

            {payMethod === "cash" ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                Vui lòng đến quầy thủ thư để thanh toán bằng tiền mặt.
              </div>
            ) : qrDataUrl ? (
              <div className="flex flex-col items-center gap-2">
                <img src={qrDataUrl} alt="QR thanh toán" className="rounded-lg border" width={200} height={200} />
                <p className="text-xs text-gray-500">Quét mã để thanh toán (mã test)</p>
              </div>
            ) : null}

            <div>
              <label className="text-sm font-medium text-gray-700">Chọn hình thức thanh toán</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      className={`flex items-center justify-start gap-2 rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                        payMethod === m.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                      onClick={() => setPayMethod(m.value)}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setPayingFine(null); setPaid(false); setQrDataUrl(null); }}>Huỷ</Button>
              {payMethod !== "cash" && (
                <Button onClick={handlePay} disabled={paying}>
                  {paying ? "Đang xử lý..." : "Xác nhận đã thanh toán"}
                </Button>
              )}
            </div>
          </div>
        ) : payingFine && paid ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-lg font-semibold text-green-700">Thanh toán thành công!</p>
            <p className="text-sm text-gray-500">{formatCurrency(payingFine.amount)} - {REASON_LABELS[payingFine.reason] || payingFine.reason}</p>
            <p className="text-xs text-gray-400">
              {payingFine.reason === "overdue" && payingFine.borrow_detail?.due_date ? `Quá hạn từ ${formatDateTime(payingFine.borrow_detail.due_date)}` : ""}
              {payingFine.reason === "damaged" ? `Hư hỏng ngày ${payingFine.borrow_detail?.return_date ? formatDateTime(payingFine.borrow_detail.return_date) : formatDateTime(payingFine.created_at)}` : ""}
              {payingFine.reason === "lost" ? `Mất ngày ${payingFine.borrow_detail?.return_date ? formatDateTime(payingFine.borrow_detail.return_date) : formatDateTime(payingFine.created_at)}` : ""}
            </p>
            <Button onClick={() => { setPayingFine(null); setPaid(false); setQrDataUrl(null); setPage(1); setTimeout(() => window.location.reload(), 300); }}>
              Đóng
            </Button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
