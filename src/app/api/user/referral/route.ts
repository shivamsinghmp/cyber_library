import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateStudentReferralCode } from "@/lib/referral";
import { headers } from "next/headers";
import { requireUser } from "@/lib/api-helpers";

async function getBaseUrl(): Promise<string> {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  const h = await headers();
  const host = h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "https://cyberlib.in";
}

export async function GET() {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;
    const userId = authResult.user.id;

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    const referredUsers = await prisma.user.findMany({
      where: { referredById: userId, deletedAt: null },
      select: { id: true, name: true, email: true, createdAt: true, referralRewarded: true },
      orderBy: { createdAt: "desc" },
    });

    const baseUrl = await getBaseUrl();
    const referralLink = dbUser?.referralCode
      ? `${baseUrl}/signup?ref=${encodeURIComponent(dbUser.referralCode)}`
      : null;

    return NextResponse.json({
      referralCode: dbUser?.referralCode ?? null,
      referralLink,
      referredCount: referredUsers.length,
      referredUsers: referredUsers.map((u) => ({
        id: u.id,
        name: u.name ?? u.email,
        email: u.email,
        joinedAt: u.createdAt,
        rewarded: u.referralRewarded,
      })),
    });
  } catch (e) {
    console.error("GET /api/user/referral:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;
    const userId = authResult.user.id;

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (dbUser?.referralCode) {
      const baseUrl = await getBaseUrl();
      return NextResponse.json({
        referralCode: dbUser.referralCode,
        referralLink: `${baseUrl}/signup?ref=${encodeURIComponent(dbUser.referralCode)}`,
        alreadyHad: true,
      });
    }

    const referralCode = await generateStudentReferralCode(userId);
    const baseUrl = await getBaseUrl();
    return NextResponse.json({
      referralCode,
      referralLink: `${baseUrl}/signup?ref=${encodeURIComponent(referralCode)}`,
      alreadyHad: false,
    });
  } catch (e) {
    console.error("POST /api/user/referral:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
