import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { encrypt } from "@/lib/encrypt";

const PYTHON_URL    = process.env.PYTHON_SERVER_URL    ?? "http://localhost:8001";
const PYTHON_SECRET = process.env.PYTHON_SERVER_SECRET ?? "";

function encryptMsg(plain: string) {
  try { const { encrypted, iv } = encrypt(plain); return { content: encrypted, contentIv: iv }; }
  catch { return { content: plain, contentIv: "" }; }
}

const WEEKLY_TEMPLATE = `🎓 *Let's Study — Weekly Summary*

Hello *{{name}}*! 👋 Here's your week at a glance:

📚 *Total Study Time:* {{studyHours}} hrs
✅ *Tasks Completed:* {{tasksCompleted}} / {{totalTasks}}
🔥 *Best Streak:* {{streak}} days
🪙 *Coins Earned:* +{{coinsEarned}} this week
💬 *AI Chats:* {{aiChats}} conversations

{{topLine}}

Keep up the great work! See you next week. 🚀

— Let's Study Team`;

/**
 * GET /api/cron/weekly-report
 * Crontab (Sunday 8 PM IST = 14:30 UTC):
 *  30 14 * * 0 curl -s -H "Authorization: Bearer $CRON_SECRET" https://lstudy.in/api/cron/weekly-report
 */
export async function GET(request: Request) {
  try {
    const CRON_SECRET = process.env.CRON_SECRET?.trim();
    if (!CRON_SECRET) return NextResponse.json({ error: "Service misconfigured" }, { status: 503 });

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token || token !== CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ── Date range: last 7 days ───────────────────────────────────────────────
    const weekEnd   = new Date(); weekEnd.setHours(23, 59, 59, 999);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0);

    // ── Fetch users with phone ────────────────────────────────────────────────
    const profiles = await prisma.profile.findMany({
      where: {
        OR: [{ whatsappNumber: { not: null } }, { phone: { not: null } }],
        whatsappMarketing: true,
      },
      select: {
        userId: true, fullName: true, whatsappNumber: true, phone: true, currentStreak: true,
      },
    });

    if (profiles.length === 0) return NextResponse.json({ ok: true, sent: 0, total: 0 });

    // ── Fetch weekly data per user ────────────────────────────────────────────
    const userDataList = await Promise.all(
      profiles.map(async (p) => {
        const uid = p.userId;
        const [sessions, tasks, coinLogs, aiLogs] = await Promise.all([
          prisma.studySession.findMany({
            where:  { userId: uid, startedAt: { gte: weekStart, lte: weekEnd }, durationMinutes: { not: null } },
            select: { durationMinutes: true },
          }),
          prisma.dailyTask.findMany({
            where:  { userId: uid, taskDate: { gte: weekStart, lte: weekEnd } },
            select: { completedAt: true },
          }),
          prisma.studyCoinLog.findMany({
            where:  { userId: uid, createdAt: { gte: weekStart, lte: weekEnd }, coins: { gt: 0 } },
            select: { coins: true },
          }),
          prisma.aIUsageLog.count({
            where: { userId: uid, createdAt: { gte: weekStart, lte: weekEnd }, status: "success" },
          }),
        ]);

        const studyMins = sessions.reduce((s, x) => s + (x.durationMinutes ?? 0), 0);
        const coinsEarned = coinLogs.reduce((s, c) => s + c.coins, 0);
        const completedTasks = tasks.filter(t => t.completedAt !== null).length;

        // Motivational top line based on performance
        let topLine = "Consistency is the key to success. Keep going! 💪";
        if (studyMins > 600) topLine = "Wow! Over 10 hours of study this week — you're unstoppable! 🌟";
        else if (studyMins > 300) topLine = "Great week! 5+ hours — you're building real momentum! 🚀";
        else if (completedTasks > 5) topLine = "Excellent task completion rate this week — keep crushing it! ✅";

        return {
          userId:         uid,
          name:           p.fullName ?? "Student",
          phone:          (p.whatsappNumber ?? p.phone) as string,
          studyMins,
          studyHours:     (studyMins / 60).toFixed(1),
          tasksCompleted: completedTasks,
          totalTasks:     tasks.length,
          streak:         p.currentStreak,
          coinsEarned,
          aiChats:        aiLogs,
          topLine,
        };
      })
    );

    // ── Format via Python /report/format ──────────────────────────────────────
    let formattedMessages: { phone: string; message: string; userId: string }[] = [];

    try {
      const pyRes = await fetch(`${PYTHON_URL}/report/format`, {
        method:  "POST",
        headers: { "Authorization": `Bearer ${PYTHON_SECRET}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ users: userDataList, template: WEEKLY_TEMPLATE }),
        signal:  AbortSignal.timeout(30_000),
      });
      if (pyRes.ok) {
        const data = await pyRes.json() as { messages: typeof formattedMessages };
        formattedMessages = data.messages;
      } else {
        return NextResponse.json({ error: "Python server error" }, { status: 502 });
      }
    } catch {
      return NextResponse.json({ error: "Python server unreachable" }, { status: 502 });
    }

    // ── Send WhatsApp messages ────────────────────────────────────────────────
    let sent = 0, failed = 0;

    for (const msg of formattedMessages) {
      const wamid = await sendWhatsAppText(msg.phone, msg.message);
      const enc   = encryptMsg(msg.message);

      await prisma.whatsAppMessage.create({
        data: {
          wamid: wamid ?? undefined, phoneNumber: msg.phone,
          content: enc.content, contentIv: enc.contentIv,
          direction: "OUTBOUND", status: wamid ? "SENT" : "FAILED",
          userId: msg.userId || null,
        },
      });

      wamid ? sent++ : failed++;
      await new Promise(r => setTimeout(r, 120));
    }

    console.log(`[cron/weekly-report] sent=${sent} failed=${failed} total=${formattedMessages.length}`);
    return NextResponse.json({ ok: true, sent, failed, total: formattedMessages.length });

  } catch (e) {
    console.error("[cron/weekly-report] error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
