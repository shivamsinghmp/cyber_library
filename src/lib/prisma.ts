import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const isBuild =
  process.env.npm_lifecycle_event === "build" || process.env.PRISMA_QUIET === "1";

// During `next build`, multiple worker processes each create a PrismaClient.
// Cap the pool to 2 connections per process so workers don't exhaust the DB limit.
function buildDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || !isBuild) return url;
  try {
    const u = new URL(url);
    if (!u.searchParams.has("connection_limit")) {
      u.searchParams.set("connection_limit", "2");
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
