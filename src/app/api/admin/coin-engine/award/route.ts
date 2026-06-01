import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { awardCoins, deductCoins } from "@/lib/coins";
import { requireSuperAdmin } from "@/lib/api-helpers";
import { z } from "zod";

const bodySchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().refine((n) => n !== 0, "Amount cannot be zero"),
  reason: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }

    const { userId, amount, reason } = parsed.data;
    const adminId = auth.user.id;

    const [targetUser, adminUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, profile: { select: { coinBalance: true, fullName: true } } },
      }),
      prisma.user.findUnique({
        where: { id: adminId },
        select: { name: true, profile: { select: { fullName: true } } },
      }),
    ]);
    if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const adminName = adminUser?.profile?.fullName || adminUser?.name || "Admin";
    const ip = (request.headers.get("x-forwarded-for")?.split(",")[0].trim()
      ?? request.headers.get("x-real-ip")
      ?? undefined);

    const systemReason = `ADMIN_MANUAL:${reason}`;

    if (amount > 0) {
      await awardCoins(userId, amount, systemReason, undefined, adminId, {
        sourceCategory: "admin_grant",
        sourceLabel:    `Admin grant: ${reason}`,
        referenceType:  "admin",
        referenceId:    adminId,
        referenceName:  adminName,
        deviceType:     "admin_panel",
        ipAddress:      ip,
        adminName,
        adminReason:    reason,
      });
    } else {
      const ok = await deductCoins(userId, Math.abs(amount), systemReason, adminId, {
        sourceCategory: "admin_deduct",
        sourceLabel:    `Admin deduct: ${reason}`,
        referenceType:  "admin",
        referenceId:    adminId,
        referenceName:  adminName,
        deviceType:     "admin_panel",
        ipAddress:      ip,
        adminName,
        adminReason:    reason,
      });
      if (!ok) {
        return NextResponse.json({ error: "Insufficient coin balance to deduct" }, { status: 400 });
      }
    }

    const updated = await prisma.profile.findUnique({
      where: { userId },
      select: { coinBalance: true },
    });

    return NextResponse.json({
      success: true,
      newBalance: updated?.coinBalance ?? 0,
      awarded: amount,
    });
  } catch (e) {
    console.error("POST /api/admin/coin-engine/award:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
