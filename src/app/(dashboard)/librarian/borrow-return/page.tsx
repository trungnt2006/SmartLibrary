"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Table } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import type { BorrowRecord, Profile, BookCopy } from "@/types";
import { formatDate } from "@/lib/utils";
import { Scan, CheckCircle, Plus, Search, X, Trash2, Eye, BookOpen, User, CalendarDays, Hash } from "lucide-react";
import toast from "react-hot-toast";

const STATUS_LABELS: Record<string, string> = {
  active: "Đang mượn",
  returned: "Đã trả",
  overdue: "Quá hạn",
};

export default function BorrowReturnPage() {
  const [tab, setTab] = useState<"borrow" | "return">("borrow");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanCode, setScanCode] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [createTab, setCreateTab] = useState<"borrow" | "return">("borrow");

  const [readerSearch, setReaderSearch] = useState("");
  const [readerResults, setReaderResults] = useState<Profile[]>([]);
  const [selectedReader, setSelectedReader] = useState<Profile | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<(BookCopy & { book?: { title: string } })[]>([]);
  const [selectedCopies, setSelectedCopies] = useState<(BookCopy & { book?: { title: string } })[]>([]);
  const [createDueDate, setCreateDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });

  const [returnReaderSearch, setReturnReaderSearch] = useState("");
  const [returnReaderResults, setReturnReaderResults] = useState<Profile[]>([]);
  const [returnReader, setReturnReader] = useState<Profile | null>(null);
  const [activeDetails, setActiveDetails] = useState<any[]>([]);
  const [returnSelections, setReturnSelections] = useState<Record<string, string>>({});

  const [creating, setCreating] = useState(false);
  const pageSize = 10;
  const supabase = createClient();

  const fetchRecords = async () => {
    setLoading(true);
    let query = supabase
      .from("borrow_records")
      .select("*, reader:profiles!borrow_records_reader_id_fkey(full_name, email, employee_code)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (tab === "borrow") {
      query = query.in("status", ["active", "overdue"]);
    } else {
      query = query.eq("status", "returned");
    }

    const { data, count } = await query;
    const enriched = await Promise.all((data || []).map(async (r) => {
      const { count: bookCount } = await supabase
        .from("borrow_details")
        .select("*", { count: "exact", head: true })
        .eq("borrow_record_id", r.id);
      return { ...r, _book_count: bookCount || 0 };
    }));
    setRecords(enriched);
    setTotal(count || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, [tab, page]);

  const searchReader = useCallback(async (query: string) => {
    if (!query.trim()) { setReaderResults([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,employee_code.ilike.%${query}%`)
      .eq("role", "reader")
      .limit(10);
    setReaderResults(data || []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchReader(readerSearch), 300);
    return () => clearTimeout(timer);
  }, [readerSearch, searchReader]);

  const searchCopies = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    const { data: matchingBooks } = await supabase
      .from("books")
      .select("id")
      .or(`title.ilike.%${query}%,author.ilike.%${query}%`);
    const bookIds = matchingBooks?.map((b) => b.id) || [];
    const orParts = [`barcode.ilike.%${query}%`];
    if (bookIds.length > 0) orParts.push(`book_id.in.(${bookIds.join(",")})`);
    const { data, error } = await supabase
      .from("book_copies")
      .select("*, book:books(title)")
      .eq("status", "available")
      .or(orParts.join(","))
      .limit(20);
    if (error) { console.error("searchCopies error:", error); toast.error("Lỗi tìm sách: " + error.message); return; }
    setSearchResults(data || []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchCopies(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchCopies]);

  const searchReturnReader = useCallback(async (query: string) => {
    if (!query.trim()) { setReturnReaderResults([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,employee_code.ilike.%${query}%`)
      .eq("role", "reader")
      .limit(10);
    setReturnReaderResults(data || []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchReturnReader(returnReaderSearch), 300);
    return () => clearTimeout(timer);
  }, [returnReaderSearch, searchReturnReader]);

  const loadActiveDetails = async (readerId: string) => {
    const { data: records, error: recErr } = await supabase
      .from("borrow_records")
      .select("id, status")
      .eq("reader_id", readerId)
      .in("status", ["active", "overdue"]);
    if (recErr) { console.error("loadActiveDetails rec err:", recErr); setActiveDetails([]); return; }
    if (!records || records.length === 0) { console.log("No active borrow records for reader", readerId); setActiveDetails([]); return; }
    console.log("Found borrow records:", records);
    const recordIds = records.map((r) => r.id);
    const { data: details, error: detErr } = await supabase
      .from("borrow_details")
      .select("*, book_copy:book_copies(id, barcode, book:books(title))")
      .in("borrow_record_id", recordIds)
      .eq("status", "active");
    if (detErr) { console.error("loadActiveDetails det err:", detErr); setActiveDetails([]); return; }
    console.log("Found borrow details:", details);
    setActiveDetails(details || []);
  };

  const handleAddCopy = (copy: BookCopy & { book?: { title: string } }) => {
    if (selectedCopies.find((c) => c.id === copy.id)) { toast.error("Sách này đã có trong danh sách"); return; }
    setSelectedCopies([...selectedCopies, copy]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveCopy = (id: string) => {
    setSelectedCopies(selectedCopies.filter((c) => c.id !== id));
  };

  const handleCreateBorrow = async () => {
    if (!selectedReader) { toast.error("Chọn độc giả"); return; }
    if (selectedCopies.length === 0) { toast.error("Chọn ít nhất một cuốn sách"); return; }

      const { data: authData } = await supabase.auth.getUser();
      const { data: librarian } = await supabase.from("profiles").select("id").eq("auth_user_id", authData!.user!.id).single();
    if (!librarian) { toast.error("Không xác định thủ thư"); return; }

    const { data: rule } = await supabase.from("library_rules").select("value").eq("key", "max_borrow_books").single();
    const maxBorrow = parseInt(rule?.value || "5");
    const { data: activeRecords } = await supabase
      .from("borrow_records")
      .select("id")
      .eq("reader_id", selectedReader.id)
      .in("status", ["active", "overdue"]);
    const recordIds = activeRecords?.map((r) => r.id) || [];
    let activeCount = 0;
    if (recordIds.length > 0) {
      const { count } = await supabase
        .from("borrow_details")
        .select("*", { count: "exact", head: true })
        .in("borrow_record_id", recordIds)
        .eq("status", "active");
      activeCount = count || 0;
    }
    if ((activeCount || 0) + selectedCopies.length > maxBorrow) {
      toast.error(`Độc giả chỉ được mượn tối đa ${maxBorrow} cuốn. Hiện đang mượn ${activeCount || 0} cuốn.`);
      return;
    }

    setCreating(true);

    const { data: record, error } = await supabase.from("borrow_records").insert({
      reader_id: selectedReader.id,
      librarian_id: librarian.id,
      borrow_date: new Date().toISOString().split("T")[0],
      due_date: createDueDate,
      status: "active",
      source: "counter",
    }).select().single();

    if (error) { toast.error("Lỗi: " + error.message); setCreating(false); return; }

    const detailsData = selectedCopies.map((c) => ({
      borrow_record_id: record.id,
      book_copy_id: c.id,
      due_date: createDueDate,
      status: "active",
    }));

    const { error: detailsError } = await supabase.from("borrow_details").insert(detailsData);
    if (detailsError) { toast.error("Lỗi: " + detailsError.message); setCreating(false); return; }

    const { error: copiesError } = await supabase
      .from("book_copies")
      .update({ status: "borrowing" })
      .in("id", selectedCopies.map((c) => c.id));
    if (copiesError) { toast.error("Lỗi: " + copiesError.message); setCreating(false); return; }

    toast.success("Tạo phiếu mượn thành công");
    setShowCreateModal(false);
    setSelectedReader(null);
    setSelectedCopies([]);
    setReaderSearch("");
    setCreating(false);
    fetchRecords();
  };

  const calcAndCreateFines = async (details: any[], librarianId: string, readerId: string, selections: Record<string, string>) => {
    const { data: rule } = await supabase.from("library_rules").select("value").eq("key", "fine_per_day_overdue").single();
    const { data: coefRule } = await supabase.from("library_rules").select("value").eq("key", "book_compensation_coefficient").single();
    const { data: dmgRule } = await supabase.from("library_rules").select("value").eq("key", "damaged_compensation_percent").single();
    const finePerDay = parseInt(rule?.value || "5000");
    const coef = parseFloat(coefRule?.value || "2");
    const dmgPercent = parseInt(dmgRule?.value || "50");
    const today = new Date().toISOString().split("T")[0];

    const fineInserts: any[] = [];
    for (const d of details) {
      const condition = selections[d.id] || "return";

      if (condition === "damaged" || condition === "lost") {
        const { data: copy } = await supabase
          .from("book_copies")
          .select("price, book:books(price)")
          .eq("id", d.book_copy_id)
          .single();
        const price = (copy as any)?.book?.price || (copy as any)?.price || 0;
        const amount = condition === "lost" ? Math.round(price * coef) : Math.round(price * dmgPercent / 100);
        if (amount > 0) {
          fineInserts.push({
            reader_id: readerId,
            borrow_detail_id: d.id,
            book_copy_id: d.book_copy_id,
            reason: condition,
            amount,
            created_by: librarianId,
          });
        }
      }

      if (condition === "return" && d.due_date && d.due_date < today) {
        const overdueDays = Math.ceil((new Date(today).getTime() - new Date(d.due_date).getTime()) / (1000 * 60 * 60 * 24));
        fineInserts.push({
          reader_id: readerId,
          borrow_detail_id: d.id,
          book_copy_id: d.book_copy_id,
          reason: "overdue",
          amount: overdueDays * finePerDay,
          created_by: librarianId,
        });
      }
    }

    if (fineInserts.length > 0) {
      const { error } = await supabase.from("fine_tickets").insert(fineInserts);
      if (error) console.error("create fines error:", error);
      else toast.success(`Đã tạo ${fineInserts.length} phiếu phạt`);
    }
  };

  const handleCreateReturn = async () => {
    if (!returnReader) { toast.error("Chọn độc giả"); return; }
    const selectedIds = Object.keys(returnSelections).filter((id) => returnSelections[id]);
    if (selectedIds.length === 0) { toast.error("Chọn ít nhất một cuốn"); return; }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: librarian } = await supabase.from("profiles").select("id").eq("auth_user_id", user!.id).single();
    if (!librarian) { toast.error("Không xác định thủ thư"); return; }

    setCreating(true);

    const { data: fullDetails, error: fetchErr } = await supabase
      .from("borrow_details")
      .select("id, book_copy_id, borrow_record_id, due_date, status")
      .in("id", selectedIds);

    if (fetchErr) { toast.error("Lỗi: " + fetchErr.message); setCreating(false); return; }
    if (!fullDetails) { setCreating(false); return; }

    const returnDate = new Date().toISOString().split("T")[0];

    const { error: updateError } = await supabase
      .from("borrow_details")
      .update({ return_date: returnDate, status: "returned" })
      .in("id", selectedIds);

    if (updateError) { toast.error("Lỗi: " + updateError.message); setCreating(false); return; }

    for (const d of fullDetails) {
      const condition = returnSelections[d.id] || "return";
      if (condition === "return") {
        await supabase.from("book_copies").update({ status: "available" }).eq("id", d.book_copy_id);
      } else if (condition === "damaged") {
        await supabase.from("book_copies").update({ status: "damaged" }).eq("id", d.book_copy_id);
      } else if (condition === "lost") {
        await supabase.from("book_copies").update({ status: "lost" }).eq("id", d.book_copy_id);
      }
    }

    const recordIds = [...new Set(fullDetails.map((d) => d.borrow_record_id))];
    for (const rid of recordIds) {
      const { count: totalCount } = await supabase
        .from("borrow_details")
        .select("*", { count: "exact", head: true })
        .eq("borrow_record_id", rid);

      const { count: returnedCount } = await supabase
        .from("borrow_details")
        .select("*", { count: "exact", head: true })
        .eq("borrow_record_id", rid)
        .eq("status", "returned");

      console.log(`Record ${rid}: total=${totalCount} returned=${returnedCount}`);
      if (totalCount !== null && totalCount === returnedCount) {
        await supabase.from("borrow_records").update({ status: "returned", return_date: returnDate }).eq("id", rid);
      }
    }

    await calcAndCreateFines(fullDetails, librarian.id, returnReader.id, returnSelections);

    const summary: string[] = [];
    const groups: Record<string, number> = {};
    for (const id of selectedIds) {
      const c = returnSelections[id] || "return";
      groups[c] = (groups[c] || 0) + 1;
    }
    for (const [c, n] of Object.entries(groups)) {
      const label = c === "return" ? "trả" : c === "damaged" ? "hư hỏng" : "mất";
      summary.push(`${n} ${label}`);
    }

    toast.success(`Hoàn tất: ${summary.join(", ")}`);
    setShowCreateModal(false);
    setReturnReader(null);
    setReturnReaderSearch("");
    setActiveDetails([]);
    setReturnSelections({});
    setCreating(false);
    fetchRecords();
  };

  const handleViewDetail = async (record: any) => {
    const { data: details } = await supabase
      .from("borrow_details")
      .select("*, book_copy:book_copies!book_copy_id(id, barcode, price, shelf_location, book:books(title, author))")
      .eq("borrow_record_id", record.id)
      .order("id");
    setShowDetail({ ...record, details: details || [] });
  };

  const handleScanComplete = async () => {
    if (!scanCode.trim()) return;

    const isBorrow = scanCode.trim().startsWith("BRW");
    const isReturn = scanCode.trim().startsWith("RTN");

    if (!isBorrow && !isReturn) {
      toast.error("Mã không hợp lệ. Phải bắt đầu bằng BRW hoặc RTN");
      return;
    }

    if (isBorrow) {
      const { data: request } = await supabase
        .from("borrow_requests")
        .select("*, reader:profiles!borrow_requests_reader_id_fkey(*)")
        .eq("borrow_code", scanCode.trim())
        .single();

      if (!request) { toast.error("Không tìm thấy mã mượn"); return; }
      if (request.status !== "approved") { toast.error("Yêu cầu chưa được duyệt hoặc đã hết hạn"); return; }

      const { data: { user } } = await supabase.auth.getUser();
      const { data: librarian } = await supabase.from("profiles").select("id").eq("auth_user_id", user!.id).single();
      if (!librarian) { toast.error("Không xác định thủ thư"); return; }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const { data: record, error } = await supabase.from("borrow_records").insert({
        reader_id: request.reader_id,
        librarian_id: librarian.id,
        borrow_date: new Date().toISOString().split("T")[0],
        due_date: dueDate.toISOString().split("T")[0],
        status: "active",
        source: "online",
        created_from_request_id: request.id,
      }).select().single();

      if (error) { toast.error("Lỗi: " + error.message); return; }

      const { data: details } = await supabase.from("borrow_request_details").select("*").eq("borrow_request_id", request.id);
      if (details) {
        const borrowDetails = await Promise.all(details.map(async (d) => {
          const { data: availableCopy } = await supabase.from("book_copies").select("id").eq("book_id", d.book_id).eq("status", "available").limit(1).single();
          if (availableCopy) {
            await supabase.from("book_copies").update({ status: "borrowing" }).eq("id", availableCopy.id);
            return { borrow_record_id: record.id, book_copy_id: availableCopy.id, due_date: record.due_date, status: "active" };
          }
          return null;
        }));
        const validDetails = borrowDetails.filter((d): d is NonNullable<typeof d> => d != null);
        await supabase.from("borrow_details").insert(validDetails);
      }

      await supabase.from("borrow_requests").update({ status: "completed", completed_by: librarian.id, completed_at: new Date().toISOString() }).eq("id", request.id);
      toast.success("Xác nhận cho mượn sách thành công");
    } else {
      const { data: request } = await supabase
        .from("return_requests")
        .select("*")
        .eq("return_code", scanCode.trim())
        .single();

      if (!request) { toast.error("Không tìm thấy mã trả"); return; }
      if (request.status !== "approved") { toast.error("Yêu cầu chưa được duyệt"); return; }

      const { data: { user: scanUser } } = await supabase.auth.getUser();
      const { data: librarian } = await supabase.from("profiles").select("id").eq("auth_user_id", scanUser!.id).single();
      if (!librarian) { toast.error("Không xác định thủ thư"); return; }

      const returnDate = new Date().toISOString().split("T")[0];
      await supabase.from("borrow_details").update({ return_date: returnDate, status: "returned" }).eq("borrow_record_id", request.borrow_record_id);

      const { data: details } = await supabase.from("borrow_details").select("id, book_copy_id, due_date").eq("borrow_record_id", request.borrow_record_id);
      if (details) {
        for (const d of details) {
          await supabase.from("book_copies").update({ status: "available" }).eq("id", d.book_copy_id);
        }
        await calcAndCreateFines(details, librarian.id, request.reader_id, {});
      }

      const allReturned = await supabase.from("borrow_details").select("*").eq("borrow_record_id", request.borrow_record_id).eq("status", "returned");
      const totalDetails = await supabase.from("borrow_details").select("*", { count: "exact", head: true }).eq("borrow_record_id", request.borrow_record_id);

      if (allReturned.data?.length === totalDetails.count) {
        await supabase.from("borrow_records").update({ status: "returned", return_date: returnDate }).eq("id", request.borrow_record_id);
      }

      await supabase.from("return_requests").update({ status: "completed", completed_by: librarian.id, completed_at: new Date().toISOString() }).eq("id", request.id);
      toast.success("Xác nhận trả sách thành công");
    }

    setScanCode("");
    setShowScanModal(false);
    fetchRecords();
  };

  const columns = [
    { key: "reader", header: "Độc giả", render: (item: any) => item.reader?.full_name || "-" },
    { key: "borrow_date", header: "Ngày mượn", render: (item: any) => formatDate(item.borrow_date) },
    { key: "due_date", header: "Hạn trả", render: (item: any) => formatDate(item.due_date) },
    { key: "return_date", header: "Ngày trả", render: (item: any) => item.return_date ? formatDate(item.return_date) : "-" },
    { key: "book_count", header: "Số cuốn", render: (item: any) => item._book_count || "-" },
    { key: "status", header: "Trạng thái", render: (item: any) => {
      const s = item.status;
      const map: Record<string, { bg: string; text: string; label: string }> = {
        active: { bg: "bg-blue-100", text: "text-blue-800", label: "Đang mượn" },
        overdue: { bg: "bg-red-100", text: "text-red-800", label: "Quá hạn" },
        returned: { bg: "bg-green-100", text: "text-green-800", label: "Đã trả" },
      };
      const c = map[s] || { bg: "bg-gray-100", text: "text-gray-800", label: s };
      return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
    } },
    { key: "source", header: "Nguồn", render: (item: any) => item.source === "online" ? "Online" : "Tại quầy" },
    {
      key: "actions",
      header: "",
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
          <h1 className="text-2xl font-bold text-gray-900">Mượn / Trả sách</h1>
          <p className="text-sm text-gray-500">Xác nhận mượn/trả sách tại quầy</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setCreateTab("borrow"); setShowCreateModal(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Tạo phiếu
          </Button>
          <Button onClick={() => setShowScanModal(true)}>
            <Scan className="mr-2 h-4 w-4" /> Quét mã / Nhập mã
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {(["borrow", "return"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "borrow" ? "Phiếu mượn" : "Phiếu trả"}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table columns={columns} data={records} keyExtractor={(item) => item.id} loading={loading} emptyMessage="Không có phiếu mượn nào" />
        </CardContent>
        <Pagination page={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} />
      </Card>

      <Modal open={showScanModal} onClose={() => { setShowScanModal(false); setScanCode(""); }} title="Quét hoặc nhập mã" size="sm">
        <div className="space-y-4">
          <Input
            id="scanCode"
            label="Mã mượn/trả"
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value)}
            placeholder="VD: BRW-2026-xxxxxx hoặc RTN-2026-xxxxxx"
          />
          <p className="text-xs text-gray-400">
            Hệ thống tự động phân biệt mã mượn (BRW) và mã trả (RTN)
          </p>
          <Button className="w-full" onClick={handleScanComplete}>
            <CheckCircle className="mr-2 h-4 w-4" /> Xác nhận
          </Button>
        </div>
      </Modal>

      <Modal open={showCreateModal} onClose={() => { setShowCreateModal(false); resetCreateForm(); }} title="Tạo phiếu tại quầy" size="lg">
        <div className="space-y-4">
          <div className="flex gap-2 border-b">
            {(["borrow", "return"] as const).map((t) => (
              <button key={t} onClick={() => setCreateTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  createTab === t
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t === "borrow" ? "Cho mượn" : "Nhận trả"}
              </button>
            ))}
          </div>

          {createTab === "borrow" ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Độc giả</label>
                {selectedReader ? (
                  <div className="flex items-center justify-between rounded-lg border bg-green-50 p-3">
                    <div>
                      <p className="font-medium text-gray-900">{selectedReader.full_name}</p>
                      <p className="text-sm text-gray-500">{selectedReader.email} — {selectedReader.employee_code}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedReader(null); setReaderSearch(""); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none" placeholder="Tìm theo tên, email, mã..." value={readerSearch} onChange={(e) => setReaderSearch(e.target.value)} />
                    {readerResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-lg">
                        {readerResults.map((r) => (
                          <button key={r.id} type="button" className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => setSelectedReader(r)}>
                            <div>
                              <p className="font-medium text-gray-900">{r.full_name}</p>
                              <p className="text-xs text-gray-500">{r.email} — {r.employee_code}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tìm sách (tên, tác giả hoặc barcode)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none" placeholder="Nhập tên sách, tác giả hoặc quét barcode..." value={searchQuery} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const first = searchResults[0]; if (first) handleAddCopy(first); } }} onChange={(e) => setSearchQuery(e.target.value)} />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map((c) => (
                        <button key={c.id} type="button" className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => handleAddCopy(c)}>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{c.book?.title || "-"}</p>
                            <p className="text-xs text-gray-500">Barcode: {c.barcode}</p>
                          </div>
                          <Plus className="ml-2 h-4 w-4 shrink-0 text-blue-500" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedCopies.length > 0 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Danh sách mượn ({selectedCopies.length} cuốn)</label>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {selectedCopies.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg border bg-gray-50 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{c.book?.title || "-"}</p>
                          <p className="text-xs text-gray-500">{c.barcode}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveCopy(c.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Input id="dueDate" label="Hạn trả" type="date" value={createDueDate} onChange={(e) => setCreateDueDate(e.target.value)} />

              <div className="flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>Hủy</Button>
                <Button loading={creating} onClick={handleCreateBorrow} disabled={!selectedReader || selectedCopies.length === 0}>
                  <CheckCircle className="mr-2 h-4 w-4" /> Xác nhận mượn
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Độc giả trả sách</label>
                {returnReader ? (
                  <div className="flex items-center justify-between rounded-lg border bg-green-50 p-3">
                    <div>
                      <p className="font-medium text-gray-900">{returnReader.full_name}</p>
                      <p className="text-sm text-gray-500">{returnReader.email} — {returnReader.employee_code}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setReturnReader(null); setActiveDetails([]); setReturnSelections({}); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none" placeholder="Tìm theo tên, email, mã..." value={returnReaderSearch} onChange={(e) => setReturnReaderSearch(e.target.value)} />
                    {returnReaderResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-lg">
                        {returnReaderResults.map((r) => (
                          <button key={r.id} type="button" className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => { setReturnReader(r); loadActiveDetails(r.id); }}>
                            <div>
                              <p className="font-medium text-gray-900">{r.full_name}</p>
                              <p className="text-xs text-gray-500">{r.email} — {r.employee_code}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {returnReader && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Chọn sách trả</label>
                  {activeDetails.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">Độc giả không có sách đang mượn</p>
                  ) : (
                    <div className="space-y-1 max-h-60 overflow-y-auto border rounded-lg divide-y">
                      {activeDetails.map((d) => {
                        const sel = returnSelections[d.id] || "";
                        const isChecked = !!sel;
                        return (
                          <div key={d.id} className={`flex items-center gap-2 px-3 py-2 ${isChecked ? "bg-blue-50" : ""}`}>
                            <input type="checkbox" checked={isChecked}
                              onChange={() => {
                                setReturnSelections((prev) => {
                                  const next = { ...prev };
                                  if (next[d.id]) delete next[d.id];
                                  else next[d.id] = "return";
                                  return next;
                                });
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                            />
                            {isChecked && (
                              <select
                                value={sel}
                                onChange={(e) => setReturnSelections((prev) => ({ ...prev, [d.id]: e.target.value }))}
                                className="text-xs rounded border border-gray-300 py-1 px-1 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="return">Trả</option>
                                <option value="damaged">Hư hỏng</option>
                                <option value="lost">Mất</option>
                              </select>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{d.book_copy?.book?.title || "-"}</p>
                              <p className="text-xs text-gray-500">Barcode: {d.book_copy?.barcode} · Hạn trả: {formatDate(d.due_date)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Đã chọn {Object.keys(returnSelections).length} cuốn</p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>Hủy</Button>
                <Button loading={creating} onClick={handleCreateReturn} disabled={!returnReader || Object.keys(returnSelections).length === 0}>
                  <CheckCircle className="mr-2 h-4 w-4" /> Xác nhận trả
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={showDetail ? "Chi tiết phiếu mượn" : ""} size="lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Độc giả</p>
                  <p className="font-medium">{showDetail.reader?.full_name || "-"}</p>
                  <p className="text-xs text-gray-400">{showDetail.reader?.email} {showDetail.reader?.employee_code ? `· ${showDetail.reader.employee_code}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Nguồn</p>
                  <p className="font-medium">{showDetail.source === "online" ? "Online" : "Tại quầy"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Ngày mượn</p>
                  <p className="font-medium">{formatDate(showDetail.borrow_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Hạn trả</p>
                  <p className="font-medium">{formatDate(showDetail.due_date)}</p>
                </div>
              </div>
              {showDetail.return_date && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-gray-500">Ngày trả</p>
                    <p className="font-medium">{formatDate(showDetail.return_date)}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-gray-500">Trạng thái</p>
                <Badge status={showDetail.status} />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Danh sách sách</label>
              <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                {showDetail.details?.map((d: any) => (
                  <div key={d.id} className="flex items-center gap-3 px-3 py-2">
                    <BookOpen className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{d.book_copy?.book?.title || "-"}</p>
                      <p className="text-xs text-gray-500">
                        Barcode: {d.book_copy?.barcode}
                        {d.book_copy?.shelf_location ? ` · Vị trí: ${d.book_copy.shelf_location}` : ""}
                        {d.book_copy?.price ? ` · Giá: ${d.book_copy.price.toLocaleString("vi-VN")}₫` : ""}
                      </p>
                    </div>
                    <Badge status={d.status} />
                  </div>
                ))}
                {(!showDetail.details || showDetail.details.length === 0) && (
                  <p className="text-sm text-gray-400 py-4 text-center">Không có chi tiết</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );

  function resetCreateForm() {
    setSelectedReader(null);
    setSelectedCopies([]);
    setReaderSearch("");
    setSearchQuery("");
    setSearchResults([]);
    setReturnReader(null);
    setReturnReaderSearch("");
    setReturnReaderResults([]);
    setActiveDetails([]);
    setReturnSelections({});
    setCreating(false);
  }
}
