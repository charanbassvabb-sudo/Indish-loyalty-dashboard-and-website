import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { sendCateringEnquiryNotifications } from "../services/whatsapp.service";
import {
  createEnquirySchema,
  createPackageSchema,
  updatePackageSchema,
  createCategorySchema,
  updateCategorySchema,
  createItemSchema,
  updateItemSchema,
  updateEnquirySchema,
  listEnquiriesQuerySchema,
} from "../validators/catering.validator";

const PACKAGE_TREE_INCLUDE = {
  categories: {
    orderBy: { sortOrder: "asc" as const },
    include: { items: { orderBy: { sortOrder: "asc" as const } } },
  },
};

// --- Public ---

/** GET /api/catering/packages — the four tiers with their subcategories/items, active only, for the public catering page. */
export async function getCateringPackages(_req: Request, res: Response) {
  const packages = await prisma.cateringPackage.findMany({
    where: { active: true },
    include: PACKAGE_TREE_INCLUDE,
    orderBy: { sortOrder: "asc" },
  });

  res.json({
    packages: packages.map((p) => ({
      id: p.id,
      tier: p.tier,
      name: p.name,
      description: p.description,
      priceNote: p.priceNote,
      categories: p.categories.map((c) => ({
        id: c.id,
        name: c.name,
        items: c.items.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity })),
      })),
    })),
  });
}

/** POST /api/catering/enquiries — public. Creates the enquiry and pings that branch's staff — no payment, no basket. */
export async function createCateringEnquiry(req: Request, res: Response) {
  const input = createEnquirySchema.parse(req.body);

  const branch = await prisma.branch.findUnique({ where: { code: input.branch } });
  if (!branch) throw ApiError.badRequest("Unknown branch");

  let pkg = null;
  if (input.packageId) {
    pkg = await prisma.cateringPackage.findUnique({ where: { id: input.packageId } });
    if (!pkg) throw ApiError.badRequest("Unknown catering package");
  }

  const enquiry = await prisma.cateringEnquiry.create({
    data: {
      branchId: branch.id,
      packageId: pkg?.id ?? null,
      customerName: input.customerName,
      phone: input.phone,
      eventDate: new Date(`${input.eventDate}T00:00:00Z`),
      guestCount: input.guestCount,
      notes: input.notes || null,
      status: "NEW",
    },
  });

  sendCateringEnquiryNotifications({
    branchName: branch.name,
    branchCode: branch.code,
    packageName: pkg?.name ?? null,
    customerName: input.customerName,
    phone: input.phone,
    eventDate: input.eventDate,
    guestCount: input.guestCount,
    notes: input.notes || null,
  }).catch((err) => console.error("[whatsapp] catering enquiry notification failed", err));

  res.status(201).json({ id: enquiry.id, status: enquiry.status });
}

// --- Admin: catalog management ---

/** GET /api/admin/catering/packages — full tree, including inactive packages (unlike the public endpoint). */
export async function listCateringPackagesAdmin(_req: Request, res: Response) {
  const packages = await prisma.cateringPackage.findMany({
    include: PACKAGE_TREE_INCLUDE,
    orderBy: { sortOrder: "asc" },
  });
  res.json({ packages });
}

export async function createCateringPackage(req: Request, res: Response) {
  const input = createPackageSchema.parse(req.body);
  const existing = await prisma.cateringPackage.findUnique({ where: { tier: input.tier } });
  if (existing) throw ApiError.conflict(`A ${input.tier} package already exists`);

  const pkg = await prisma.cateringPackage.create({
    data: {
      tier: input.tier,
      name: input.name,
      description: input.description || null,
      priceNote: input.priceNote || null,
      active: input.active ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
  });
  res.status(201).json({ package: pkg });
}

export async function updateCateringPackage(req: Request, res: Response) {
  const id = Number(req.params.id);
  const input = updatePackageSchema.parse(req.body);

  const existing = await prisma.cateringPackage.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Package not found");

  const pkg = await prisma.cateringPackage.update({
    where: { id },
    data: {
      ...(input.tier !== undefined ? { tier: input.tier } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.priceNote !== undefined ? { priceNote: input.priceNote || null } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });
  res.json({ package: pkg });
}

export async function deleteCateringPackage(req: Request, res: Response) {
  const id = Number(req.params.id);
  const existing = await prisma.cateringPackage.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Package not found");
  // Categories/items cascade (onDelete: Cascade in schema.prisma); enquiries
  // that reference this package have packageId set to null (onDelete: SetNull)
  // rather than being deleted — an enquiry is a real customer contact record.
  await prisma.cateringPackage.delete({ where: { id } });
  res.status(204).end();
}

export async function createCateringCategory(req: Request, res: Response) {
  const input = createCategorySchema.parse(req.body);
  const pkg = await prisma.cateringPackage.findUnique({ where: { id: input.packageId } });
  if (!pkg) throw ApiError.badRequest("Unknown package");

  const existing = await prisma.cateringCategory.findUnique({
    where: { packageId_name: { packageId: input.packageId, name: input.name } },
  });
  if (existing) throw ApiError.conflict(`"${input.name}" already exists in this package`);

  const category = await prisma.cateringCategory.create({
    data: { packageId: input.packageId, name: input.name, sortOrder: input.sortOrder ?? 0 },
  });
  res.status(201).json({ category });
}

export async function updateCateringCategory(req: Request, res: Response) {
  const id = Number(req.params.id);
  const input = updateCategorySchema.parse(req.body);

  const existing = await prisma.cateringCategory.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Category not found");

  const category = await prisma.cateringCategory.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });
  res.json({ category });
}

export async function deleteCateringCategory(req: Request, res: Response) {
  const id = Number(req.params.id);
  const existing = await prisma.cateringCategory.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Category not found");
  await prisma.cateringCategory.delete({ where: { id } }); // items cascade
  res.status(204).end();
}

export async function createCateringItem(req: Request, res: Response) {
  const input = createItemSchema.parse(req.body);
  const category = await prisma.cateringCategory.findUnique({ where: { id: input.categoryId } });
  if (!category) throw ApiError.badRequest("Unknown category");

  const item = await prisma.cateringItem.create({
    data: {
      categoryId: input.categoryId,
      name: input.name,
      quantity: input.quantity,
      sortOrder: input.sortOrder ?? 0,
    },
  });
  res.status(201).json({ item });
}

export async function updateCateringItem(req: Request, res: Response) {
  const id = Number(req.params.id);
  const input = updateItemSchema.parse(req.body);

  const existing = await prisma.cateringItem.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Item not found");

  const item = await prisma.cateringItem.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });
  res.json({ item });
}

export async function deleteCateringItem(req: Request, res: Response) {
  const id = Number(req.params.id);
  const existing = await prisma.cateringItem.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Item not found");
  await prisma.cateringItem.delete({ where: { id } });
  res.status(204).end();
}

// --- Admin: enquiries ---

/** GET /api/admin/catering/enquiries — filterable, searchable, paginated. Mirrors listTakeawayOrders. */
export async function listCateringEnquiries(req: Request, res: Response) {
  const query = listEnquiriesQuerySchema.parse(req.query);

  const where: Prisma.CateringEnquiryWhereInput = {};
  if (query.branch) where.branch = { code: query.branch };
  if (query.status) where.status = query.status;
  if (query.search) {
    where.OR = [{ customerName: { contains: query.search } }, { phone: { contains: query.search } }];
  }

  const [total, enquiries] = await Promise.all([
    prisma.cateringEnquiry.count({ where }),
    prisma.cateringEnquiry.findMany({
      where,
      include: { branch: true, package: true },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  res.json({ total, page: query.page, pageSize: query.pageSize, enquiries });
}

export async function updateCateringEnquiry(req: Request, res: Response) {
  const id = Number(req.params.id);
  const input = updateEnquirySchema.parse(req.body);

  const existing = await prisma.cateringEnquiry.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Enquiry not found");

  const enquiry = await prisma.cateringEnquiry.update({
    where: { id },
    data: { status: input.status },
    include: { branch: true, package: true },
  });
  res.json({ enquiry });
}
