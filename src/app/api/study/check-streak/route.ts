import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MIN_STUDY_MINUTES_FOR_STREAK = 30;

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const now = new Date();
    const today = toDateOnly(now);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    const sessionsToday = await prisma.studySession.findMany({
      where: {
        userId,
        startedAt: { gte: dayStart, lte: dayEnd },
        durationMinutes: { not: null },
      },
      select: { durationMinutes: true },
    });
    const minutesStudiedToday = sessionsToday.reduce(
      (sum, s) => sum + (s.durationMinutes ?? 0),
      0
    );

    if (minutesStudiedToday < MIN_STUDY_MINUTES_FOR_STREAK) {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { currentStreak: true, longestStreak: true, totalPoints: true, lastStudyDate: true },
      });
      return NextResponse.json({
        currentStreak: profile?.currentStreak ?? 0,
        longestStreak: profile?.longestStreak ?? 0,
        totalPoints: profile?.totalPoints ?? 0,
        lastStudyDate: profile?.lastStudyDate,
        updated: false,
        message: "Study at least 30 minutes today to count for streak.",
      });
    }

    const yesterday = toDateOnly(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    const lastStudy = profile?.lastStudyDate
      ? toDateOnly(new Date(profile.lastStudyDate))
      : null;

    let newStreak = profile?.currentStreak ?? 0;
    const pointsToAdd = 1;

    if (lastStudy === today) {
      return NextResponse.json({
        currentStreak: profile?.currentStreak ?? 0,
        longestStreak: profile?.longestStreak ?? 0,
        totalPoints: (profile?.totalPoints ?? 0),
        lastStudyDate: profile?.lastStudyDate,
        updated: false,
      });
    }

    if (lastStudy === yesterday) {
      newStreak = (profile?.currentStreak ?? 0) + 1;
    } else {
      newStreak = 1;
    }

    const newLongest = Math.max(profile?.longestStreak ?? 0, newStreak);
    const newTotalPoints = (profile?.totalPoints ?? 0) + pointsToAdd;

    const updated = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        currentStreak: newStreak,
        lastStudyDate: now,
        longestStreak: newLongest,
        totalPoints: newTotalPoints,
      },
      update: {
        currentStreak: newStreak,
        lastStudyDate: now,
        longestStreak: newLongest,
        totalPoints: newTotalPoints,
      },
    });

    return NextResponse.json({
      currentStreak: updated.currentStreak,
      longestStreak: updated.longestStreak,
      totalPoints: updated.totalPoints,
      lastStudyDate: updated.lastStudyDate,
      updated: true,
    });
  } catch (e) {
    console.error("POST /api/study/check-streak:", e);
    return NextResponse.json(
      { error: "Failed to update streak" },
      { status: 500 }
    );
  }
}
