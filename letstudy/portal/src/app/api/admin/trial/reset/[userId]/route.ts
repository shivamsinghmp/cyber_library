import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";
import { logTrialEvent } from "@/lib/trial-logger";
import { z } from "zod";

const schema = z.object({
  reason: z.string().min(3).max(300),
});

/**
 * POST /api/admin/trial/reset/[userId]
 * SuperAdmin only. Resets a user's trial so they can activate again.
 * Cancels any existing TRIAL subscription, sets trialUsed = false.
 * Requires a reason — saved in TrialLog for audit.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const adminId = auth.user.id;

    const { userId } = await params;
    const body   = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "reason is required (min 3 chars)" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true, name: true, trialUsed: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Cancel any existing TRIAL subscription
    await prisma.userSubscription.updateMany({
      where: { userId, planType: "TRIAL" },
      data:  { status: "CANCELLED" },
    });

    // Reset the trial flag
    await prisma.user.update({
      where: { id: userId },
      data:  { trialUsed: false },
    });

    // Audit log
    logTrialEvent({
      userId,
      event:  "admin_reset",
      detail: `Reset by admin ${adminId}. Reason: ${parsed.data.reason}`,
    });

    return NextResponse.json({ ok: true, message: `Trial reset for ${user.name ?? userId}` });
  } catch (e) {
    console.error("POST /api/admin/trial/reset/[userId]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
