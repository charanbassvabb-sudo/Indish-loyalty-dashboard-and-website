import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { calculateDepositZMW } from "../services/deposit.service";
import { generateBookingReference } from "../utils/bookingReference";
import { stringParam } from "../utils/params";
import {
  sendBookingCreatedNotifications,
  sendPaymentConfirmedNotification,
  sendPaymentRejectedNotification,
} from "../services/whatsapp.service";
import {
  createReservationSchema,
  updateReservationSchema,
  listReservationsQuerySchema,
} from "../validators/reservation.validator";

export const SEATING_LABEL: Record<string, string> = {
  INDOOR: "Indoor",
  OUTDOOR: "Outdoor patio",
  NO_PREFERENCE: "No preference",
};

const LATEST_ATTEMPT_INCLUDE = {
  paymentAttempts: { orderBy: { createdAt: "desc" as const } },
};

/**
 * POST /api/reservations
 * Public endpoint. Creates the booking itself — no payment info here at
 * all. Payment is a separate step: the customer gets the business Airtel
 * Money/MTN MoMo number and instructions, pays outside this app, then
 * uploads a screenshot to POST /api/reservations/:reference/payment-screenshot
 * (see payment.controller.ts), which is what can actually flip this
 * reservation to CONFIRMED.
 */
export async function createReservation(req: Request, res: Response) {
  const input = createReservationSchema.parse(req.body);

  const branch = await prisma.branch.findUnique({ where: { code: input.branch } });
  if (!branch) throw ApiError.badRequest("Unknown branch");

  if (input.seating === "OUTDOOR" && !branch.allowsOutdoor) {
    throw ApiError.badRequest(`${branch.name} does not offer outdoor seating`);
  }

  const depositAmount = calculateDepositZMW(input.guests);
  const reference = generateBookingReference(input.branch);

  const reservation = await prisma.reservation.create({
    data: {
      reference,
      branchId: branch.id,
      bookingType: input.bookingType,
      eventType: input.eventType || null,
      customerName: input.customerName,
      phone: input.phone,
      email: input.email,
      guests: input.guests,
      date: new Date(`${input.date}T00:00:00Z`),
      time: input.time,
      seating: input.seating,
      occasion: input.occasion || null,
      depositAmount: new Prisma.Decimal(depositAmount),
      status: "PENDING_PAYMENT",
    },
    include: { branch: true },
  });

  // Fire-and-forget: don't let a WhatsApp outage block the booking response.
  sendBookingCreatedNotifications({
    reference: reservation.reference,
    branchName: reservation.branch.name,
    branchCode: reservation.branch.code,
    customerName: reservation.customerName,
    phone: reservation.phone,
    email: reservation.email,
    date: input.date,
    time: reservation.time,
    guests: reservation.guests,
    seating: SEATING_LABEL[reservation.seating] ?? reservation.seating,
    depositAmount,
    notes: reservation.notes,
  }).catch((err) => console.error("[whatsapp] notification failed", err));

  res.status(201).json({
    id: reservation.id,
    reference: reservation.reference,
    branch: reservation.branch.code,
    bookingType: reservation.bookingType,
    date: input.date,
    time: reservation.time,
    guests: reservation.guests,
    seating: reservation.seating,
    depositAmount,
    status: reservation.status,
  });
}

/** GET /api/reservations/:reference — public lookup for the payment/confirmation pages. */
export async function getReservationByReference(req: Request, res: Response) {
  const reservation = await prisma.reservation.findUnique({
    where: { reference: stringParam(req, "reference") },
    include: { branch: true, ...LATEST_ATTEMPT_INCLUDE },
  });

  if (!reservation) throw ApiError.notFound("Reservation not found");

  const latestAttempt = reservation.paymentAttempts[0] ?? null;

  res.json({
    id: reservation.id,
    reference: reservation.reference,
    branch: reservation.branch.code,
    branchName: reservation.branch.name,
    customerName: reservation.customerName,
    date: reservation.date.toISOString().slice(0, 10),
    time: reservation.time,
    guests: reservation.guests,
    seating: reservation.seating,
    depositAmount: reservation.depositAmount,
    status: reservation.status,
    latestPaymentAttempt: latestAttempt
      ? {
          id: latestAttempt.id,
          internalPaymentId: latestAttempt.internalPaymentId,
          status: latestAttempt.status,
        }
      : null,
  });
}

/** GET /api/admin/reservations — filterable, searchable, paginated. */
export async function listReservations(req: Request, res: Response) {
  const query = listReservationsQuerySchema.parse(req.query);

  const where: Prisma.ReservationWhereInput = {};

  if (query.branch) where.branch = { code: query.branch };
  if (query.status) where.status = query.status;
  if (query.from || query.to) {
    where.date = {
      ...(query.from ? { gte: new Date(`${query.from}T00:00:00Z`) } : {}),
      ...(query.to ? { lte: new Date(`${query.to}T23:59:59Z`) } : {}),
    };
  }
  if (query.search) {
    where.OR = [
      { customerName: { contains: query.search } },
      { phone: { contains: query.search } },
      { email: { contains: query.search } },
      { reference: { contains: query.search } },
    ];
  }

  const [total, reservations] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where,
      include: { branch: true, ...LATEST_ATTEMPT_INCLUDE },
      orderBy: { date: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  res.json({
    total,
    page: query.page,
    pageSize: query.pageSize,
    reservations,
  });
}

export async function getReservation(req: Request, res: Response) {
  const id = Number(req.params.id);
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { branch: true, ...LATEST_ATTEMPT_INCLUDE },
  });
  if (!reservation) throw ApiError.notFound("Reservation not found");
  res.json({ reservation });
}

/**
 * PATCH /api/admin/reservations/:id — edit booking details (date, time,
 * guests, seating, notes), or manually override the status for cases
 * outside the normal payment flow (e.g. a phone/walk-in booking staff enter
 * and confirm directly, with no screenshot at all).
 *
 * For the normal case — a customer uploaded a screenshot that needs a human
 * to check it — use PATCH /api/admin/payment-attempts/:id instead (see
 * payment.controller.ts), which acts on the specific attempt and keeps the
 * reservation status in sync with it. This endpoint's status override is
 * intentionally a blunt instrument for exceptions, not the main path.
 */
export async function updateReservation(req: Request, res: Response) {
  const id = Number(req.params.id);
  const input = updateReservationSchema.parse(req.body);

  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Reservation not found");

  const becomingConfirmed = existing.status === "PENDING_PAYMENT" && input.status === "CONFIRMED";
  const becomingRejected = existing.status === "PENDING_PAYMENT" && input.status === "CANCELLED";

  const reservation = await prisma.reservation.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.seating ? { seating: input.seating } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.date ? { date: new Date(`${input.date}T00:00:00Z`) } : {}),
      ...(input.time ? { time: input.time } : {}),
      ...(input.guests ? { guests: input.guests } : {}),
    },
    include: { branch: true, ...LATEST_ATTEMPT_INCLUDE },
  });

  if (becomingConfirmed || becomingRejected) {
    const notifyPayload = {
      reference: reservation.reference,
      branchName: reservation.branch.name,
      branchCode: reservation.branch.code,
      customerName: reservation.customerName,
      phone: reservation.phone,
      email: reservation.email,
      date: reservation.date.toISOString().slice(0, 10),
      time: reservation.time,
      guests: reservation.guests,
      seating: SEATING_LABEL[reservation.seating] ?? reservation.seating,
      depositAmount: Number(reservation.depositAmount),
      notes: reservation.notes,
    };
    const notify = becomingConfirmed
      ? sendPaymentConfirmedNotification(notifyPayload)
      : sendPaymentRejectedNotification(notifyPayload);
    notify.catch((err) => console.error("[whatsapp] payment status notification failed", err));
  }

  res.json({ reservation });
}

/** GET /api/admin/reservations/export — CSV export for the current filter set. */
export async function exportReservations(req: Request, res: Response) {
  const query = listReservationsQuerySchema.parse(req.query);

  const where: Prisma.ReservationWhereInput = {};
  if (query.branch) where.branch = { code: query.branch };
  if (query.status) where.status = query.status;

  const reservations = await prisma.reservation.findMany({
    where,
    include: { branch: true, ...LATEST_ATTEMPT_INCLUDE },
    orderBy: { date: "desc" },
  });

  const header = [
    "Reference",
    "Branch",
    "Customer",
    "Phone",
    "Email",
    "Guests",
    "Date",
    "Time",
    "Seating",
    "Deposit (ZMW)",
    "Payment Provider",
    "Transaction ID",
    "Payment Status",
    "Status",
  ];

  const rows = reservations.map((r) => {
    const latest = r.paymentAttempts[0];
    return [
      r.reference,
      r.branch.name,
      r.customerName,
      r.phone,
      r.email,
      r.guests,
      r.date.toISOString().slice(0, 10),
      r.time,
      r.seating,
      r.depositAmount.toString(),
      latest?.provider ?? "",
      latest?.extractedTransactionId ?? "",
      latest?.status ?? "",
      r.status,
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="reservations-${Date.now()}.csv"`);
  res.send(csv);
}
