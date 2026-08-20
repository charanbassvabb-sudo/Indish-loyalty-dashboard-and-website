import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const branchCodeSchema = z.enum(["LUSAKA", "KITWE"]);

// The fixed set of editable fields the admin dashboard exposes. Keeping an
// allow-list (rather than free-form keys) keeps the CMS predictable and
// stops the admin UI and this API from drifting apart.
export const CONTENT_KEYS = [
  "heroHeading",
  "heroSubheading",
  "aboutText",
  "hoursText",
  "phoneOverride",
  "addressOverride",
  "announcementBanner",
] as const;

/** GET /api/content — public. Returns every stored override, site-wide + per branch. */
export async function getPublicContent(_req: Request, res: Response) {
  const rows = await prisma.siteContent.findMany();
  const content: Record<string, Record<string, string>> = { GLOBAL: {} };

  for (const row of rows) {
    const scope = row.branchCode ?? "GLOBAL";
    content[scope] = content[scope] ?? {};
    content[scope][row.key] = row.value;
  }

  res.json({ content });
}

/** GET /api/admin/content — same shape, for the editor to prefill its form. */
export const listContent = getPublicContent;

const upsertSchema = z.object({
  key: z.enum(CONTENT_KEYS),
  branch: branchCodeSchema.nullable().optional(),
  value: z.string().trim().max(5000),
});

/**
 * PUT /api/admin/content — upsert a single (key, branch) content value.
 *
 * Not a `prisma.siteContent.upsert()` on purpose: `@@unique([key, branchCode])`
 * has a nullable member (branchCode is null for site-wide values), and SQL
 * unique indexes treat every NULL as distinct from every other NULL — so
 * MySQL wouldn't actually stop two GLOBAL rows for the same key existing,
 * and Prisma's generated compound-key type correctly refuses to accept null
 * there at all (the type error this sidesteps). Doing the
 * find-then-update-or-create manually gets single-row-per-scope behaviour
 * for GLOBAL keys too, not just branch-scoped ones.
 */
export async function upsertContent(req: Request, res: Response) {
  const input = upsertSchema.parse(req.body);
  const branchCode = input.branch ?? null;

  const existing = await prisma.siteContent.findFirst({ where: { key: input.key, branchCode } });

  const row = existing
    ? await prisma.siteContent.update({ where: { id: existing.id }, data: { value: input.value } })
    : await prisma.siteContent.create({ data: { key: input.key, branchCode, value: input.value } });

  res.json({ content: { key: row.key, branch: row.branchCode, value: row.value } });
}
