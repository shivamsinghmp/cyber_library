import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTemplate, sendWhatsAppText } from "@/lib/whatsapp";

const SUBSCRIPTION_DAYS = 30;

/** GET: Send WhatsApp expiry reminders for room subscriptions + trial plan expiry.
 *  Runs daily via cron (Authorization: Bearer <CRON_SECRET>).
 */
export async function GET(request: Request) {
  try {
    const CRON_SECRET = process.env.CRON_SECRET?.trim();
    if (!CRON_SECRET) {
      console.error("[cron] CRON_SECRET env var not set — refusing to run");
      return NextResponse.json({ error: "Service misconfigured" }, { status: 503 });
    }
    const authHeader = request.headers.get("authorization");
    const token      = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token || token !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 1. Room subscription reminders (existing logic) ────────────

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allSubs = await prisma.roomSubscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            profile: { select: { whatsappNumber: true, phone: true } },
          },
        },
        studySlot: { select: { name: true, timeLabel: true } },
      },
    });

    const reminders: { userId: string; phone: string; roomName: string; daysLeft: number }[] = [];

    for (const sub of allSubs) {
      const endDate = new Date(sub.createdAt);
      endDate.setDate(endDate.getDate() + SUBSCRIPTION_DAYS);
      endDate.setHours(0, 0, 0, 0);

      const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft !== 3 && daysLeft !== 1) continue;

      const phone = sub.user.profile?.whatsappNumber || sub.user.profile?.phone;
      if (!phone) continue;

      reminders.push({ userId: sub.user.id, phone, roomName: sub.studySlot.name, daysLeft });
    }

    const templateName = "subscription_expiring_reminder";
    let roomSent = 0;
    for (const r of reminders) {
      const ok = await sendWhatsAppTemplate(r.phone, templateName, "en", [r.roomName, String(r.daysLeft)]);
      if (ok) roomSent++;
    }

    // ── 2. Trial expiry notifications ──────────────────────────────

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd   = new Date(todayEnd);   tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    // Trials expiring TODAY → expired message + mark EXPIRED
    const expiredTrials = await prisma.userSubscription.findMany({
      where: {
        planType: "TRIAL",
        status: "ACTIVE",
        endDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        user: {
          select: {
            name: true,
            profile: { select: { whatsappNumber: true, phone: true } },
          },
        },
      },
    });

    // Trials expiring TOMORROW → warning message
    const expiringTrials = await prisma.userSubscription.findMany({
      where: {
        planType: "TRIAL",
        status: "ACTIVE",
        endDate: { gte: tomorrowStart, lte: tomorrowEnd },
      },
      include: {
        user: {
          select: {
            name: true,
            profile: { select: { whatsappNumber: true, phone: true } },
          },
        },
      },
    });

    let trialExpiredSent = 0;
    let trialWarningSent = 0;

    // Mark expired + send trial-ended message
    for (const sub of expiredTrials) {
      const phone = sub.user.profile?.whatsappNumber || sub.user.profile?.phone;
      const name  = sub.user.name ?? "Student";

      // Mark EXPIRED in DB
      await prisma.userSubscription.update({
        where: { id: sub.id },
        data: { status: "EXPIRED" },
      });

      // Log expired trial event
      const { logTrialEvent } = await import("@/lib/trial-logger");
      const daysUsed = Math.ceil((new Date().getTime() - sub.startDate.getTime()) / 86_400_000);
      logTrialEvent({ userId: sub.userId, event: "expired", detail: `Trial expired. Days used: ${daysUsed}`, daysUsed });

      if (!phone) continue;

      const msg =
        `Hello ${name}! 🙏\n\n` +
        `*Let's Study* — Your *7-day free trial* ended today.\n\n` +
        `We hope you enjoyed our study rooms, AI assistant, and other features during the trial.\n\n` +
        `🚀 *Subscribe now and continue your studies:*\n` +
        `https://cyberlib.in/pricing\n\n` +
        `Feel free to reach out if you have any questions. Best of luck! 💪`;

      const ok = await sendWhatsAppText(phone, msg);
      if (ok) trialExpiredSent++;
    }

    // Send "trial expires tomorrow" warning
    for (const sub of expiringTrials) {
      const phone = sub.user.profile?.whatsappNumber || sub.user.profile?.phone;
      const name  = sub.user.name ?? "Student";

      if (!phone) continue;

      const msg =
        `Hello ${name}! ⏰\n\n` +
        `*Let's Study* — Your *free trial ends tomorrow!*\n\n` +
        `Features that will become unavailable:\n` +
        `• Study Room Access\n` +
        `• AI Study Assistant\n` +
        `• Live Video Sessions\n` +
        `• Daily Slots Booking\n\n` +
        `✅ *Subscribe today and keep your access:*\n` +
        `https://cyberlib.in/pricing\n\n` +
        `Don't stop studying! 📚`;

      const ok = await sendWhatsAppText(phone, msg);
      if (ok) trialWarningSent++;
    }

    // ── 3. Subscription plan expiry reminders (MONTHLY/YEARLY) ──────
    //    Looks up WhatsAppTemplate with triggerEvent="3days_before" / "1day_before"
    //    Falls back to plain text if no approved template is configured.

    const in3Days = new Date(todayStart); in3Days.setDate(in3Days.getDate() + 3);
    const in3DaysEnd = new Date(in3Days); in3DaysEnd.setHours(23, 59, 59, 999);
    const in1Day    = new Date(tomorrowStart);
    const in1DayEnd = new Date(tomorrowEnd);

    const expiringPlans = await prisma.userSubscription.findMany({
      where: {
        planType: { in: ["MONTHLY", "YEARLY"] },
        status:   "ACTIVE",
        OR: [
          { endDate: { gte: in3Days,  lte: in3DaysEnd } },  // 3 days left
          { endDate: { gte: in1Day,   lte: in1DayEnd  } },  // 1 day left
        ],
      },
      include: {
        user: {
          select: {
            name: true,
            profile: {
              select: {
                whatsappNumber: true,
                phone:           true,
                whatsappMarketing: true,
              },
            },
          },
        },
      },
    });

    // Fetch configured templates
    const [tmpl3days, tmpl1day] = await Promise.all([
      prisma.whatsAppTemplate.findFirst({
        where: { triggerEvent: "3days_before", isActive: true, status: "APPROVED" },
      }),
      prisma.whatsAppTemplate.findFirst({
        where: { triggerEvent: "1day_before", isActive: true, status: "APPROVED" },
      }),
    ]);

    let planReminderSent = 0;

    for (const sub of expiringPlans) {
      const phone = sub.user.profile?.whatsappNumber || sub.user.profile?.phone;
      const name  = sub.user.name ?? "Student";
      if (!phone || sub.user.profile?.whatsappMarketing === false) continue;

      const endDate = new Date(sub.endDate);
      const daysLeft = Math.ceil((endDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
      const tmpl = daysLeft <= 1 ? tmpl1day : tmpl3days;

      let sent: string | null = null;

      if (tmpl) {
        // Use approved template
        const params = [name, String(daysLeft)].slice(0, tmpl.variableCount || 2);
        sent = await sendWhatsAppTemplate(phone, tmpl.name, tmpl.language, params);
      } else {
        // Fallback plain text
        const msg =
          `Hello ${name}! ⏰\n\n` +
          `*Let's Study* — Your subscription expires in *${daysLeft} days*!\n\n` +
          `Renew before you lose access:\n` +
          `https://cyberlib.in/pricing\n\n` +
          `Keep studying! 📚`;
        sent = await sendWhatsAppText(phone, msg);
      }

      if (sent) planReminderSent++;
    }

    return NextResponse.json({
      ok: true,
      roomReminders: { total: reminders.length,       sent: roomSent },
      trialExpired:  { total: expiredTrials.length,    sent: trialExpiredSent },
      trialWarning:  { total: expiringTrials.length,   sent: trialWarningSent },
      planReminders: { total: expiringPlans.length,    sent: planReminderSent },
    });
  } catch (e) {
    console.error("GET /api/cron/expiry-reminders:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
