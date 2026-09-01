import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { applyDiscountSchema, listDiscountsQuerySchema, type ApplyDiscountInput } from "../validators/discount.validator";

const ORDER_WITH_DISCOUNT_INCLUDE = { branch: true, items: true, discount: true } as const;

/**
 * Never trust the admin's raw `value` as the final discount amount — always
 * recompute against the order's own (server-computed) subtotalAmount, same
 * "never trust client/admin-submitted money math" principle as
 * resolveLinePrice in takeaway.controller.ts. A FIXED discount can never
 * exceed the subtotal (no negative totals); a PERCENTAGE discount is capped
 * at 100 by the validator already.
 */
function computeDiscount(subtotal: number, type: "FIXED" | "PERCENTAGE", value: number) {
  const rawDiscount = type === "PERCENTAGE" ? (subtotal * value) / 100 : value;
  const discountAmount = Math.round(Math.min(rawDiscount, subtotal) * 100) / 100;
  const finalAmount = Math.round((subtotal - discountAmount) * 100) / 100;
  return { discountAmount, finalAmount };
}

/**
 * POST /api/admin/takeaway-orders/:id/discount
 * Only while the order is still PENDING_PAYMENT — the OCR verification step
 * checks the uploaded screenshot against `totalAmount`, so a discount must be
 * settled before payment, not after (no refund flow exists in this codebase
 * at all, so adjusting a discount post-payment is out of scope for v1).
 */
export async function applyDiscount(req: Request, res: Response) {
  const id = Number(req.params.id);
  const input: ApplyDiscountInput = applyDiscountSchema.parse(req.body);

  const order = await prisma.takeawayOrder.findUnique({ where: { id } });
  if (!order) throw ApiError.notFound("Order not found");
  if (order.status !== "PENDING_PAYMENT") {
    throw ApiError.conflict("Discounts can only be applied before payment is submitted");
  }
  if (order.discountId) {
    throw ApiError.conflict("This order already has a discount — edit or remove it instead");
  }

  const subtotal = Number(order.subtotalAmount);
  const { discountAmount, finalAmount } = computeDiscount(subtotal, input.type, input.value);

  const updated = await prisma.$transaction(async (tx) => {
    const discount = await tx.discount.create({
      data: {
        type: input.type,
        value: new Prisma.Decimal(input.value),
        reason: input.reason || null,
        originalAmount: new Prisma.Decimal(subtotal),
        discountAmount: new Prisma.Decimal(discountAmount),
        finalAmount: new Prisma.Decimal(finalAmount),
        appliedByAdminId: req.admin!.adminId,
      },
    });
    return tx.takeawayOrder.update({
      where: { id: order.id },
      data: { discountId: discount.id, totalAmount: new Prisma.Decimal(finalAmount) },
      include: ORDER_WITH_DISCOUNT_INCLUDE,
    });
  });

  res.status(201).json({ order: updated });
}

/** PATCH /api/admin/takeaway-orders/:id/discount — replaces the existing discount's type/value/reason, same PENDING_PAYMENT-only guard as applying one. */
export async function updateDiscount(req: Request, res: Response) {
  const id = Number(req.params.id);
  const input: ApplyDiscountInput = applyDiscountSchema.parse(req.body);

  const order = await prisma.takeawayOrder.findUnique({ where: { id } });
  if (!order) throw ApiError.notFound("Order not found");
  if (order.status !== "PENDING_PAYMENT") {
    throw ApiError.conflict("Discounts can only be edited before payment is submitted");
  }
  if (!order.discountId) {
    throw ApiError.notFound("This order has no discount to edit");
  }

  const subtotal = Number(order.subtotalAmount);
  const { discountAmount, finalAmount } = computeDiscount(subtotal, input.type, input.value);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.discount.update({
      where: { id: order.discountId! },
      data: {
        type: input.type,
        value: new Prisma.Decimal(input.value),
        reason: input.reason || null,
        originalAmount: new Prisma.Decimal(subtotal),
        discountAmount: new Prisma.Decimal(discountAmount),
        finalAmount: new Prisma.Decimal(finalAmount),
      },
    });
    return tx.takeawayOrder.update({
      where: { id: order.id },
      data: { totalAmount: new Prisma.Decimal(finalAmount) },
      include: ORDER_WITH_DISCOUNT_INCLUDE,
    });
  });

  res.json({ order: updated });
}

/** DELETE /api/admin/takeaway-orders/:id/discount — reverts totalAmount back to the full subtotal and deletes the Discount row. */
export async function removeDiscount(req: Request, res: Response) {
  const id = Number(req.params.id);

  const order = await prisma.takeawayOrder.findUnique({ where: { id } });
  if (!order) throw ApiError.notFound("Order not found");
  if (order.status !== "PENDING_PAYMENT") {
    throw ApiError.conflict("Discounts can only be removed before payment is submitted");
  }
  if (!order.discountId) {
    throw ApiError.notFound("This order has no discount to remove");
  }

  const discountId = order.discountId;
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.takeawayOrder.update({
      where: { id: order.id },
      data: { discountId: null, totalAmount: order.subtotalAmount },
      include: ORDER_WITH_DISCOUNT_INCLUDE,
    });
    await tx.discount.delete({ where: { id: discountId } });
    return result;
  });

  res.json({ order: updated });
}

/** GET /api/admin/discounts — flat audit list across all takeaway orders, filterable by branch/date range. */
export async function listDiscounts(req: Request, res: Response) {
  const query = listDiscountsQuerySchema.parse(req.query);

  const where: Prisma.DiscountWhereInput = {};
  if (query.branch) where.takeawayOrder = { branch: { code: query.branch } };
  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: new Date(`${query.from}T00:00:00Z`) } : {}),
      ...(query.to ? { lte: new Date(`${query.to}T23:59:59Z`) } : {}),
    };
  }

  const [total, discounts] = await Promise.all([
    prisma.discount.count({ where }),
    prisma.discount.findMany({
      where,
      include: {
        takeawayOrder: { include: { branch: true } },
        appliedByAdmin: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  res.json({ total, page: query.page, pageSize: query.pageSize, discounts });
}
