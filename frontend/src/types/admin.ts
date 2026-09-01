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

/** Which kind of order this payment attempt belongs to — exactly one of `reservation`/`takeawayOrder` below is non-null, matching which one this is. */
export type PaymentAttemptParentType = "RESERVATION" | "TAKEAWAY";

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
  parentType: PaymentAttemptParentType;
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
  } | null;
  takeawayOrder: {
    id: number;
    reference: string;
    customerName: string;
    phone: string;
    branch: "LUSAKA" | "KITWE";
    branchName: string;
    pickupDate: string;
    pickupTime: string;
    totalAmount: string;
    status: TakeawayOrderStatus;
  } | null;
}

export type TakeawayOrderStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface PaymentAttemptListResponse {
  total: number;
  page: number;
  pageSize: number;
  attempts: PaymentAttemptListItem[];
}

// --- Takeaway orders (AdminTakeawayTab) ---

export interface AdminTakeawayOrderItem {
  id: number;
  nameSnapshot: string;
  priceVariantLabel: string | null;
  unitPrice: string;
  quantity: number;
  spiceLevel: "MILD" | "MEDIUM" | "HOT" | null;
  lineTotal: string;
}

export type DiscountType = "FIXED" | "PERCENTAGE";

export interface AdminDiscount {
  id: number;
  type: DiscountType;
  value: string;
  reason: string | null;
  originalAmount: string;
  discountAmount: string;
  finalAmount: string;
  appliedByAdminId: number;
  createdAt: string;
}

export interface AdminTakeawayOrder {
  id: number;
  reference: string;
  branch: { id: number; code: "LUSAKA" | "KITWE"; name: string };
  customerName: string;
  phone: string;
  email: string | null;
  notes: string | null;
  /** ISO datetime string (the date part is what matters — pickupTime carries the wall-clock time separately). */
  pickupDate: string;
  pickupTime: string;
  subtotalAmount: string;
  totalAmount: string;
  status: TakeawayOrderStatus;
  items: AdminTakeawayOrderItem[];
  /** Only ever set while status is PENDING_PAYMENT-editable — see TakeawayOrderDrawer's discount section. */
  discount: AdminDiscount | null;
  /** Ordered most-recent first — [0] is the latest attempt, if any. */
  paymentAttempts: AdminPaymentAttemptRaw[];
  createdAt: string;
}

export interface TakeawayOrderListResponse {
  total: number;
  page: number;
  pageSize: number;
  orders: AdminTakeawayOrder[];
}

export const TAKEAWAY_STATUS_LABEL: Record<TakeawayOrderStatus, string> = {
  PENDING_PAYMENT: "Pending Payment",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready for Pickup",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

export const TAKEAWAY_STATUS_STYLE: Record<TakeawayOrderStatus, string> = {
  PENDING_PAYMENT: "bg-accent text-accent-foreground",
  CONFIRMED: "bg-secondary text-secondary-foreground border border-primary/40",
  PREPARING: "bg-accent/15 text-accent border border-accent/30",
  READY_FOR_PICKUP: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  COMPLETED: "bg-gradient-ember text-primary-foreground",
  CANCELLED: "bg-destructive/15 text-destructive",
  NO_SHOW: "bg-border text-muted-foreground",
};

export const SPICE_LEVEL_LABEL: Record<"MILD" | "MEDIUM" | "HOT", string> = {
  MILD: "Mild",
  MEDIUM: "Medium",
  HOT: "Hot",
};

/**
 * Normalizes whichever parent a payment attempt has (reservation OR
 * takeaway order — see PaymentAttemptListItem/parentType) into one common
 * display shape, so table rows and the review drawer don't need an
 * `if (parentType === ...)` at every field access. `id` here is the
 * reservation/order id, never the attempt's own id.
 */
export function paymentAttemptOrderInfo(item: PaymentAttemptListItem) {
  if (item.parentType === "TAKEAWAY" && item.takeawayOrder) {
    const o = item.takeawayOrder;
    return {
      kind: "TAKEAWAY" as const,
      id: o.id,
      reference: o.reference,
      customerName: o.customerName,
      phone: o.phone,
      email: null as string | null,
      branchName: o.branchName,
      amountLabel: `ZMW ${o.totalAmount}`,
      dateLabel: `${o.pickupDate} · ${o.pickupTime} (pickup)`,
    };
  }
  const r = item.reservation!;
  return {
    kind: "RESERVATION" as const,
    id: r.id,
    reference: r.reference,
    customerName: r.customerName,
    phone: r.phone,
    email: r.email as string | null,
    branchName: r.branchName,
    amountLabel: `ZMW ${r.depositAmount}`,
    dateLabel: `${r.date} · ${r.time}`,
  };
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
  takeawaySeries: { date: string; orders: number; revenue: number }[];
  totals: {
    totalReservations: number;
    totalCovers: number;
    averagePartySize: number;
    partyBookings: number;
    cancelled: number;
    noShow: number;
    todaysReservations: number;
    todaysCovers: number;
    totalTakeawayOrders: number;
    totalTakeawayRevenue: number;
    totalCateringEnquiries: number;
    totalDiscountsApplied: number;
    totalDiscountAmount: number;
    revenueByPaymentMethod: { AIRTEL_MONEY: number; MTN_MOMO: number };
    ordersByBranch: { LUSAKA: number; KITWE: number };
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

export interface AdminMenuPriceVariant {
  label: string;
  price: number;
}

export interface AdminMenuItem {
  id: number;
  categoryId: number;
  /** null = shown at both branches (the default — one shared menu). */
  branch: "LUSAKA" | "KITWE" | null;
  name: string;
  description: string;
  price: number;
  /** What `price` is for when priceVariants is set — e.g. "Veg", "Half", "Dry". */
  priceLabel?: string;
  veg: boolean;
  badges: AdminMenuBadge[];
  /** Extra prices beyond the base one — "Veg./Chicken", "Half/Full", "Dry/Gravy" etc. */
  priceVariants?: AdminMenuPriceVariant[];
  /** Absolute-path URL to the dish photo, e.g. "/api/uploads/menu-images/xxx.jpg". Undefined = no photo set. */
  imageUrl?: string;
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

// --- Catering (AdminCateringTab) ---

export type CateringPackageTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
export type CateringEnquiryStatus = "NEW" | "CONTACTED" | "BOOKED" | "DECLINED";

export interface AdminCateringItem {
  id: number;
  categoryId: number;
  name: string;
  quantity: string;
  sortOrder: number;
}

export interface AdminCateringCategory {
  id: number;
  packageId: number;
  name: string;
  sortOrder: number;
  items: AdminCateringItem[];
}

export interface AdminCateringPackage {
  id: number;
  tier: CateringPackageTier;
  name: string;
  description: string | null;
  priceNote: string | null;
  active: boolean;
  sortOrder: number;
  categories: AdminCateringCategory[];
}

export interface AdminCateringEnquiry {
  id: number;
  branch: { id: number; code: "LUSAKA" | "KITWE"; name: string };
  package: { id: number; tier: CateringPackageTier; name: string } | null;
  customerName: string;
  phone: string;
  eventDate: string;
  guestCount: number;
  notes: string | null;
  status: CateringEnquiryStatus;
  createdAt: string;
}

export interface CateringEnquiryListResponse {
  total: number;
  page: number;
  pageSize: number;
  enquiries: AdminCateringEnquiry[];
}

export const CATERING_ENQUIRY_STATUS_LABEL: Record<CateringEnquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  BOOKED: "Booked",
  DECLINED: "Declined",
};

export const CATERING_ENQUIRY_STATUS_STYLE: Record<CateringEnquiryStatus, string> = {
  NEW: "bg-accent text-accent-foreground",
  CONTACTED: "bg-secondary text-secondary-foreground border border-primary/40",
  BOOKED: "bg-gradient-ember text-primary-foreground",
  DECLINED: "bg-destructive/15 text-destructive",
};
