import { z } from "zod";
import { branchCodeSchema } from "./reservation.validator";

// Kept in sync with the frontend's MenuBadge union (src/types/index.ts) —
// badges are stored as JSON, not a DB enum, so this allow-list is what
// actually keeps the two sides from drifting apart.
export const MENU_BADGES = ["Signature", "Guest Favourite", "Most Ordered", "Chef's Special"] as const;

// Extra priced variants beyond the base price — "Veg./Chicken",
// "Half/Full", "Dry/Gravy" etc. Max 3 kept generous for the odd item with
// three prices (e.g. a Veg/Chicken/Prawns rice); every case seen on the
// actual menus so far only ever needs 1.
const priceVariantSchema = z.object({
  label: z.string().trim().min(1).max(30),
  price: z.coerce.number().positive().max(100000),
});

export const menuItemBodySchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  // Omitted/undefined = shared across both branches, matching how the menu
  // has always worked; set to one branch to scope a one-off addition there.
  branch: branchCodeSchema.nullable().optional(),
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(2000),
  price: z.coerce.number().positive().max(100000),
  // Only meaningful alongside priceVariants — what the base `price` is for
  // (e.g. "Veg", "Half", "Dry"). Null/omitted for ordinary single-price items.
  priceLabel: z.string().trim().min(1).max(30).nullable().optional(),
  veg: z.boolean().default(false),
  badges: z.array(z.enum(MENU_BADGES)).max(MENU_BADGES.length).default([]),
  priceVariants: z.array(priceVariantSchema).max(3).nullable().optional(),
});

export const updateMenuItemBodySchema = menuItemBodySchema.partial();
