import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import { getMeetAddonCorsHeaders } from "../cors";

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { "Access-Control-Max-Age": "86400" } });
}

function auth(request: NextRequest): { userId: string } | null {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  return verifyMeetAddonToken(token);
}

export async function GET(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  const payload = auth(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }
  const taskDate = todayDate();
  const task = await prisma.dailyTask.findUnique({
    where: {
      userId_taskDate: { userId: payload.userId, taskDate },
    },
  });
  return NextResponse.json(
    task ? { id: task.id, title: task.title, completedAt: task.completedAt?.toISOString() ?? null } : null,
    { headers: cors }
  );
}

export async function POST(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  const payload = auth(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }
  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const markComplete = body.markComplete === true;
  const taskDate = todayDate();

  if (markComplete) {
    const existing = await prisma.dailyTask.findUnique({
      where: { userId_taskDate: { userId: payload.userId, taskDate } },
    });
    if (!existing) {
      return NextResponse.json({ error: "No task for today" }, { status: 400, headers: cors });
    }
    const updated = await prisma.dailyTask.update({
      where: { id: existing.id },
      data: { completedAt: new Date() },
    });
    return NextResponse.json(
      { id: updated.id, title: updated.title, completedAt: updated.completedAt?.toISOString() ?? null },
      { headers: cors }
    );
  }

  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400, headers: cors });
  }

  const task = await prisma.dailyTask.upsert({
    where: { userId_taskDate: { userId: payload.userId, taskDate } },
    create: { userId: payload.userId, taskDate, title },
    update: { title },
  });
  return NextResponse.json(
    { id: task.id, title: task.title, completedAt: task.completedAt?.toISOString() ?? null },
    { headers: cors }
  );
}
