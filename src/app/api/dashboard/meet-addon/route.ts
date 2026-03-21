import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const taskDate = todayDate();
  const [todayTask, pollResponses] = await Promise.all([
    prisma.dailyTask.findUnique({
      where: { userId_taskDate: { userId, taskDate } },
      select: { id: true, title: true, completedAt: true },
    }),
    prisma.meetPollResponse.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { poll: { select: { question: true } } },
    }),
  ]);

  return NextResponse.json({
    todayTask: todayTask
      ? {
          id: todayTask.id,
          title: todayTask.title,
          completedAt: todayTask.completedAt?.toISOString() ?? null,
        }
      : null,
    pollResponses: pollResponses.map((r) => ({
      id: r.id,
      question: r.poll.question,
      answer: r.answer,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
