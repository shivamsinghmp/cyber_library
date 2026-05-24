import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const isBuild =
  process.env.npm_lifecycle_event === "build" || process.env.PRISMA_QUIET === "1";

// Cap Prisma's connection pool so that 3 PM2 cluster workers (each with their own
// PrismaClient) don't exhaust DigitalOcean PG's max_connections (≈25).
// Build: 2 per process; runtime: 5 per worker (5×3 = 15 total, leaves room for DO monitoring).
function buildDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!u.searchParams.has("connection_limit")) {
      u.searchParams.set("connection_limit", isBuild ? "2" : "5");
    }
    if (!u.searchParams.has("pool_timeout")) {
      u.searchParams.set("pool_timeout", "10");
    }
    return u.toString();
  } catch {
    return url;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: buildDatabaseUrl() } },
    log: isBuild
      ? []
      : process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    // 10 s query timeout — prevents slow queries from hanging serverless functions.
    transactionOptions: {
      timeout: 10_000,
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
