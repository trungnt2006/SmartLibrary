"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Table } from "@/components/ui/table";
import type { Announcement } from "@/types";
import { Plus, Edit3, Trash2, Bell, Calendar, Bold, Italic, Underline, Link, List, ListOrdered } from "lucide-react";
import toast from "react-hot-toast";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setAnnouncements(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (form: { title: string; content: string }) => {
    if (editItem) {
      const { error } = await supabase.from("announcements").update({ ...form, updated_at: new Date().toISOString() }).eq("id", editItem.id);
      if (error) { toast.error("Lỗi: " + error.message); return; }
      toast.success("Cập nhật thành công");
    } else {
      const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id).single();
      const { error } = await supabase.from("announcements").insert({ ...form, created_by: profile?.id || null });
      if (error) { toast.error("Lỗi: " + error.message); return; }
      toast.success("Thêm thông báo thành công");
    }
    setShowModal(false);
    setEditItem(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá thông báo này?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) { toast.error("Lỗi: " + error.message); return; }
    toast.success("Đã xoá");
    fetchData();
  };

  const toggleStatus = async (item: Announcement) => {
    const newStatus = item.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("announcements").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", item.id);
    if (error) { toast.error("Lỗi: " + error.message); return; }
    toast.success(newStatus === "active" ? "Đã hiện thông báo" : "Đã ẩn thông báo");
    fetchData();
  };

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");

  const columns = [
    { key: "title", header: "Tiêu đề" },
    { key: "content", header: "Nội dung", render: (item: Announcement) => (
      <span className="line-clamp-2 text-sm text-gray-500">{stripHtml(item.content)}</span>
    ) },
    { key: "status", header: "Trạng thái", render: (item: Announcement) => (
      <button onClick={() => toggleStatus(item)}>
        <Badge status={item.status === "active" ? "active" : "inactive"} />
      </button>
    ) },
    { key: "created_at", header: "Ngày tạo", render: (item: Announcement) => (
      <span className="text-sm text-gray-500">{new Date(item.created_at).toLocaleDateString("vi-VN")}</span>
    ) },
    {
      key: "actions", header: "Thao tác", render: (item: Announcement) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => { setEditItem(item); setShowModal(true); }}>
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thông báo</h1>
          <p className="text-sm text-gray-500">Quản lý thông báo hiển thị trên trang chủ</p>
        </div>
        <Button onClick={() => { setEditItem(null); setShowModal(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Thêm thông báo
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table columns={columns} data={announcements} keyExtractor={(item) => item.id} loading={loading} emptyMessage="Chưa có thông báo nào" />
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? "Sửa thông báo" : "Thêm thông báo"} size="lg">
        <AnnouncementForm initialData={editItem} onSave={handleSave} onCancel={() => { setShowModal(false); setEditItem(null); }} />
      </Modal>
    </div>
  );
}

function AnnouncementForm({ initialData, onSave, onCancel }: { initialData: Announcement | null; onSave: (data: { title: string; content: string }) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && initialData?.content) {
      editorRef.current.innerHTML = initialData.content;
    }
  }, []);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  const addLink = () => {
    const url = prompt("Nhập URL:");
    if (url) exec("createLink", url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const html = editorRef.current?.innerHTML?.trim() || "";
    if (!title.trim() || !html || html === "<br>") { toast.error("Vui lòng nhập đầy đủ"); return; }
    setSaving(true);
    await onSave({ title: title.trim(), content: html });
    setSaving(false);
  };

  const btnClass = "flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input id="announcementTitle" label="Tiêu đề" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Lịch nghỉ lễ 30/4" required />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nội dung</label>
        <div className="overflow-hidden rounded-lg border border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
          <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
            <button type="button" className={btnClass} onClick={() => exec("bold")} title="In đậm"><Bold className="h-4 w-4" /></button>
            <button type="button" className={btnClass} onClick={() => exec("italic")} title="In nghiêng"><Italic className="h-4 w-4" /></button>
            <button type="button" className={btnClass} onClick={() => exec("underline")} title="Gạch chân"><Underline className="h-4 w-4" /></button>
            <span className="mx-1 h-5 w-px bg-gray-200" />
            <button type="button" className={btnClass} onClick={addLink} title="Chèn link"><Link className="h-4 w-4" /></button>
            <span className="mx-1 h-5 w-px bg-gray-200" />
            <button type="button" className={btnClass} onClick={() => exec("insertUnorderedList")} title="Danh sách"><List className="h-4 w-4" /></button>
            <button type="button" className={btnClass} onClick={() => exec("insertOrderedList")} title="Danh sách số"><ListOrdered className="h-4 w-4" /></button>
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="min-h-[160px] px-3 py-2 text-sm outline-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]"
            data-placeholder="Nhập nội dung thông báo..."
            onInput={() => {}}
          />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="outline" type="button" onClick={onCancel}>Hủy</Button>
        <Button type="submit" loading={saving}>{initialData ? "Cập nhật" : "Tạo mới"}</Button>
      </div>
    </form>
  );
}
