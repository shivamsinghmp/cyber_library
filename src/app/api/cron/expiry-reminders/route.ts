import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

const SUBSCRIPTION_DAYS = 30;

/** GET: Send WhatsApp expiry reminders for subscriptions ending in 3 or 1 day.
 *  Fixed: N+1 query eliminated — profile fetched via include in single query.
 */
export async function GET(request: Request) {
  try {
    // Security tokens must only come from env — DB fallback allows privilege escalation
    // if the DB is compromised. Hard-fail if the env var is not set.
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Single query — profile included, no N+1
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
    let sent = 0;
    for (const r of reminders) {
      const ok = await sendWhatsAppTemplate(r.phone, templateName, "en", [r.roomName, String(r.daysLeft)]);
      if (ok) sent++;
    }

    return NextResponse.json({
      ok: true,
      reminders: reminders.length,
      sent,
      message: `Processed ${reminders.length} reminders, sent ${sent}.`,
    });
  } catch (e) {
    console.error("GET /api/cron/expiry-reminders:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
