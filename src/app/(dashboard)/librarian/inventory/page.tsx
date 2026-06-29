"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import type { InventoryReceipt, Book, Profile } from "@/types";
import { Plus, Search, Eye, Trash2 } from "lucide-react";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

function generateReceiptCode(): string {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 999999)).padStart(6, "0");
  return `INP-${year}-${rand}`;
}

function generateBarcode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const rand = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `BK-${rand(4)}-${rand(4)}`;
}

export default function InventoryPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<InventoryReceipt | null>(null);
  const pageSize = 10;
  const supabase = createClient();

  const fetchReceipts = async () => {
    setLoading(true);
    let query = supabase
      .from("inventory_receipts")
      .select("*, profiles!created_by(full_name, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search) {
      query = query.ilike("receipt_code", `%${search}%`);
    }

    const { data, count } = await query;
    setReceipts(data || []);
    setTotal(count || 0);
    setLoading(false);
  };

  const fetchBooks = async () => {
    const { data } = await supabase.from("books").select("*").eq("status", "active").order("title");
    setBooks(data || []);
  };

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("auth_user_id", user.id).single();
    setProfile(data);
  };

  useEffect(() => {
    fetchReceipts();
    fetchBooks();
    fetchProfile();
  }, [page, search]);

  const columns = [
    { key: "receipt_code", header: "Mã phiếu" },
    { key: "created_at", header: "Ngày nhập", render: (item: InventoryReceipt) => formatDateTime(item.created_at) },
    { key: "creator", header: "Người nhập", render: (item: any) => item.profiles?.full_name || "-" },
    { key: "note", header: "Ghi chú", render: (item: InventoryReceipt) => item.note || "-" },
    {
      key: "actions",
      header: "Thao tác",
      render: (item: InventoryReceipt) => (
        <Button variant="ghost" size="sm" onClick={() => handleViewDetail(item)}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const handleViewDetail = async (receipt: InventoryReceipt) => {
    const { data } = await supabase
      .from("inventory_receipt_details")
      .select("*, book:books(*)")
      .eq("receipt_id", receipt.id);
    setShowDetail({ ...receipt, details: data || [] });
  };

  const handleCreate = async (data: { note: string | null; items: { book_id: string; quantity: number; unit_price: number }[] }) => {
    if (!profile) { toast.error("Không tìm thấy thông tin người dùng"); return; }

    const receiptCode = generateReceiptCode();
    const { data: receipt, error: receiptError } = await supabase
      .from("inventory_receipts")
      .insert({ receipt_code: receiptCode, created_by: profile.id, note: data.note || null })
      .select()
      .single();

    if (receiptError) { toast.error("Lỗi tạo phiếu: " + receiptError.message); return; }

    const detailsToInsert = data.items.map((item) => ({
      receipt_id: receipt.id,
      book_id: item.book_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));

    const { error: detailsError } = await supabase
      .from("inventory_receipt_details")
      .insert(detailsToInsert);

    if (detailsError) { toast.error("Lỗi tạo chi tiết: " + detailsError.message); return; }

    const copiesToInsert = data.items.flatMap((item) =>
      Array.from({ length: item.quantity }, () => ({
        book_id: item.book_id,
        barcode: generateBarcode(),
        price: item.unit_price,
        shelf_location: null,
      }))
    );

    const { error: copiesError } = await supabase.from("book_copies").insert(copiesToInsert);
    if (copiesError) { toast.error("Lỗi tạo bản sao: " + copiesError.message); return; }

    toast.success(`Tạo phiếu ${receiptCode} thành công, đã thêm ${copiesToInsert.length} cuốn sách`);
    setShowModal(false);
    fetchReceipts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nhập kho</h1>
          <p className="text-sm text-gray-500">Quản lý phiếu nhập sách mới</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Tạo phiếu nhập
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none" placeholder="Tìm mã phiếu..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table columns={columns} data={receipts} keyExtractor={(item) => item.id} loading={loading} emptyMessage="Chưa có phiếu nhập nào" />
        </CardContent>
        <Pagination page={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Tạo phiếu nhập kho" size="lg">
        <CreateReceiptForm books={books} onSave={handleCreate} onCancel={() => setShowModal(false)} />
      </Modal>

      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={showDetail ? `Phiếu ${showDetail.receipt_code}` : ""} size="lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Ngày nhập</p>
                <p className="font-medium">{formatDateTime(showDetail.created_at)}</p>
              </div>
              <div>
                <p className="text-gray-500">Ghi chú</p>
                <p className="font-medium">{showDetail.note || "-"}</p>
              </div>
            </div>
            <Table
              columns={[
                { key: "book", header: "Đầu sách", render: (item: any) => item.book?.title || "-" },
                { key: "quantity", header: "Số lượng" },
                { key: "unit_price", header: "Đơn giá", render: (item: any) => formatCurrency(item.unit_price) },
                { key: "total", header: "Thành tiền", render: (item: any) => formatCurrency((item.unit_price || 0) * item.quantity) },
              ]}
              data={showDetail.details || []}
              keyExtractor={(item) => item.id}
              emptyMessage="Không có chi tiết"
            />
            <div className="text-right text-sm font-medium text-gray-900">
              Tổng: {formatCurrency((showDetail.details || []).reduce((sum, d) => sum + (d.unit_price || 0) * d.quantity, 0))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CreateReceiptForm({ books, onSave, onCancel }: { books: Book[]; onSave: (data: any) => void; onCancel: () => void }) {
  const [note, setNote] = useState("");
  const [items, setItems] = useState<{ book_id: string; quantity: string; unit_price: string }[]>([
    { book_id: "", quantity: "1", unit_price: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const handleBookChange = (index: number, bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    const newItems = [...items];
    newItems[index] = { ...newItems[index], book_id: bookId, unit_price: book?.price?.toString() || "0" };
    setItems(newItems);
  };

  const handleQuantityChange = (index: number, quantity: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], quantity };
    setItems(newItems);
  };

  const handlePriceChange = (index: number, unit_price: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], unit_price };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { book_id: "", quantity: "1", unit_price: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((item) => item.book_id);
    if (validItems.length === 0) { toast.error("Chọn ít nhất một đầu sách"); return; }
    setSaving(true);
    await onSave({
      note: note || null,
      items: validItems.map((item) => ({
        book_id: item.book_id,
        quantity: parseInt(item.quantity) || 1,
        unit_price: parseInt(item.unit_price) || 0,
      })),
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input id="note" label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú cho phiếu nhập" />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Danh sách sách nhập</label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1 h-3 w-3" /> Thêm dòng
          </Button>
        </div>

        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2 rounded-lg border p-3">
            <div className="flex-1">
              <Select
                value={item.book_id}
                onChange={(e) => handleBookChange(index, e.target.value)}
                options={books.map((b) => ({ value: b.id, label: `${b.title} - ${b.author}` }))}
                placeholder="Chọn sách"
                required
              />
            </div>
            <div className="w-20">
              <Input type="number" value={item.quantity} onChange={(e) => handleQuantityChange(index, e.target.value)} min={1} placeholder="SL" />
            </div>
            <div className="w-32">
              <Input type="number" value={item.unit_price} onChange={(e) => handlePriceChange(index, e.target.value)} placeholder="Đơn giá" />
            </div>
            <Button type="button" variant="ghost" size="sm" className="mt-6" onClick={() => removeItem(index)} disabled={items.length === 1}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" type="button" onClick={onCancel}>Hủy</Button>
        <Button type="submit" loading={saving}>Tạo phiếu nhập</Button>
      </div>
    </form>
  );
}
