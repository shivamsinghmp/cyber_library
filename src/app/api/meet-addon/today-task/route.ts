import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import { getMeetAddonCorsHeaders } from "../cors";
import { getCoinDelta } from "@/lib/gamification/awards";
import { applyStudyStreakForQualifyingDay, todayDateUtc } from "@/lib/gamification/study-streak";

const MAX_TASKS_PER_DAY  = 5;  // excluding daily promise (priority 0)
const MAX_SUBTASKS       = 10; // per task

function todayDate(): Date {
  return todayDateUtc();
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { "Access-Control-Max-Age": "86400" } });
}

function normalizePriority(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : NaN;
  if (n === 0 || n === 1 || n === 2 || n === 3) return n;
  return 2;
}

function authPayload(request: NextRequest): { userId: string } | null {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  return verifyMeetAddonToken(token);
}

function taskJson(t: {
  id: string; title: string; description: string | null;
  priority: number; completedAt: Date | null;
  subtasks?: { id: string; title: string; completedAt: Date | null; sortOrder: number }[];
}) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    completedAt: t.completedAt?.toISOString() ?? null,
    subtasks: (t.subtasks ?? []).map(s => ({
      id: s.id,
      title: s.title,
      completedAt: s.completedAt?.toISOString() ?? null,
      sortOrder: s.sortOrder,
    })),
  };
}

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  try {
    const payload = authPayload(request);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });

    const taskDate = todayDate();
    const now = new Date();
    const localTodayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const localTodayEnd   = new Date(localTodayStart.getTime() + 86_400_000);

    const [tasks, profile, streak, sessionsToday, meetPresenceToday, pomodoroToday] = await Promise.all([
      prisma.dailyTask.findMany({
        where: { userId: payload.userId, taskDate },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        include: { subtasks: { orderBy: { sortOrder: "asc" } } },
      }),
      prisma.profile.findUnique({
        where: { userId: payload.userId },
        select: { coinBalance: true },
      }),
      prisma.studyStreak.findUnique({
        where: { userId: payload.userId },
        select: { currentDays: true },
      }),
      prisma.studySession.findMany({
        where: { userId: payload.userId, startedAt: { gte: localTodayStart, lt: localTodayEnd } },
        select: { durationMinutes: true },
      }),
      prisma.meetPresenceSession.findMany({
        where: { userId: payload.userId, startedAt: { gte: localTodayStart, lt: localTodayEnd } },
        select: { startedAt: true, endedAt: true, lastHeartbeatAt: true },
      }),
      prisma.pomodoroTimerSession.findMany({
        where: { userId: payload.userId, startedAt: { gte: localTodayStart, lt: localTodayEnd } },
        select: { completedSeconds: true },
      }),
    ]);

    // Total study hours today (study sessions + meet presence + standalone pomodoro sessions)
    const studyMinutesToday = sessionsToday.reduce((s, r) => s + (r.durationMinutes ?? 0), 0);
    let meetSecondsToday = 0;
    for (const m of meetPresenceToday) {
      const end = m.endedAt ?? m.lastHeartbeatAt ?? now;
      const a = Math.max(m.startedAt.getTime(), localTodayStart.getTime());
      const b = Math.min(end.getTime(), localTodayEnd.getTime());
      if (b > a) meetSecondsToday += (b - a) / 1000;
    }
    const pomodoroSecondsToday = pomodoroToday.reduce((s, r) => s + (r.completedSeconds ?? 0), 0);
    const hoursToday = (studyMinutesToday / 60) + (meetSecondsToday / 3600) + (pomodoroSecondsToday / 3600);

    return NextResponse.json({
      tasks: tasks.map(taskJson),
      coinBalance: profile?.coinBalance ?? 0,
      streakDays:  streak?.currentDays  ?? 0,
      hoursToday,
    }, { headers: cors });
  } catch (e) {
    console.error("[meet-addon/today-task] GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: cors });
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  try {
    const payload = authPayload(request);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });

    const body = await request.json().catch(() => ({}));
    const taskDate    = todayDate();
    const markComplete = body.markComplete === true;
    const isSubtask    = body.subtask === true;

    // ── Target ID resolution ──────────────────────────────────────────────────
    const targetId =
      typeof body.taskId    === "string" ? body.taskId.trim() :
      typeof body.subtaskId === "string" ? body.subtaskId.trim() :
      typeof body.id        === "string" ? body.id.trim() : "";

    // ── SUBTASK operations ────────────────────────────────────────────────────
    if (isSubtask) {
      // Mark subtask complete
      if (markComplete) {
        if (!targetId) return NextResponse.json({ error: "subtaskId required" }, { status: 400, headers: cors });
        const sub = await prisma.dailyTaskSubtask.findFirst({
          where: { id: targetId, task: { userId: payload.userId } },
        });
        if (!sub) return NextResponse.json({ error: "Subtask not found" }, { status: 404, headers: cors });
        const updated = await prisma.dailyTaskSubtask.update({
          where: { id: sub.id },
          data: { completedAt: sub.completedAt ? null : new Date() },
        });
        return NextResponse.json({
          id: updated.id, title: updated.title,
          completedAt: updated.completedAt?.toISOString() ?? null,
          sortOrder: updated.sortOrder,
        }, { headers: cors });
      }

      // Create subtask
      const parentTaskId = typeof body.taskId === "string" ? body.taskId.trim() : "";
      if (!parentTaskId) return NextResponse.json({ error: "taskId required" }, { status: 400, headers: cors });
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title)        return NextResponse.json({ error: "Title required" }, { status: 400, headers: cors });

      const parentTask = await prisma.dailyTask.findFirst({
        where: { id: parentTaskId, userId: payload.userId },
        include: { subtasks: { select: { id: true } } },
      });
      if (!parentTask) return NextResponse.json({ error: "Task not found" }, { status: 404, headers: cors });
      if (parentTask.subtasks.length >= MAX_SUBTASKS) {
        return NextResponse.json(
          { error: `Maximum ${MAX_SUBTASKS} subtasks allowed per task` },
          { status: 400, headers: cors }
        );
      }

      const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : parentTask.subtasks.length;
      const subtask = await prisma.dailyTaskSubtask.create({
        data: { taskId: parentTaskId, title, sortOrder },
      });
      return NextResponse.json({
        id: subtask.id, title: subtask.title,
        completedAt: subtask.completedAt?.toISOString() ?? null,
        sortOrder: subtask.sortOrder,
      }, { headers: cors });
    }

    // ── TASK mark complete ────────────────────────────────────────────────────
    if (markComplete) {
      if (!targetId) return NextResponse.json({ error: "taskId required" }, { status: 400, headers: cors });
      const existing = await prisma.dailyTask.findFirst({
        where: { id: targetId, userId: payload.userId, taskDate },
        include: { subtasks: { orderBy: { sortOrder: "asc" } } },
      });
      if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404, headers: cors });
      if (existing.completedAt) return NextResponse.json(taskJson(existing), { headers: cors });

      const completedCountBefore = await prisma.dailyTask.count({
        where: { userId: payload.userId, taskDate, completedAt: { not: null } },
      });
      const isFirstCompletionToday = completedCountBefore === 0;

      const updated = await prisma.dailyTask.update({
        where: { id: existing.id },
        data: { completedAt: new Date() },
        include: { subtasks: { orderBy: { sortOrder: "asc" } } },
      });

      const coins = await getCoinDelta("TODO_COMPLETED");
      if (coins !== 0) {
        await prisma.$transaction([
          prisma.studyCoinLog.create({
            data: { userId: payload.userId, reason: "TODO_COMPLETED", coins },
          }),
          prisma.profile.upsert({
            where:  { userId: payload.userId },
            create: { userId: payload.userId, coinBalance: Math.max(0, coins) },
            update: { coinBalance: { increment: coins } },
          }),
        ]);
      }

      if (isFirstCompletionToday) {
        await applyStudyStreakForQualifyingDay(payload.userId);
      }

      return NextResponse.json(taskJson(updated), { headers: cors });
    }

    // ── TASK create / edit ────────────────────────────────────────────────────
    const title       = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() || null
                        : body.description === null ? null : undefined;
    const priority = normalizePriority(body.priority);

    // Edit existing task
    if (targetId) {
      const existing = await prisma.dailyTask.findFirst({
        where: { id: targetId, userId: payload.userId, taskDate },
        include: { subtasks: { orderBy: { sortOrder: "asc" } } },
      });
      if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404, headers: cors });
      if (!title)    return NextResponse.json({ error: "Title required" }, { status: 400, headers: cors });

      const updated = await prisma.dailyTask.update({
        where: { id: existing.id },
        data: {
          title,
          ...(description !== undefined ? { description: description || null } : {}),
          priority,
        },
        include: { subtasks: { orderBy: { sortOrder: "asc" } } },
      });
      return NextResponse.json(taskJson(updated), { headers: cors });
    }

    // Create new task
    if (!title) return NextResponse.json({ error: "Title required" }, { status: 400, headers: cors });

    // Enforce 5-task daily limit (excludes daily promise priority=0)
    if (priority !== 0) {
      const taskCount = await prisma.dailyTask.count({
        where: { userId: payload.userId, taskDate, priority: { not: 0 } },
      });
      if (taskCount >= MAX_TASKS_PER_DAY) {
        return NextResponse.json(
          { error: `Maximum ${MAX_TASKS_PER_DAY} tasks allowed per day` },
          { status: 400, headers: cors }
        );
      }
    }

    const task = await prisma.dailyTask.create({
      data: {
        userId: payload.userId, taskDate, title,
        description: description !== undefined ? description || null : null,
        priority,
      },
      include: { subtasks: { orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json(taskJson(task), { headers: cors });

  } catch (e) {
    console.error("[meet-addon/today-task] POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: cors });
  }
}
