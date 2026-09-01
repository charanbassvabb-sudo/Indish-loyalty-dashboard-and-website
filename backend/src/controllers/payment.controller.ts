import type { Request, Response } from "express";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { generateInternalPaymentId } from "../utils/bookingReference";
import { stringParam } from "../utils/params";
import { PAYMENT_SCREENSHOT_DIR } from "../middleware/upload";
import { extractTextFromImage } from "../services/ocr.service";
import { verifyPaymentScreenshot } from "../services/paymentVerification.service";
import { getBusinessNumber, isProviderAllowedForBranch } from "../config/paymentNumbers";
import { SEATING_LABEL } from "./reservation.controller";
import {
  sendPaymentConfirmedNotification,
  sendPaymentRejectedNotification,
  sendPaymentUnderReviewNotifications,
  sendPaymentAutoRejectedNotification,
  sendRequestNewScreenshotNotification,
  sendTakeawayPaymentConfirmedNotification,
  sendTakeawayPaymentRejectedNotification,
  sendTakeawayPaymentUnderReviewNotifications,
  sendTakeawayPaymentAutoRejectedNotification,
  sendTakeawayRequestNewScreenshotNotification,
} from "../services/whatsapp.service";
import {
  uploadPaymentScreenshotSchema,
  paymentAttemptActionSchema,
  listPaymentAttemptsQuerySchema,
} from "../validators/reservation.validator";

async function generateUniqueInternalPaymentId(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const candidate = generateInternalPaymentId();
    const existing = await prisma.paymentAttempt.findUnique({ where: { internalPaymentId: candidate } });
    if (!existing) return candidate;
  }
  throw ApiError.internal("Could not generate a unique payment reference — please try again");
}

function reservationNotifyPayloadFor(reservation: {
  reference: string;
  customerName: string;
  phone: string;
  email: string;
  date: Date;
  time: string;
  guests: number;
  seating: string;
  depositAmount: Prisma.Decimal;
  notes: string | null;
  branch: { name: string; code: "LUSAKA" | "KITWE" };
}) {
  return {
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
}

function takeawayNotifyPayloadFor(order: {
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
 * POST /api/reservations/:reference/payment-screenshot
 * Public endpoint. The core of the automatic verification system: reads the
 * uploaded screenshot with OCR, extracts payment details, compares them
 * against what this booking actually expects (amount, business number),
 * checks the transaction ID hasn't been used before, and decides whether
 * that's confident enough to confirm the table immediately — see
 * paymentVerification.service.ts for the actual decision logic.
 *
 * IMPORTANT: this is screenshot-proof verification, not a real confirmation
 * from Airtel/MTN themselves — see PaymentAttempt.verificationMethod and the
 * schema comment on it. A future direct API/webhook integration would add a
 * new verificationMethod value and a new code path here, not replace this
 * one wholesale.
 */
export async function uploadPaymentScreenshot(req: Request, res: Response) {
  const reservation = await prisma.reservation.findUnique({
    where: { reference: stringParam(req, "reference") },
    include: { branch: true },
  });
  if (!reservation) throw ApiError.notFound("Reservation not found");

  if (reservation.status !== "PENDING_PAYMENT") {
    throw ApiError.conflict("This booking is no longer waiting for payment");
  }

  const input = uploadPaymentScreenshotSchema.parse(req.body);

  if (!isProviderAllowedForBranch(reservation.branch.code, input.provider)) {
    throw ApiError.badRequest(`${input.provider} is not accepted at this branch`);
  }

  if (!req.file) {
    throw ApiError.badRequest("Please attach a payment screenshot");
  }

  const expectedRecipient = getBusinessNumber(reservation.branch.code, input.provider);
  if (!expectedRecipient) throw ApiError.badRequest("No business number configured for this provider/branch");

  const expectedAmount = Number(reservation.depositAmount);

  let rawText = "";
  try {
    rawText = await extractTextFromImage(req.file.path);
  } catch (err) {
    // OCR itself failing (corrupt image, etc.) shouldn't 500 the request —
    // fall through with empty text, which the verification step below
    // treats as "nothing could be read" and lands on REQUIRES_REVIEW.
    console.error("[ocr] extraction failed", err);
  }

  const usedIdRows = await prisma.paymentAttempt.findMany({
    where: { status: { in: ["AUTO_VERIFIED", "APPROVED"] }, extractedTransactionId: { not: null } },
    select: { extractedTransactionId: true },
  });
  const usedTransactionIds = new Set(usedIdRows.map((r) => r.extractedTransactionId!.toUpperCase()));

  const result = verifyPaymentScreenshot({ rawText, expectedAmount, expectedRecipient, usedTransactionIds });
  const internalPaymentId = await generateUniqueInternalPaymentId();

  const attempt = await prisma.paymentAttempt.create({
    data: {
      reservationId: reservation.id,
      provider: input.provider,
      expectedAmount: new Prisma.Decimal(expectedAmount),
      expectedRecipient,
      screenshotPath: req.file.filename,
      screenshotMime: req.file.mimetype,
      ocrRawText: rawText || null,
      extractedAmount: result.extracted.amount !== null ? new Prisma.Decimal(result.extracted.amount) : null,
      extractedTransactionId: result.extracted.transactionId,
      extractedSender: result.extracted.sender,
      extractedRecipient: result.extracted.recipient,
      extractedDate: result.extracted.date,
      extractedTime: result.extracted.time,
      extractedStatus: result.extracted.status,
      matchAmount: result.matchAmount,
      matchRecipient: result.matchRecipient,
      matchStatus: result.matchStatus,
      matchRecency: result.matchRecency,
      matchNotDuplicate: result.matchNotDuplicate,
      confidenceScore: result.confidenceScore,
      status: result.decision,
      verificationMethod: "SCREENSHOT_OCR",
      internalPaymentId,
    },
  });

  const notifyPayload = reservationNotifyPayloadFor(reservation);
  let reservationStatus: "PENDING_PAYMENT" | "CONFIRMED" = reservation.status;

  if (result.decision === "AUTO_VERIFIED") {
    reservationStatus = "CONFIRMED";
    await prisma.reservation.update({ where: { id: reservation.id }, data: { status: "CONFIRMED" } });
    sendPaymentConfirmedNotification(notifyPayload).catch((err) => console.error("[whatsapp] confirm notify failed", err));
  } else if (result.decision === "REQUIRES_REVIEW") {
    sendPaymentUnderReviewNotifications(notifyPayload).catch((err) => console.error("[whatsapp] review notify failed", err));
  } else if (result.decision === "PAYMENT_FAILED") {
    sendPaymentAutoRejectedNotification(notifyPayload, "The screenshot shows the transaction was not successful.").catch(
      (err) => console.error("[whatsapp] auto-reject notify failed", err),
    );
  } else if (result.decision === "DUPLICATE") {
    sendPaymentAutoRejectedNotification(
      notifyPayload,
      "This transaction has already been used to confirm a different booking.",
    ).catch((err) => console.error("[whatsapp] duplicate notify failed", err));
  }

  res.status(201).json({
    attemptId: attempt.id,
    internalPaymentId: attempt.internalPaymentId,
    status: attempt.status,
    reservationStatus,
    expected: { amount: expectedAmount, recipient: expectedRecipient },
    extracted: result.extracted,
    matches: {
      amount: result.matchAmount,
      recipient: result.matchRecipient,
      status: result.matchStatus,
      recency: result.matchRecency,
      notDuplicate: result.matchNotDuplicate,
    },
    confidenceScore: result.confidenceScore,
  });
}

/**
 * POST /api/takeaway-orders/:reference/payment-screenshot
 * Public endpoint. Exact same OCR/verification flow as uploadPaymentScreenshot
 * above, targeting a TakeawayOrder instead of a Reservation — expectedAmount
 * is the order's totalAmount (already net of any admin-applied discount)
 * rather than a per-guest deposit. See the PaymentAttempt schema comment for
 * why this shares the same table/dedup check as reservation deposits.
 */
export async function uploadTakeawayPaymentScreenshot(req: Request, res: Response) {
  const order = await prisma.takeawayOrder.findUnique({
    where: { reference: stringParam(req, "reference") },
    include: { branch: true },
  });
  if (!order) throw ApiError.notFound("Order not found");

  if (order.status !== "PENDING_PAYMENT") {
    throw ApiError.conflict("This order is no longer waiting for payment");
  }

  const input = uploadPaymentScreenshotSchema.parse(req.body);

  if (!isProviderAllowedForBranch(order.branch.code, input.provider)) {
    throw ApiError.badRequest(`${input.provider} is not accepted at this branch`);
  }

  if (!req.file) {
    throw ApiError.badRequest("Please attach a payment screenshot");
  }

  const expectedRecipient = getBusinessNumber(order.branch.code, input.provider);
  if (!expectedRecipient) throw ApiError.badRequest("No business number configured for this provider/branch");

  const expectedAmount = Number(order.totalAmount);

  let rawText = "";
  try {
    rawText = await extractTextFromImage(req.file.path);
  } catch (err) {
    console.error("[ocr] extraction failed", err);
  }

  // Same cross-parent duplicate check as the reservation path — a screenshot
  // already used to confirm a reservation deposit (or another takeaway
  // order) can't also confirm this one.
  const usedIdRows = await prisma.paymentAttempt.findMany({
    where: { status: { in: ["AUTO_VERIFIED", "APPROVED"] }, extractedTransactionId: { not: null } },
    select: { extractedTransactionId: true },
  });
  const usedTransactionIds = new Set(usedIdRows.map((r) => r.extractedTransactionId!.toUpperCase()));

  const result = verifyPaymentScreenshot({ rawText, expectedAmount, expectedRecipient, usedTransactionIds });
  const internalPaymentId = await generateUniqueInternalPaymentId();

  const attempt = await prisma.paymentAttempt.create({
    data: {
      takeawayOrderId: order.id,
      provider: input.provider,
      expectedAmount: new Prisma.Decimal(expectedAmount),
      expectedRecipient,
      screenshotPath: req.file.filename,
      screenshotMime: req.file.mimetype,
      ocrRawText: rawText || null,
      extractedAmount: result.extracted.amount !== null ? new Prisma.Decimal(result.extracted.amount) : null,
      extractedTransactionId: result.extracted.transactionId,
      extractedSender: result.extracted.sender,
      extractedRecipient: result.extracted.recipient,
      extractedDate: result.extracted.date,
      extractedTime: result.extracted.time,
      extractedStatus: result.extracted.status,
      matchAmount: result.matchAmount,
      matchRecipient: result.matchRecipient,
      matchStatus: result.matchStatus,
      matchRecency: result.matchRecency,
      matchNotDuplicate: result.matchNotDuplicate,
      confidenceScore: result.confidenceScore,
      status: result.decision,
      verificationMethod: "SCREENSHOT_OCR",
      internalPaymentId,
    },
  });

  const notifyPayload = takeawayNotifyPayloadFor(order);
  // order.status is guaranteed PENDING_PAYMENT here (checked above) until AUTO_VERIFIED flips it below.
  let orderStatus: "PENDING_PAYMENT" | "CONFIRMED" = "PENDING_PAYMENT";

  if (result.decision === "AUTO_VERIFIED") {
    orderStatus = "CONFIRMED";
    await prisma.takeawayOrder.update({ where: { id: order.id }, data: { status: "CONFIRMED" } });
    sendTakeawayPaymentConfirmedNotification(notifyPayload).catch((err) =>
      console.error("[whatsapp] takeaway confirm notify failed", err),
    );
  } else if (result.decision === "REQUIRES_REVIEW") {
    sendTakeawayPaymentUnderReviewNotifications(notifyPayload).catch((err) =>
      console.error("[whatsapp] takeaway review notify failed", err),
    );
  } else if (result.decision === "PAYMENT_FAILED") {
    sendTakeawayPaymentAutoRejectedNotification(
      notifyPayload,
      "The screenshot shows the transaction was not successful.",
    ).catch((err) => console.error("[whatsapp] takeaway auto-reject notify failed", err));
  } else if (result.decision === "DUPLICATE") {
    sendTakeawayPaymentAutoRejectedNotification(
      notifyPayload,
      "This transaction has already been used to confirm a different order.",
    ).catch((err) => console.error("[whatsapp] takeaway duplicate notify failed", err));
  }

  res.status(201).json({
    attemptId: attempt.id,
    internalPaymentId: attempt.internalPaymentId,
    status: attempt.status,
    orderStatus,
    expected: { amount: expectedAmount, recipient: expectedRecipient },
    extracted: result.extracted,
    matches: {
      amount: result.matchAmount,
      recipient: result.matchRecipient,
      status: result.matchStatus,
      recency: result.matchRecency,
      notDuplicate: result.matchNotDuplicate,
    },
    confidenceScore: result.confidenceScore,
  });
}

type AttemptWithRelations = Prisma.PaymentAttemptGetPayload<{
  include: {
    reservation: { include: { branch: true } };
    takeawayOrder: { include: { branch: true } };
    reviewedByAdmin: { select: { id: true; name: true } };
  };
}>;

function serializeAttempt(a: AttemptWithRelations) {
  return {
    id: a.id,
    paymentStatus: a.status,
    internalPaymentId: a.internalPaymentId,
    provider: a.provider,
    verificationMethod: a.verificationMethod,
    expectedAmount: a.expectedAmount,
    expectedRecipient: a.expectedRecipient,
    extracted: {
      amount: a.extractedAmount,
      transactionId: a.extractedTransactionId,
      sender: a.extractedSender,
      recipient: a.extractedRecipient,
      date: a.extractedDate,
      time: a.extractedTime,
      status: a.extractedStatus,
    },
    matches: {
      amount: a.matchAmount,
      recipient: a.matchRecipient,
      status: a.matchStatus,
      recency: a.matchRecency,
      notDuplicate: a.matchNotDuplicate,
    },
    confidenceScore: a.confidenceScore,
    reviewNotes: a.reviewNotes,
    reviewedAt: a.reviewedAt,
    reviewedByAdmin: a.reviewedByAdmin,
    createdAt: a.createdAt,
    // Exactly one of these two is non-null — parentType tells the frontend
    // which. See the PaymentAttempt schema comment for why the table (and
    // therefore this serializer) is shared rather than forked in two.
    parentType: a.reservation ? ("RESERVATION" as const) : ("TAKEAWAY" as const),
    reservation: a.reservation
      ? {
          id: a.reservation.id,
          reference: a.reservation.reference,
          customerName: a.reservation.customerName,
          phone: a.reservation.phone,
          email: a.reservation.email,
          branch: a.reservation.branch.code,
          branchName: a.reservation.branch.name,
          date: a.reservation.date.toISOString().slice(0, 10),
          time: a.reservation.time,
          guests: a.reservation.guests,
          depositAmount: a.reservation.depositAmount,
          status: a.reservation.status,
        }
      : null,
    takeawayOrder: a.takeawayOrder
      ? {
          id: a.takeawayOrder.id,
          reference: a.takeawayOrder.reference,
          customerName: a.takeawayOrder.customerName,
          phone: a.takeawayOrder.phone,
          branch: a.takeawayOrder.branch.code,
          branchName: a.takeawayOrder.branch.name,
          pickupDate: a.takeawayOrder.pickupDate.toISOString().slice(0, 10),
          pickupTime: a.takeawayOrder.pickupTime,
          totalAmount: a.takeawayOrder.totalAmount,
          status: a.takeawayOrder.status,
        }
      : null,
  };
}

/**
 * GET /api/admin/payment-attempts — the payment verification queue, now
 * covering both reservation deposits and takeaway order payments in one
 * list. status=WAITING_FOR_PAYMENT is synthetic — it's not a PaymentAttempt
 * at all, it's reservations/orders that haven't had a screenshot uploaded
 * yet, so it queries Reservation and TakeawayOrder directly and merges the
 * two in application code (small, transient sets — fine at this scale, same
 * "aggregate in JS" convention already used in reports.controller.ts).
 * Every other status queries PaymentAttempt directly, which already spans
 * both parent types via parentType (see serializeAttempt).
 */
export async function listPaymentAttempts(req: Request, res: Response) {
  const query = listPaymentAttemptsQuerySchema.parse(req.query);

  if (query.status === "WAITING_FOR_PAYMENT") {
    const reservationWhere: Prisma.ReservationWhereInput = {
      status: "PENDING_PAYMENT",
      paymentAttempts: { none: {} },
      ...(query.branch ? { branch: { code: query.branch } } : {}),
      ...(query.search
        ? {
            OR: [
              { customerName: { contains: query.search } },
              { phone: { contains: query.search } },
              { reference: { contains: query.search } },
            ],
          }
        : {}),
    };
    const takeawayWhere: Prisma.TakeawayOrderWhereInput = {
      status: "PENDING_PAYMENT",
      paymentAttempts: { none: {} },
      ...(query.branch ? { branch: { code: query.branch } } : {}),
      ...(query.search
        ? {
            OR: [
              { customerName: { contains: query.search } },
              { phone: { contains: query.search } },
              { reference: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [reservations, orders] = await Promise.all([
      prisma.reservation.findMany({ where: reservationWhere, include: { branch: true }, orderBy: { createdAt: "desc" } }),
      prisma.takeawayOrder.findMany({ where: takeawayWhere, include: { branch: true }, orderBy: { createdAt: "desc" } }),
    ]);

    const waiting = [
      ...reservations.map((r) => ({
        createdAt: r.createdAt,
        id: null,
        paymentStatus: "WAITING_FOR_PAYMENT" as const,
        internalPaymentId: null,
        provider: null,
        extracted: null,
        matches: null,
        confidenceScore: null,
        parentType: "RESERVATION" as const,
        reservation: {
          id: r.id,
          reference: r.reference,
          customerName: r.customerName,
          phone: r.phone,
          email: r.email,
          branch: r.branch.code,
          branchName: r.branch.name,
          date: r.date.toISOString().slice(0, 10),
          time: r.time,
          guests: r.guests,
          depositAmount: r.depositAmount,
          status: r.status,
        },
        takeawayOrder: null,
      })),
      ...orders.map((o) => ({
        createdAt: o.createdAt,
        id: null,
        paymentStatus: "WAITING_FOR_PAYMENT" as const,
        internalPaymentId: null,
        provider: null,
        extracted: null,
        matches: null,
        confidenceScore: null,
        parentType: "TAKEAWAY" as const,
        reservation: null,
        takeawayOrder: {
          id: o.id,
          reference: o.reference,
          customerName: o.customerName,
          phone: o.phone,
          branch: o.branch.code,
          branchName: o.branch.name,
          pickupDate: o.pickupDate.toISOString().slice(0, 10),
          pickupTime: o.pickupTime,
          totalAmount: o.totalAmount,
          status: o.status,
        },
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = waiting.length;
    const start = (query.page - 1) * query.pageSize;
    const page = waiting.slice(start, start + query.pageSize).map(({ createdAt, ...rest }) => rest);

    res.json({ total, page: query.page, pageSize: query.pageSize, attempts: page });
    return;
  }

  // A branch/search filter must match EITHER parent relation — reservationId
  // and takeawayOrderId are mutually exclusive per row, so an attempt only
  // ever satisfies one side of this OR, never both.
  const where: Prisma.PaymentAttemptWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.branch || query.search
      ? {
          OR: [
            {
              reservation: {
                ...(query.branch ? { branch: { code: query.branch } } : {}),
                ...(query.search
                  ? {
                      OR: [
                        { customerName: { contains: query.search } },
                        { phone: { contains: query.search } },
                        { reference: { contains: query.search } },
                      ],
                    }
                  : {}),
              },
            },
            {
              takeawayOrder: {
                ...(query.branch ? { branch: { code: query.branch } } : {}),
                ...(query.search
                  ? {
                      OR: [
                        { customerName: { contains: query.search } },
                        { phone: { contains: query.search } },
                        { reference: { contains: query.search } },
                      ],
                    }
                  : {}),
              },
            },
          ],
        }
      : {}),
  };

  const [total, attempts] = await Promise.all([
    prisma.paymentAttempt.count({ where }),
    prisma.paymentAttempt.findMany({
      where,
      include: {
        reservation: { include: { branch: true } },
        takeawayOrder: { include: { branch: true } },
        reviewedByAdmin: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  res.json({
    total,
    page: query.page,
    pageSize: query.pageSize,
    attempts: attempts.map(serializeAttempt),
  });
}

/** GET /api/admin/payment-attempts/:id — full detail for the review drawer. */
export async function getPaymentAttempt(req: Request, res: Response) {
  const id = Number(req.params.id);
  const attempt = await prisma.paymentAttempt.findUnique({
    where: { id },
    include: {
      reservation: { include: { branch: true } },
      takeawayOrder: { include: { branch: true } },
      reviewedByAdmin: { select: { id: true, name: true } },
    },
  });
  if (!attempt) throw ApiError.notFound("Payment attempt not found");
  res.json({ attempt: serializeAttempt(attempt) });
}

/**
 * GET /api/admin/payment-attempts/:id/screenshot — streams the uploaded
 * image. Auth-gated (requireAdmin, applied in payment.routes.ts) rather
 * than served as a static public directory, since screenshots can show
 * partial account/contact info.
 */
export async function getPaymentAttemptScreenshot(req: Request, res: Response) {
  const id = Number(req.params.id);
  const attempt = await prisma.paymentAttempt.findUnique({ where: { id } });
  if (!attempt) throw ApiError.notFound("Payment attempt not found");

  const filePath = path.join(PAYMENT_SCREENSHOT_DIR, attempt.screenshotPath);
  res.type(attempt.screenshotMime);
  await new Promise<void>((resolve, reject) => {
    res.sendFile(filePath, (err) => (err ? reject(err) : resolve()));
  });
}

/**
 * PATCH /api/admin/payment-attempts/:id — the actual "admin only handles
 * what the system couldn't confidently verify" step. Approve confirms the
 * reservation/order and tells the customer; Reject cancels it and tells the
 * customer why; Request another screenshot leaves it open for a retry and
 * asks the customer to re-upload. Branches on which parent this attempt has
 * (see the PaymentAttempt schema comment) — the three actions themselves are
 * otherwise identical between the two parent types.
 */
export async function actOnPaymentAttempt(req: Request, res: Response) {
  const id = Number(req.params.id);
  const input = paymentAttemptActionSchema.parse(req.body);
  const adminId = req.admin!.adminId;

  const attempt = await prisma.paymentAttempt.findUnique({
    where: { id },
    include: { reservation: { include: { branch: true } }, takeawayOrder: { include: { branch: true } } },
  });
  if (!attempt) throw ApiError.notFound("Payment attempt not found");

  const isTakeaway = attempt.takeawayOrderId !== null;
  const notifyPayload = isTakeaway
    ? takeawayNotifyPayloadFor(attempt.takeawayOrder!)
    : reservationNotifyPayloadFor(attempt.reservation!);

  if (input.action === "approve") {
    const [updatedAttempt] = await prisma.$transaction([
      prisma.paymentAttempt.update({
        where: { id },
        data: { status: "APPROVED", reviewedByAdminId: adminId, reviewNotes: input.notes, reviewedAt: new Date() },
      }),
      isTakeaway
        ? prisma.takeawayOrder.update({ where: { id: attempt.takeawayOrderId! }, data: { status: "CONFIRMED" } })
        : prisma.reservation.update({ where: { id: attempt.reservationId! }, data: { status: "CONFIRMED" } }),
    ]);
    const notify = isTakeaway
      ? sendTakeawayPaymentConfirmedNotification(notifyPayload as Parameters<typeof sendTakeawayPaymentConfirmedNotification>[0])
      : sendPaymentConfirmedNotification(notifyPayload as Parameters<typeof sendPaymentConfirmedNotification>[0]);
    notify.catch((err) => console.error("[whatsapp] approve notify failed", err));
    res.json({ attempt: updatedAttempt });
    return;
  }

  if (input.action === "reject") {
    const [updatedAttempt] = await prisma.$transaction([
      prisma.paymentAttempt.update({
        where: { id },
        data: { status: "REJECTED", reviewedByAdminId: adminId, reviewNotes: input.notes, reviewedAt: new Date() },
      }),
      isTakeaway
        ? prisma.takeawayOrder.update({ where: { id: attempt.takeawayOrderId! }, data: { status: "CANCELLED" } })
        : prisma.reservation.update({ where: { id: attempt.reservationId! }, data: { status: "CANCELLED" } }),
    ]);
    const notify = isTakeaway
      ? sendTakeawayPaymentRejectedNotification(notifyPayload as Parameters<typeof sendTakeawayPaymentRejectedNotification>[0])
      : sendPaymentRejectedNotification(notifyPayload as Parameters<typeof sendPaymentRejectedNotification>[0]);
    notify.catch((err) => console.error("[whatsapp] reject notify failed", err));
    res.json({ attempt: updatedAttempt });
    return;
  }

  // request_new_screenshot — reservation/order stays PENDING_PAYMENT; the
  // customer uploads a fresh attempt, which becomes its own new row.
  const updatedAttempt = await prisma.paymentAttempt.update({
    where: { id },
    data: {
      reviewedByAdminId: adminId,
      reviewNotes: input.notes,
      reviewedAt: new Date(),
      ...(attempt.status === "PROCESSING" ? { status: "REQUIRES_REVIEW" as const } : {}),
    },
  });
  const notify = isTakeaway
    ? sendTakeawayRequestNewScreenshotNotification(
        notifyPayload as Parameters<typeof sendTakeawayRequestNewScreenshotNotification>[0],
        input.notes,
      )
    : sendRequestNewScreenshotNotification(notifyPayload as Parameters<typeof sendRequestNewScreenshotNotification>[0], input.notes);
  notify.catch((err) => console.error("[whatsapp] request-new-screenshot notify failed", err));
  res.json({ attempt: updatedAttempt });
}
