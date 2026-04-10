import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function utcDayBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as { id?: string }).id;
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const { start, end } = utcDayBounds(new Date());
    const log = await prisma.moodLog.findFirst({
      where: { userId, createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "desc" },
      select: { id: true, level: true, notes: true, createdAt: true },
    });

    return NextResponse.json({
      mood: log
        ? {
            id: log.id,
            level: log.level,
            notes: log.notes,
            createdAt: log.createdAt.toISOString(),
          }
        : null,
    });
  } catch (e) {
    console.error("GET /api/dashboard/mood:", e);
    return NextResponse.json({ error: "Failed to fetch mood" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as { id?: string }).id;
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const level = typeof body.level === "number" ? body.level : parseInt(String(body.level), 10);
    if (level !== 1 && level !== 2 && level !== 3) {
      return NextResponse.json({ error: "level must be 1, 2, or 3" }, { status: 400 });
    }
    const notesRaw = body.notes;
    const notes =
      notesRaw === undefined
        ? undefined
        : notesRaw === null
          ? null
          : typeof notesRaw === "string"
            ? notesRaw.slice(0, 2000)
            : undefined;

    const { start, end } = utcDayBounds(new Date());
    const existing = await prisma.moodLog.findFirst({
      where: { userId, createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "desc" },
    });

    const saved = existing
      ? await prisma.moodLog.update({
          where: { id: existing.id },
          data: {
            level,
            ...(notes !== undefined ? { notes } : {}),
          },
          select: { id: true, level: true, notes: true, createdAt: true },
        })
      : await prisma.moodLog.create({
          data: {
            userId,
            level,
            notes: notes ?? null,
          },
          select: { id: true, level: true, notes: true, createdAt: true },
        });

    return NextResponse.json({
      mood: {
        id: saved.id,
        level: saved.level,
        notes: saved.notes,
        createdAt: saved.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("POST /api/dashboard/mood:", e);
    return NextResponse.json({ error: "Failed to save mood" }, { status: 500 });
  }
}
