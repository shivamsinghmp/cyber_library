import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-helpers";
import { batchGetAppSettings } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

const PYTHON_URL    = process.env.PYTHON_SERVER_URL    ?? "http://localhost:8001";
const PYTHON_SECRET = process.env.PYTHON_SERVER_SECRET ?? "";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const userId = auth.user.id;

    const now      = new Date();
    const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const start7d  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);

    // Fetch all data in parallel
    const [profile, sessions30d, tasks7d, aiLogs30d, chatMessages, settings] = await Promise.all([
      prisma.profile.findUnique({
        where:  { userId },
        select: { targetExam: true, targetYear: true, currentStreak: true, coinBalance: true },
      }),
      prisma.studySession.findMany({
        where:  { userId, startedAt: { gte: start30d }, durationMinutes: { not: null } },
        select: { durationMinutes: true },
      }),
      prisma.dailyTask.findMany({
        where:  { userId, taskDate: { gte: start7d } },
        select: { completedAt: true },
      }),
      prisma.aIUsageLog.count({
        where: { userId, createdAt: { gte: start30d }, status: "success" },
      }),
      // Get recent AI chat messages to extract study topics
      prisma.chatMessage.findMany({
        where:   { session: { userId }, role: "user", createdAt: { gte: start30d } },
        select:  { content: true },
        orderBy: { createdAt: "desc" },
        take:    50,
      }),
      batchGetAppSettings(["GEMINI_API_KEY"]),
    ]);

    const studyHours30d = sessions30d.reduce((s, x) => s + (x.durationMinutes ?? 0), 0) / 60;
    const taskRate      = tasks7d.length > 0
      ? (tasks7d.filter(t => t.completedAt).length / tasks7d.length) * 100
      : 0;

    // Extract topic keywords from chat messages (first 5 words of each user message)
    const chatTopics = chatMessages
      .map(m => m.content.split(/\s+/).slice(0, 5).join(" "))
      .filter(Boolean);

    // Calculate days until exam (rough estimate from targetYear)
    const targetYear = parseInt(profile?.targetYear ?? "0", 10);
    const daysUntilExam = targetYear > 0
      ? Math.max(0, Math.floor((new Date(`${targetYear}-06-01`).getTime() - now.getTime()) / 86400000))
      : 0;

    const payload = {
      targetExam:    profile?.targetExam    ?? "",
      targetYear:    profile?.targetYear    ?? "",
      daysUntilExam,
      studyHours30d: Math.round(studyHours30d * 10) / 10,
      streak:        profile?.currentStreak ?? 0,
      taskRate:      Math.round(taskRate),
      chatTopics,
      aiSessions:    aiLogs30d,
      apiKey:        settings["GEMINI_API_KEY"] ?? "",
    };

    const pyRes = await fetch(`${PYTHON_URL}/analytics/readiness`, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${PYTHON_SECRET}`, "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(15_000),
    });

    if (!pyRes.ok) {
      return NextResponse.json({ error: "Readiness service unavailable" }, { status: 502 });
    }

    const result = await pyRes.json();

    return NextResponse.json({
      ...result,
      meta: {
        studyHours30d:  Math.round(studyHours30d * 10) / 10,
        streak:         profile?.currentStreak ?? 0,
        taskRate:       Math.round(taskRate),
        aiSessions:     aiLogs30d,
        coinBalance:    profile?.coinBalance   ?? 0,
        targetExam:     profile?.targetExam    ?? null,
        targetYear:     profile?.targetYear    ?? null,
        daysUntilExam,
      },
    });

  } catch (e) {
    console.error("GET /api/ai/studymate/readiness:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
