import "dotenv/config";
import { readFileSync } from "node:fs";

import mysql from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var __indishPool: mysql.Pool | undefined;
}

function loadCa(): string | undefined {
  // Preferred: a path to a .pem file (avoids .env multi-line quoting pain).
  const caPath = process.env.DB_SSL_CA_PATH?.trim();
  if (caPath) return readFileSync(caPath, "utf8");

  // Fallback: the cert pasted directly into the env var.
  const inline = process.env.DB_SSL_CA?.trim();
  if (inline) return inline;

  return undefined;
}

function createPool(): mysql.Pool {
  const useSsl = process.env.DB_SSL === "true";
  // Aiven (and most managed MySQL hosts) issue a private CA — pin it here so
  // TLS actually verifies instead of just trusting anything.
  const ca = useSsl ? loadCa() : undefined;

  return mysql.createPool({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "indish_loyalty",
    waitForConnections: true,
    connectionLimit: 5,
    maxIdle: 5,
    idleTimeout: 60_000,
    dateStrings: true,
    ssl: useSsl ? (ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true }) : undefined,
  });
}

// Reused across hot reloads in dev and across warm invocations in serverless
// so we don't exhaust connections on every request.
export const pool: mysql.Pool = globalThis.__indishPool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  globalThis.__indishPool = pool;
}
