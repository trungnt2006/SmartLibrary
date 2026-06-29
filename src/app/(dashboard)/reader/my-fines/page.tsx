"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/shared/pagination";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { Receipt } from "lucide-react";

const REASON_LABELS: Record<string, string> = {
  overdue: "Quá hạn",
  damaged: "Hư hỏng",
  lost: "Mất sách",
};

export default function MyFinesPage() {
  const [fines, setFines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
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
        .select("*, borrow_detail:borrow_details!borrow_detail_id(book_copy:book_copies(id, barcode, book:books(title)))", { count: "exact" })
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vi phạm & Phạt</h1>
        <p className="text-sm text-gray-500">Các phiếu phạt của tôi</p>
      </div>

      {unpaidTotal > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-red-800">
              Tổng tiền phạt chưa thanh toán: {formatCurrency(unpaidTotal)}
            </p>
            <p className="text-xs text-red-600">
              Vui lòng đến quầy thủ thư để thanh toán
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center text-gray-400">Đang tải...</div>
          ) : fines.length === 0 ? (
            <div className="p-6 text-center text-gray-400">Không có phiếu phạt</div>
          ) : (
            <div className="divide-y">
              {fines.map((f) => (
                <div key={f.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {REASON_LABELS[f.reason] || f.reason}
                    </p>
                    <p className="text-xs text-gray-500">
                      {f.borrow_detail?.book_copy?.book?.title
                        ? `Sách: ${f.borrow_detail.book_copy.book.title} · Barcode: ${f.borrow_detail.book_copy.barcode}`
                        : `Ngày tạo: ${formatDateTime(f.created_at)}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-red-600">{formatCurrency(f.amount)}</p>
                    <Badge status={f.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <Pagination page={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} />
      </Card>
    </div>
  );
}
