"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Table } from "@/components/ui/table";
import type { Category } from "@/types";
import { Plus, Edit3 } from "lucide-react";
import toast from "react-hot-toast";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Category | null>(null);
  const supabase = createClient();

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSave = async (data: Partial<Category>) => {
    if (editItem) {
      const { error } = await supabase.from("categories").update(data).eq("id", editItem.id);
      if (error) { toast.error("Lỗi: " + error.message); return; }
      toast.success("Cập nhật thành công");
    } else {
      const { error } = await supabase.from("categories").insert(data);
      if (error) { toast.error("Lỗi: " + error.message); return; }
      toast.success("Thêm danh mục thành công");
    }
    setShowModal(false);
    setEditItem(null);
    fetchCategories();
  };

  const columns = [
    { key: "name", header: "Tên danh mục" },
    { key: "description", header: "Mô tả", render: (item: Category) => item.description || "-" },
    { key: "status", header: "Trạng thái", render: (item: Category) => <Badge status={item.status} /> },
    {
      key: "actions",
      header: "Thao tác",
      render: (item: Category) => (
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
          <h1 className="text-2xl font-bold text-gray-900">Danh mục sách</h1>
          <p className="text-sm text-gray-500">Quản lý thể loại và danh mục sách</p>
        </div>
        <Button onClick={() => { setEditItem(null); setShowModal(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Thêm danh mục
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table columns={columns} data={categories} keyExtractor={(item) => item.id} loading={loading} emptyMessage="Chưa có danh mục nào" />
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? "Cập nhật danh mục" : "Thêm danh mục"}>
        <CategoryForm initialData={editItem} onSave={handleSave} onCancel={() => { setShowModal(false); setEditItem(null); }} />
      </Modal>
    </div>
  );
}

function CategoryForm({ initialData, onSave, onCancel }: { initialData: Partial<Category> | null; onSave: (data: Partial<Category>) => void; onCancel: () => void }) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ name, description: description || null });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input id="name" label="Tên danh mục" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input id="desc" label="Mô tả" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="flex justify-end gap-3">
        <Button variant="outline" type="button" onClick={onCancel}>Hủy</Button>
        <Button type="submit" loading={saving}>{initialData ? "Cập nhật" : "Tạo mới"}</Button>
      </div>
    </form>
  );
}
