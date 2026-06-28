"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import type { FineTicket } from "@/types";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { Plus, DollarSign, Search } from "lucide-react";
import toast from "react-hot-toast";

export default function FinesPage() {
  const [fines, setFines] = useState<FineTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  const handleCreateFine = async (data: { reader_id: string; reason: string; amount: number }) => {
    const { data: profile } = await supabase.auth.getUser();
    const { data: librarian } = await supabase.from("profiles").select("id").eq("auth_user_id", profile.user!.id).single();
    if (!librarian) { toast.error("Không xác định thủ thư"); return; }

    const { error } = await supabase.from("fine_tickets").insert({
      reader_id: data.reader_id,
      reason: data.reason,
      amount: data.amount,
      created_by: librarian.id,
    });

    if (error) { toast.error("Lỗi: " + error.message); return; }
    toast.success("Tạo phiếu phạt thành công");
    setShowCreateModal(false);
    fetchFines();
  };

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
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Tạo phiếu phạt
        </Button>
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

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Tạo phiếu phạt">
        <CreateFineForm onSave={handleCreateFine} onCancel={() => setShowCreateModal(false)} />
      </Modal>

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

function CreateFineForm({ onSave, onCancel }: { onSave: (data: { reader_id: string; reason: string; amount: number }) => void; onCancel: () => void }) {
  const [readers, setReaders] = useState<any[]>([]);
  const [readerId, setReaderId] = useState("");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("profiles").select("id, full_name, email").eq("role", "reader").order("full_name").then(({ data }) => setReaders(data || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!readerId || !reason || !amount) { toast.error("Vui lòng điền đầy đủ thông tin"); return; }
    setSaving(true);
    await onSave({ reader_id: readerId, reason, amount: parseInt(amount) });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Độc giả</label>
        <select value={readerId} onChange={(e) => setReaderId(e.target.value)} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required>
          <option value="">Chọn độc giả</option>
          {readers.map((r) => (
            <option key={r.id} value={r.id}>{r.full_name} ({r.email})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Lý do</label>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required>
          <option value="">Chọn lý do</option>
          <option value="overdue">Quá hạn</option>
          <option value="damaged">Hư hỏng sách</option>
          <option value="lost">Mất sách</option>
        </select>
      </div>
      <Input id="amount" label="Số tiền phạt (VNĐ)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      <div className="flex justify-end gap-3">
        <Button variant="outline" type="button" onClick={onCancel}>Hủy</Button>
        <Button type="submit" loading={saving}>Tạo phiếu phạt</Button>
      </div>
    </form>
  );
}
