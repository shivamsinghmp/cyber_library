import { prisma } from "@/lib/prisma";
import { randomInt } from "crypto";

/**
 * Generate unique student ID: VL-YYYY-MM-XXXXX (e.g. VL-2026-03-47291)
 * Uses cryptographically secure random integers to prevent prediction and collision attacks.
 */
export async function generateStudentId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `VL-${year}-${month}-`;

  for (let attempt = 0; attempt < 10; attempt++) {
    const digits = String(randomInt(0, 100000)).padStart(5, "0");
    const candidate = prefix + digits;

    const existing = await prisma.user.findUnique({
      where: { studentId: candidate },
    });
    if (!existing) return candidate;
  }

  const fallback = prefix + String(randomInt(0, 100000)).padStart(5, "0");
  return fallback;
}
