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

    await awardCoins(userId, checkinCoins, CHECKIN_REASON, undefined, undefined, {
      sourceCategory: "checkin_bonus",
      sourceLabel:    "Daily check-in bonus",
      referenceType:  "system",
      deviceType:     "web_browser",
    });

    // Calculate streak with a single query — fetch last 365 checkin dates
    const windowStart = new Date(todayStart);
    windowStart.setDate(windowStart.getDate() - 365);
    const recentCheckins = await prisma.studyCoinLog.findMany({
      where: { userId, reason: CHECKIN_REASON, createdAt: { gte: windowStart } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    const checkinDays = new Set(
      recentCheckins.map(c => c.createdAt.toISOString().slice(0, 10))
    );
    let streak = 0;
    let cursor = new Date(todayStart);
    for (let i = 0; i < 366; i++) {
      const key = cursor.toISOString().slice(0, 10);
      if (!checkinDays.has(key)) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    // Bonus coins for streak milestones
    let bonusCoins = 0;
    const bonusReason = `CHECKIN_STREAK_BONUS_${streak}`;
    if (streak === 7) { bonusCoins = 20; }
    else if (streak === 30) { bonusCoins = 100; }
    else if (streak % 7 === 0 && streak > 7) { bonusCoins = 10; }

    if (bonusCoins > 0) {
      await awardCoins(userId, bonusCoins, bonusReason, undefined, undefined, {
        sourceCategory: "daily_streak",
        sourceLabel:    `Streak bonus — ${streak} day streak`,
        referenceType:  "system",
        deviceType:     "web_browser",
      });
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

    // Count streak with a single query
    const windowStart2 = new Date(todayStart);
    windowStart2.setDate(windowStart2.getDate() - 365);
    const recentCheckins2 = await prisma.studyCoinLog.findMany({
      where: { userId, reason: CHECKIN_REASON, createdAt: { gte: windowStart2 } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    const checkinDays2 = new Set(
      recentCheckins2.map(c => c.createdAt.toISOString().slice(0, 10))
    );
    let streak = 0;
    const streakStart = todayCheckin ? todayStart : new Date(todayStart.getTime() - 86400000);
    let cursorDate = new Date(streakStart);
    for (let i = 0; i < 366; i++) {
      const key = cursorDate.toISOString().slice(0, 10);
      if (!checkinDays2.has(key)) break;
      streak++;
      cursorDate.setDate(cursorDate.getDate() - 1);
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
