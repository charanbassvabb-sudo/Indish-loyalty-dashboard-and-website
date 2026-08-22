import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { isRecurringlyClosed, getRecurringClosureNote } from "../utils/branchHours";

/** Every calendar date from `from` to `to` inclusive, as YYYY-MM-DD strings. */
function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

const branchCodeSchema = z.enum(["LUSAKA", "KITWE"]);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

/**
 * GET /api/availability?branch=LUSAKA&from=2026-08-05&to=2026-08-12
 * Public — powers the "seats left today" banner on the reserve page.
 * Only ever returns branches/dates that staff have explicitly set.
 */
export async function getPublicAvailability(req: Request, res: Response) {
  const query = z
    .object({
      branch: branchCodeSchema.optional(),
      from: dateSchema.optional(),
      to: dateSchema.optional(),
    })
    .parse(req.query);

  const where: Record<string, unknown> = {};
  if (query.branch) where.branch = { code: query.branch };
  if (query.from || query.to) {
    where.date = {
      ...(query.from ? { gte: new Date(`${query.from}T00:00:00Z`) } : {}),
      ...(query.to ? { lte: new Date(`${query.to}T23:59:59Z`) } : {}),
    };
  }

  const rows = await prisma.dailyAvailability.findMany({
    where,
    include: { branch: true },
    orderBy: { date: "asc" },
  });

  // Keyed by "BRANCH|date" — a bare date would collide between branches
  // when this endpoint is called without a branch filter (e.g. the admin
  // dashboard listing overrides across both).
  const byKey = new Map(
    rows.map((r) => {
      const date = r.date.toISOString().slice(0, 10);
      const entry = { branch: r.branch.code, date, seatsLeft: r.seatsLeft, fullyBooked: r.fullyBooked, note: r.note };
      return [`${entry.branch}|${date}`, entry];
    }),
  );

  // Each branch's recurring closure (Lusaka: 2nd/3rd Monday, Kitwe: 2nd
  // Tuesday) is a fixed rule, not a staff-set override — surface it here too
  // (as if it were a fullyBooked row) so the "seats left" banner shows
  // "Closed" before the customer even tries to submit, without anyone having
  // to remember to add DailyAvailability rows every month. Takes precedence
  // over any stale override for the same date.
  if (query.from && query.to) {
    const branchesToCheck = query.branch ? [query.branch] : (["LUSAKA", "KITWE"] as const);
    for (const branch of branchesToCheck) {
      for (const date of eachDate(query.from, query.to)) {
        if (isRecurringlyClosed(date, branch)) {
          byKey.set(`${branch}|${date}`, { branch, date, seatsLeft: 0, fullyBooked: true, note: getRecurringClosureNote(branch) });
        }
      }
    }
  }

  res.json({
    availability: [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date) || a.branch.localeCompare(b.branch)),
  });
}

/** GET /api/admin/availability — full list for the admin dashboard, most recent first. */
export async function listAvailability(req: Request, res: Response) {
  const query = z
    .object({
      branch: branchCodeSchema.optional(),
      from: dateSchema.optional(),
      to: dateSchema.optional(),
    })
    .parse(req.query);

  const where: Record<string, unknown> = {};
  if (query.branch) where.branch = { code: query.branch };
  if (query.from || query.to) {
    where.date = {
      ...(query.from ? { gte: new Date(`${query.from}T00:00:00Z`) } : {}),
      ...(query.to ? { lte: new Date(`${query.to}T23:59:59Z`) } : {}),
    };
  }

  const rows = await prisma.dailyAvailability.findMany({
    where,
    include: { branch: true },
    orderBy: { date: "desc" },
    take: 60,
  });

  res.json({
    availability: rows.map((r) => ({
      id: r.id,
      branch: r.branch.code,
      date: r.date.toISOString().slice(0, 10),
      seatsLeft: r.seatsLeft,
      fullyBooked: r.fullyBooked,
      note: r.note,
      updatedByName: r.updatedByName,
      updatedAt: r.updatedAt,
    })),
  });
}

const upsertSchema = z.object({
  branch: branchCodeSchema,
  date: dateSchema,
  seatsLeft: z.number().int().min(0).max(999).nullable().optional(),
  fullyBooked: z.boolean().optional(),
  note: z.string().trim().max(280).optional(),
});

/** PUT /api/admin/availability — upsert one branch/date row. */
export async function upsertAvailability(req: Request, res: Response) {
  const input = upsertSchema.parse(req.body);

  const branch = await prisma.branch.findUnique({ where: { code: input.branch } });
  if (!branch) throw ApiError.badRequest("Unknown branch");

  const row = await prisma.dailyAvailability.upsert({
    where: { branchId_date: { branchId: branch.id, date: new Date(`${input.date}T00:00:00Z`) } },
    update: {
      seatsLeft: input.seatsLeft ?? null,
      fullyBooked: input.fullyBooked ?? false,
      note: input.note || null,
      updatedByName: req.admin?.email ?? null,
    },
    create: {
      branchId: branch.id,
      date: new Date(`${input.date}T00:00:00Z`),
      seatsLeft: input.seatsLeft ?? null,
      fullyBooked: input.fullyBooked ?? false,
      note: input.note || null,
      updatedByName: req.admin?.email ?? null,
    },
    include: { branch: true },
  });

  res.json({
    availability: {
      id: row.id,
      branch: row.branch.code,
      date: row.date.toISOString().slice(0, 10),
      seatsLeft: row.seatsLeft,
      fullyBooked: row.fullyBooked,
      note: row.note,
    },
  });
}

/** DELETE /api/admin/availability/:id — clear an override (back to "not tracked"). */
export async function deleteAvailability(req: Request, res: Response) {
  const id = Number(req.params.id);
  await prisma.dailyAvailability.delete({ where: { id } }).catch(() => {
    throw ApiError.notFound("Availability entry not found");
  });
  res.status(204).send();
}
