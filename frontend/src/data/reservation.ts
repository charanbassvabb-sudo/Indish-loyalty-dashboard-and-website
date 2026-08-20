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
// Airtel Money + MTN MoMo, both regular wallets — "Send Money" (Zamtel
// Kwacha dropped — not carried forward to the verified-payment flow).
export const PAYMENT_PROVIDERS_BY_BRANCH: Record<BranchId, PaymentProviderOption[]> = {
  lusaka: [
    { id: "AIRTEL_MONEY", label: "Airtel Money", number: "0979771033", ussdCode: "*115#", isAgentNumber: true },
  ],
  kitwe: [
    { id: "AIRTEL_MONEY", label: "Airtel Money", number: "0976309999", ussdCode: "*115#", isAgentNumber: false },
    { id: "MTN_MOMO", label: "MTN MoMo", number: "0963240240", ussdCode: "*303#", isAgentNumber: false },
  ],
};

export const DEPOSIT_PER_GUEST_ZMW = 100;

// Reservations can only be made for a slot within this many hours from now.
export const MAX_ADVANCE_HOURS = 24;

export type SlotAvailability = "bookable" | "past" | "too-far";

export function getSlotAvailability(date: string, time: string): SlotAvailability {
  const target = new Date(`${date}T${time}:00`);
  const now = new Date();
  const maxDate = new Date(now.getTime() + MAX_ADVANCE_HOURS * 60 * 60 * 1000);
  if (target < now) return "past";
  if (target > maxDate) return "too-far";
  return "bookable";
}

export function isSlotBookable(date: string, time: string): boolean {
  if (!date || !time) return false;
  return getSlotAvailability(date, time) === "bookable";
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
