import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (q.length < 2) return NextResponse.json([]);

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
        profile: {
          select: {
            fullName: true,
            coinBalance: true,
            phone: true,
          },
        },
      },
      take: 6,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(students);
  } catch (e) {
    console.error("GET /api/admin/coin-engine/user-lookup:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
