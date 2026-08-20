export type ReservationStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export type PaymentAttemptStatus =
  | "PROCESSING"
  | "AUTO_VERIFIED"
  | "REQUIRES_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "DUPLICATE"
  | "PAYMENT_FAILED";

/** WAITING_FOR_PAYMENT is synthetic — no screenshot uploaded yet, so there's no PaymentAttempt row at all. */
export type PaymentDashboardStatus = "WAITING_FOR_PAYMENT" | PaymentAttemptStatus;

/** The raw shape embedded on a reservation (reservation.controller.ts's `include`) — flat DB fields, unlike the nicer nested shape payment.controller.ts serializes for the dedicated Payments tab. */
export interface AdminPaymentAttemptRaw {
  id: number;
  status: PaymentAttemptStatus;
  internalPaymentId: string;
  provider: string;
  extractedAmount: string | null;
  extractedTransactionId: string | null;
  extractedRecipient: string | null;
  extractedStatus: string | null;
  createdAt: string;
}

export interface AdminReservation {
  id: number;
  reference: string;
  branch: { id: number; code: "LUSAKA" | "KITWE"; name: string };
  bookingType: "STANDARD" | "PARTY";
  eventType: string | null;
  customerName: string;
  phone: string;
  email: string;
  guests: number;
  date: string;
  time: string;
  seating: string;
  occasion: string | null;
  notes: string | null;
  depositAmount: string;
  status: ReservationStatus;
  /** Ordered most-recent first — [0] is the latest attempt, if any. */
  paymentAttempts: AdminPaymentAttemptRaw[];
  createdAt: string;
}

export interface PaymentAttemptListItem {
  id: number | null;
  paymentStatus: PaymentDashboardStatus;
  internalPaymentId: string | null;
  provider: string | null;
  expectedAmount?: string;
  expectedRecipient?: string;
  extracted: {
    amount: string | null;
    transactionId: string | null;
    sender: string | null;
    recipient: string | null;
    date: string | null;
    time: string | null;
    status: string | null;
  } | null;
  matches: {
    amount: boolean | null;
    recipient: boolean | null;
    status: boolean | null;
    recency: boolean | null;
    notDuplicate: boolean | null;
  } | null;
  confidenceScore: number | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  reviewedByAdmin?: { id: number; name: string } | null;
  createdAt?: string;
  reservation: {
    id: number;
    reference: string;
    customerName: string;
    phone: string;
    email: string;
    branch: "LUSAKA" | "KITWE";
    branchName: string;
    date: string;
    time: string;
    guests: number;
    depositAmount: string;
    status: ReservationStatus;
  };
}

export interface PaymentAttemptListResponse {
  total: number;
  page: number;
  pageSize: number;
  attempts: PaymentAttemptListItem[];
}

export const PAYMENT_STATUS_LABEL: Record<PaymentDashboardStatus, string> = {
  WAITING_FOR_PAYMENT: "Waiting for Payment",
  PROCESSING: "Processing",
  AUTO_VERIFIED: "Automatically Verified",
  REQUIRES_REVIEW: "Requires Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  DUPLICATE: "Duplicate",
  PAYMENT_FAILED: "Payment Failed",
};

export const PAYMENT_STATUS_STYLE: Record<PaymentDashboardStatus, string> = {
  WAITING_FOR_PAYMENT: "bg-border text-muted-foreground",
  PROCESSING: "bg-accent/15 text-accent border border-accent/30",
  AUTO_VERIFIED: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  REQUIRES_REVIEW: "bg-accent/15 text-accent border border-accent/30",
  APPROVED: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  REJECTED: "bg-destructive/15 text-destructive border border-destructive/30",
  DUPLICATE: "bg-destructive/15 text-destructive border border-destructive/30",
  PAYMENT_FAILED: "bg-destructive/15 text-destructive border border-destructive/30",
};

export interface DailyAvailabilityEntry {
  id: number;
  branch: "LUSAKA" | "KITWE";
  date: string;
  seatsLeft: number | null;
  fullyBooked: boolean;
  note: string | null;
  updatedByName?: string | null;
  updatedAt?: string;
}

export interface ReportsSummary {
  series: { date: string; reservations: number; covers: number }[];
  totals: {
    totalReservations: number;
    totalCovers: number;
    averagePartySize: number;
    partyBookings: number;
    cancelled: number;
    noShow: number;
    todaysReservations: number;
    todaysCovers: number;
  };
}

export const CONTENT_KEYS = [
  "heroHeading",
  "heroSubheading",
  "aboutText",
  "hoursText",
  "phoneOverride",
  "addressOverride",
  "announcementBanner",
] as const;

export type ContentKey = (typeof CONTENT_KEYS)[number];

export const CONTENT_LABELS: Record<ContentKey, string> = {
  heroHeading: "Homepage headline",
  heroSubheading: "Homepage subheading",
  aboutText: "About / story paragraph",
  hoursText: "Opening hours text",
  phoneOverride: "Phone number override",
  addressOverride: "Address override",
  announcementBanner: "Site-wide announcement banner",
};

export interface ReservationListResponse {
  total: number;
  page: number;
  pageSize: number;
  reservations: AdminReservation[];
}

export const STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING_PAYMENT: "Pending Payment",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No Show",
};

export const STATUS_STYLE: Record<ReservationStatus, string> = {
  PENDING_PAYMENT: "bg-accent text-accent-foreground",
  CONFIRMED: "bg-secondary text-secondary-foreground border border-primary/40",
  CANCELLED: "bg-destructive/15 text-destructive",
  COMPLETED: "bg-gradient-ember text-primary-foreground",
  NO_SHOW: "bg-border text-muted-foreground",
};

// --- Menu management (AdminMenuTab) ---

export type AdminMenuBadge = "Signature" | "Guest Favourite" | "Most Ordered" | "Chef's Special";

export const ALL_MENU_BADGES: AdminMenuBadge[] = ["Signature", "Guest Favourite", "Most Ordered", "Chef's Special"];

export interface AdminMenuItem {
  id: number;
  categoryId: number;
  /** null = shown at both branches (the default — one shared menu). */
  branch: "LUSAKA" | "KITWE" | null;
  name: string;
  description: string;
  price: number;
  veg: boolean;
  badges: AdminMenuBadge[];
}

export interface AdminMenuCategory {
  id: number;
  slug: string;
  label: string;
  items: AdminMenuItem[];
}

export interface AdminMenuResponse {
  categories: AdminMenuCategory[];
}
