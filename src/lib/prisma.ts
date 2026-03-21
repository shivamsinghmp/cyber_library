import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/** During `next build`, avoid logging every failed query (e.g. missing tables before migrate). */
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
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
