"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import type { FineTicket } from "@/types";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { Receipt } from "lucide-react";

export default function MyFinesPage() {
  const [fines, setFines] = useState<FineTicket[]>([]);
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
        .select("*", { count: "exact" })
        .eq("reader_id", profileId)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      setFines(data || []);
      setTotal(count || 0);
      setLoading(false);
    };
    fetchFines();
  }, [profileId, page]);

  const columns = [
    { key: "reason", header: "Lý do" },
    { key: "amount", header: "Số tiền", render: (item: FineTicket) => formatCurrency(item.amount) },
    { key: "status", header: "Trạng thái", render: (item: FineTicket) => <Badge status={item.status} /> },
    { key: "created_at", header: "Ngày tạo", render: (item: FineTicket) => formatDateTime(item.created_at) },
    { key: "paid_at", header: "Ngày đóng", render: (item: FineTicket) => item.paid_at ? formatDateTime(item.paid_at) : "-" },
  ];

  const unpaidTotal = fines.filter((f) => f.status === "unpaid").reduce((sum, f) => sum + Number(f.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vi phạm & Phạt</h1>
        <p className="text-sm text-gray-500">Các phiếu phạt của tôi</p>
      </div>

      {fines.filter((f) => f.status === "unpaid").length > 0 && (
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
          <Table columns={columns} data={fines} keyExtractor={(item) => item.id} loading={loading} emptyMessage="Không có phiếu phạt" />
        </CardContent>
        <Pagination page={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} />
      </Card>
    </div>
  );
}
