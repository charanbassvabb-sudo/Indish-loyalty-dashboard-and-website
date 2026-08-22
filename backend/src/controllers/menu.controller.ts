import type { Request, Response } from "express";
import { z } from "zod";
import path from "path";
import fs from "fs/promises";
import { Prisma, type MenuItem } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { stringParam } from "../utils/params";
import { branchCodeSchema } from "../validators/reservation.validator";
import { menuItemBodySchema, updateMenuItemBodySchema } from "../validators/menu.validator";
import { MENU_IMAGE_DIR } from "../middleware/menuImageUpload";

function imageUrlFor(item: MenuItem): string | undefined {
  return item.imagePath ? `/api/uploads/menu-images/${item.imagePath}` : undefined;
}

/** Best-effort delete — a missing file (already gone, or never existed) isn't an error here. */
async function deleteImageFile(imagePath: string | null) {
  if (!imagePath) return;
  try {
    await fs.unlink(path.join(MENU_IMAGE_DIR, imagePath));
  } catch {
    // already gone — fine
  }
}

type PriceVariant = { label: string; price: number };

function serializePriceVariants(item: MenuItem): PriceVariant[] | undefined {
  const variants = item.priceVariants as PriceVariant[] | null;
  return variants?.length ? variants : undefined;
}

function serializePublicItem(item: MenuItem) {
  return {
    id: String(item.id),
    name: item.name,
    description: item.description,
    price: Number(item.price),
    priceLabel: item.priceLabel ?? undefined,
    veg: item.veg,
    badges: (item.badges as string[] | null) ?? [],
    priceVariants: serializePriceVariants(item),
    imageUrl: imageUrlFor(item),
  };
}

function serializeAdminItem(item: MenuItem) {
  return {
    id: item.id,
    categoryId: item.categoryId,
    branch: item.branchCode,
    name: item.name,
    description: item.description,
    price: Number(item.price),
    priceLabel: item.priceLabel ?? undefined,
    veg: item.veg,
    badges: (item.badges as string[] | null) ?? [],
    priceVariants: serializePriceVariants(item),
    imageUrl: imageUrlFor(item),
  };
}

/**
 * GET /api/menu?branch=LUSAKA — public. Categories are only included once
 * filtered down to that branch's items (branchCode null = shown everywhere,
 * matching how the menu has always worked) — an empty category (e.g.
 * "Chef's Specials" with nothing added yet) simply doesn't appear, so the
 * public tab bar never shows a dead tab.
 */
export async function getPublicMenu(req: Request, res: Response) {
  const { branch } = z.object({ branch: branchCodeSchema }).parse(req.query);

  const categories = await prisma.menuCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { OR: [{ branchCode: null }, { branchCode: branch }] },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const nonEmpty = categories
    .filter((c) => c.items.length > 0)
    .map((c) => ({ id: c.slug, label: c.label, items: c.items.map(serializePublicItem) }));

  res.json({ categories: nonEmpty });
}

/** GET /api/admin/menu — everything, including empty categories and items scoped to either branch, for the dashboard. */
export async function listMenuAdmin(_req: Request, res: Response) {
  const categories = await prisma.menuCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  res.json({
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      label: c.label,
      items: c.items.map(serializeAdminItem),
    })),
  });
}

/** POST /api/admin/menu/items */
export async function createMenuItem(req: Request, res: Response) {
  const input = menuItemBodySchema.parse(req.body);

  const category = await prisma.menuCategory.findUnique({ where: { id: input.categoryId } });
  if (!category) throw ApiError.badRequest("That category doesn't exist");

  const maxSort = await prisma.menuItem.aggregate({
    where: { categoryId: input.categoryId },
    _max: { sortOrder: true },
  });

  const item = await prisma.menuItem.create({
    data: {
      categoryId: input.categoryId,
      branchCode: input.branch ?? null,
      name: input.name,
      description: input.description,
      price: input.price,
      priceLabel: input.priceLabel ?? null,
      veg: input.veg,
      badges: input.badges.length ? input.badges : Prisma.JsonNull,
      priceVariants: input.priceVariants?.length ? input.priceVariants : Prisma.JsonNull,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  res.status(201).json({ item: serializeAdminItem(item) });
}

/** PATCH /api/admin/menu/items/:id — every field is optional; only what's sent is changed. */
export async function updateMenuItem(req: Request, res: Response) {
  const id = Number(stringParam(req, "id"));
  if (!Number.isInteger(id)) throw ApiError.badRequest("Invalid item id");

  const input = updateMenuItemBodySchema.parse(req.body);

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Menu item not found");

  if (input.categoryId !== undefined) {
    const category = await prisma.menuCategory.findUnique({ where: { id: input.categoryId } });
    if (!category) throw ApiError.badRequest("That category doesn't exist");
  }

  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      ...(input.branch !== undefined && { branchCode: input.branch }),
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.priceLabel !== undefined && { priceLabel: input.priceLabel }),
      ...(input.veg !== undefined && { veg: input.veg }),
      ...(input.badges !== undefined && { badges: input.badges.length ? input.badges : Prisma.JsonNull }),
      ...(input.priceVariants !== undefined && {
        priceVariants: input.priceVariants?.length ? input.priceVariants : Prisma.JsonNull,
      }),
    },
  });

  res.json({ item: serializeAdminItem(item) });
}

/** DELETE /api/admin/menu/items/:id — a real delete, not a soft flag: "remove it any time" per spec. */
export async function deleteMenuItem(req: Request, res: Response) {
  const id = Number(stringParam(req, "id"));
  if (!Number.isInteger(id)) throw ApiError.badRequest("Invalid item id");

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Menu item not found");

  await prisma.menuItem.delete({ where: { id } });
  await deleteImageFile(existing.imagePath);
  res.status(204).send();
}

/**
 * POST /api/admin/menu/items/:id/image — multipart upload (field name
 * "image"). Replaces any existing photo on this item; the old file is
 * deleted once the new one is safely saved and the DB row updated.
 */
export async function uploadMenuItemImage(req: Request, res: Response) {
  const id = Number(stringParam(req, "id"));
  if (!Number.isInteger(id)) throw ApiError.badRequest("Invalid item id");
  if (!req.file) throw ApiError.badRequest("No image file uploaded");

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) {
    await deleteImageFile(req.file.filename);
    throw ApiError.notFound("Menu item not found");
  }

  const item = await prisma.menuItem.update({
    where: { id },
    data: { imagePath: req.file.filename },
  });

  await deleteImageFile(existing.imagePath);
  res.json({ item: serializeAdminItem(item) });
}

/** DELETE /api/admin/menu/items/:id/image — removes the photo, leaves everything else on the item untouched. */
export async function removeMenuItemImage(req: Request, res: Response) {
  const id = Number(stringParam(req, "id"));
  if (!Number.isInteger(id)) throw ApiError.badRequest("Invalid item id");

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Menu item not found");
  if (!existing.imagePath) {
    res.json({ item: serializeAdminItem(existing) });
    return;
  }

  const item = await prisma.menuItem.update({ where: { id }, data: { imagePath: null } });
  await deleteImageFile(existing.imagePath);
  res.json({ item: serializeAdminItem(item) });
}
