"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import type { Book, Category } from "@/types";
import { Plus, Search, Edit3, BookOpen, Camera } from "lucide-react";
import toast from "react-hot-toast";

export default function BookTitlesPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Book | null>(null);
  const pageSize = 10;
  const supabase = createClient();

  const fetchBooks = async () => {
    setLoading(true);
    let query = supabase
      .from("books")
      .select("*, category:categories(*)", { count: "exact" })
      .order("title")
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search) {
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
    }

    const { data, count } = await query;
    setBooks(data || []);
    setTotal(count || 0);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").eq("status", "active").order("name");
    setCategories(data || []);
  };

  useEffect(() => {
    fetchBooks();
    fetchCategories();
  }, [page, search]);

  const handleSave = async (data: Record<string, any>) => {
    const cleanData = {
      ...data,
      publisher: data.publisher || null,
      description: data.description || null,
      publication_year: data.publication_year || null,
    };
    if (editItem) {
      const { error } = await supabase.from("books").update(cleanData).eq("id", editItem.id);
      if (error) { toast.error("Lỗi: " + error.message); return; }
      toast.success("Cập nhật thành công");
    } else {
      const { error } = await supabase.from("books").insert(cleanData);
      if (error) { toast.error("Lỗi: " + error.message); return; }
      toast.success("Thêm đầu sách thành công");
    }
    setShowModal(false);
    setEditItem(null);
    fetchBooks();
  };

  const columns = [
    { key: "cover_url", header: "Ảnh bìa", render: (item: Book) => (
      <img src={item.cover_url || "/default-cover.png"} alt={item.title} className="h-14 w-10 rounded object-cover" />
    ) },
    { key: "title", header: "Tên sách" },
    { key: "author", header: "Tác giả" },
    { key: "publisher", header: "NXB", render: (item: Book) => item.publisher || "-" },
    { key: "publication_year", header: "Năm XB", render: (item: Book) => item.publication_year || "-" },
    { key: "category", header: "Danh mục", render: (item: Book) => item.category?.name || "-" },
    { key: "status", header: "Trạng thái", render: (item: Book) => <Badge status={item.status} /> },
    {
      key: "actions",
      header: "Thao tác",
      render: (item: Book) => (
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
          <h1 className="text-2xl font-bold text-gray-900">Đầu sách</h1>
          <p className="text-sm text-gray-500">Quản lý danh mục đầu sách trong thư viện</p>
        </div>
        <Button onClick={() => { setEditItem(null); setShowModal(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Thêm đầu sách
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none" placeholder="Tìm kiếm sách..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table columns={columns} data={books} keyExtractor={(item) => item.id} loading={loading} emptyMessage="Không tìm thấy sách" />
        </CardContent>
        <Pagination page={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} />
      </Card>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? "Cập nhật đầu sách" : "Thêm đầu sách"} size="lg">
        <BookForm initialData={editItem} categories={categories} onSave={handleSave} onCancel={() => { setShowModal(false); setEditItem(null); }} />
      </Modal>
    </div>
  );
}

function BookForm({ initialData, categories, onSave, onCancel }: { initialData: Partial<Book> | null; categories: Category[]; onSave: (data: Record<string, any>) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [author, setAuthor] = useState(initialData?.author || "");
  const [publisher, setPublisher] = useState(initialData?.publisher || "");
  const [pubYear, setPubYear] = useState(initialData?.publication_year?.toString() || "");
  const [price, setPrice] = useState(initialData?.price?.toString() || "");
  const [categoryId, setCategoryId] = useState(initialData?.category_id || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [coverUrl, setCoverUrl] = useState(initialData?.cover_url || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Ảnh không được quá 2MB"); return; }
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const filePath = `books/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("book-covers").upload(filePath, file, { upsert: true });
    if (uploadError) { toast.error("Lỗi tải ảnh: " + uploadError.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("book-covers").getPublicUrl(filePath);
    setCoverUrl(urlData.publicUrl);
    setUploading(false);
    toast.success("Đã tải ảnh bìa!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ title, author, publisher: publisher || null, publication_year: pubYear ? parseInt(pubYear) : null, price: parseInt(price) || 0, category_id: categoryId, description: description || null, cover_url: coverUrl || null });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="group relative flex h-32 w-24 overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition-all hover:border-blue-400 hover:bg-blue-50 disabled:opacity-60">
            {coverUrl ? (
              <img src={coverUrl} alt="book cover" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                <Camera className="h-8 w-8 text-gray-400 group-hover:text-blue-500" />
                <span className="text-[10px] text-gray-400">Ảnh bìa</span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadCover} />
        </div>
        <div className="flex-1 space-y-4">
          <Input id="title" label="Tên sách" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Input id="author" label="Tác giả" value={author} onChange={(e) => setAuthor(e.target.value)} required />
          <Input id="publisher" label="Nhà xuất bản" value={publisher} onChange={(e) => setPublisher(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input id="pubYear" label="Năm xuất bản" type="number" value={pubYear} onChange={(e) => setPubYear(e.target.value)} />
        <Input id="price" label="Giá (VNĐ)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Select id="category" label="Danh mục" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} options={categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="Chọn danh mục" required />
      </div>
      <Input id="desc" label="Mô tả" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="flex justify-end gap-3">
        <Button variant="outline" type="button" onClick={onCancel}>Hủy</Button>
        <Button type="submit" loading={saving}>{initialData ? "Cập nhật" : "Tạo mới"}</Button>
      </div>
    </form>
  );
}
