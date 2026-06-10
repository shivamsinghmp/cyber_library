import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { encrypt } from "@/lib/encrypt";

const PYTHON_URL    = process.env.PYTHON_SERVER_URL    ?? "http://localhost:8001";
const PYTHON_SECRET = process.env.PYTHON_SERVER_SECRET ?? "";
const TEMPLATE_KEY  = "WA_DAILY_REPORT_TEMPLATE";

function encryptMsg(plain: string) {
  try { const { encrypted, iv } = encrypt(plain); return { content: encrypted, contentIv: iv }; }
  catch { return { content: plain, contentIv: "" }; }
}

/**
 * GET /api/cron/daily-report
 * Secured with Bearer CRON_SECRET.
 *
 * Flow:
 *  1. Fetch all users with a phone number
 *  2. Fetch today's study data per user (sessions, tasks, coins)
 *  3. POST all user data to Python /report/format → get formatted WA messages
 *  4. Send each message via WhatsApp + save to DB
 *
 * Crontab (9 PM IST = 15:30 UTC):
 *  30 15 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://lstudy.in/api/cron/daily-report
 */
export async function GET(request: Request) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const CRON_SECRET = process.env.CRON_SECRET?.trim();
    if (!CRON_SECRET) {
      console.error("[cron/daily-report] CRON_SECRET not set");
      return NextResponse.json({ error: "Service misconfigured" }, { status: 503 });
    }
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token || token !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Fetch template from DB ─────────────────────────────────────────────────
    const templateRow = await prisma.appSetting.findUnique({ where: { key: TEMPLATE_KEY } });
    const template    = templateRow?.valueEncrypted ?? null; // null → Python uses DEFAULT_TEMPLATE

    // ── Date range: today ─────────────────────────────────────────────────────
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

    // ── Fetch all users with phone number ────────────────────────────────────
    const profiles = await prisma.profile.findMany({
      where: { OR: [{ whatsappNumber: { not: null } }, { phone: { not: null } }] },
      select: {
        userId:          true,
        fullName:        true,
        whatsappNumber:  true,
        phone:           true,
        currentStreak:   true,
        coinBalance:     true,
      },
    });

    if (profiles.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, failed: 0, total: 0, message: "No users with phone number" });
    }

    // ── Fetch today's study data for all users in parallel ───────────────────
    const userDataList = await Promise.all(
      profiles.map(async (profile) => {
        const uid = profile.userId;
        const [sessions, tasks, coinLogs] = await Promise.all([
          prisma.studySession.findMany({
            where: { userId: uid, startedAt: { gte: todayStart, lte: todayEnd }, durationMinutes: { not: null } },
            select: { durationMinutes: true },
          }),
          prisma.dailyTask.findMany({
            where: { userId: uid, taskDate: { gte: todayStart, lte: todayEnd } },
            select: { completedAt: true },
          }),
          prisma.studyCoinLog.findMany({
            where: { userId: uid, createdAt: { gte: todayStart, lte: todayEnd }, coins: { gt: 0 } },
            select: { coins: true },
          }),
        ]);

        return {
          userId:         uid,
          name:           profile.fullName ?? "Student",
          phone:          (profile.whatsappNumber ?? profile.phone) as string,
          studyMins:      sessions.reduce((s, x) => s + (x.durationMinutes ?? 0), 0),
          tasksCompleted: tasks.filter(t => t.completedAt !== null).length,
          totalTasks:     tasks.length,
          streak:         profile.currentStreak,
          coins:          profile.coinBalance,
          coinsToday:     coinLogs.reduce((s, c) => s + c.coins, 0),
        };
      })
    );

    // ── Ask Python to format all messages ────────────────────────────────────
    let formattedMessages: { phone: string; message: string; userId: string }[] = [];

    try {
      const pyRes = await fetch(`${PYTHON_URL}/report/format`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PYTHON_SECRET}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({ users: userDataList, template }),
        signal: AbortSignal.timeout(30_000),
      });

      if (pyRes.ok) {
        const data = await pyRes.json() as { messages: typeof formattedMessages };
        formattedMessages = data.messages;
      } else {
        console.error("[cron/daily-report] Python format error:", pyRes.status);
        return NextResponse.json({ error: "Python server error during report formatting" }, { status: 502 });
      }
    } catch (e) {
      console.error("[cron/daily-report] Python unreachable:", e);
      return NextResponse.json({ error: "Python server unreachable" }, { status: 502 });
    }

    // ── Send WhatsApp messages (with 120ms delay between each to avoid rate limits) ──
    let sent   = 0;
    let failed = 0;
    const results: { name: string; phone: string; status: string }[] = [];

    for (const msg of formattedMessages) {
      const wamid = await sendWhatsAppText(msg.phone, msg.message);
      const enc   = encryptMsg(msg.message);
      const name  = userDataList.find(u => u.userId === msg.userId)?.name ?? msg.phone;

      await prisma.whatsAppMessage.create({
        data: {
          wamid:       wamid ?? undefined,
          phoneNumber: msg.phone,
          content:     enc.content,
          contentIv:   enc.contentIv,
          direction:   "OUTBOUND",
          status:      wamid ? "SENT" : "FAILED",
          userId:      msg.userId || null,
        },
      });

      if (wamid) { sent++;   results.push({ name, phone: msg.phone, status: "sent" }); }
      else       { failed++; results.push({ name, phone: msg.phone, status: "failed" }); }

      // Small delay to avoid Meta rate limits
      await new Promise(r => setTimeout(r, 120));
    }

    console.log(`[cron/daily-report] Done — sent=${sent} failed=${failed} total=${formattedMessages.length}`);
    return NextResponse.json({
      ok: true,
      sent,
      failed,
      total: formattedMessages.length,
      results,
    });

  } catch (e) {
    console.error("[cron/daily-report] Unexpected error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
