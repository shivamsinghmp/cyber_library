import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // ENV_SUPERADMIN is stateless — no DB row, skip logging
    if (userId === "ENV_SUPERADMIN") {
      return NextResponse.json({ ok: true });
    }

    const existing = await prisma.loginLog.findFirst({
      where: { userId, logoutAt: null },
      orderBy: { loginAt: "desc" },
    });
    if (!existing) {
      await prisma.loginLog.create({
        data: { userId, loginAt: new Date() },
      });
    }

    // Influencer attribution on login (cookie-based, happens here where cookies are available)
    try {
      const infVid = req.cookies.get("inf_vid")?.value;
      const infRef = req.cookies.get("inf_ref")?.value;

      if (infVid) {
        await prisma.influencerLinkClick.updateMany({
          where: { visitorId: infVid, userId: null },
          data: { userId },
        });
      }

      if (infRef) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { referredByInfluencer: true },
        });
        if (dbUser && !dbUser.referredByInfluencer) {
          const influencer = await prisma.user.findFirst({
            where: { referralCode: infRef, role: "INFLUENCER", deletedAt: null },
            select: { id: true },
          });
          if (influencer) {
            await prisma.user.update({
              where: { id: userId },
              data: { referredByInfluencer: influencer.id },
            });
          }
        }
      }
    } catch {
      // attribution failure is non-fatal
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("record-login:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
