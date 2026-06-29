"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { User, Save, Camera, KeyRound } from "lucide-react";
import toast from "react-hot-toast";

export default function ReaderProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setAuthUser(user);
      supabase.from("profiles").select("*").eq("auth_user_id", user.id).single().then(({ data }) => {
        if (data) setProfile(data);
        setLoading(false);
      });
    });
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
        address: profile.address,
        date_of_birth: profile.date_of_birth,
      })
      .eq("id", profile.id);
    if (error) { toast.error("Lỗi: " + error.message); setSaving(false); return; }
    toast.success("Cập nhật thông tin thành công!");
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Ảnh không được quá 2MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${authUser.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) { toast.error("Lỗi tải ảnh: " + uploadError.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const avatarUrl = urlData.publicUrl;
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", profile.id);
    if (updateError) { toast.error("Lỗi cập nhật: " + updateError.message); setUploading(false); return; }
    setProfile({ ...profile, avatar_url: avatarUrl });
    setUploading(false);
    toast.success("Cập nhật ảnh đại diện thành công!");
  };

  const handleChangePassword = async () => {
    if (pwForm.newPw !== pwForm.confirm) { toast.error("Mật khẩu xác nhận không khớp"); return; }
    if (pwForm.newPw.length < 6) { toast.error("Mật khẩu tối thiểu 6 ký tự"); return; }
    setChangingPw(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: profile.email, password: pwForm.current });
    if (signInError) { toast.error("Mật khẩu hiện tại không đúng"); setChangingPw(false); return; }
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
    if (error) { toast.error("Lỗi: " + error.message); setChangingPw(false); return; }
    toast.success("Đổi mật khẩu thành công!");
    setPwForm({ current: "", newPw: "", confirm: "" });
    setChangingPw(false);
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Đang tải...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Thông tin cá nhân</h1>
        <p className="text-sm text-gray-500">Quản lý thông tin tài khoản của bạn</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                  <User className="h-7 w-7 text-blue-600" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow hover:bg-blue-700"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div>
              <p className="font-medium text-gray-900">{profile.full_name}</p>
              <p className="text-sm text-gray-500">{profile.email}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Họ tên</label>
              <input
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                value={profile.full_name || ""}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                value={profile.email || ""}
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
              <input
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                value={profile.phone || ""}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ngày sinh</label>
              <input
                type="date"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                value={profile.date_of_birth || ""}
                onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Địa chỉ</label>
            <input
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={profile.address || ""}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-gray-700">Thông tin thẻ</h3>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Mã độc giả</span>
            <span className="font-medium">{profile.employee_code || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span>Ngày cấp thẻ</span>
            <span className="font-medium">{profile.card_issued_at ? formatDate(profile.card_issued_at) : "-"}</span>
          </div>
          <div className="flex justify-between">
            <span>Hạn thẻ</span>
            <span className="font-medium">{profile.card_expires_at ? formatDate(profile.card_expires_at) : "-"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-gray-700">Đổi mật khẩu</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="password"
            placeholder="Mật khẩu hiện tại"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={pwForm.current}
            onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="password"
              placeholder="Mật khẩu mới"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={pwForm.newPw}
              onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
            />
            <input
              type="password"
              placeholder="Xác nhận mật khẩu mới"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
            />
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleChangePassword} disabled={changingPw}>
              <KeyRound className="mr-2 h-4 w-4" /> {changingPw ? "Đang xử lý..." : "Đổi mật khẩu"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || uploading}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </div>
    </div>
  );
}
