import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const branchCodeSchema = z.enum(["LUSAKA", "KITWE"]);
const orderTypeSchema = z.enum(["RESERVATION", "TAKEAWAY", "CATERING"]);
const paymentMethodSchema = z.enum(["AIRTEL_MONEY", "MTN_MOMO"]);

/**
 * GET /api/admin/reports/summary?branch=&days=30&orderType=&paymentMethod=
 *
 * Two zero-filled day series (reservations, takeaway) plus headline totals
 * across reservations, takeaway orders, catering enquiries, and discounts.
 * `orderType` narrows which dataset(s) actually get queried/populated — the
 * other(s) come back zero-filled rather than omitted, so the frontend never
 * has to branch on which fields exist. Aggregation happens in application
 * code (no Prisma `groupBy` used anywhere in this codebase) — fine at
 * restaurant scale, matching every other report/list endpoint here.
 */
export async function getReportsSummary(req: Request, res: Response) {
  const query = z
    .object({
      branch: branchCodeSchema.optional(),
      days: z.coerce.number().int().min(7).max(180).default(30),
      orderType: orderTypeSchema.optional(),
      paymentMethod: paymentMethodSchema.optional(),
    })
    .parse(req.query);

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (query.days - 1));
  const todayKey = new Date().toISOString().slice(0, 10);

  const includeReservations = !query.orderType || query.orderType === "RESERVATION";
  const includeTakeaway = !query.orderType || query.orderType === "TAKEAWAY";
  const includeCatering = !query.orderType || query.orderType === "CATERING";

  function zeroFilledSeries<T extends Record<string, number>>(extra: T) {
    const byDay = new Map<string, { date: string } & T>();
    for (let i = 0; i < query.days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, { date: key, ...extra });
    }
    return byDay;
  }

  // --- Reservations ---
  const reservationSeries = zeroFilledSeries({ reservations: 0, covers: 0 });
  let totalReservations = 0;
  let totalCovers = 0;
  let partyBookings = 0;
  let cancelled = 0;
  let noShow = 0;
  let todaysReservations = 0;
  let todaysCovers = 0;
  const ordersByBranch = { LUSAKA: 0, KITWE: 0 };

  if (includeReservations) {
    const where: Record<string, unknown> = { date: { gte: since } };
    if (query.branch) where.branch = { code: query.branch };

    const reservations = await prisma.reservation.findMany({
      where,
      select: { date: true, guests: true, status: true, bookingType: true, branch: { select: { code: true } } },
    });

    for (const r of reservations) {
      const key = r.date.toISOString().slice(0, 10);
      const bucket = reservationSeries.get(key);
      if (bucket) {
        bucket.reservations += 1;
        bucket.covers += r.guests;
      }
      totalCovers += r.guests;
      if (r.bookingType === "PARTY") partyBookings += 1;
      if (r.status === "CANCELLED") cancelled += 1;
      if (r.status === "NO_SHOW") noShow += 1;
      if (key === todayKey) {
        todaysReservations += 1;
        todaysCovers += r.guests;
      }
      ordersByBranch[r.branch.code] += 1;
    }
    totalReservations = reservations.length;
  }

  // --- Takeaway ---
  const takeawaySeries = zeroFilledSeries({ orders: 0, revenue: 0 });
  let totalTakeawayOrders = 0;
  let totalTakeawayRevenue = 0;
  const revenueByPaymentMethod = { AIRTEL_MONEY: 0, MTN_MOMO: 0 };
  let totalDiscountsApplied = 0;
  let totalDiscountAmount = 0;

  if (includeTakeaway) {
    const where: Record<string, unknown> = { createdAt: { gte: since } };
    if (query.branch) where.branch = { code: query.branch };

    const orders = await prisma.takeawayOrder.findMany({
      where,
      select: {
        createdAt: true,
        totalAmount: true,
        status: true,
        branch: { select: { code: true } },
        discount: { select: { discountAmount: true } },
        paymentAttempts: {
          where: { status: { in: ["AUTO_VERIFIED", "APPROVED"] } },
          select: { provider: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    for (const o of orders) {
      // Only orders that actually got past payment count toward revenue —
      // a still-PENDING_PAYMENT or CANCELLED order isn't money taken.
      const paid = o.status !== "PENDING_PAYMENT" && o.status !== "CANCELLED";
      const key = o.createdAt.toISOString().slice(0, 10);
      const bucket = takeawaySeries.get(key);
      if (bucket) {
        bucket.orders += 1;
        if (paid) bucket.revenue += Number(o.totalAmount);
      }
      totalTakeawayOrders += 1;
      ordersByBranch[o.branch.code] += 1;

      if (paid) {
        totalTakeawayRevenue += Number(o.totalAmount);
        const provider = o.paymentAttempts[0]?.provider;
        if (!query.paymentMethod || query.paymentMethod === provider) {
          if (provider === "AIRTEL_MONEY") revenueByPaymentMethod.AIRTEL_MONEY += Number(o.totalAmount);
          else if (provider === "MTN_MOMO") revenueByPaymentMethod.MTN_MOMO += Number(o.totalAmount);
        }
      }

      if (o.discount) {
        totalDiscountsApplied += 1;
        totalDiscountAmount += Number(o.discount.discountAmount);
      }
    }
  }

  // --- Catering enquiries ---
  let totalCateringEnquiries = 0;
  if (includeCatering) {
    const where: Record<string, unknown> = { createdAt: { gte: since } };
    if (query.branch) where.branch = { code: query.branch };
    totalCateringEnquiries = await prisma.cateringEnquiry.count({ where });
  }

  res.json({
    series: Array.from(reservationSeries.values()),
    takeawaySeries: Array.from(takeawaySeries.values()),
    totals: {
      totalReservations,
      totalCovers,
      averagePartySize: totalReservations ? Math.round((totalCovers / totalReservations) * 10) / 10 : 0,
      partyBookings,
      cancelled,
      noShow,
      todaysReservations,
      todaysCovers,
      totalTakeawayOrders,
      totalTakeawayRevenue: Math.round(totalTakeawayRevenue * 100) / 100,
      totalCateringEnquiries,
      totalDiscountsApplied,
      totalDiscountAmount: Math.round(totalDiscountAmount * 100) / 100,
      revenueByPaymentMethod: {
        AIRTEL_MONEY: Math.round(revenueByPaymentMethod.AIRTEL_MONEY * 100) / 100,
        MTN_MOMO: Math.round(revenueByPaymentMethod.MTN_MOMO * 100) / 100,
      },
      ordersByBranch,
    },
  });
}
