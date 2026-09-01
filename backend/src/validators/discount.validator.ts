import { z } from "zod";

/**
 * Body for POST/PATCH /admin/takeaway-orders/:id/discount. `value` is the raw
 * admin-entered number — ZMW for FIXED, 0-100 for PERCENTAGE — never trusted
 * as the final discount amount; discount.controller.ts always recomputes
 * originalAmount/discountAmount/finalAmount server-side from the order's own
 * subtotalAmount, same principle as takeaway order line pricing.
 */
export const applyDiscountSchema = z
  .object({
    type: z.enum(["FIXED", "PERCENTAGE"]),
    value: z.coerce.number().positive("Value must be greater than 0"),
    reason: z.string().trim().max(200).optional().or(z.literal("")).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "PERCENTAGE" && data.value > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "Percentage must be 100 or less" });
    }
  });

export type ApplyDiscountInput = z.infer<typeof applyDiscountSchema>;

export const listDiscountsQuerySchema = z.object({
  branch: z.enum(["LUSAKA", "KITWE"]).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
