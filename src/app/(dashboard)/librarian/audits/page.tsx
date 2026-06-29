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
import type { Profile, BookCopyStatus } from "@/types";
import { Plus, Search, Eye, CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_LABELS: Record<string, string> = {
  available: "Sẵn sàng",
  borrowing: "Đang mượn",
  reserved: "Đã đặt",
  damaged: "Hư hại",
  lost: "Mất",
  inactive: "Ngừng hoạt động",
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));
const AUDIT_STATUSES = ["available", "borrowing", "reserved", "damaged", "lost", "inactive"] as BookCopyStatus[];

function generateAuditCode(): string {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 999999)).padStart(6, "0");
  return `INV-${year}-${rand}`;
}

export default function AuditsPage() {
  const [audits, setAudits] = useState<any[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const pageSize = 10;
  const supabase = createClient();

  const fetchAudits = async () => {
    setLoading(true);
    let query = supabase
      .from("inventory_audits")
      .select("*, profiles!created_by(full_name, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search) {
      query = query.ilike("audit_code", `%${search}%`);
    }

    const { data, count } = await query;
    setAudits(data || []);
    setTotal(count || 0);
    setLoading(false);
  };

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("auth_user_id", user.id).single();
    setProfile(data);
  };

  useEffect(() => {
    fetchAudits();
    fetchProfile();
  }, [page, search]);

  const handleCreate = async (note: string) => {
    if (!profile) { toast.error("Không tìm thấy thông tin người dùng"); return; }

    const auditCode = generateAuditCode();

    const { data: audit, error: auditError } = await supabase
      .from("inventory_audits")
      .insert({ audit_code: auditCode, created_by: profile.id, note: note || null })
      .select()
      .single();

    if (auditError) { toast.error("Lỗi tạo phiếu: " + auditError.message); return; }

    const { data: copies } = await supabase
      .from("book_copies")
      .select("id, status");

    if (!copies || copies.length === 0) {
      toast.success(`Tạo phiếu ${auditCode} thành công (không có bản sao nào)`);
      setShowCreateModal(false);
      fetchAudits();
      return;
    }

    const BATCH_SIZE = 500;
    const details = copies.map((c) => ({
      audit_id: audit.id,
      book_copy_id: c.id,
      expected_status: c.status,
    }));

    for (let i = 0; i < details.length; i += BATCH_SIZE) {
      const batch = details.slice(i, i + BATCH_SIZE);
      const { error: detailsError } = await supabase.from("inventory_audit_details").insert(batch);
      if (detailsError) { toast.error("Lỗi tạo chi tiết: " + detailsError.message); return; }
    }

    toast.success(`Tạo phiếu ${auditCode} thành công, đã thêm ${copies.length} bản sao vào kiểm kê`);
    setShowCreateModal(false);
    fetchAudits();
  };

  const handleViewDetail = async (audit: any) => {
    const { data } = await supabase
      .from("inventory_audit_details")
      .select("*, book_copy:book_copies!book_copy_id(id, barcode, status, book:books(id, title, author))")
      .eq("audit_id", audit.id)
      .order("id");

    setShowDetail({ ...audit, details: data || [] });
  };

  const handleUpdateStatus = async (detailId: string, actualStatus: string) => {
    const { error } = await supabase
      .from("inventory_audit_details")
      .update({ actual_status: actualStatus })
      .eq("id", detailId);

    if (error) { toast.error("Lỗi cập nhật: " + error.message); return; }

    setShowDetail((prev: any) => ({
      ...prev,
      details: prev.details.map((d: any) =>
        d.id === detailId ? { ...d, actual_status: actualStatus } : d
      ),
    }));

    toast.success("Đã cập nhật trạng thái thực tế");
  };

  const handleMatchAll = async (auditId: string, details: any[]) => {
    const unmatched = details.filter((d: any) => !d.actual_status);
    if (unmatched.length === 0) { toast("Tất cả đã được kiểm tra"); return; }

    const updates = unmatched.map((d: any) => ({
      id: d.id,
      actual_status: d.expected_status,
    }));

    const { error } = await supabase
      .from("inventory_audit_details")
      .upsert(updates, { onConflict: "id" });

    if (error) { toast.error("Lỗi cập nhật: " + error.message); return; }

    setShowDetail((prev: any) => ({
      ...prev,
      details: prev.details.map((d: any) =>
        !d.actual_status ? { ...d, actual_status: d.expected_status } : d
      ),
    }));

    toast.success(`Đã đánh dấu ${unmatched.length} bản sao là khớp`);
  };

  const handleComplete = async (auditId: string) => {
    const { error } = await supabase
      .from("inventory_audits")
      .update({ status: "completed" })
      .eq("id", auditId);

    if (error) { toast.error("Lỗi hoàn thành: " + error.message); return; }

    toast.success("Đã hoàn thành phiếu kiểm kê");
    setShowDetail(null);
    fetchAudits();
  };

  const columns = [
    { key: "audit_code", header: "Mã phiếu" },
    { key: "created_at", header: "Ngày tạo", render: (item: any) => formatDateTime(item.created_at) },
    { key: "creator", header: "Người tạo", render: (item: any) => item.profiles?.full_name || "-" },
    {
      key: "status",
      header: "Trạng thái",
      render: (item: any) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          item.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
        }`}>
          {item.status === "completed" ? "Đã hoàn thành" : "Đang kiểm kê"}
        </span>
      ),
    },
    { key: "note", header: "Ghi chú", render: (item: any) => item.note || "-" },
    {
      key: "actions",
      header: "Thao tác",
      render: (item: any) => (
        <Button variant="ghost" size="sm" onClick={() => handleViewDetail(item)}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kiểm kê</h1>
          <p className="text-sm text-gray-500">Kiểm tra đối chiếu sách trong kho với hệ thống</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Tạo phiếu kiểm kê
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
          <Table columns={columns} data={audits} keyExtractor={(item) => item.id} loading={loading} emptyMessage="Chưa có phiếu kiểm kê nào" />
        </CardContent>
        <Pagination page={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} />
      </Card>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Tạo phiếu kiểm kê">
        <CreateAuditForm onSave={handleCreate} onCancel={() => setShowCreateModal(false)} />
      </Modal>

      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={showDetail ? `Phiếu ${showDetail.audit_code}` : ""} size="xl">
        {showDetail && (
          <AuditDetailView
            audit={showDetail}
            onUpdateStatus={handleUpdateStatus}
            onMatchAll={handleMatchAll}
            onComplete={handleComplete}
            onClose={() => setShowDetail(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function CreateAuditForm({ onSave, onCancel }: { onSave: (note: string) => void; onCancel: () => void }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(note);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500">
        Phiếu kiểm kê sẽ tự động thêm tất cả bản sao hiện có vào danh sách kiểm tra.
      </p>
      <Input id="note" label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú cho phiếu kiểm kê" />
      <div className="flex justify-end gap-3">
        <Button variant="outline" type="button" onClick={onCancel}>Hủy</Button>
        <Button type="submit" loading={saving}>Tạo phiếu</Button>
      </div>
    </form>
  );
}

function AuditDetailView({
  audit,
  onUpdateStatus,
  onMatchAll,
  onComplete,
  onClose,
}: {
  audit: any;
  onUpdateStatus: (detailId: string, status: string) => Promise<void>;
  onMatchAll: (auditId: string, details: any[]) => Promise<void>;
  onComplete: (auditId: string) => Promise<void>;
  onClose: () => void;
}) {
  const updatesMatch = audit.details.every(
    (d: any) => !d.actual_status || d.actual_status === d.expected_status
  );

  const columns = [
    { key: "barcode", header: "Barcode", render: (item: any) => item.book_copy?.barcode || "-" },
    { key: "book_title", header: "Đầu sách", render: (item: any) => item.book_copy?.book?.title || "-" },
    { key: "expected_status", header: "TT hệ thống", render: (item: any) => (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        item.expected_status === "available" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
      }`}>
        {STATUS_LABELS[item.expected_status] || item.expected_status}
      </span>
    )},
    {
      key: "actual_status",
      header: "TT thực tế",
      render: (item: any) => {
        const isMatch = item.actual_status && item.actual_status === item.expected_status;
        return (
          <div className="flex items-center gap-2">
            {audit.status === "in_progress" ? (
              <Select
                value={item.actual_status || ""}
                onChange={(e) => onUpdateStatus(item.id, e.target.value)}
                options={STATUS_OPTIONS}
                placeholder="Chọn..."
              />
            ) : (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isMatch ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}>
                {item.actual_status ? STATUS_LABELS[item.actual_status] || item.actual_status : "-"}
              </span>
            )}
            {isMatch && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          </div>
        );
      },
    },
    { key: "mismatch", header: "Khớp?", render: (item: any) => {
      if (!item.actual_status) return <span className="text-gray-400">-</span>;
      return item.actual_status === item.expected_status ? (
        <span className="text-green-600 text-sm font-medium">Khớp</span>
      ) : (
        <span className="text-red-600 text-sm font-medium">Lệch</span>
      );
    }},
  ];

  const mismatches = audit.details.filter(
    (d: any) => d.actual_status && d.actual_status !== d.expected_status
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Ngày tạo</p>
          <p className="font-medium">{formatDateTime(audit.created_at)}</p>
        </div>
        <div>
          <p className="text-gray-500">Trạng thái</p>
          <p className="font-medium">
            {audit.status === "completed" ? "Đã hoàn thành" : "Đang kiểm kê"}
          </p>
        </div>
        {audit.note && (
          <div className="col-span-2">
            <p className="text-gray-500">Ghi chú</p>
            <p className="font-medium">{audit.note}</p>
          </div>
        )}
      </div>

      {mismatches.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Phát hiện <strong>{mismatches.length}</strong> bản sao có trạng thái lệch so với hệ thống.
        </div>
      )}

      <div className="max-h-96 overflow-y-auto">
        <Table
          columns={columns}
          data={audit.details}
          keyExtractor={(item: any) => item.id}
          emptyMessage="Không có chi tiết"
        />
      </div>

      <div className="text-sm text-gray-500">
        Tổng số: <strong>{audit.details.length}</strong> bản sao
        {audit.details.filter((d: any) => d.actual_status).length > 0 && (
          <> · Đã kiểm tra: <strong>{audit.details.filter((d: any) => d.actual_status).length}</strong></>
        )}
      </div>

      <div className="flex justify-end gap-3">
        {audit.status === "in_progress" && (
          <>
            <Button variant="outline" onClick={() => onMatchAll(audit.id, audit.details)}>
              Đã khớp toàn bộ
            </Button>
            <Button
              onClick={() => onComplete(audit.id)}
              disabled={!audit.details.some((d: any) => d.actual_status)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Hoàn thành kiểm kê
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
