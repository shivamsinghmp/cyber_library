import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

/** GET /api/admin/referrals/[userId] — full referral detail for one student */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        referralCode: true,
        role: true,
        createdAt: true,
        referrals: {
          select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
            createdAt: true,
            referralRewarded: true,
            deletedAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    return NextResponse.json({
      id:           user.id,
      name:         user.name,
      email:        user.email,
      studentId:    user.studentId,
      referralCode: user.referralCode,
      role:         user.role,
      joinedAt:     user.createdAt,
      totalReferrals:  user.referrals.length,
      activeReferrals: user.referrals.filter(r => !r.deletedAt).length,
      referrals: user.referrals.map(r => ({
        id:        r.id,
        name:      r.name,
        email:     r.email,
        studentId: r.studentId,
        joinedAt:  r.createdAt,
        rewarded:  r.referralRewarded,
        active:    !r.deletedAt,
      })),
    });
  } catch (e) {
    console.error("GET /api/admin/referrals/[userId]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
