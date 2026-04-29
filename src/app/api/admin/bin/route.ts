import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

const BIN_DAYS = 30;

/** GET: List items in bin (deleted users). Purges items older than 30 days first. */
export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - BIN_DAYS);

    await prisma.user.deleteMany({
      where: { deletedAt: { not: null, lt: cutoff } },
    });

    const deleted = await prisma.user.findMany({
      where: { deletedAt: { not: null } },
      select: {
        id: true,
        studentId: true,
        name: true,
        email: true,
        goal: true,
        role: true,
        deletedAt: true,
        createdAt: true,
      },
      orderBy: { deletedAt: "desc" },
    });

    const items = deleted.map((u) => ({
      id: u.id,
      type: "USER" as const,
      studentId: u.studentId,
      name: u.name,
      email: u.email,
      goal: u.goal,
      role: u.role,
      deletedAt: u.deletedAt,
      createdAt: u.createdAt,
    }));

    return NextResponse.json(items);
  } catch (e) {
    console.error("GET /api/admin/bin:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
