"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import type { LibraryRule } from "@/types";
import { cn, formatCurrency } from "@/lib/utils";
import { Edit3, BookOpen, Clock, Coins, Users, Calendar, BookCopy, Hourglass, Shield, Database } from "lucide-react";
import toast from "react-hot-toast";

export default function RulesPage() {
  const [rules, setRules] = useState<LibraryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [editRule, setEditRule] = useState<LibraryRule | null>(null);
  const [showModal, setShowModal] = useState(false);
  const supabase = createClient();

  const defaultRules = [
    { key: "membership_duration_months", value: "6", value_type: "number", description: "Thời hạn thẻ độc giả (tháng)" },
    { key: "max_borrow_books", value: "5", value_type: "number", description: "Số sách tối đa được mượn" },
    { key: "max_borrow_days", value: "14", value_type: "number", description: "Số ngày mượn tối đa" },
    { key: "fine_per_day_overdue", value: "5000", value_type: "number", description: "Phạt quá hạn mỗi ngày (VNĐ)" },
    { key: "min_reader_age", value: "15", value_type: "number", description: "Tuổi độc giả tối thiểu" },
    { key: "request_expiry_days", value: "3", value_type: "number", description: "Số ngày mã mượn/trả còn hiệu lực" },
    { key: "book_compensation_coefficient", value: "2", value_type: "number", description: "Hệ số đền bù khi mất sách (giá sách × hệ số)" },
    { key: "damaged_compensation_percent", value: "50", value_type: "number", description: "Phần trăm giá sách bồi thường khi hư hỏng (%)" },
  ];

  const fetchRules = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("library_rules")
      .select("*")
      .order("key");
    setRules(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    const { error } = await supabase.from("library_rules").insert(defaultRules);
    if (error) { toast.error("Lỗi tạo dữ liệu: " + error.message); setSeeding(false); return; }
    toast.success("Đã tạo quy định mặc định");
    setSeeding(false);
    fetchRules();
  };

  const handleSave = async (rule: LibraryRule) => {
    const { error } = await supabase
      .from("library_rules")
      .update({ value: rule.value })
      .eq("id", rule.id);

    if (error) {
      toast.error("Lỗi cập nhật: " + error.message);
      return;
    }
    toast.success("Cập nhật quy định thành công");
    setShowModal(false);
    setEditRule(null);
    fetchRules();
  };

  const ruleConfig: Record<string, { label: string; icon: typeof Shield; suffix: string; gradient: string }> = {
    membership_duration_months: { label: "Thời hạn thẻ", icon: Calendar, suffix: "tháng", gradient: "from-blue-500 to-blue-600" },
    max_borrow_books: { label: "Số sách mượn tối đa", icon: BookCopy, suffix: "cuốn", gradient: "from-emerald-500 to-emerald-600" },
    max_borrow_days: { label: "Số ngày mượn tối đa", icon: Clock, suffix: "ngày", gradient: "from-violet-500 to-violet-600" },
    fine_per_day_overdue: { label: "Phạt quá hạn", icon: Coins, suffix: "VNĐ/ngày", gradient: "from-orange-500 to-orange-600" },
    min_reader_age: { label: "Tuổi tối thiểu", icon: Users, suffix: "tuổi", gradient: "from-cyan-500 to-cyan-600" },
    request_expiry_days: { label: "Hiệu lực mã yêu cầu", icon: Hourglass, suffix: "ngày", gradient: "from-amber-500 to-amber-600" },
    book_compensation_coefficient: { label: "Hệ số đền sách", icon: Shield, suffix: "x giá sách", gradient: "from-red-500 to-red-600" },
    damaged_compensation_percent: { label: "Bồi thường hư hỏng", icon: Shield, suffix: "% giá sách", gradient: "from-rose-500 to-rose-600" },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quy định thư viện</h1>
        <p className="text-sm text-gray-500 mt-1">
          Các quy định áp dụng cho toàn bộ hệ thống mượn trả sách
        </p>
      </div>

      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
            <Database className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Chưa có quy định nào</h3>
          <p className="mt-1 text-sm text-gray-500">Bảng library_rules đang trống. Hãy tạo dữ liệu mặc định.</p>
          <Button variant="gradient" className="mt-6" loading={seeding} onClick={handleSeed}>
            <Database className="mr-2 h-4 w-4" /> Tạo quy định mặc định
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rules.map((rule) => {
          const config = ruleConfig[rule.key];
          const Icon = config?.icon || Shield;
          const displayValue = rule.key === "fine_per_day_overdue"
            ? formatCurrency(Number(rule.value))
            : rule.value;

          return (
            <Card
              key={rule.id}
              hover
              className="relative overflow-hidden group cursor-pointer"
              onClick={() => {
                setEditRule(rule);
                setShowModal(true);
              }}
            >
              <div className={cn(
                "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
                config?.gradient || "from-blue-500 to-blue-600"
              )} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
                    config?.gradient || "from-blue-500 to-blue-600"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
                    <Edit3 className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-900">
                    {config?.label || rule.key}
                  </p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900">{displayValue}</span>
                    <span className="text-sm text-gray-500">{config?.suffix}</span>
                  </div>
                </div>
                {rule.description && (
                  <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                    {rule.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditRule(null); }}
        title="Chỉnh sửa quy định"
        size="sm"
      >
        {editRule && (
          <RuleForm
            rule={editRule}
            onSave={handleSave}
            onCancel={() => { setShowModal(false); setEditRule(null); }}
          />
        )}
      </Modal>
    </div>
  );
}

function RuleForm({
  rule,
  onSave,
  onCancel,
}: {
  rule: LibraryRule;
  onSave: (rule: LibraryRule) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(rule.value);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...rule, value });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {rule.description && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          {rule.description}
        </div>
      )}
      <Input
        id="ruleValue"
        label="Giá trị mới"
        type={rule.value_type === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" type="button" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" loading={saving}>
          Lưu thay đổi
        </Button>
      </div>
    </form>
  );
}

