import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { todayDateUtc, applyStudyStreakForQualifyingDay } from "@/lib/gamification/study-streak";
import { getCoinDelta } from "@/lib/gamification/awards";
import { requireUser } from "@/lib/api-helpers";

const MAX_DAILY_TASKS = 3;
const MAX_CUSTOM_RANGE_DAYS = 366;
const LIST_TAKE = 500;

function normalizePriority(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : NaN;
  if (n === 1 || n === 2 || n === 3) return n;
  return 2;
}

function parseYmdUtc(s: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return utcDateKey(a) === utcDateKey(b);
}

/** Range bounds inclusive on `taskDate` (UTC calendar dates). */
function resolveListRange(
  range: string,
  fromParam: string | null,
  toParam: string | null,
  dateParam: string | null,
  anchorParam: string | null
): { ok: true; from: Date; to: Date } | { ok: false; error: string } {
  const today = todayDateUtc();
  const now = new Date();

  if (range === "today") {
    return { ok: true, from: today, to: today };
  }

  /** Single calendar day (UTC). Query: range=day&date=YYYY-MM-DD */
  if (range === "day") {
    const d = parseYmdUtc(dateParam);
    if (!d) return { ok: false, error: "date required for day range (YYYY-MM-DD)" };
    return { ok: true, from: d, to: d };
  }

  /** Seven UTC days ending on `anchor` (inclusive). Query: range=week&anchor=YYYY-MM-DD (optional, default today). */
  if (range === "week") {
    const anchor = parseYmdUtc(anchorParam) ?? today;
    const from = new Date(anchor);
    from.setUTCDate(from.getUTCDate() - 6);
    return { ok: true, from, to: anchor };
  }

  if (range === "month") {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const from = new Date(Date.UTC(y, m, 1));
    const to = new Date(Date.UTC(y, m + 1, 0));
    return { ok: true, from, to };
  }

  if (range === "custom") {
    const from = parseYmdUtc(fromParam);
    const to = parseYmdUtc(toParam);
    if (!from || !to) return { ok: false, error: "from and to required (YYYY-MM-DD)" };
    if (from.getTime() > to.getTime()) return { ok: false, error: "from must be before or equal to to" };
    const days =
      Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (days > MAX_CUSTOM_RANGE_DAYS) {
      return { ok: false, error: `Custom range cannot exceed ${MAX_CUSTOM_RANGE_DAYS} days` };
    }
    return { ok: true, from, to };
  }

  return { ok: false, error: "Invalid range (use today, day, week, month, or custom)" };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const { user } = auth;
    const userId = user.id;

    const searchParams = req.nextUrl.searchParams;
    const range = (searchParams.get("range") ?? "today").toLowerCase();
    const status = (searchParams.get("status") ?? "all").toLowerCase();

    if (status !== "all" && status !== "complete" && status !== "incomplete") {
      return NextResponse.json({ error: "status must be all, complete, or incomplete" }, { status: 400 });
    }

    const bounds = resolveListRange(
      range,
      searchParams.get("from"),
      searchParams.get("to"),
      searchParams.get("date"),
      searchParams.get("anchor")
    );
    if (!bounds.ok) {
      return NextResponse.json({ error: bounds.error }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      userId,
      ...(isSameUtcDay(bounds.from, bounds.to)
        ? { taskDate: bounds.from }
        : { taskDate: { gte: bounds.from, lte: bounds.to } }),
    };

    if (status === "complete") where.completedAt = { not: null };
    if (status === "incomplete") where.completedAt = null;

    const tasks = await prisma.dailyTask.findMany({
      where: where as never,
      orderBy: [{ taskDate: "desc" }, { priority: "asc" }, { createdAt: "asc" }],
      take: LIST_TAKE,
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        completedAt: true,
        taskDate: true,
      },
    });

    return NextResponse.json({
      tasks: tasks.map((t) => ({
        ...t,
        taskDate: t.taskDate.toISOString().slice(0, 10),
        completedAt: t.completedAt?.toISOString() ?? null,
      })),
      meta: {
        range,
        from: utcDateKey(bounds.from),
        to: utcDateKey(bounds.to),
        status,
        ...(range === "day" && searchParams.get("date")
          ? { date: searchParams.get("date") }
          : {}),
        ...(range === "week"
          ? { anchor: utcDateKey(bounds.to) }
          : {}),
      },
    });
  } catch (e) {
    console.error("GET /api/dashboard/todo:", e);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as { id?: string }).id;
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    const taskDate = todayDateUtc();
    const count = await prisma.dailyTask.count({ where: { userId, taskDate } });
    if (count >= MAX_DAILY_TASKS) {
      return NextResponse.json(
        { error: `You can add up to ${MAX_DAILY_TASKS} goals per day` },
        { status: 400 }
      );
    }

    const description =
      typeof body.description === "string" ? body.description.trim() || null : null;
    const priority = normalizePriority(body.priority);

    const task = await prisma.dailyTask.create({
      data: { userId, taskDate, title, description, priority },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        completedAt: true,
        taskDate: true,
      },
    });

    return NextResponse.json({
      task: {
        ...task,
        taskDate: task.taskDate.toISOString().slice(0, 10),
        completedAt: task.completedAt?.toISOString() ?? null,
      },
    });
  } catch (e) {
    console.error("POST /api/dashboard/todo:", e);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as { id?: string }).id;
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const completed = body.completed === true;

    const existing = await prisma.dailyTask.findFirst({
      where: { id, userId },
    });
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const today = todayDateUtc();
    const taskDay = existing.taskDate;
    const isTaskToday = isSameUtcDay(taskDay, today);

    if (completed) {
      if (existing.completedAt) {
        return NextResponse.json({
          task: {
            id: existing.id,
            title: existing.title,
            description: existing.description,
            priority: existing.priority,
            completedAt: existing.completedAt.toISOString(),
            taskDate: existing.taskDate.toISOString().slice(0, 10),
          },
        });
      }

      const isFirstCompletionToday =
        isTaskToday &&
        (await prisma.dailyTask.count({
          where: { userId, taskDate: today, completedAt: { not: null } },
        })) === 0;

      const updated = await prisma.dailyTask.update({
        where: { id: existing.id },
        data: { completedAt: new Date() },
        select: {
          id: true,
          title: true,
          description: true,
          priority: true,
          completedAt: true,
          taskDate: true,
        },
      });

      if (isTaskToday) {
        await prisma.studyCoinLog.create({
          data: {
            userId,
            reason: "TODO_COMPLETED",
            coins: await getCoinDelta("TODO_COMPLETED"),
          },
        });
        // Bonus coin for completing the FIRST task of the day
        if (isFirstCompletionToday) {
          await prisma.studyCoinLog.create({
            data: {
              userId,
              reason: "STREAK_MAINTAINED",
              coins: await getCoinDelta("STREAK_MAINTAINED"),
            },
          });
        }
      }

      return NextResponse.json({
        task: {
          ...updated,
          taskDate: updated.taskDate.toISOString().slice(0, 10),
          completedAt: updated.completedAt!.toISOString(),
        },
      });
    }

    // un-complete
    const updated = await prisma.dailyTask.update({
      where: { id: existing.id },
      data: { completedAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        completedAt: true,
        taskDate: true,
      },
    });

    return NextResponse.json({
      task: {
        ...updated,
        taskDate: updated.taskDate.toISOString().slice(0, 10),
        completedAt: null,
      },
    });
  } catch (e) {
    console.error("PATCH /api/dashboard/todo:", e);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
