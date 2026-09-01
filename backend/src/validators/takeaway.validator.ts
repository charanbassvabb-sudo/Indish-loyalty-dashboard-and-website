import { z } from "zod";
import {
  isRecurringlyClosed,
  getRecurringClosureNote,
  isWithinBranchOperatingHours,
  getBranchHoursNote,
} from "../utils/branchHours";
import { branchCodeSchema } from "./reservation.validator";

// A takeaway order needs at least this much lead time from "now" so the
// kitchen isn't handed an order to start on the same minute it's placed.
// Pickup times are also constrained to the branch's structured opening
// hours (see branchHours.ts) — ending PICKUP_CLOSING_BUFFER_MINUTES before
// actual close.
export const MIN_PICKUP_LEAD_MINUTES = 30;
// Same rolling booking window as reservations (MAX_ADVANCE_HOURS in
// reservation.validator.ts) — nothing further out than 24h from now, like a
// flight search only letting you pick a date it actually flies.
export const MAX_PICKUP_ADVANCE_HOURS = 24;

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:MM format");
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

// Same +02:00 Africa/Lusaka wall-clock handling as reservation.validator.ts's
// isWithinBookingWindow — the server runs in UTC, so parsing without an
// explicit offset would silently drift by 2 hours right near the edges.
function isWithinPickupWindow(date: string, time: string): boolean {
  const target = new Date(`${date}T${time}:00+02:00`);
  const now = new Date();
  const minTime = new Date(now.getTime() + MIN_PICKUP_LEAD_MINUTES * 60 * 1000);
  const maxTime = new Date(now.getTime() + MAX_PICKUP_ADVANCE_HOURS * 60 * 60 * 1000);
  return target >= minTime && target <= maxTime;
}

export const spiceLevelSchema = z.enum(["MILD", "MEDIUM", "HOT"]);

const takeawayOrderItemSchema = z.object({
  menuItemId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(20),
  priceVariantLabel: z.string().trim().min(1).max(30).nullable().optional(),
  spiceLevel: spiceLevelSchema.nullable().optional(),
});

/**
 * Body for POST /api/takeaway-orders. Prices are NEVER trusted from the
 * client — the controller recomputes every line from the current
 * MenuItem.price/priceVariants, exactly like reservations never trust a
 * client-submitted deposit amount (see deposit.service.ts).
 */
export const createTakeawayOrderSchema = z
  .object({
    branch: branchCodeSchema,
    customerName: z.string().trim().min(2, "Name must be at least 2 characters"),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s-]{9,}$/, "Phone must have at least 9 digits"),
    email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")).optional(),
    notes: z.string().trim().max(500).optional().or(z.literal("")).optional(),
    pickupDate: dateSchema,
    pickupTime: timeSchema,
    acknowledgedNoDelivery: z.literal(true, {
      message: "You must acknowledge this is a takeaway (pickup) order — no delivery is available",
    }),
    items: z.array(takeawayOrderItemSchema).min(1, "Your basket is empty"),
  })
  .superRefine((data, ctx) => {
    if (isRecurringlyClosed(data.pickupDate, data.branch)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pickupDate"],
        message: `${getRecurringClosureNote(data.branch)} — please pick another pickup date`,
      });
      return;
    }
    if (!isWithinPickupWindow(data.pickupDate, data.pickupTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pickupDate"],
        message: `Pickup must be at least ${MIN_PICKUP_LEAD_MINUTES} minutes from now and within ${MAX_PICKUP_ADVANCE_HOURS} hours`,
      });
      return;
    }
    if (!isWithinBranchOperatingHours(data.pickupDate, data.pickupTime, data.branch)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pickupTime"],
        message: getBranchHoursNote(data.pickupDate, data.branch),
      });
    }
  });

export type CreateTakeawayOrderInput = z.infer<typeof createTakeawayOrderSchema>;

export const takeawayOrderStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export const updateTakeawayOrderSchema = z.object({
  status: takeawayOrderStatusSchema.optional(),
  notes: z.string().trim().max(500).optional(),
  pickupDate: dateSchema.optional(),
  pickupTime: timeSchema.optional(),
});

export const listTakeawayOrdersQuerySchema = z.object({
  branch: branchCodeSchema.optional(),
  status: takeawayOrderStatusSchema.optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
