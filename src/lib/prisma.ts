import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const quietDuringBuild =
  process.env.npm_lifecycle_event === "build" || process.env.PRISMA_QUIET === "1";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: quietDuringBuild
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
