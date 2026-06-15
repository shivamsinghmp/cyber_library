import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { earningIds?: string[] };
    const { earningIds } = body;

    // Verify influencer exists
    const influencer = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!influencer || influencer.role !== "INFLUENCER") {
      return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
    }

    const result = await prisma.influencerEarning.updateMany({
      where: {
        influencerId: id,
        status: "PENDING",
        ...(earningIds && earningIds.length > 0 ? { id: { in: earningIds } } : {}),
      },
      data: { status: "PAID", paidAt: new Date() },
    });

    return NextResponse.json({ updated: result.count });
  } catch (e) {
    console.error("POST /api/admin/influencers/[id]/pay:", e);
    return NextResponse.json({ error: "Failed to mark earnings as paid" }, { status: 500 });
  }
}
