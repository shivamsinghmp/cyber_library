import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Align with meet-addon today-task API (UTC calendar day). */
function todayDateUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const taskDate = todayDateUtc();

  const [
    todayTasks,
    pastTasks,
    pollResponses,
    coinLogs,
    focusSessions,
    presenceSessions,
    pomodoroTimerSessions,
    coins,
    streak,
  ] = await Promise.all([
    prisma.dailyTask.findMany({
      where: { userId, taskDate },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        completedAt: true,
        taskDate: true,
      },
    }),
    prisma.dailyTask.findMany({
      where: { userId, taskDate: { lt: taskDate } },
      orderBy: [{ taskDate: "desc" }, { priority: "asc" }, { createdAt: "asc" }],
      take: 400,
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        completedAt: true,
        taskDate: true,
      },
    }),
    prisma.meetPollResponse.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { poll: { select: { question: true } } },
    }),
    prisma.studyCoinLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 150,
      select: { id: true, coins: true, reason: true, createdAt: true, roomId: true },
    }),
    prisma.focusSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 80,
      include: { room: { select: { title: true, roomKey: true } } },
    }),
    prisma.meetPresenceSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 100,
      include: { room: { select: { roomKey: true, title: true } } },
    }),
    prisma.pomodoroTimerSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 100,
      include: { room: { select: { roomKey: true, title: true } } },
    }),
    prisma.studyCoinLog.aggregate({
      where: { userId },
      _sum: { coins: true },
    }),
    prisma.studyStreak.findUnique({
      where: { userId },
      select: { currentDays: true, longestDays: true, lastStudyOn: true },
    }),
  ]);

  const taskFields = (t: (typeof todayTasks)[0]) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    completedAt: t.completedAt?.toISOString() ?? null,
    taskDate: t.taskDate.toISOString().slice(0, 10),
  });

  return NextResponse.json({
    todayTasks: todayTasks.map(taskFields),
    pastTasks: pastTasks.map(taskFields),
    pollResponses: pollResponses.map((r) => ({
      id: r.id,
      question: r.poll.question,
      answer: r.answer,
      createdAt: r.createdAt.toISOString(),
    })),
    coinLogs: coinLogs.map((l) => ({
      id: l.id,
      coins: l.coins,
      reason: l.reason,
      createdAt: l.createdAt.toISOString(),
      roomId: l.roomId,
    })),
    focusSessions: focusSessions.map((s) => ({
      id: s.id,
      workMinutes: s.workMinutes,
      breakMinutes: s.breakMinutes,
      cycles: s.cycles,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString() ?? null,
      roomTitle: s.room.title,
      roomKey: s.room.roomKey,
    })),
    pomodoroTimerSessions: pomodoroTimerSessions.map((p) => ({
      id: p.id,
      roomKey: p.room.roomKey,
      roomTitle: p.room.title,
      plannedSeconds: p.plannedSeconds,
      completedSeconds: p.completedSeconds,
      completedFully: p.completedFully,
      startedAt: p.startedAt.toISOString(),
      endedAt: p.endedAt.toISOString(),
    })),
    presenceSessions: presenceSessions.map((p) => {
      const end = p.endedAt;
      const start = p.startedAt;
      const durationSeconds =
        end != null ? Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000)) : null;
      return {
        id: p.id,
        roomKey: p.room.roomKey,
        roomTitle: p.room.title,
        startedAt: start.toISOString(),
        endedAt: end?.toISOString() ?? null,
        lastHeartbeatAt: p.lastHeartbeatAt.toISOString(),
        durationSeconds,
        active: end == null,
      };
    }),
    gamification: {
      totalCoins: coins._sum.coins ?? 0,
      streakDays: streak?.currentDays ?? 0,
      longestStreakDays: streak?.longestDays ?? 0,
      lastStudyOn: streak?.lastStudyOn?.toISOString() ?? null,
    },
  });
}
