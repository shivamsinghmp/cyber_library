import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

/**
 * GET /api/admin/students/lookup?q=<search>
 * Quick student lookup for Grant Subscription modal.
 * Searches by internal id, studentId (VL-...), or exact email match.
 * Returns the first matching student with their active subscription status.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (q.length < 2) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { id: q },
          { studentId: { equals: q, mode: "insensitive" } },
          { email: { equals: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        role: true,
        userSubscriptions: {
          where: { status: "ACTIVE" },
          orderBy: { endDate: "desc" },
          take: 1,
          select: { planType: true, endDate: true },
        },
      },
    });

    if (!user) return NextResponse.json({ user: null });

    return NextResponse.json({
      user: {
        id:        user.id,
        name:      user.name,
        email:     user.email,
        studentId: user.studentId,
        role:      user.role,
        activeSub: user.userSubscriptions[0] ?? null,
      },
    });
  } catch (e) {
    console.error("GET /api/admin/students/lookup:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
