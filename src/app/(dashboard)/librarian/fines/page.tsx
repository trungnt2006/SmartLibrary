"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import type { FineTicket } from "@/types";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { DollarSign, Search } from "lucide-react";
import toast from "react-hot-toast";

export default function FinesPage() {
  const [fines, setFines] = useState<FineTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showPayModal, setShowPayModal] = useState<FineTicket | null>(null);
  const pageSize = 10;
  const supabase = createClient();

  const fetchFines = async () => {
    setLoading(true);
    let query = supabase
      .from("fine_tickets")
      .select("*, reader:profiles!fine_tickets_reader_id_fkey(full_name, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search) {
      query = query.or(`reader.full_name.ilike.%${search}%`);
    }

    const { data, count } = await query;
    setFines(data || []);
    setTotal(count || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchFines();
  }, [page, search]);

  const handlePay = async () => {
    if (!showPayModal) return;

    const { error } = await supabase.from("payment_transactions").insert({
      fine_ticket_id: showPayModal.id,
      amount: showPayModal.amount,
      payment_method: "cash",
      status: "success",
      paid_at: new Date().toISOString(),
    });

    if (error) { toast.error("Lỗi thanh toán: " + error.message); return; }

    await supabase.from("fine_tickets").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", showPayModal.id);

    toast.success("Ghi nhận thanh toán thành công");
    setShowPayModal(null);
    fetchFines();
  };

  const columns = [
    { key: "reader", header: "Độc giả", render: (item: FineTicket) => item.reader?.full_name || "-" },
    { key: "reason", header: "Lý do" },
    { key: "amount", header: "Số tiền", render: (item: FineTicket) => formatCurrency(item.amount) },
    { key: "status", header: "Trạng thái", render: (item: FineTicket) => <Badge status={item.status} /> },
    { key: "created_at", header: "Ngày tạo", render: (item: FineTicket) => formatDateTime(item.created_at) },
    {
      key: "actions",
      header: "Thao tác",
      render: (item: FineTicket) => (
        <div className="flex gap-2">
          {item.status === "unpaid" && (
            <Button variant="primary" size="sm" onClick={() => setShowPayModal(item)}>
              <DollarSign className="mr-1 h-4 w-4" /> Thu tiền
            </Button>
          )}
        </div>
      ),
    },
  ];

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
            <input className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none" placeholder="Tìm kiếm độc giả..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table columns={columns} data={fines} keyExtractor={(item) => item.id} loading={loading} emptyMessage="Không có phiếu phạt" />
        </CardContent>
        <Pagination page={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} />
      </Card>

      <Modal open={!!showPayModal} onClose={() => setShowPayModal(null)} title="Xác nhận thanh toán" size="sm">
        {showPayModal && (
          <div className="space-y-4">
            <p>Độc giả: <strong>{showPayModal.reader?.full_name}</strong></p>
            <p>Lý do: {showPayModal.reason}</p>
            <p>Số tiền: <strong className="text-lg text-blue-600">{formatCurrency(showPayModal.amount)}</strong></p>
            <p className="text-sm text-gray-500">Phương thức: Tiền mặt</p>
            <Button className="w-full" onClick={handlePay}>
              <DollarSign className="mr-2 h-4 w-4" /> Xác nhận thu tiền
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}


