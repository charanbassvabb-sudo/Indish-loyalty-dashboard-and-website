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

const CATERING_TIERS: { tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM"; name: string; sortOrder: number }[] = [
  { tier: "BRONZE", name: "Bronze Package", sortOrder: 0 },
  { tier: "SILVER", name: "Silver Package", sortOrder: 1 },
  { tier: "GOLD", name: "Gold Package", sortOrder: 2 },
  { tier: "PLATINUM", name: "Platinum Package", sortOrder: 3 },
];

// Every tier gets the same base subcategory scaffold; Silver/Gold/Platinum
// additionally get "Additional Items" per the client's spec. Items
// themselves are left empty — admin fills those in via the dashboard.
const BASE_CATEGORIES = ["Starters", "Main Course", "Dal", "Rice", "Roti"];

/**
 * Idempotent — upserts the 4 fixed tiers and their subcategory scaffold by
 * unique key (tier / [packageId, name]), so re-running this on a database an
 * admin has already customized never overwrites their edits, just fills in
 * anything still missing.
 */
async function seedCatering() {
  for (const t of CATERING_TIERS) {
    const pkg = await prisma.cateringPackage.upsert({
      where: { tier: t.tier },
      update: {},
      create: { tier: t.tier, name: t.name, sortOrder: t.sortOrder },
    });

    const categories = t.tier === "BRONZE" ? BASE_CATEGORIES : [...BASE_CATEGORIES, "Additional Items"];
    for (let i = 0; i < categories.length; i++) {
      await prisma.cateringCategory.upsert({
        where: { packageId_name: { packageId: pkg.id, name: categories[i]! } },
        update: {},
        create: { packageId: pkg.id, name: categories[i]!, sortOrder: i },
      });
    }
  }
  console.log("Seeded catering packages: Bronze, Silver, Gold, Platinum (with their subcategory scaffold).");
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
  const seedAdminUsername = process.env.SEED_ADMIN_USERNAME ?? "admin";
  if (!seedAdminPassword) {
    console.warn(
      "SEED_ADMIN_PASSWORD not set — skipping default admin creation. " +
        "Set it in your environment and re-run `npx prisma db seed` to create one.",
    );
  } else {
    const passwordHash = await bcrypt.hash(seedAdminPassword, 12);
    await prisma.admin.upsert({
      where: { username: seedAdminUsername },
      update: {},
      create: {
        name: "Indish Owner",
        username: seedAdminUsername,
        passwordHash,
        role: "OWNER",
      },
    });
    console.log(`Seeded default admin: ${seedAdminUsername}`);
  }

  await seedMenu();
  await seedCatering();

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
