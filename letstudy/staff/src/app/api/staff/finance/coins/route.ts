import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkStaffModuleApi } from "@/lib/permissions";

/** GET only — read-only coin balance + passbook lookup. No award/deduct
 *  endpoints here (those stay admin-only in portal's coin-engine). */
export async function GET(request: Request) {
  try {
    const auth = await checkStaffModuleApi("FINANCE");
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return NextResponse.json({ students: [] });

    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        deletedAt: null,
        OR: [
          { studentId: { contains: q, mode: "insensitive" } },
          { id: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { profile: { fullName: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        studentId: true,
        name: true,
        email: true,
        profile: { select: { fullName: true, coinBalance: true, phone: true } },
      },
      take: 6,
      orderBy: { createdAt: "desc" },
    });

    // If exactly one match, also return their recent coin passbook entries.
    let passbook: unknown[] = [];
    if (students.length === 1) {
      passbook = await prisma.studyCoinLog.findMany({
        where: { userId: students[0].id },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }

    return NextResponse.json({ students, passbook });
  } catch (e) {
    console.error("GET /api/staff/finance/coins:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
