import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

    const whereClause = q ? {
      OR: [
        { userId: { equals: q } },
        { user: { email: { contains: q, mode: "insensitive" as const } } },
        { user: { profile: { phone: { contains: q, mode: "insensitive" as const } } } },
        { user: { profile: { fullName: { contains: q, mode: "insensitive" as const } } } }
      ]
    } : {};

    const logs = await prisma.studyCoinLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { fullName: true, phone: true }
            }
          }
        }
      }
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("GET /api/admin/coin-engine/passbook:", error);
    return NextResponse.json({ error: "Failed to fetch passbook" }, { status: 500 });
  }
}
