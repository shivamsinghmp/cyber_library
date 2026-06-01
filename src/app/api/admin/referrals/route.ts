import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

/** GET: List all referrers with stats and optional search (admin only).
 *  Query params:
 *   q              — search by name / email / studentId (optional)
 *   includeReferred — include referred users list (default: false)
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const includeReferred = searchParams.get("includeReferred") === "true";

    const where = {
      deletedAt: null,
      referrals: { some: {} },
      ...(q
        ? {
            OR: [
              { name:      { contains: q, mode: "insensitive" as const } },
              { email:     { contains: q, mode: "insensitive" as const } },
              { studentId: { contains: q, mode: "insensitive" as const } },
              { referralCode: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const usersWithReferrals = await prisma.user.findMany({
      where,
      take: 500,
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        referralCode: true,
        role: true,
        _count: { select: { referrals: true } },
        referrals: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            referralRewarded: true,
            deletedAt: true,
          },
          orderBy: { createdAt: "asc" },
          ...(includeReferred ? {} : { take: 0 }),
        },
      },
    });

    const list = usersWithReferrals
      .map((u) => {
        const active   = u.referrals.filter(r => !r.deletedAt).length;
        const inactive = u.referrals.filter(r =>  r.deletedAt).length;
        const sorted   = [...u.referrals].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return {
          referrerId:      u.id,
          referrerName:    u.name ?? u.email,
          referrerEmail:   u.email,
          studentId:       u.studentId ?? null,
          referralCode:    u.referralCode,
          role:            u.role,
          referredCount:   u._count.referrals,
          activeCount:     active,
          inactiveCount:   inactive,
          firstReferralAt: sorted[0]?.createdAt ?? null,
          lastReferralAt:  sorted[sorted.length - 1]?.createdAt ?? null,
          ...(includeReferred
            ? {
                referredUsers: u.referrals.map(r => ({
                  id:       r.id,
                  name:     r.name,
                  email:    r.email,
                  joinedAt: r.createdAt,
                  rewarded: r.referralRewarded,
                  active:   !r.deletedAt,
                })),
              }
            : {}),
        };
      })
      .sort((a, b) => b.referredCount - a.referredCount);

    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/admin/referrals:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
