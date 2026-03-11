import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({
  type: z.enum(["START", "STOP"]),
  studySlotId: z.string().optional(),
});

/** GET: Return current user's active session (no endedAt) if any. */
export async function GET() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!session?.user || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const active = await prisma.studySession.findFirst({
      where: { userId, endedAt: null },
      orderBy: { startedAt: "desc" },
      select: { id: true, startedAt: true },
    });

    return NextResponse.json({
      activeSession: active
        ? { id: active.id, startedAt: active.startedAt.toISOString() }
        : null,
    });
  } catch (e) {
    console.error("GET /api/study/session:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** POST: START creates a new StudySession; STOP ends the active one and updates Profile.totalStudyHours. */
export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!session?.user || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const { type } = parsed.data;

    if (type === "START") {
      const existing = await prisma.studySession.findFirst({
        where: { userId, endedAt: null },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Already have an active session. Stop it first." },
          { status: 400 }
        );
      }
      const startedAt = new Date();
      const sessionRecord = await prisma.studySession.create({
        data: { userId, startedAt },
      });
      return NextResponse.json({
        session: { id: sessionRecord.id, startedAt: sessionRecord.startedAt.toISOString() },
      });
    }

    if (type === "STOP") {
      const active = await prisma.studySession.findFirst({
        where: { userId, endedAt: null },
        orderBy: { startedAt: "desc" },
      });
      if (!active) {
        return NextResponse.json({ error: "No active session" }, { status: 400 });
      }
      const endedAt = new Date();
      const durationMinutes = Math.round(
        (endedAt.getTime() - active.startedAt.getTime()) / 60_000
      );
      await prisma.studySession.update({
        where: { id: active.id },
        data: { endedAt, durationMinutes },
      });
      const addHours = Math.round(durationMinutes / 60);
      await prisma.profile.upsert({
        where: { userId },
        create: { userId, totalStudyHours: addHours },
        update: { totalStudyHours: { increment: addHours } },
      });

      const MIN_STUDY_MINUTES_FOR_STREAK = 30;
      const dayStart = new Date(endedAt);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
      const sessionsToday = await prisma.studySession.findMany({
        where: {
          userId,
          startedAt: { gte: dayStart, lte: dayEnd },
          durationMinutes: { not: null },
        },
        select: { durationMinutes: true },
      });
      const minutesToday = sessionsToday.reduce(
        (sum, s) => sum + (s.durationMinutes ?? 0),
        0
      );
      if (minutesToday >= MIN_STUDY_MINUTES_FOR_STREAK) {
        const todayStr = dayStart.toISOString().slice(0, 10);
        const yesterdayStr = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        const profile = await prisma.profile.findUnique({
          where: { userId },
          select: { lastStudyDate: true, currentStreak: true, longestStreak: true },
        });
        const lastStudy = profile?.lastStudyDate
          ? new Date(profile.lastStudyDate).toISOString().slice(0, 10)
          : null;
        if (lastStudy !== todayStr) {
          const newStreak =
            lastStudy === yesterdayStr
              ? (profile?.currentStreak ?? 0) + 1
              : 1;
          const newLongest = Math.max(profile?.longestStreak ?? 0, newStreak);
          await prisma.profile.upsert({
            where: { userId },
            create: {
              userId,
              lastStudyDate: endedAt,
              currentStreak: newStreak,
              longestStreak: newLongest,
            },
            update: {
              lastStudyDate: endedAt,
              currentStreak: newStreak,
              longestStreak: newLongest,
            },
          });
        }
      }

      return NextResponse.json({
        session: {
          id: active.id,
          endedAt: endedAt.toISOString(),
          durationMinutes,
        },
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (e) {
    console.error("POST /api/study/session:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
