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
import type { BorrowRecord, Profile, BookCopy, Book } from "@/types";
import { formatDate } from "@/lib/utils";
import { Scan, BookOpen, CheckCircle, Plus, Search, X, Trash2, Barcode } from "lucide-react";
import toast from "react-hot-toast";

export default function BorrowReturnPage() {
  const [tab, setTab] = useState<"borrow" | "return">("borrow");
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanCode, setScanCode] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [readerSearch, setReaderSearch] = useState("");
  const [readerResults, setReaderResults] = useState<Profile[]>([]);
  const [selectedReader, setSelectedReader] = useState<Profile | null>(null);
  const [bookSearch, setBookSearch] = useState("");
  const [bookResults, setBookResults] = useState<Book[]>([]);
  const [quantity, setQuantity] = useState("1");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [selectedCopies, setSelectedCopies] = useState<(BookCopy & { book?: { title: string } })[]>([]);
  const [createDueDate, setCreateDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [creating, setCreating] = useState(false);
  const pageSize = 10;
  const supabase = createClient();

  const fetchRecords = async () => {
    setLoading(true);
    let query = supabase
      .from("borrow_records")
      .select("*, reader:profiles!borrow_records_reader_id_fkey(full_name, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (tab === "borrow") {
      query = query.in("status", ["active", "overdue"]);
    } else {
      query = query.eq("status", "returned");
    }

    const { data, count } = await query;
    setRecords(data || []);
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

  const searchBook = useCallback(async (query: string) => {
    if (!query.trim()) { setBookResults([]); return; }
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .ilike("title", `%${query}%`)
      .limit(10);
    if (error) { console.error("searchBook error:", error); toast.error("Lỗi tìm sách: " + error.message); return; }
    console.log("searchBook result:", data?.length, data);
    setBookResults(data || []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchBook(bookSearch), 300);
    return () => clearTimeout(timer);
  }, [bookSearch, searchBook]);

  const handleSelectBook = async (book: Book, qty: number = 1) => {
    const { data: copies, error } = await supabase
      .from("book_copies")
      .select("*, book:books(title)")
      .eq("book_id", book.id)
      .eq("status", "available")
      .limit(qty);
    if (error) { console.error("handleSelectBook error:", error); toast.error("Lỗi: " + error.message); return; }
    if (!copies || copies.length === 0) { toast.error(`"${book.title}" không còn cuốn nào có sẵn`); return; }
    setSelectedCopies([...selectedCopies, ...copies]);
    setBookSearch("");
    setBookResults([]);
  };

  const handleAddCopyByBarcode = async () => {
    const code = barcodeInput.trim();
    if (!code) return;
    const { data: copy, error } = await supabase
      .from("book_copies")
      .select("*, book:books(title)")
      .eq("barcode", code)
      .eq("status", "available")
      .single();
    if (error && error.code !== "PGRST116") { console.error("barcode error:", error); toast.error("Lỗi: " + error.message); return; }
    if (!copy) { toast.error("Không tìm thấy barcode hoặc sách không có sẵn"); return; }
    if (selectedCopies.find((c) => c.id === copy.id)) { toast.error("Sách này đã có trong danh sách"); return; }
    setSelectedCopies([...selectedCopies, copy]);
    setBarcodeInput("");
  };

  const handleRemoveCopy = (id: string) => {
    setSelectedCopies(selectedCopies.filter((c) => c.id !== id));
  };

  const handleCreateBorrow = async () => {
    if (!selectedReader) { toast.error("Chọn độc giả"); return; }
    if (selectedCopies.length === 0) { toast.error("Chọn ít nhất một cuốn sách"); return; }

    const { data: profile } = await supabase.auth.getUser();
    const { data: librarian } = await supabase.from("profiles").select("id").eq("auth_user_id", profile.user!.id).single();
    if (!librarian) { toast.error("Không xác định thủ thư"); return; }

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

  const handleScanComplete = async () => {
    if (!scanCode.trim()) return;

    if (tab === "borrow") {
      const { data: request } = await supabase
        .from("borrow_requests")
        .select("*, reader:profiles!borrow_requests_reader_id_fkey(*)")
        .eq("borrow_code", scanCode.trim())
        .single();

      if (!request) {
        toast.error("Không tìm thấy mã mượn");
        return;
      }

      if (request.status !== "approved") {
        toast.error("Yêu cầu chưa được duyệt hoặc đã hết hạn");
        return;
      }

      const { data: profile } = await supabase.auth.getUser();
      const { data: librarian } = await supabase.from("profiles").select("id").eq("auth_user_id", profile.user!.id).single();
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

      if (!request) {
        toast.error("Không tìm thấy mã trả");
        return;
      }

      if (request.status !== "approved") {
        toast.error("Yêu cầu chưa được duyệt");
        return;
      }

      const { data: profile } = await supabase.auth.getUser();
      const { data: librarian } = await supabase.from("profiles").select("id").eq("auth_user_id", profile.user!.id).single();
      if (!librarian) { toast.error("Không xác định thủ thư"); return; }

      await supabase.from("borrow_details").update({ return_date: new Date().toISOString().split("T")[0], status: "returned" }).eq("borrow_record_id", request.borrow_record_id);

      const { data: details } = await supabase.from("borrow_details").select("book_copy_id").eq("borrow_record_id", request.borrow_record_id);
      if (details) {
        for (const d of details) {
          await supabase.from("book_copies").update({ status: "available" }).eq("id", d.book_copy_id);
        }
      }

      const allReturned = await supabase.from("borrow_details").select("*").eq("borrow_record_id", request.borrow_record_id).eq("status", "returned");
      const totalDetails = await supabase.from("borrow_details").select("*", { count: "exact", head: true }).eq("borrow_record_id", request.borrow_record_id);

      if (allReturned.data?.length === totalDetails.count) {
        await supabase.from("borrow_records").update({ status: "returned" }).eq("id", request.borrow_record_id);
      }

      await supabase.from("return_requests").update({ status: "completed", completed_by: librarian.id, completed_at: new Date().toISOString() }).eq("id", request.id);

      toast.success("Xác nhận trả sách thành công");
    }

    setScanCode("");
    setShowScanModal(false);
    fetchRecords();
  };

  const columns = [
    { key: "reader", header: "Độc giả", render: (item: BorrowRecord) => item.reader?.full_name || "-" },
    { key: "borrow_date", header: "Ngày mượn", render: (item: BorrowRecord) => formatDate(item.borrow_date) },
    { key: "due_date", header: "Hạn trả", render: (item: BorrowRecord) => formatDate(item.due_date) },
    { key: "status", header: "Trạng thái", render: (item: BorrowRecord) => <Badge status={item.status} /> },
    { key: "source", header: "Nguồn", render: (item: BorrowRecord) => item.source === "online" ? "Online" : "Tại quầy" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mượn / Trả sách</h1>
          <p className="text-sm text-gray-500">Xác nhận mượn/trả sách tại quầy</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Tạo phiếu mượn
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
            {t === "borrow" ? "Đang mượn" : "Đã trả"}
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
          <Button className="w-full" onClick={handleScanComplete}>
            <CheckCircle className="mr-2 h-4 w-4" /> Xác nhận
          </Button>
        </div>
      </Modal>

      <Modal open={showCreateModal} onClose={() => { setShowCreateModal(false); setSelectedReader(null); setSelectedCopies([]); setReaderSearch(""); setBookSearch(""); setBookResults([]); setBarcodeInput(""); }} title="Tạo phiếu mượn tại quầy" size="lg">
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Tìm theo tên sách / tác giả</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none" placeholder="Nhập tên sách hoặc tác giả..." value={bookSearch} onChange={(e) => setBookSearch(e.target.value)} />
                {bookResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-48 overflow-y-auto">
                    {bookResults.map((b) => (
                      <button key={b.id} type="button" className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => handleSelectBook(b, parseInt(quantity) || 1)}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{b.title}</p>
                          <p className="text-xs text-gray-500">{b.author}</p>
                        </div>
                        <Plus className="ml-2 h-4 w-4 shrink-0 text-blue-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-20 shrink-0">
                <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min={1} placeholder="SL" />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Hoặc nhập Barcode</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCopyByBarcode(); } }}
                  placeholder="Quét hoặc nhập barcode, Enter để xác nhận"
                />
              </div>
              <Button type="button" variant="outline" onClick={handleAddCopyByBarcode}>
                <Barcode className="h-4 w-4" />
              </Button>
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
            <Button variant="outline" type="button" onClick={() => { setShowCreateModal(false); setSelectedReader(null); setSelectedCopies([]); setReaderSearch(""); setBookSearch(""); setBookResults([]); setBarcodeInput(""); }}>Hủy</Button>
            <Button loading={creating} onClick={handleCreateBorrow} disabled={!selectedReader || selectedCopies.length === 0}>
              <CheckCircle className="mr-2 h-4 w-4" /> Xác nhận mượn
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
