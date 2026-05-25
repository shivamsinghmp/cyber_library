import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { awardCoins } from "@/lib/coins";
import { getAppSetting } from "@/lib/app-settings";

const CHECKIN_REASON = "DAILY_CHECKIN";

export async function POST() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get configured daily check-in reward (default 5 coins)
    const raw = await getAppSetting("CHECKIN_COINS").catch(() => null);
    const checkinCoins = raw ? Math.max(1, parseInt(raw)) : 5;

    // Check if already checked in today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const alreadyCheckedIn = await prisma.studyCoinLog.findFirst({
      where: {
        userId,
        reason: CHECKIN_REASON,
        createdAt: { gte: todayStart },
      },
    });

    if (alreadyCheckedIn) {
      return NextResponse.json({ success: false, alreadyCheckedIn: true, coins: checkinCoins });
    }

    await awardCoins(userId, checkinCoins, CHECKIN_REASON);

    // Calculate check-in streak
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date(todayStart);
    dayBefore.setDate(dayBefore.getDate() - 2);

    const yesterdayCheckin = await prisma.studyCoinLog.findFirst({
      where: { userId, reason: CHECKIN_REASON, createdAt: { gte: yesterday, lt: todayStart } },
    });

    // Count consecutive daily check-ins ending today
    let streak = 1;
    if (yesterdayCheckin) {
      // Count backwards
      let checkDate = new Date(yesterday);
      for (let i = 0; i < 365; i++) {
        const dayStart = new Date(checkDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const hit = await prisma.studyCoinLog.findFirst({
          where: { userId, reason: CHECKIN_REASON, createdAt: { gte: dayStart, lt: dayEnd } },
        });
        if (!hit) break;
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Bonus coins for streak milestones
    let bonusCoins = 0;
    const bonusReason = `CHECKIN_STREAK_BONUS_${streak}`;
    if (streak === 7) { bonusCoins = 20; }
    else if (streak === 30) { bonusCoins = 100; }
    else if (streak % 7 === 0 && streak > 7) { bonusCoins = 10; }

    if (bonusCoins > 0) {
      await awardCoins(userId, bonusCoins, bonusReason);
    }

    return NextResponse.json({ success: true, coins: checkinCoins, streak, bonusCoins });
  } catch (e) {
    console.error("POST /api/user/wallet/checkin:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const raw = await getAppSetting("CHECKIN_COINS").catch(() => null);
    const checkinCoins = raw ? Math.max(1, parseInt(raw)) : 5;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCheckin = await prisma.studyCoinLog.findFirst({
      where: { userId, reason: CHECKIN_REASON, createdAt: { gte: todayStart } },
    });

    // Count streak
    let streak = 0;
    let checkDate = new Date(todayCheckin ? todayStart : new Date(todayStart.getTime() - 86400000));
    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(checkDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const hit = await prisma.studyCoinLog.findFirst({
        where: { userId, reason: CHECKIN_REASON, createdAt: { gte: dayStart, lt: dayEnd } },
      });
      if (!hit) break;
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return NextResponse.json({
      checkedInToday: !!todayCheckin,
      checkinCoins,
      streak,
    });
  } catch (e) {
    console.error("GET /api/user/wallet/checkin:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
