export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(date: string | Date | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "-";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

export function getStatusColor(
  status: string
): { bg: string; text: string; label: string } {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "bg-green-100", text: "text-green-800", label: "Hoạt động" },
    inactive: { bg: "bg-gray-100", text: "text-gray-800", label: "Ngừng" },
    locked: { bg: "bg-red-100", text: "text-red-800", label: "Khóa" },
    pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Chờ duyệt" },
    approved: { bg: "bg-blue-100", text: "text-blue-800", label: "Đã duyệt" },
    rejected: { bg: "bg-red-100", text: "text-red-800", label: "Từ chối" },
    completed: { bg: "bg-green-100", text: "text-green-800", label: "Hoàn tất" },
    expired: { bg: "bg-gray-100", text: "text-gray-800", label: "Hết hạn" },
    cancelled: { bg: "bg-gray-100", text: "text-gray-800", label: "Đã hủy" },
    available: { bg: "bg-green-100", text: "text-green-800", label: "Có sẵn" },
    borrowing: { bg: "bg-blue-100", text: "text-blue-800", label: "Đang mượn" },
    reserved: { bg: "bg-purple-100", text: "text-purple-800", label: "Đã giữ" },
    damaged: { bg: "bg-orange-100", text: "text-orange-800", label: "Hư hỏng" },
    lost: { bg: "bg-red-100", text: "text-red-800", label: "Mất" },
    returned: { bg: "bg-green-100", text: "text-green-800", label: "Đã trả" },
    overdue: { bg: "bg-red-100", text: "text-red-800", label: "Quá hạn" },
    unpaid: { bg: "bg-red-100", text: "text-red-800", label: "Chưa đóng" },
    paid: { bg: "bg-green-100", text: "text-green-800", label: "Đã đóng" },
    success: { bg: "bg-green-100", text: "text-green-800", label: "Thành công" },
    failed: { bg: "bg-red-100", text: "text-red-800", label: "Thất bại" },
    in_progress: { bg: "bg-blue-100", text: "text-blue-800", label: "Đang tiến hành" },
  };
  return colors[status] || { bg: "bg-gray-100", text: "text-gray-800", label: status };
}

export function generateBorrowCode(year: number, seq: number): string {
  return `BRW-${year}-${String(seq).padStart(6, "0")}`;
}

export function generateReturnCode(year: number, seq: number): string {
  return `RTN-${year}-${String(seq).padStart(6, "0")}`;
}

export function generateBarcode(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(6, "0")}`;
}

export function generateQRPayload(type: "BRW" | "RTN", code: string): string {
  return `SMARTLIB:${type}:${code}`;
}
