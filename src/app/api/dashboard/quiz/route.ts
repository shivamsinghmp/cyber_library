import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as { id?: string }).id;
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const range = (searchParams.get("range") ?? "week").toLowerCase();
    
    // Bounds logic similar to tasks
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const now = new Date();
    let from = new Date(today);
    let to = new Date(now);

    if (range === "today") {
      from = today;
    } else if (range === "week") {
      from.setUTCDate(from.getUTCDate() - 6);
    } else if (range === "month") {
      const y = now.getUTCFullYear();
      const m = now.getUTCMonth();
      from = new Date(Date.UTC(y, m, 1));
      to = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
    } else if (range === "custom") {
      const fromParam = searchParams.get("from");
      const toParam = searchParams.get("to");
      if (fromParam && toParam) {
        from = new Date(`${fromParam}T00:00:00.000Z`);
        to = new Date(`${toParam}T23:59:59.999Z`);
      }
    }

    const where: Prisma.MeetPollResponseWhereInput = {
      userId,
      createdAt: {
        gte: from,
        lte: to,
      },
    };

    const responses = await prisma.meetPollResponse.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        poll: {
          select: { question: true },
        },
      },
    });

    return NextResponse.json({
      responses: responses.map((r) => ({
        id: r.id,
        pollId: r.pollId,
        question: r.poll.question,
        answer: r.answer,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: {
        range,
        from: from.toISOString(),
        to: to.toISOString(),
      },
    });
  } catch (e) {
    console.error("GET /api/dashboard/quiz:", e);
    return NextResponse.json({ error: "Failed to fetch quiz responses" }, { status: 500 });
  }
}
