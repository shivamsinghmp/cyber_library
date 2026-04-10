import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import { getMeetAddonCorsHeaders } from "../cors";
import { getCoinDelta } from "@/lib/gamification/awards";
import { applyStudyStreakForQualifyingDay, todayDateUtc } from "@/lib/gamification/study-streak";

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

function auth(request: NextRequest): { userId: string } | null {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  return verifyMeetAddonToken(token);
}

function taskJson(t: {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  completedAt: Date | null;
}) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    completedAt: t.completedAt?.toISOString() ?? null,
  };
}

export async function GET(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  const payload = auth(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }
  const taskDate = todayDate();
  const [tasks, profile] = await Promise.all([
    prisma.dailyTask.findMany({
      where: { userId: payload.userId, taskDate },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    }),
    prisma.profile.findUnique({
      where: { userId: payload.userId },
      select: { totalPoints: true }
    })
  ]);
  return NextResponse.json({ tasks: tasks.map(taskJson), totalPoints: profile?.totalPoints || 0 }, { headers: cors });
}

export async function POST(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  const payload = auth(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }
  const body = await request.json().catch(() => ({}));
  const taskDate = todayDate();
  const markComplete = body.markComplete === true;
  const targetId =
    typeof body.taskId === "string"
      ? body.taskId.trim()
      : typeof body.id === "string"
        ? body.id.trim()
        : "";

  if (markComplete) {
    if (!targetId) {
      return NextResponse.json({ error: "taskId required" }, { status: 400, headers: cors });
    }
    const existing = await prisma.dailyTask.findFirst({
      where: { id: targetId, userId: payload.userId, taskDate },
    });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404, headers: cors });
    }
    if (existing.completedAt) {
      return NextResponse.json(taskJson(existing), { headers: cors });
    }

    const completedCountBefore = await prisma.dailyTask.count({
      where: { userId: payload.userId, taskDate, completedAt: { not: null } },
    });
    const isFirstCompletionToday = completedCountBefore === 0;

    const updated = await prisma.dailyTask.update({
      where: { id: existing.id },
      data: { completedAt: new Date() },
    });

    await prisma.studyCoinLog.create({
      data: {
        userId: payload.userId,
        reason: "TODO_COMPLETED",
        coins: getCoinDelta("TODO_COMPLETED"),
      },
    });

    if (isFirstCompletionToday) {
      await applyStudyStreakForQualifyingDay(payload.userId);
    }

    return NextResponse.json(taskJson(updated), { headers: cors });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : body.description === null ? null : undefined;
  const priority = normalizePriority(body.priority);

  if (targetId) {
    const existing = await prisma.dailyTask.findFirst({
      where: { id: targetId, userId: payload.userId, taskDate },
    });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404, headers: cors });
    }
    if (!title) {
      return NextResponse.json({ error: "Title required" }, { status: 400, headers: cors });
    }
    const updated = await prisma.dailyTask.update({
      where: { id: existing.id },
      data: {
        title,
        ...(description !== undefined ? { description: description || null } : {}),
        priority,
      },
    });
    return NextResponse.json(taskJson(updated), { headers: cors });
  }

  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400, headers: cors });
  }

  const task = await prisma.dailyTask.create({
    data: {
      userId: payload.userId,
      taskDate,
      title,
      description: description !== undefined ? description || null : null,
      priority,
    },
  });
  return NextResponse.json(taskJson(task), { headers: cors });
}
