import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateStudentReferralCode } from "@/lib/referral";
import { headers } from "next/headers";

async function getBaseUrl(): Promise<string> {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  const h = await headers();
  const host = h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "https://virtuallibrary.com";
}

/** GET: Current user's referral code, link, referred count and list. */
export async function GET() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!session?.user || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    const referredUsers = await prisma.user.findMany({
      where: { referredById: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        referralRewarded: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const baseUrl = await getBaseUrl();
    const referralLink = user?.referralCode
      ? `${baseUrl}/signup?ref=${encodeURIComponent(user.referralCode)}`
      : null;

    return NextResponse.json({
      referralCode: user?.referralCode ?? null,
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

/** POST: Generate referral code for current user if not already set (students get REF- prefix). */
export async function POST() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!session?.user || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (user?.referralCode) {
      const baseUrl = await getBaseUrl();
      return NextResponse.json({
        referralCode: user.referralCode,
        referralLink: `${baseUrl}/signup?ref=${encodeURIComponent(user.referralCode)}`,
        alreadyHad: true,
      });
    }

    const referralCode = await generateStudentReferralCode(userId);
    const baseUrl = await getBaseUrl();
    const referralLink = `${baseUrl}/signup?ref=${encodeURIComponent(referralCode)}`;

    return NextResponse.json({
      referralCode,
      referralLink,
      alreadyHad: false,
    });
  } catch (e) {
    console.error("POST /api/user/referral:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
