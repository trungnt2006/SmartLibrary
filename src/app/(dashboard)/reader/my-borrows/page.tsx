"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { RotateCcw, RefreshCw, BookOpen } from "lucide-react";
import toast from "react-hot-toast";

export default function MyBorrowsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("id").eq("auth_user_id", user.id).single().then(({ data }) => {
        if (data) setProfileId(data.id);
      });
    });
  }, []);

  const fetchActive = async () => {
    if (!profileId) return;
    setLoading(true);
    const { data } = await supabase
      .from("borrow_records")
      .select("*, details:borrow_details(*, book_copy:book_copies(*, book:books(*)))")
      .eq("reader_id", profileId)
      .in("status", ["active", "overdue"])
      .order("created_at", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchActive();
  }, [profileId]);

  const handleReturnRequest = async (recordId: string) => {
    if (!profileId) return;
    const { error } = await supabase.from("return_requests").insert({
      reader_id: profileId,
      borrow_record_id: recordId,
      status: "pending",
    });
    if (error) { toast.error("Lỗi: " + error.message); return; }
    toast.success("Đã gửi yêu cầu trả sách!");
    fetchActive();
  };

  const handleRenewalRequest = async (detailId: string, recordId: string, oldDueDate: string) => {
    if (!profileId) return;
    const { error } = await supabase.from("renewal_requests").insert({
      reader_id: profileId,
      borrow_record_id: recordId,
      borrow_detail_id: detailId,
      status: "pending",
      old_due_date: oldDueDate,
    });
    if (error) { toast.error("Lỗi: " + error.message); return; }
    toast.success("Đã gửi yêu cầu gia hạn!");
    fetchActive();
  };

  if (loading) return <div className="p-6 text-center text-gray-400">Đang tải...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sách đang mượn</h1>
        <p className="text-sm text-gray-500">Các sách đang mượn và quá hạn</p>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-400">
            <BookOpen className="mx-auto h-10 w-10 text-gray-300 mb-2" />
            <p>Không có sách nào đang mượn</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const activeDetails = (record.details || []).filter((d: any) => d.status !== "returned");
            const isOverdue = record.status === "overdue";
            return (
              <Card key={record.id} className={isOverdue ? "border-red-200" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isOverdue ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                      {isOverdue ? "Quá hạn" : "Đang mượn"}
                    </span>
                    <span className="text-xs text-gray-400">Hạn trả: {formatDate(record.due_date)}</span>
                  </div>
                  <div className="divide-y">
                    {activeDetails.map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{d.book_copy?.book?.title || "-"}</p>
                          <p className="text-xs text-gray-500">Barcode: {d.book_copy?.barcode}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRenewalRequest(d.id, record.id, d.due_date)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => handleReturnRequest(record.id)}>
                      <RotateCcw className="mr-1 h-4 w-4" /> Yêu cầu trả
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
