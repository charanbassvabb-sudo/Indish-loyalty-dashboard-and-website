import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const branchCodeSchema = z.enum(["LUSAKA", "KITWE"]);

/**
 * GET /api/admin/reports/summary?branch=&days=30
 * Reservations-per-day series (for the chart) plus headline stats
 * (today's covers, this week's bookings, average party size, no-show rate).
 */
export async function getReportsSummary(req: Request, res: Response) {
  const query = z
    .object({
      branch: branchCodeSchema.optional(),
      days: z.coerce.number().int().min(7).max(180).default(30),
    })
    .parse(req.query);

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (query.days - 1));

  const where: Record<string, unknown> = { date: { gte: since } };
  if (query.branch) where.branch = { code: query.branch };

  const reservations = await prisma.reservation.findMany({
    where,
    select: {
      date: true,
      guests: true,
      status: true,
      bookingType: true,
      branch: { select: { code: true } },
    },
  });

  // Build a zero-filled day series so the chart doesn't have gaps.
  const byDay = new Map<string, { date: string; reservations: number; covers: number }>();
  for (let i = 0; i < query.days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, { date: key, reservations: 0, covers: 0 });
  }

  let totalCovers = 0;
  let partyBookings = 0;
  let cancelled = 0;
  let noShow = 0;
  const todayKey = new Date().toISOString().slice(0, 10);
  let todaysReservations = 0;
  let todaysCovers = 0;

  for (const r of reservations) {
    const key = r.date.toISOString().slice(0, 10);
    const bucket = byDay.get(key);
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
  }

  const series = Array.from(byDay.values());
  const totalReservations = reservations.length;

  res.json({
    series,
    totals: {
      totalReservations,
      totalCovers,
      averagePartySize: totalReservations ? Math.round((totalCovers / totalReservations) * 10) / 10 : 0,
      partyBookings,
      cancelled,
      noShow,
      todaysReservations,
      todaysCovers,
    },
  });
}
