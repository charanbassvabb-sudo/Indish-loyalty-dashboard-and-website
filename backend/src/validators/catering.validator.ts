import { z } from "zod";
import { branchCodeSchema } from "./reservation.validator";

export const cateringTierSchema = z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]);
export const cateringEnquiryStatusSchema = z.enum(["NEW", "CONTACTED", "BOOKED", "DECLINED"]);

/**
 * Catering is a catalog + enquiry model, not a paid checkout (client-
 * confirmed scope) — this just captures contact details + event info; staff
 * follow up by phone. No basket, no pricing math, no PaymentAttempt here.
 */
export const createEnquirySchema = z.object({
  branch: branchCodeSchema,
  packageId: z.number().int().positive().optional(),
  customerName: z.string().trim().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{9,}$/, "Phone must have at least 9 digits"),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  guestCount: z.number().int().min(1).max(2000),
  notes: z.string().trim().max(500).optional().or(z.literal("")).optional(),
});

// --- Admin catalog management ---

export const createPackageSchema = z.object({
  tier: cateringTierSchema,
  name: z.string().trim().min(1),
  description: z.string().trim().max(1000).optional().or(z.literal("")).optional(),
  priceNote: z.string().trim().max(100).optional().or(z.literal("")).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const updatePackageSchema = createPackageSchema.partial();

export const createCategorySchema = z.object({
  packageId: z.number().int().positive(),
  name: z.string().trim().min(1).max(60),
  sortOrder: z.number().int().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  sortOrder: z.number().int().optional(),
});

export const createItemSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().trim().min(1).max(120),
  quantity: z.string().trim().min(1).max(60),
  sortOrder: z.number().int().optional(),
});

export const updateItemSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  quantity: z.string().trim().min(1).max(60).optional(),
  sortOrder: z.number().int().optional(),
});

export const updateEnquirySchema = z.object({
  status: cateringEnquiryStatusSchema,
});

export const listEnquiriesQuerySchema = z.object({
  branch: branchCodeSchema.optional(),
  status: cateringEnquiryStatusSchema.optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
