"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { AvatarUpload } from "@/components/shared/avatar-upload";
import type { Profile } from "@/types";
import { formatDate } from "@/lib/utils";
import { Plus, Search, Lock, Unlock, Eye, Shield, Camera } from "lucide-react";
import toast from "react-hot-toast";

export default function LibrariansPage() {
  const [librarians, setLibrarians] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<Profile | null>(null);
  const [showConfirm, setShowConfirm] = useState<Profile | null>(null);
  const [editItem, setEditItem] = useState<Profile | null>(null);
  const pageSize = 10;

  const supabase = createClient();

  const fetchLibrarians = async () => {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .eq("role", "librarian")
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,employee_code.ilike.%${search}%`);
    }

    const { data, count } = await query;
    setLibrarians(data || []);
    setTotal(count || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchLibrarians();
  }, [page, search]);

  const handleToggleLock = async (lib: Profile) => {
    const newStatus = lib.status === "locked" ? "active" : "locked";
    const { error } = await supabase
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", lib.id);

    if (error) { toast.error("Lỗi cập nhật trạng thái"); return; }
    toast.success(newStatus === "locked" ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản");
    setShowConfirm(null);
    fetchLibrarians();
  };

  const handleSave = async (data: Partial<Profile> & { password?: string }) => {
    if (editItem) {
      const { error } = await supabase.from("profiles").update(data).eq("id", editItem.id);
      if (error) { toast.error("Lỗi cập nhật: " + error.message); return; }
      toast.success("Cập nhật thành công");
    } else {
      const code = "LIB-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email!,
        password: data.password as string || "password123",
        options: { data: { role: "librarian", full_name: data.full_name } },
      });
      if (signUpError) { toast.error("Lỗi tạo tài khoản: " + signUpError.message); return; }
      setTimeout(async () => {
        const { data: profile } = await supabase
          .from("profiles")
          .update({
            phone: data.phone || null,
            date_of_birth: data.date_of_birth || null,
            address: data.address || null,
            position: data.position || null,
            avatar_url: data.avatar_url || null,
            employee_code: code,
          })
          .eq("email", data.email)
          .select("id")
          .single();
        if (profile) toast.success(`Tạo thủ thư thành công (Mã NV: ${code})`);
        fetchLibrarians();
      }, 1000);
      toast.success("Đang tạo tài khoản...");
    }
    setShowForm(false);
    setEditItem(null);
    fetchLibrarians();
  };

  const columns = [
    {
      key: "employee_code",
      header: "Mã NV",
      render: (item: Profile) => (
        <span className="font-mono text-xs font-medium text-gray-600">{item.employee_code || "-"}</span>
      ),
    },
    { key: "full_name", header: "Họ tên" },
    { key: "email", header: "Email" },
    {
      key: "position",
      header: "Vị trí",
      render: (item: Profile) => item.position || "-",
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item: Profile) => <Badge status={item.status} />,
    },
    {
      key: "actions",
      header: "",
      width: 160,
      render: (item: Profile) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setShowDetail(item)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setEditItem(item); setShowForm(true); }}>
            Sửa
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowConfirm(item)}>
            {item.status === "locked" ? (
              <Unlock className="h-4 w-4 text-green-600" />
            ) : (
              <Lock className="h-4 w-4 text-red-600" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý thủ thư</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý tài khoản thủ thư trong hệ thống</p>
        </div>
        <Button onClick={() => { setEditItem(null); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Thêm thủ thư
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 pb-0">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder="Tìm theo tên, email, mã NV..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </CardContent>
        <CardContent className="p-0">
          <Table columns={columns} data={librarians} keyExtractor={(item) => item.id} loading={loading} emptyMessage="Không tìm thấy thủ thư nào" />
        </CardContent>
        <Pagination page={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} />
      </Card>

      {/* Form modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem ? "Cập nhật thủ thư" : "Thêm thủ thư"}>
        <LibrarianForm initialData={editItem} onSave={handleSave} onCancel={() => { setShowForm(false); setEditItem(null); }} />
      </Modal>

      {/* Detail modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Chi tiết thủ thư" size="md">
        {showDetail && (
          <div className="space-y-5">
            <div className="flex gap-4">
              {showDetail.avatar_url ? (
                <img
                  src={showDetail.avatar_url}
                  alt={showDetail.full_name}
                  className="h-14 w-14 flex-shrink-0 rounded-xl object-cover shadow"
                />
              ) : (
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow">
                  <Shield className="h-7 w-7" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">{showDetail.full_name}</h3>
                <p className="text-sm text-gray-500">{showDetail.email}</p>
                {showDetail.employee_code && (
                  <p className="text-xs font-mono text-gray-400 mt-0.5">Mã NV: {showDetail.employee_code}</p>
                )}
              </div>
              <Badge status={showDetail.status} className="self-start mt-1 px-1.5 py-0 text-[10px]" />
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <span className="text-gray-400">SĐT</span>
                <p className="font-medium text-gray-900">{showDetail.phone || "-"}</p>
              </div>
              <div>
                <span className="text-gray-400">Ngày sinh</span>
                <p className="font-medium text-gray-900">{showDetail.date_of_birth ? formatDate(showDetail.date_of_birth) : "-"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400">Địa chỉ</span>
                <p className="font-medium text-gray-900">{showDetail.address || "-"}</p>
              </div>
              <div>
                <span className="text-gray-400">Vị trí</span>
                <p className="font-medium text-gray-900">{showDetail.position || "-"}</p>
              </div>
              <div>
                <span className="text-gray-400">Ngày tạo</span>
                <p className="font-medium text-gray-900">{formatDate(showDetail.created_at)}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm lock modal */}
      <Modal open={!!showConfirm} onClose={() => setShowConfirm(null)} title="Xác nhận" size="sm">
        {showConfirm && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {showConfirm.status === "locked"
                ? `Mở khóa tài khoản "${showConfirm.full_name}"?`
                : `Khóa tài khoản "${showConfirm.full_name}"? Sau khi khóa, thủ thư này sẽ không thể đăng nhập.`}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowConfirm(null)}>Hủy</Button>
              <Button
                variant={showConfirm.status === "locked" ? "gradient" : "danger"}
                onClick={() => handleToggleLock(showConfirm)}
              >
                {showConfirm.status === "locked" ? "Mở khóa" : "Khóa"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function LibrarianForm({ initialData, onSave, onCancel }: { initialData: Partial<Profile> | null; onSave: (data: Partial<Profile> & { password?: string }) => void; onCancel: () => void }) {
  const [fullName, setFullName] = useState(initialData?.full_name || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState(initialData?.date_of_birth || "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [position, setPosition] = useState(initialData?.position || "");
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatar_url || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialData && password !== confirmPassword) { toast.error("Mật khẩu xác nhận không khớp"); return; }
    setSaving(true);
    await onSave({
      full_name: fullName, email,
      phone: phone || null, date_of_birth: dateOfBirth || null,
      address: address || null, position: position || null,
      avatar_url: avatarUrl || null,
      ...(!initialData && password ? { password } : {}),
    });
    setSaving(false);
  };

  const handleResetPassword = async () => {
    if (!initialData?.auth_user_id) return;
    if (!confirm("Đặt lại mật khẩu thành 'thuvien123'?")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: initialData.auth_user_id, password: "thuvien123" }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Lỗi: " + data.error); setResetting(false); return; }
      toast.success("Đã đặt lại mật khẩu thành 'thuvien123'!");
    } catch (e: any) {
      toast.error("Lỗi kết nối: " + (e?.message || "Không thể kết nối server"));
    }
    setResetting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AvatarUpload url={avatarUrl} onUpload={setAvatarUrl} className="mb-4" />
      <div className="grid grid-cols-2 gap-4">
        <Input id="fullName" label="Họ tên" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <Input id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={!!initialData} />
        <Input id="phone" label="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input id="dob" label="Ngày sinh" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
        <Input id="position" label="Vị trí" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="VD: Thủ thư tầng 1, Thủ thư trưởng..." />
      </div>
      <Input id="address" label="Địa chỉ" value={address} onChange={(e) => setAddress(e.target.value)} />
      {!initialData && (
        <div className="grid grid-cols-2 gap-4">
          <Input id="password" label="Mật khẩu" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mặc định: password123" />
          <Input id="confirmPassword" label="Xác nhận mật khẩu" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu" />
        </div>
      )}
      <div className="flex items-center justify-between border-t pt-4">
        <div>
          {initialData && (
            <Button variant="outline" type="button" loading={resetting} onClick={handleResetPassword} className="text-orange-600 border-orange-300 hover:bg-orange-50">
              Cấp lại mật khẩu
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" type="button" onClick={onCancel}>Hủy</Button>
          <Button type="submit" loading={saving}>{initialData ? "Cập nhật" : "Tạo mới"}</Button>
        </div>
      </div>
    </form>
  );
}