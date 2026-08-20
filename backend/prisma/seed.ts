import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import menuSeedData from "./menu-seed-data.json";

const prisma = new PrismaClient();

interface SeedMenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  badges?: string[];
  veg?: boolean;
}

interface SeedMenuCategory {
  id: string;
  label: string;
  items: SeedMenuItem[];
}

/**
 * One-time port of the site's original static menu (frontend/src/data/menu.ts,
 * captured to menu-seed-data.json — see that file's own note) into the DB,
 * plus an empty "Chef's Specials" category ready for admin use. Only runs
 * when menu_items is empty, so re-running `prisma db seed` on an existing,
 * admin-edited database is always a safe no-op here.
 */
async function seedMenu() {
  const existingItemCount = await prisma.menuItem.count();
  if (existingItemCount > 0) {
    console.log("Menu already has items — skipping menu seed.");
    return;
  }

  // Sorts first (sortOrder -1) so a special is the first tab guests see
  // whenever one exists; MenuSection hides empty category tabs, so this
  // stays invisible on the public site until an admin actually adds one.
  const specialsCategory = await prisma.menuCategory.upsert({
    where: { slug: "chefs-specials" },
    update: {},
    create: { slug: "chefs-specials", label: "Chef's Specials", sortOrder: -1 },
  });
  console.log(`Seeded category: ${specialsCategory.label} (empty — ready for admin use)`);

  const categories = menuSeedData as SeedMenuCategory[];
  for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex++) {
    const cat = categories[categoryIndex]!;
    const category = await prisma.menuCategory.upsert({
      where: { slug: cat.id },
      update: {},
      create: { slug: cat.id, label: cat.label, sortOrder: categoryIndex },
    });

    await prisma.menuItem.createMany({
      data: cat.items.map((item, itemIndex) => ({
        categoryId: category.id,
        branchCode: null, // shared across both branches, matching the original static menu
        name: item.name,
        description: item.description,
        price: new Prisma.Decimal(item.price),
        veg: item.veg ?? false,
        badges: item.badges ?? Prisma.JsonNull,
        sortOrder: itemIndex,
      })),
    });
  }

  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);
  console.log(`Seeded ${categories.length} menu categories and ${totalItems} menu items.`);
}

async function main() {
  await prisma.branch.upsert({
    where: { code: "LUSAKA" },
    update: {},
    create: {
      code: "LUSAKA",
      name: "Indish — Lusaka",
      address: "EastPark Mall, Lusaka 10101",
      plusCode: "J84F+79 Lusaka",
      phone: "0976309999",
      allowsOutdoor: true,
    },
  });

  await prisma.branch.upsert({
    where: { code: "KITWE" },
    update: {},
    create: {
      code: "KITWE",
      name: "Indish — Kitwe",
      address: "Kitwe, Zambia",
      plusCode: "56R6+PJ Kitwe",
      phone: "0963240240",
      allowsOutdoor: false,
    },
  });

  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!seedAdminPassword) {
    console.warn(
      "SEED_ADMIN_PASSWORD not set — skipping default admin creation. " +
        "Set it in your environment and re-run `npx prisma db seed` to create one.",
    );
  } else {
    const passwordHash = await bcrypt.hash(seedAdminPassword, 12);
    await prisma.admin.upsert({
      where: { email: "owner@indishzambia.com" },
      update: {},
      create: {
        name: "Indish Owner",
        email: "owner@indishzambia.com",
        passwordHash,
        role: "OWNER",
      },
    });
    console.log("Seeded default admin: owner@indishzambia.com");
  }

  await seedMenu();

  console.log("Seed complete: Lusaka and Kitwe branches ready.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
