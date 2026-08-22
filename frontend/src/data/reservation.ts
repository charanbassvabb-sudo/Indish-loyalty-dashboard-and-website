export const TIME_SLOTS = [
  "11:30",
  "12:30",
  "13:30",
  "17:30",
  "18:30",
  "19:30",
  "20:30",
  "21:00",
] as const;

import type { BranchId } from "@/types";

export type TimeSlot = (typeof TIME_SLOTS)[number];

export type SeatingPreference = "INDOOR" | "OUTDOOR" | "NO_PREFERENCE";

export type PaymentProvider = "AIRTEL_MONEY" | "MTN_MOMO";

export type BookingType = "STANDARD" | "PARTY";

export const EVENT_TYPES = [
  "Birthday",
  "Anniversary",
  "Family Gathering",
  "Engagement / Bridal",
  "Corporate Event",
  "Other Celebration",
] as const;

export interface PaymentProviderOption {
  id: PaymentProvider;
  label: string;
  number: string;
  /** USSD code to dial to make the payment — different per network. */
  ussdCode: string;
  /**
   * True when `number` is registered as a mobile-money AGENT till rather than
   * a regular wallet. Agent numbers are paid via the "Get Cash" / "Withdraw
   * Cash" menu item, not "Send Money" — client-confirmed per number, so
   * don't flip this without the branch owner confirming the number's real
   * registration type first.
   */
  isAgentNumber: boolean;
}

// Client-confirmed, per branch — these are real numbers guests send deposits
// to, so don't guess at additions here without the branch owner confirming
// them first. Lusaka: Airtel Money only (an agent till — "Get Cash"). Kitwe:
// Airtel Money + MTN MoMo, both agent tills too as of 2026-08-23 — "Get
// Cash", not "Send Money" (Zamtel Kwacha dropped — not carried forward to
// the verified-payment flow).
export const PAYMENT_PROVIDERS_BY_BRANCH: Record<BranchId, PaymentProviderOption[]> = {
  lusaka: [
    { id: "AIRTEL_MONEY", label: "Airtel Money", number: "0979771033", ussdCode: "*115#", isAgentNumber: true },
  ],
  kitwe: [
    // Agent till, registered to Panda Rahul.
    { id: "AIRTEL_MONEY", label: "Airtel Money", number: "0973371166", ussdCode: "*115#", isAgentNumber: true },
    // Agent till, registered to Indish Friends.
    { id: "MTN_MOMO", label: "MTN MoMo", number: "0767393454", ussdCode: "*303#", isAgentNumber: true },
  ],
};

export const DEPOSIT_PER_GUEST_ZMW = 100;

// Reservations can only be made for a slot within this many hours from now.
export const MAX_ADVANCE_HOURS = 24;

export type SlotAvailability = "bookable" | "past" | "too-far" | "closed";

/**
 * Fixed, permanent recurring closures per branch (not a manual admin
 * toggle), so they're computed here rather than tracked as one-off dates.
 * Mirrored server-side in isRecurringlyClosed (backend/src/utils/branchHours.ts),
 * which is what actually enforces it — this client-side copy just gives
 * immediate feedback in the time-slot picker instead of waiting for a
 * rejected submit.
 *
 * weekday: 0=Sunday..6=Saturday. occurrences: which numbered occurrence(s)
 * of that weekday in the month count as closed (1st, 2nd, 3rd...).
 */
const RECURRING_CLOSURES: Record<BranchId, { weekday: number; occurrences: number[]; note: string; shortLabel: string }> = {
  lusaka: {
    weekday: 1,
    occurrences: [2, 3],
    note: "We're closed on the 2nd and 3rd Monday of the month",
    shortLabel: "2nd & 3rd Mon",
  },
  kitwe: {
    weekday: 2,
    occurrences: [2],
    note: "We're closed on the 2nd Tuesday of the month",
    shortLabel: "2nd Tue",
  },
};

export function isRecurringlyClosed(date: string, branchId: BranchId): boolean {
  const rule = RECURRING_CLOSURES[branchId];
  if (!rule || !date) return false;
  const d = new Date(`${date}T12:00:00Z`); // midday UTC — immune to timezone drift
  if (d.getUTCDay() !== rule.weekday) return false;
  const occurrence = Math.ceil(d.getUTCDate() / 7);
  return rule.occurrences.includes(occurrence);
}

export function getRecurringClosureNote(branchId: BranchId): string {
  return RECURRING_CLOSURES[branchId]?.note ?? "We're closed that day";
}

/** Compact form for inline use, e.g. a <select> option label — "2nd Tue" instead of the full sentence. */
export function getRecurringClosureShortLabel(branchId: BranchId): string {
  return RECURRING_CLOSURES[branchId]?.shortLabel ?? "closed";
}

// Time slots are always restaurant-local (Africa/Lusaka, UTC+2, no DST)
// wall-clock values, not the visitor's own browser timezone — someone
// booking from outside Zambia would otherwise have "17:30" silently
// reinterpreted as 17:30 in their own timezone. The explicit "+02:00"
// keeps this in lockstep with the identical fix on the backend
// (isWithinBookingWindow in validators/reservation.validator.ts), which
// runs on a UTC server and had the same bug the other direction.
export function getSlotAvailability(date: string, time: string, branchId: BranchId): SlotAvailability {
  if (isRecurringlyClosed(date, branchId)) return "closed";
  const target = new Date(`${date}T${time}:00+02:00`);
  const now = new Date();
  const maxDate = new Date(now.getTime() + MAX_ADVANCE_HOURS * 60 * 60 * 1000);
  if (target < now) return "past";
  if (target > maxDate) return "too-far";
  return "bookable";
}

export function isSlotBookable(date: string, time: string, branchId: BranchId): boolean {
  if (!date || !time) return false;
  return getSlotAvailability(date, time, branchId) === "bookable";
}

// Payment (provider selection, screenshot upload, verification) is a
// separate step against an already-created reservation — see
// ReservationPaymentStep.tsx — so this form data is purely the booking
// details collected before that reservation even exists.
export interface ReservationFormData {
  bookingType: BookingType;
  eventType: string;
  customerName: string;
  phone: string;
  email: string;
  guests: number;
  date: string;
  time: TimeSlot | "";
  seating: SeatingPreference;
  occasion: string;
}

export const emptyReservationForm: ReservationFormData = {
  bookingType: "STANDARD",
  eventType: "",
  customerName: "",
  phone: "",
  email: "",
  guests: 2,
  date: "",
  time: "",
  seating: "NO_PREFERENCE",
  occasion: "",
};
