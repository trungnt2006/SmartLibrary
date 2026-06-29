"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { DollarSign, Search, Eye } from "lucide-react";
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
  const supabase = createClient();

  const fetchFines = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("fine_tickets")
      .select("*, reader:profiles!fine_tickets_reader_id_fkey(full_name, email, employee_code), borrow_detail:borrow_details!borrow_detail_id(book_copy:book_copies(id, barcode, book:books(title)))")
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

  const handlePayAll = async () => {
    if (!showDetail) return;
    const unpaidIds = showDetail.fines.filter((f: any) => f.status === "unpaid").map((f: any) => f.id);
    if (unpaidIds.length === 0) { toast.error("Không có phiếu phạt nào chưa đóng"); return; }

    const payDate = new Date().toISOString();
    const inserts = unpaidIds.map((id: string) => ({
      fine_ticket_id: id,
      amount: showDetail.fines.find((f: any) => f.id === id)?.amount || 0,
      payment_method: "cash",
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

    toast.success(`Đã thu ${formatCurrency(showDetail.total)} từ ${showDetail.reader?.full_name}`);
    setShowDetail(null);
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
                      <Button variant="ghost" size="sm" onClick={() => setShowDetail(g)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {unpaidCount > 0 && (
                        <Button variant="primary" size="sm" onClick={() => setShowDetail(g)}>
                          <DollarSign className="mr-1 h-4 w-4" /> Thu {formatCurrency(g.total)}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={showDetail ? `Phiếu phạt - ${showDetail.reader?.full_name}` : ""} size="lg">
        {showDetail && (
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
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-red-600">{formatCurrency(f.amount)}</p>
                    <Badge status={f.status} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDetail(null)}>Đóng</Button>
              {showDetail.fines.some((f: any) => f.status === "unpaid") && (
                <Button onClick={handlePayAll}>
                  <DollarSign className="mr-2 h-4 w-4" /> Thu tất cả {formatCurrency(showDetail.total)}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
