// Sets up the database: runs schema.sql, creates default settings + reward
// options, creates a manager login, and (unless --no-demo is passed) adds a
// few demo customers/visits so the dashboard isn't empty on first run.
//
// Usage:
//   npm run db:setup            # schema + settings + admin account
//   npm run db:setup -- --no-demo

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import "dotenv/config";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const includeDemo = !process.argv.includes("--no-demo");

const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Amaka Phiri";

function loadCa() {
  const caPath = process.env.DB_SSL_CA_PATH?.trim();
  if (caPath) return readFileSync(caPath, "utf8");
  const inline = process.env.DB_SSL_CA?.trim();
  if (inline) return inline;
  return undefined;
}

async function main() {
  const useSsl = process.env.DB_SSL === "true";
  const ca = useSsl ? loadCa() : undefined;

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "indish_loyalty",
    multipleStatements: true,
    ssl: useSsl ? (ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true }) : undefined,
  });

  console.log("→ Creating schema...");
  const schema = readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf8");
  await connection.query(schema);

  console.log("→ Seeding default settings for both branches...");
  const branchSettings = [
    { branch: "LUSAKA", name: "Indish — Lusaka", prefix: "INDL" },
    { branch: "KITWE", name: "Indish — Kitwe", prefix: "INDK" },
  ];
  for (const b of branchSettings) {
    await connection.query(
      `INSERT INTO settings (branch, restaurant_name, loyalty_prefix, currency, enabled,
         minimum_spend, campaign_duration, required_visits, reward_visit)
       VALUES (?, ?, ?, 'K', 1, 500, 60, 6, 6)
       ON DUPLICATE KEY UPDATE branch = branch`,
      [b.branch, b.name, b.prefix],
    );

    const [existingOptions] = await connection.query(
      "SELECT COUNT(*) AS n FROM reward_options WHERE branch = ?",
      [b.branch],
    );
    if (existingOptions[0].n === 0) {
      const options = ["Free Dessert", "20% Off Next Visit", "Complimentary Cocktail", "Free Main Course"];
      const values = options.map((label, i) => [randomUUID(), b.branch, label, i]);
      await connection.query("INSERT INTO reward_options (id, branch, label, sort_order) VALUES ?", [
        values,
      ]);
    }
  }

  console.log(`→ Creating manager account "${ADMIN_USERNAME}"...`);
  const [existingStaff] = await connection.query("SELECT id FROM staff WHERE username = ?", [
    ADMIN_USERNAME,
  ]);
  if (existingStaff.length === 0) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await connection.query(
      `INSERT INTO staff (id, full_name, username, password_hash, role, active)
       VALUES (?, ?, ?, ?, 'manager', 1)`,
      [randomUUID(), ADMIN_NAME, ADMIN_USERNAME, passwordHash],
    );
    console.log(`   Login: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}  (change this after first login)`);
  } else {
    console.log("   Already exists, skipping.");
  }

  if (includeDemo) {
    const [existingCustomers] = await connection.query("SELECT COUNT(*) AS n FROM customers");
    if (existingCustomers[0].n === 0) {
      console.log("→ Adding demo customers...");
      const [[managerRow]] = await connection.query(
        "SELECT id, full_name FROM staff WHERE username = ?",
        [ADMIN_USERNAME],
      );
      const demo = [
        { branch: "LUSAKA", prefix: "INDL", name: "Chanda Mwansa", phone: "+260 971 234 567", email: "chanda@example.com", visits: 4 },
        { branch: "LUSAKA", prefix: "INDL", name: "Bwalya Tembo", phone: "+260 966 555 111", email: "bwalya@example.com", visits: 6, claimed: true },
        { branch: "KITWE", prefix: "INDK", name: "Mutale Banda", phone: "+260 977 888 222", email: "mutale@example.com", visits: 1 },
      ];
      for (const d of demo) {
        const id = randomUUID();
        const [[{ n }]] = await connection.query("SELECT COUNT(*) AS n FROM customers WHERE branch = ?", [
          d.branch,
        ]);
        const loyaltyId = `${d.prefix}${String(n + 1).padStart(6, "0")}`;
        const start = new Date(Date.now() - 10 * 86_400_000);
        const end = new Date(start.getTime() + 60 * 86_400_000);
        await connection.query(
          `INSERT INTO customers
            (id, branch, loyalty_id, full_name, phone, email, gender, notes, disabled,
             visit_count, reward_claimed, reward_type, campaign_start, campaign_end, campaign_duration)
           VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 0, ?, ?, ?, ?, ?, 60)`,
          [
            id,
            d.branch,
            loyaltyId,
            d.name,
            d.phone,
            d.email,
            d.visits,
            d.claimed ? 1 : 0,
            d.claimed ? "Free Dessert" : null,
            start.toISOString().slice(0, 10),
            end.toISOString().slice(0, 10),
          ],
        );
        for (let i = 0; i < d.visits; i++) {
          await connection.query(
            `INSERT INTO visits (id, customer_id, date, amount, staff_id, staff_name)
             VALUES (?, ?, DATE_ADD(?, INTERVAL ? DAY), ?, ?, ?)`,
            [
              randomUUID(),
              id,
              start.toISOString().slice(0, 10),
              i * 5,
              600 + i * 50,
              managerRow?.id ?? null,
              managerRow?.full_name ?? "Staff",
            ],
          );
        }
      }
    }
  }

  await connection.end();
  console.log("✓ Database ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
