import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({ userId: z.string().min(1) });

/** POST: Permanently delete a user from bin (admin only). Cascades related data per Prisma schema. */
export async function POST(request: Request) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const { userId } = parsed.data;

    // Ensure user is in bin (soft-deleted) before hard delete
    const existing = await prisma.user.findFirst({
      where: { id: userId, deletedAt: { not: null } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "User not found in bin or already removed." },
        { status: 404 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/admin/bin/delete:", e);
    return NextResponse.json({ error: "Failed to permanently delete user." }, { status: 500 });
  }
}

