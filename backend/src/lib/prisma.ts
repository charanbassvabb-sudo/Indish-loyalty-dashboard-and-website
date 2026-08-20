import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

// Reuse a single PrismaClient instance across hot reloads in development,
// and across requests always (Prisma manages its own connection pool).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
