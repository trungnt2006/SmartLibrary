"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/shared/pagination";
import { Search, Eye, BookOpen, Minus, Plus } from "lucide-react";
import toast from "react-hot-toast";

const coverGradients = [
  "from-blue-400 to-blue-600",
  "from-emerald-400 to-emerald-600",
  "from-violet-400 to-violet-600",
  "from-orange-400 to-orange-600",
  "from-rose-400 to-rose-600",
  "from-cyan-400 to-cyan-600",
  "from-amber-400 to-amber-600",
  "from-indigo-400 to-indigo-600",
];

function getCoverGradient(title: string) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return coverGradients[Math.abs(hash) % coverGradients.length];
}

function getInitials(title: string) {
  const words = title.split(" ").filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return title.slice(0, 2).toUpperCase();
}

export default function SearchPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [borrowBook, setBorrowBook] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const pageSize = 12;
  const supabase = createClient();

  const fetchBooks = async () => {
    setLoading(true);
    let query = supabase
      .from("books")
      .select("*, category:categories(*), copies:book_copies(*)", { count: "exact" })
      .eq("status", "active")
      .order("title")
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search) {
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
    }

    const { data, count } = await query;
    setBooks(data || []);
    setTotal(count || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchBooks();
  }, [page, search]);

  const openBorrowForm = (book: any) => {
    setBorrowBook(book);
    setQuantity(1);
    setNote("");
  };

  const handleBorrow = async () => {
    if (!borrowBook) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Vui lòng đăng nhập"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (!profile) { toast.error("Không tìm thấy thông tin độc giả"); return; }

      const { data: rule } = await supabase.from("library_rules").select("value").eq("key", "max_borrow_books").single();
      const maxBorrow = parseInt(rule?.value || "5");
      const { data: activeRecords } = await supabase
        .from("borrow_records")
        .select("id")
        .eq("reader_id", profile.id)
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
      if (activeCount + quantity > maxBorrow) {
        toast.error(`Bạn chỉ được mượn tối đa ${maxBorrow} cuốn. Hiện đang mượn ${activeCount} cuốn.`);
        setSaving(false);
        return;
      }

      const { data: existing } = await supabase
        .from("borrow_requests")
        .select("id, status")
        .eq("reader_id", profile.id)
        .eq("status", "pending")
        .limit(1);

      let requestId: string;

      if (existing && existing.length > 0) {
        requestId = existing[0].id;
        if (note) {
          await supabase
            .from("borrow_requests")
            .update({ note })
            .eq("id", requestId);
        }
      } else {
        const { data: newReq, error: reqErr } = await supabase
          .from("borrow_requests")
          .insert({ reader_id: profile.id, note: note || null })
          .select("id")
          .single();

        if (reqErr) { toast.error("Lỗi tạo yêu cầu"); return; }
        requestId = newReq.id;
      }

      const details = Array.from({ length: quantity }, () => ({
        borrow_request_id: requestId,
        book_id: borrowBook.id,
      }));

      const { error: detailErr } = await supabase
        .from("borrow_request_details")
        .insert(details);

      if (detailErr) {
        toast.error("Lỗi thêm sách vào yêu cầu");
        return;
      }

      toast.success(`Đã thêm ${quantity} cuốn vào yêu cầu mượn`);
      setBorrowBook(null);
    } catch (err: any) {
      toast.error("Lỗi: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tra cứu sách</h1>
        <p className="text-sm text-gray-500 mt-1">Tìm kiếm sách trong thư viện</p>
      </div>

      <div className="relative w-full max-w-2xl">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          className="block w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          placeholder="Tìm kiếm theo tên sách, tác giả..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : books.length === 0 ? (
        <div className="py-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">Không tìm thấy sách</p>
        </div>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => {
              const available = book.copies?.filter((c: any) => c.status === "available").length || 0;
              const gradient = getCoverGradient(book.title);
              const initials = getInitials(book.title);

              return (
                <Card key={book.id} hover className="overflow-hidden">
                  <div className="flex">
                    <div className={`flex h-auto w-24 flex-shrink-0 items-center justify-center bg-gradient-to-br ${gradient} p-3`}>
                      <span className="text-lg font-bold text-white text-center leading-tight break-all">
                        {initials}
                      </span>
                    </div>
                    <CardContent className="flex flex-1 flex-col p-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{book.title}</h3>
                        <p className="text-sm text-gray-500 truncate">{book.author}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {book.category?.name}
                          </span>
                          {available > 0 ? (
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              {available} sẵn sàng
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                              Hết sách
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setShowDetail(book)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Chi tiết
                        </Button>
                        <Button
                          variant="gradient"
                          size="sm"
                          className="flex-1"
                          disabled={available === 0}
                          onClick={() => openBorrowForm(book)}
                        >
                          <BookOpen className="h-3.5 w-3.5 mr-1" /> Mượn
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              );
            })}
          </div>
          <Pagination page={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} />
        </>
      )}

      {/* Detail modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Chi tiết sách" size="lg">
        {showDetail && (
          <div className="space-y-5">
            <div className="flex gap-5">
              <div className={`flex h-32 w-24 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getCoverGradient(showDetail.title)} shadow-md`}>
                <span className="text-2xl font-bold text-white">{getInitials(showDetail.title)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900">{showDetail.title}</h2>
                <p className="text-sm text-gray-500">{showDetail.author}</p>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-gray-400">Nhà XB:</span>{" "}
                    <span className="text-gray-700">{showDetail.publisher || "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Năm XB:</span>{" "}
                    <span className="text-gray-700">{showDetail.publication_year || "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Danh mục:</span>{" "}
                    <span className="text-gray-700">{showDetail.category?.name || "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Có sẵn:</span>{" "}
                    <span className="font-semibold text-emerald-600">
                      {showDetail.copies?.filter((c: any) => c.status === "available").length || 0}/{showDetail.copies?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {showDetail.description && (
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Mô tả</p>
                <p className="text-sm text-gray-700 leading-relaxed">{showDetail.description}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="gradient"
                className="flex-1"
                onClick={() => {
                  const book = showDetail;
                  setShowDetail(null);
                  openBorrowForm(book);
                }}
              >
                <BookOpen className="h-4 w-4 mr-2" /> Mượn sách này
              </Button>
              <Button variant="outline" onClick={() => setShowDetail(null)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Borrow form modal */}
      <Modal
        open={!!borrowBook}
        onClose={() => setBorrowBook(null)}
        title="Mượn sách"
        size="md"
      >
        {borrowBook && (
          <div className="space-y-5">
            <div className="flex gap-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 border border-blue-100">
              <div className={`flex h-20 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${getCoverGradient(borrowBook.title)} shadow`}>
                <span className="text-lg font-bold text-white">{getInitials(borrowBook.title)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{borrowBook.title}</h3>
                <p className="text-sm text-gray-500">{borrowBook.author}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Có sẵn: {borrowBook.copies?.filter((c: any) => c.status === "available").length || 0}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Số lượng muốn mượn
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <Minus className="h-4 w-4 text-gray-600" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={borrowBook.copies?.filter((c: any) => c.status === "available").length || 1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 rounded-lg border border-gray-300 py-2 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <Plus className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Ghi chú <span className="text-gray-400 font-normal">(không bắt buộc)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Cần mượn bản đặc biệt, có minh họa..."
                rows={3}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setBorrowBook(null)}>
                Hủy
              </Button>
              <Button variant="gradient" loading={saving} onClick={handleBorrow}>
                <BookOpen className="h-4 w-4 mr-2" /> Gửi yêu cầu
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}