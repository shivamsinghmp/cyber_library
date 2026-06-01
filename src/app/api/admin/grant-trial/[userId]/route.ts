import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    const adminId = (session?.user as { id?: string })?.id;
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, isSuperAdmin: true },
    });
    if (!admin || (admin.role !== "ADMIN" && admin.role !== "EMPLOYEE" && !admin.isSuperAdmin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await params;
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Cancel any existing active TRIAL subscription first
    await prisma.userSubscription.updateMany({
      where: { userId, planType: "TRIAL", status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 7);

    await prisma.$transaction([
      prisma.userSubscription.create({
        data: {
          userId,
          planType: "TRIAL",
          startDate: now,
          endDate,
          status: "ACTIVE",
          amountPaid: 0,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { trialUsed: true },
      }),
    ]);

    return NextResponse.json({ success: true, endDate: endDate.toISOString() });
  } catch (e) {
    console.error("POST /api/admin/grant-trial:", e);
    return NextResponse.json({ error: "Failed to grant trial" }, { status: 500 });
  }
}
