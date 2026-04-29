import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

/** GET: List all referrers with their referred count and referred users (admin only). */
export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { searchParams } = new URL(request.url);
    const includeReferred = searchParams.get("includeReferred") === "true";

    const usersWithReferrals = await prisma.user.findMany({
      where: {
        deletedAt: null,
        referrals: { some: {} },
      },
      select: {
        id: true,
        name: true,
        email: true,
        referralCode: true,
        role: true,
        _count: { select: { referrals: true } },
        ...(includeReferred
          ? {
              referrals: {
                where: { deletedAt: null },
                select: {
                  id: true,
                  name: true,
                  email: true,
                  createdAt: true,
                  referralRewarded: true,
                },
                orderBy: { createdAt: "desc" },
              },
            }
          : {}),
      },
    });

    const list = usersWithReferrals
      .map((u) => ({
        referrerId: u.id,
        referrerName: u.name ?? u.email,
        referrerEmail: u.email,
        referralCode: u.referralCode,
        role: u.role,
        referredCount: u._count.referrals,
        referredUsers: "referrals" in u ? u.referrals : undefined,
      }))
      .sort((a, b) => b.referredCount - a.referredCount);

    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/admin/referrals:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
