import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSales } from "@/lib/api-helpers";

/** ADMIN + EMPLOYEE users, for the contact-assignment dropdown. */
export async function GET() {
  const auth = await requireSales();
  if (auth.error) return auth.error;

  try {
    const team = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "EMPLOYEE"] }, deletedAt: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ team });
  } catch (e) {
    console.error("GET /api/admin/team:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
