import { z } from "zod";
import { branchCodeSchema } from "./reservation.validator";

// Kept in sync with the frontend's MenuBadge union (src/types/index.ts) —
// badges are stored as JSON, not a DB enum, so this allow-list is what
// actually keeps the two sides from drifting apart.
export const MENU_BADGES = ["Signature", "Guest Favourite", "Most Ordered", "Chef's Special"] as const;

export const menuItemBodySchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  // Omitted/undefined = shared across both branches, matching how the menu
  // has always worked; set to one branch to scope a one-off addition there.
  branch: branchCodeSchema.nullable().optional(),
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(2000),
  price: z.coerce.number().positive().max(100000),
  veg: z.boolean().default(false),
  badges: z.array(z.enum(MENU_BADGES)).max(MENU_BADGES.length).default([]),
});

export const updateMenuItemBodySchema = menuItemBodySchema.partial();
