import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { format, eachDayOfInterval, startOfDay, endOfDay, isSameDay, subDays } from "date-fns";
import { requireUser } from "@/lib/api-helpers";

async function sumStudyHoursForRange(
  userId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<number> {
  const [studySessions, meetPresence] = await Promise.all([
    prisma.studySession.findMany({
      where: { userId, startedAt: { gte: rangeStart, lte: rangeEnd } },
      select: { startedAt: true, durationMinutes: true },
    }),
    prisma.meetPresenceSession.findMany({
      where: { userId, startedAt: { gte: rangeStart, lte: rangeEnd } },
      select: { startedAt: true, endedAt: true, lastHeartbeatAt: true },
    }),
  ]);

  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  let total = 0;
  for (const day of days) {
    let dailyMinutes = 0;
    for (const s of studySessions) {
      if (isSameDay(new Date(s.startedAt), day)) dailyMinutes += s.durationMinutes ?? 0;
    }
    let dailyMeetSecs = 0;
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    for (const m of meetPresence) {
      const ended = m.endedAt ?? m.lastHeartbeatAt ?? new Date();
      const a = Math.max(new Date(m.startedAt).getTime(), dayStart.getTime());
      const b = Math.min(ended.getTime(), dayEnd.getTime());
      if (b > a) dailyMeetSecs += (b - a) / 1000;
    }
    total += dailyMinutes / 60 + dailyMeetSecs / 3600;
  }
  return Number(total.toFixed(2));
}

function buildInsights(
  studyData: { date: string; rawDate: string; hours: number }[],
  currentTotal: number,
  prevTotal: number
): string[] {
  const insights: string[] = [];
  const n = studyData.length;
  const isWeek = n === 7;
  const diff = Number((currentTotal - prevTotal).toFixed(2));

  if (currentTotal > 0 || prevTotal > 0) {
    if (diff > 0.25) {
      insights.push(
        isWeek
          ? `Outstanding performance! Aapne pichle week ke mukable ${diff.toFixed(1)} hours zyada deep work kiya hai. Keep the momentum going! 🔥`
          : `Brilliant work! Is period mein aapne pichle time se ${diff.toFixed(1)} hours ka extra focus show kiya hai. 🚀`
      );
    } else if (diff < -0.25) {
      insights.push(
        isWeek
          ? `Aapka focus is week thoda drop hua hai (${Math.abs(diff).toFixed(1)} hrs kam). Ek choti si planning se aap apna solid rhythm wapas la sakte hain! 💪`
          : `Study load thoda decrease hua hai. Consistency build karne ke liye chhote (short) deep focus sessions zaroor try karein. ⏳`
      );
    } else {
      insights.push("Brilliant balance! Aapka study routine bilkul steady aur consistent chal raha hai. Ekdum perfect pace! 🎯");
    }
  }

  const hasStudy = studyData.some((d) => d.hours > 0);
  if (hasStudy) {
    let best = 0;
    for (let i = 1; i < studyData.length; i++) {
      if (studyData[i].hours > studyData[best].hours) best = i;
    }
    const weekday = format(new Date(studyData[best].rawDate), "EEEE");
    insights.push(`🌟 ${weekday} aapka sabse productive aur high-focus din raha!`);
  }

  return insights;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const { user } = auth;
    const userId = user.id;

    const searchParams = req.nextUrl.searchParams;
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    let startDate = fromParam ? new Date(fromParam) : new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    let endDate = toParam ? new Date(toParam) : new Date();

    // Ensure valid dates
    if (isNaN(startDate.getTime())) startDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    if (isNaN(endDate.getTime())) endDate = new Date();

    startDate = startOfDay(startDate);
    endDate = endOfDay(endDate);

    // 1. Study trend data (group by day)
    const [studySessions, meetPresence] = await Promise.all([
      prisma.studySession.findMany({
        where: { userId, startedAt: { gte: startDate, lte: endDate } },
        select: { startedAt: true, durationMinutes: true },
      }),
      prisma.meetPresenceSession.findMany({
        where: { userId, startedAt: { gte: startDate, lte: endDate } },
        select: { startedAt: true, endedAt: true, lastHeartbeatAt: true },
      }),
    ]);

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const studyData = days.map((day) => {
      let dailyMinutes = 0;
      
      // Traditional sessions
      for (const s of studySessions) {
        if (isSameDay(new Date(s.startedAt), day)) dailyMinutes += s.durationMinutes ?? 0;
      }

      // Meet presence
      let dailyMeetSecs = 0;
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      for (const m of meetPresence) {
        const ended = m.endedAt ?? m.lastHeartbeatAt ?? new Date();
        const a = Math.max(new Date(m.startedAt).getTime(), dayStart.getTime());
        const b = Math.min(ended.getTime(), dayEnd.getTime());
        if (b > a) dailyMeetSecs += (b - a) / 1000;
      }
      
      const totalHours = (dailyMinutes / 60) + (dailyMeetSecs / 3600);
      
      return {
        date: format(day, "MMM dd"),
        rawDate: day.toISOString(),
        hours: Number(totalHours.toFixed(2)),
      };
    });

    // 2. Task data (completed vs pending in date range)
    const tasks = await prisma.dailyTask.findMany({
      where: { userId, taskDate: { gte: startDate, lte: endDate } }
    });
    const completedTasks = tasks.filter(t => t.completedAt).length;
    const pendingTasks = tasks.length - completedTasks;

    const taskData = [
      { name: "Completed", value: completedTasks },
      { name: "Pending", value: pendingTasks }
    ];

    // 3. Attendance data (presence in date range vs absent)
    let presentDays = 0;
    let absentDays = 0;
    for (const d of studyData) {
      if (d.hours >= (10 / 60)) {
        presentDays++;
      } else {
        absentDays++;
      }
    }

    const attendanceData = [
      { name: "Present", value: presentDays },
      { name: "Absent", value: absentDays }
    ];

    const currentTotal = Number(studyData.reduce((s, d) => s + d.hours, 0).toFixed(2));
    let insights: string[] = [];
    if (days.length > 0) {
      const prevEnd = endOfDay(subDays(startDate, 1));
      const prevStart = startOfDay(subDays(prevEnd, days.length - 1));
      const prevTotal = await sumStudyHoursForRange(userId, prevStart, prevEnd);
      insights = buildInsights(studyData, currentTotal, prevTotal);
    }

    return NextResponse.json({
      studyData,
      taskData,
      attendanceData,
      insights,
      summary: {
        totalHours: currentTotal,
        totalTasks: tasks.length,
        completionRate: tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0,
        presentDays,
      }
    });

  } catch (error) {
    console.error("GET /api/dashboard/charts:", error);
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 });
  }
}
