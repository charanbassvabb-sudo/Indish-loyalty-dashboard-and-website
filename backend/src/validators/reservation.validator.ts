import { z } from "zod";
import { isRecurringlyClosed, getRecurringClosureNote } from "../utils/branchHours";

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

export const branchCodeSchema = z.enum(["LUSAKA", "KITWE"]);

export const seatingSchema = z.enum(["INDOOR", "OUTDOOR", "NO_PREFERENCE"]);

// Reservations can only be made for a slot that falls within this many hours
// from right now — no booking further out than that, and nothing already past.
export const MAX_ADVANCE_HOURS = 24;

// The date/time strings are always restaurant-local (Africa/Lusaka, UTC+2,
// no DST) wall-clock values — never the server's own timezone. The server
// runs in UTC, so parsing "2026-08-22T13:30:00" without an explicit offset
// would silently treat it as 13:30 UTC (15:30 Lusaka) instead of the
// intended 13:30 Lusaka (11:30 UTC), a 2-hour drift that's enough to push
// a genuinely-within-24h booking outside this window right near the edge.
// The explicit "+02:00" makes this deterministic regardless of the
// runtime's TZ, matching the identical fix on the frontend (data/reservation.ts).
function isWithinBookingWindow(date: string, time: string) {
  const target = new Date(`${date}T${time}:00+02:00`);
  const now = new Date();
  const maxDate = new Date(now.getTime() + MAX_ADVANCE_HOURS * 60 * 60 * 1000);
  return target >= now && target <= maxDate;
}

export const bookingTypeSchema = z.enum(["STANDARD", "PARTY"]);

// Payment is no longer collected at reservation-creation time — a booking is
// created first (status PENDING_PAYMENT, no payment info yet), then the
// customer uploads a screenshot against it as a separate step. See
// payment.routes.ts / payment.controller.ts for the upload + verification
// flow, and config/paymentNumbers.ts for which providers are live per branch.
export const createReservationSchema = z
  .object({
    branch: branchCodeSchema,
    bookingType: bookingTypeSchema.default("STANDARD"),
    eventType: z.string().trim().max(120).optional(),
    customerName: z.string().trim().min(2, "Name must be at least 2 characters"),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s-]{9,}$/, "Phone must have at least 9 digits"),
    email: z.string().trim().email("Enter a valid email address"),
    guests: z.number().int().min(1).max(40),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    time: z.enum(TIME_SLOTS),
    seating: seatingSchema.default("NO_PREFERENCE"),
    occasion: z.string().trim().max(500).optional().or(z.literal("")).optional(),
  })
  .superRefine((data, ctx) => {
    if (isRecurringlyClosed(data.date, data.branch)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: `${getRecurringClosureNote(data.branch)} — please pick another date`,
      });
      return;
    }
    if (!isWithinBookingWindow(data.date, data.time)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: `Reservations can only be made up to ${MAX_ADVANCE_HOURS} hours in advance`,
      });
    }
  });

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

/** Body fields alongside the multipart screenshot file — see payment.routes.ts. */
export const uploadPaymentScreenshotSchema = z.object({
  provider: z.enum(["AIRTEL_MONEY", "MTN_MOMO"], {
    message: "Select which network you paid with",
  }),
});

export const paymentAttemptActionSchema = z.object({
  action: z.enum(["approve", "reject", "request_new_screenshot"]),
  notes: z.string().trim().max(1000).optional(),
});

export const listPaymentAttemptsQuerySchema = z.object({
  // WAITING_FOR_PAYMENT is synthetic — not a PaymentAttempt status at all,
  // it means "no screenshot uploaded yet" (see payment.controller.ts).
  status: z
    .enum([
      "WAITING_FOR_PAYMENT",
      "PROCESSING",
      "AUTO_VERIFIED",
      "REQUIRES_REVIEW",
      "APPROVED",
      "REJECTED",
      "DUPLICATE",
      "PAYMENT_FAILED",
    ])
    .optional(),
  branch: branchCodeSchema.optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateReservationSchema = z.object({
  status: z.enum(["PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]).optional(),
  seating: seatingSchema.optional(),
  notes: z.string().trim().max(1000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.enum(TIME_SLOTS).optional(),
  guests: z.number().int().min(1).max(40).optional(),
});

export const listReservationsQuerySchema = z.object({
  branch: branchCodeSchema.optional(),
  status: z
    .enum(["PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"])
    .optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
