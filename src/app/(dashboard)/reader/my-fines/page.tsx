"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

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

  const columns = [
    { key: "reason", header: "Lý do", render: (item: any) => REASON_LABELS[item.reason] || item.reason },
    { key: "book", header: "Sách", render: (item: any) => item.borrow_detail?.book_copy?.book?.title || "-" },
    { key: "barcode", header: "Mã vạch", render: (item: any) => item.borrow_detail?.book_copy?.barcode || "-" },
    { key: "amount", header: "Số tiền", render: (item: any) => <span className="font-medium text-red-600">{formatCurrency(item.amount)}</span> },
    { key: "status", header: "Trạng thái", render: (item: any) => <Badge status={item.status} /> },
    { key: "created_at", header: "Ngày tạo", render: (item: any) => formatDateTime(item.created_at) },
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
              <p className="text-xs text-red-600">Vui lòng đến quầy thủ thư để thanh toán</p>
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
    </div>
  );
}
