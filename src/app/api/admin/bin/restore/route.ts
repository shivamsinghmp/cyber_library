import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/api-helpers";

const bodySchema = z.object({ userId: z.string().min(1) });

/** POST: Restore a deleted user from bin (admin only) */
export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user: adminUser } = auth;

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const { userId } = parsed.data;
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: { not: null } },
    });
    if (!user) {
      return NextResponse.json({ error: "Item not found in bin or already restored." }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/admin/bin/restore:", e);
    return NextResponse.json({ error: "Failed to restore." }, { status: 500 });
  }
}
