// One-off cleanup: removes the demo customers that `npm run db:setup`
// (without --no-demo) inserts, so a database that was seeded with demo data
// can be made production-ready without wiping real customers.
//
// It only ever deletes rows matching the exact demo emails below, so it's
// safe to run even if you already have real customers in the database.
//
// Usage:
//   node scripts/remove-demo-data.mjs

import { readFileSync } from "node:fs";
import "dotenv/config";
import mysql from "mysql2/promise";

const DEMO_EMAILS = ["chanda@example.com", "bwalya@example.com", "mutale@example.com"];

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
    ssl: useSsl ? (ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true }) : undefined,
  });

  const [rows] = await connection.query(
    `SELECT id, full_name, email FROM customers WHERE email IN (?)`,
    [DEMO_EMAILS],
  );

  if (rows.length === 0) {
    console.log("No demo customers found — nothing to remove.");
  } else {
    console.log(`Removing ${rows.length} demo customer(s):`);
    for (const r of rows) console.log(`  - ${r.full_name} <${r.email}>`);
    // visits.customer_id has ON DELETE CASCADE, so their visit history goes with them.
    await connection.query(`DELETE FROM customers WHERE email IN (?)`, [DEMO_EMAILS]);
    console.log("✓ Demo customers removed.");
  }

  await connection.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
