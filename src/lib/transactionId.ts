import { prisma } from "@/lib/prisma";

/**
 * Generate unique transaction ID: TXN-YYYY-MM-XXXXX (e.g. TXN-2026-03-47291)
 */
export async function generateTransactionId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `TXN-${year}-${month}-`;

  for (let attempt = 0; attempt < 10; attempt++) {
    const digits = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
    const candidate = prefix + digits;

    const existing = await prisma.transaction.findUnique({
      where: { transactionId: candidate },
    });
    if (!existing) return candidate;
  }

  return prefix + String(Date.now() % 100000).padStart(5, "0");
}
