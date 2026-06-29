"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { Announcement } from "@/types";
import { Bold, Italic, Underline, Link, List, ListOrdered, Bell } from "lucide-react";
import toast from "react-hot-toast";

export default function AnnouncementsPage() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [active, setActive] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(1).single();
    if (data) {
      setAnnouncement(data);
      setTitle(data.title);
      setActive(data.status === "active");
      if (editorRef.current) editorRef.current.innerHTML = data.content;
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  const addLink = () => {
    const url = prompt("Nhập URL:");
    if (url) exec("createLink", url);
  };

  const handleSave = async () => {
    const html = editorRef.current?.innerHTML?.trim() || "";
    if (!title.trim() || !html || html === "<br>") { toast.error("Vui lòng nhập đầy đủ"); return; }
    setSaving(true);
    const payload = { title: title.trim(), content: html, status: active ? "active" : "inactive", updated_at: new Date().toISOString() };
    if (announcement) {
      const { error } = await supabase.from("announcements").update(payload).eq("id", announcement.id);
      if (error) { toast.error("Lỗi: " + error.message); setSaving(false); return; }
    } else {
      const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id).single();
      const { error } = await supabase.from("announcements").insert({ ...payload, created_by: profile?.id || null });
      if (error) { toast.error("Lỗi: " + error.message); setSaving(false); return; }
      const { data: newItem } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(1).single();
      if (newItem) setAnnouncement(newItem);
    }
    toast.success("Đã lưu");
    setSaving(false);
  };

  const btnClass = "flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thông báo</h1>
          <p className="text-sm text-gray-500">Soạn thảo thông báo hiển thị trên trang chủ</p>
        </div>
        <Button onClick={handleSave} loading={saving}>Lưu thông báo</Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-sm">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Trạng thái</p>
                <p className="text-xs text-gray-500">{active ? "Đang hiển thị trên trang chủ" : "Đã ẩn khỏi trang chủ"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${active ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <Input id="announcementTitle" label="Tiêu đề" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Lịch nghỉ lễ 30/4" />

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
                className="min-h-[200px] px-3 py-2 text-sm outline-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]"
                data-placeholder="Nhập nội dung thông báo..."
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
