import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/api-helpers";

const markPaidSchema = z.object({ status: z.enum(["PENDING", "PAID"]) });

/** PATCH: Mark winner as PAID (admin) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    // auth verified (user identity confirmed by requireSuperAdmin/requireAdmin)
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = markPaidSchema.safeParse(body);
    const status = parsed.success ? parsed.data.status : "PAID";
    const winner = await prisma.rewardWinner.update({
      where: { id },
      data: {
        status,
        ...(status === "PAID" ? { paidAt: new Date() } : { paidAt: null }),
      },
      include: {
        user: { select: { name: true, email: true } },
        reward: { select: { name: true, amount: true } },
      },
    });
    return NextResponse.json(winner);
  } catch (e) {
    console.error("PATCH /api/admin/rewards/winners/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
