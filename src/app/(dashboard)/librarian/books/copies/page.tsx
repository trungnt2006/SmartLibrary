"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import type { BookCopy, Book } from "@/types";
import { Plus, Search, Edit3 } from "lucide-react";
import toast from "react-hot-toast";

function generateBarcode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const rand = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `BK-${rand(4)}-${rand(4)}`;
}

const COPY_STATUSES = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "available", label: "Có sẵn" },
  { value: "borrowing", label: "Đang mượn" },
  { value: "reserved", label: "Đã đặt" },
  { value: "damaged", label: "Hư hỏng" },
  { value: "lost", label: "Mất" },
  { value: "inactive", label: "Ngừng hoạt động" },
];

export default function BookCopiesPage() {
  const [copies, setCopies] = useState<BookCopy[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<BookCopy | null>(null);
  const pageSize = 10;
  const supabase = createClient();

  const fetchCopies = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("book_copies")
      .select("*, book:books(*)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search) {
      const { data: matchingBooks } = await supabase
        .from("books")
        .select("id")
        .or(`title.ilike.%${search}%,author.ilike.%${search}%`);
      const bookIds = matchingBooks?.map((b) => b.id) || [];
      const orParts = [`barcode.ilike.%${search}%`];
      if (bookIds.length > 0) orParts.push(`book_id.in.(${bookIds.join(",")})`);
      query = query.or(orParts.join(","));
    }
    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, count } = await query;
    setCopies(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [page, search, statusFilter]);

  const fetchBooks = async () => {
    const { data } = await supabase.from("books").select("*").eq("status", "active").order("title");
    setBooks(data || []);
  };

  useEffect(() => {
    fetchCopies();
  }, [fetchCopies]);

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleSave = async (data: { book_id: string; shelf_location?: string }) => {
    if (editItem) {
      const { error } = await supabase.from("book_copies").update(data).eq("id", editItem.id);
      if (error) { toast.error("Lỗi: " + error.message); return; }
      toast.success("Cập nhật thành công");
    } else {
      const book = books.find((b) => b.id === data.book_id);
      const copyData = {
        book_id: data.book_id,
        barcode: generateBarcode(),
        price: book?.price ?? 0,
        shelf_location: data.shelf_location || null,
      };
      const { error } = await supabase.from("book_copies").insert(copyData);
      if (error) { toast.error("Lỗi: " + error.message); return; }
      toast.success("Thêm cuốn sách thành công");
    }
    setShowModal(false);
    setEditItem(null);
    fetchCopies();
  };

  const columns = [
    { key: "barcode", header: "Barcode" },
    { key: "book", header: "Đầu sách", render: (item: BookCopy) => item.book?.title || "-" },
    { key: "shelf_location", header: "Vị trí", render: (item: BookCopy) => item.shelf_location || "-" },
    { key: "status", header: "Trạng thái", render: (item: BookCopy) => <Badge status={item.status} /> },
    {
      key: "actions",
      header: "Thao tác",
      render: (item: BookCopy) => (
        <Button variant="ghost" size="sm" onClick={() => { setEditItem(item); setShowModal(true); }}>
          <Edit3 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cuốn sách</h1>
          <p className="text-sm text-gray-500">Quản lý các cuốn sách vật lý trong thư viện</p>
        </div>
        <Button onClick={() => { setEditItem(null); setShowModal(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Thêm cuốn sách
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none" placeholder="Tìm kiếm barcode, sách..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="w-40 shrink-0">
              <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} options={COPY_STATUSES} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table columns={columns} data={copies} keyExtractor={(item) => item.id} loading={loading} emptyMessage="Chưa có cuốn sách nào" />
        </CardContent>
        <Pagination page={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} />
      </Card>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? "Cập nhật cuốn sách" : "Thêm cuốn sách"}>
        <CopyForm initialData={editItem} books={books} onSave={handleSave} onCancel={() => { setShowModal(false); setEditItem(null); }} />
      </Modal>
    </div>
  );
}

function CopyForm({ initialData, books, onSave, onCancel }: { initialData: Partial<BookCopy> | null; books: Book[]; onSave: (data: any) => void; onCancel: () => void }) {
  const [bookId, setBookId] = useState(initialData?.book_id || "");
  const [shelf, setShelf] = useState(initialData?.shelf_location || "");
  const [saving, setSaving] = useState(false);
  const selectedBook = books.find((b) => b.id === bookId);
  const isEdit = !!initialData;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ book_id: bookId, shelf_location: shelf || null });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select id="book" label="Đầu sách" value={bookId} onChange={(e) => setBookId(e.target.value)} options={books.map((b) => ({ value: b.id, label: `${b.title} - ${b.author}` }))} placeholder="Chọn sách" required />
      {selectedBook && (
        <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 space-y-1">
          {isEdit ? (
            <>
              <p>Barcode: <span className="font-mono font-medium text-gray-900">{initialData.barcode}</span></p>
              <p>Giá: <span className="font-medium text-gray-900">{initialData.price?.toLocaleString("vi-VN") || selectedBook.price?.toLocaleString("vi-VN")} VNĐ</span></p>
            </>
          ) : (
            <>
              <p>Barcode: <span className="font-mono font-medium text-gray-900">BK-XXXX-XXXX</span> (tự động)</p>
              <p>Giá: <span className="font-medium text-gray-900">{selectedBook.price?.toLocaleString("vi-VN")} VNĐ</span></p>
            </>
          )}
        </div>
      )}
      <Input id="shelf" label="Vị trí kệ" value={shelf} onChange={(e) => setShelf(e.target.value)} placeholder="VD: A1-01" />
      <div className="flex justify-end gap-3">
        <Button variant="outline" type="button" onClick={onCancel}>Hủy</Button>
        <Button type="submit" loading={saving}>{isEdit ? "Cập nhật" : "Tạo mới"}</Button>
      </div>
    </form>
  );
}
