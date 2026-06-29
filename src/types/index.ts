export type Role = "admin" | "librarian" | "reader";

export type ProfileStatus = "active" | "inactive" | "locked";

export type BookCopyStatus =
  | "available"
  | "borrowing"
  | "reserved"
  | "damaged"
  | "lost"
  | "inactive";

export type RequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "expired"
  | "cancelled";

export type BorrowRecordStatus = "active" | "returned" | "overdue";

export type FineStatus = "unpaid" | "paid" | "cancelled";

export type PaymentStatus = "pending" | "success" | "failed";

export type AuditStatus = "in_progress" | "completed";

export interface Profile {
  id: string;
  auth_user_id: string;
  role: Role;
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  position: string | null;
  employee_code: string | null;
  avatar_url: string | null;
  status: ProfileStatus;
  card_issued_at: string | null;
  card_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LibraryRule {
  id: string;
  key: string;
  value: string;
  value_type: "number" | "string" | "boolean";
  description: string;
  updated_by: string | null;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "inactive";
}

export interface Book {
  id: string;
  category_id: string;
  title: string;
  author: string;
  publisher: string;
  publication_year: number | null;
  description: string | null;
  price: number;
  cover_url: string | null;
  status: "active" | "inactive";
  category?: Category;
}

export interface BookCopy {
  id: string;
  book_id: string;
  barcode: string;
  status: BookCopyStatus;
  price: number | null;
  shelf_location: string | null;
  created_at: string;
  updated_at: string;
  book?: Book;
}

export interface BorrowRequest {
  id: string;
  reader_id: string;
  status: RequestStatus;
  borrow_code: string | null;
  qr_payload: string | null;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  completed_by: string | null;
  completed_at: string | null;
  expires_at: string | null;
  reader?: Profile;
  details?: BorrowRequestDetail[];
}

export interface BorrowRequestDetail {
  id: string;
  borrow_request_id: string;
  book_id: string;
  book_copy_id: string | null;
  status: RequestStatus;
  book?: Book;
  book_copy?: BookCopy;
}

export interface ReturnRequest {
  id: string;
  reader_id: string;
  borrow_record_id: string;
  status: RequestStatus;
  return_code: string | null;
  qr_payload: string | null;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  completed_by: string | null;
  completed_at: string | null;
  expires_at: string | null;
  reader?: Profile;
}

export interface RenewalRequest {
  id: string;
  reader_id: string;
  borrow_record_id: string;
  borrow_detail_id: string;
  status: RequestStatus;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  old_due_date: string;
  new_due_date: string | null;
}

export interface BorrowRecord {
  id: string;
  reader_id: string;
  librarian_id: string;
  borrow_date: string;
  due_date: string;
  status: BorrowRecordStatus;
  source: "counter" | "online";
  created_from_request_id: string | null;
  created_at: string;
  reader?: Profile;
  librarian?: Profile;
  details?: BorrowDetail[];
}

export interface BorrowDetail {
  id: string;
  borrow_record_id: string;
  book_copy_id: string;
  due_date: string;
  return_date: string | null;
  status: BorrowRecordStatus;
  renewal_count: number;
  book_copy?: BookCopy;
}

export interface FineTicket {
  id: string;
  reader_id: string;
  borrow_detail_id: string | null;
  book_copy_id: string | null;
  reason: string;
  amount: number;
  status: FineStatus;
  created_by: string;
  created_at: string;
  paid_at: string | null;
  reader?: Profile;
  borrow_detail?: BorrowDetail;
}

export interface PaymentTransaction {
  id: string;
  fine_ticket_id: string;
  amount: number;
  payment_method: string;
  status: PaymentStatus;
  paid_by: string | null;
  received_by: string | null;
  transaction_ref: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface InventoryReceipt {
  id: string;
  receipt_code: string;
  created_by: string;
  created_at: string;
  note: string | null;
  details?: InventoryReceiptDetail[];
}

export interface InventoryReceiptDetail {
  id: string;
  receipt_id: string;
  book_id: string;
  quantity: number;
  unit_price: number | null;
}

export interface InventoryAudit {
  id: string;
  audit_code: string;
  created_by: string;
  created_at: string;
  status: AuditStatus;
  note: string | null;
  details?: InventoryAuditDetail[];
}

export interface InventoryAuditDetail {
  id: string;
  audit_id: string;
  book_copy_id: string;
  expected_status: BookCopyStatus;
  actual_status: BookCopyStatus | null;
  note: string | null;
}
