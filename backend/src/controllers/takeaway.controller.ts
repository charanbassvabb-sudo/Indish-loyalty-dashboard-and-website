import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { generateTakeawayReference } from "../utils/bookingReference";
import { stringParam } from "../utils/params";
import { sendTakeawayOrderCreatedNotifications, sendTakeawayOrderReadyForPickupNotification } from "../services/whatsapp.service";
import {
  createTakeawayOrderSchema,
  updateTakeawayOrderSchema,
  listTakeawayOrdersQuerySchema,
  type CreateTakeawayOrderInput,
} from "../validators/takeaway.validator";

const LATEST_ATTEMPT_INCLUDE = {
  paymentAttempts: { orderBy: { createdAt: "desc" as const } },
};

interface PriceVariant {
  label: string;
  price: number;
}

/**
 * Resolves what a single basket line actually costs RIGHT NOW from the menu
 * item's own price/priceVariants — the client's line is only ever used for
 * which item/variant/quantity/spice was picked, never for the price itself.
 * Same principle as calculateDepositZMW never trusting a client-submitted
 * deposit.
 */
function resolveLinePrice(
  menuItem: { price: Prisma.Decimal; priceVariants: Prisma.JsonValue },
  priceVariantLabel: string | null | undefined,
): { unitPrice: number; resolvedLabel: string | null } {
  if (!priceVariantLabel) {
    return { unitPrice: Number(menuItem.price), resolvedLabel: null };
  }
  const variants = Array.isArray(menuItem.priceVariants) ? (menuItem.priceVariants as unknown as PriceVariant[]) : [];
  const match = variants.find((v) => v.label === priceVariantLabel);
  if (!match) {
    throw ApiError.badRequest(`"${priceVariantLabel}" is not a valid option for this item`);
  }
  return { unitPrice: Number(match.price), resolvedLabel: match.label };
}

function notifyPayloadFor(order: {
  reference: string;
  customerName: string;
  phone: string;
  pickupDate: Date;
  pickupTime: string;
  totalAmount: Prisma.Decimal;
  notes: string | null;
  branch: { name: string; code: "LUSAKA" | "KITWE" };
}) {
  return {
    reference: order.reference,
    branchName: order.branch.name,
    branchCode: order.branch.code,
    customerName: order.customerName,
    phone: order.phone,
    pickupDate: order.pickupDate.toISOString().slice(0, 10),
    pickupTime: order.pickupTime,
    totalAmount: Number(order.totalAmount),
    notes: order.notes,
  };
}

/**
 * POST /api/takeaway-orders
 * Public endpoint. Creates the order itself — no payment info here. Payment
 * is a separate step, exactly like reservations: the customer gets the
 * business Airtel Money/MTN MoMo number, pays outside this app, then uploads
 * a screenshot to POST /api/takeaway-orders/:reference/payment-screenshot
 * (see payment.controller.ts's uploadTakeawayPaymentScreenshot).
 */
export async function createTakeawayOrder(req: Request, res: Response) {
  const input: CreateTakeawayOrderInput = createTakeawayOrderSchema.parse(req.body);

  const branch = await prisma.branch.findUnique({ where: { code: input.branch } });
  if (!branch) throw ApiError.badRequest("Unknown branch");

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: input.items.map((i) => i.menuItemId) } },
  });
  const menuItemById = new Map(menuItems.map((m) => [m.id, m]));

  let subtotal = 0;
  const lineData = input.items.map((line) => {
    const menuItem = menuItemById.get(line.menuItemId);
    if (!menuItem) throw ApiError.badRequest(`Menu item ${line.menuItemId} not found`);

    const { unitPrice, resolvedLabel } = resolveLinePrice(menuItem, line.priceVariantLabel);
    const lineTotal = unitPrice * line.quantity;
    subtotal += lineTotal;

    return {
      menuItemId: menuItem.id,
      nameSnapshot: menuItem.name,
      priceVariantLabel: resolvedLabel,
      unitPrice: new Prisma.Decimal(unitPrice),
      quantity: line.quantity,
      spiceLevel: line.spiceLevel ?? null,
      lineTotal: new Prisma.Decimal(lineTotal),
    };
  });

  const reference = generateTakeawayReference(input.branch);

  const order = await prisma.takeawayOrder.create({
    data: {
      reference,
      branchId: branch.id,
      customerName: input.customerName,
      phone: input.phone,
      email: input.email || null,
      notes: input.notes || null,
      pickupDate: new Date(`${input.pickupDate}T00:00:00Z`),
      pickupTime: input.pickupTime,
      subtotalAmount: new Prisma.Decimal(subtotal),
      totalAmount: new Prisma.Decimal(subtotal), // no discount yet at creation time
      status: "PENDING_PAYMENT",
      items: { create: lineData },
    },
    include: { branch: true },
  });

  sendTakeawayOrderCreatedNotifications(notifyPayloadFor(order)).catch((err) =>
    console.error("[whatsapp] takeaway order notification failed", err),
  );

  res.status(201).json({
    id: order.id,
    reference: order.reference,
    branch: order.branch.code,
    pickupDate: input.pickupDate,
    pickupTime: order.pickupTime,
    subtotalAmount: subtotal,
    totalAmount: subtotal,
    status: order.status,
  });
}

/** GET /api/takeaway-orders/:reference — public lookup for the payment/confirmation pages. */
export async function getTakeawayOrderByReference(req: Request, res: Response) {
  const order = await prisma.takeawayOrder.findUnique({
    where: { reference: stringParam(req, "reference") },
    include: { branch: true, items: true, ...LATEST_ATTEMPT_INCLUDE },
  });
  if (!order) throw ApiError.notFound("Order not found");

  const latestAttempt = order.paymentAttempts[0] ?? null;

  res.json({
    id: order.id,
    reference: order.reference,
    branch: order.branch.code,
    branchName: order.branch.name,
    customerName: order.customerName,
    pickupDate: order.pickupDate.toISOString().slice(0, 10),
    pickupTime: order.pickupTime,
    subtotalAmount: order.subtotalAmount,
    totalAmount: order.totalAmount,
    status: order.status,
    items: order.items.map((it) => ({
      name: it.nameSnapshot,
      priceVariantLabel: it.priceVariantLabel,
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      spiceLevel: it.spiceLevel,
      lineTotal: it.lineTotal,
    })),
    latestPaymentAttempt: latestAttempt
      ? { id: latestAttempt.id, internalPaymentId: latestAttempt.internalPaymentId, status: latestAttempt.status }
      : null,
  });
}

/** GET /api/admin/takeaway-orders — filterable, searchable, paginated. */
export async function listTakeawayOrders(req: Request, res: Response) {
  const query = listTakeawayOrdersQuerySchema.parse(req.query);

  const where: Prisma.TakeawayOrderWhereInput = {};
  if (query.branch) where.branch = { code: query.branch };
  if (query.status) where.status = query.status;
  if (query.from || query.to) {
    where.pickupDate = {
      ...(query.from ? { gte: new Date(`${query.from}T00:00:00Z`) } : {}),
      ...(query.to ? { lte: new Date(`${query.to}T23:59:59Z`) } : {}),
    };
  }
  if (query.search) {
    where.OR = [
      { customerName: { contains: query.search } },
      { phone: { contains: query.search } },
      { reference: { contains: query.search } },
    ];
  }

  const [total, orders] = await Promise.all([
    prisma.takeawayOrder.count({ where }),
    prisma.takeawayOrder.findMany({
      where,
      include: { branch: true, items: true, discount: true, ...LATEST_ATTEMPT_INCLUDE },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  res.json({ total, page: query.page, pageSize: query.pageSize, orders });
}

export async function getTakeawayOrder(req: Request, res: Response) {
  const id = Number(req.params.id);
  const order = await prisma.takeawayOrder.findUnique({
    where: { id },
    include: { branch: true, items: true, discount: true, ...LATEST_ATTEMPT_INCLUDE },
  });
  if (!order) throw ApiError.notFound("Order not found");
  res.json({ order });
}

/**
 * PATCH /api/admin/takeaway-orders/:id — status transitions (PREPARING,
 * READY_FOR_PICKUP, COMPLETED, CANCELLED, NO_SHOW) plus minor edits
 * (pickup time/date, notes). Mirrors updateReservation's role as a blunt
 * instrument for staff-driven changes outside the payment-verification path.
 */
export async function updateTakeawayOrder(req: Request, res: Response) {
  const id = Number(req.params.id);
  const input = updateTakeawayOrderSchema.parse(req.body);

  const existing = await prisma.takeawayOrder.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Order not found");

  const becomingReady = existing.status !== "READY_FOR_PICKUP" && input.status === "READY_FOR_PICKUP";

  const order = await prisma.takeawayOrder.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.pickupDate ? { pickupDate: new Date(`${input.pickupDate}T00:00:00Z`) } : {}),
      ...(input.pickupTime ? { pickupTime: input.pickupTime } : {}),
    },
    include: { branch: true },
  });

  if (becomingReady) {
    sendTakeawayOrderReadyForPickupNotification(notifyPayloadFor(order)).catch((err) =>
      console.error("[whatsapp] ready-for-pickup notification failed", err),
    );
  }

  res.json({ order });
}

/** GET /api/admin/takeaway-orders/export — CSV export for the current filter set. */
export async function exportTakeawayOrders(req: Request, res: Response) {
  const query = listTakeawayOrdersQuerySchema.parse(req.query);

  const where: Prisma.TakeawayOrderWhereInput = {};
  if (query.branch) where.branch = { code: query.branch };
  if (query.status) where.status = query.status;

  const orders = await prisma.takeawayOrder.findMany({
    where,
    include: { branch: true, discount: true, ...LATEST_ATTEMPT_INCLUDE },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "Reference",
    "Branch",
    "Customer",
    "Phone",
    "Pickup Date",
    "Pickup Time",
    "Subtotal (ZMW)",
    "Discount (ZMW)",
    "Total (ZMW)",
    "Payment Provider",
    "Transaction ID",
    "Payment Status",
    "Status",
  ];

  const rows = orders.map((o) => {
    const latest = o.paymentAttempts[0];
    return [
      o.reference,
      o.branch.name,
      o.customerName,
      o.phone,
      o.pickupDate.toISOString().slice(0, 10),
      o.pickupTime,
      o.subtotalAmount.toString(),
      o.discount ? o.discount.discountAmount.toString() : "",
      o.totalAmount.toString(),
      latest?.provider ?? "",
      latest?.extractedTransactionId ?? "",
      latest?.status ?? "",
      o.status,
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="takeaway-orders-${Date.now()}.csv"`);
  res.send(csv);
}
