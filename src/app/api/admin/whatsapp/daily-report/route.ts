import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { encrypt } from "@/lib/encrypt";

const TEMPLATE_KEY = "WA_DAILY_REPORT_TEMPLATE";

const DEFAULT_TEMPLATE = `🎓 *Let's Study — Daily Report*

Hello *{{name}}*! 👋

Here's your performance for today — great work! 💪

📚 *Study Time:* {{studyHours}} hrs ({{studyMins}} min)
✅ *Tasks Done:* {{tasksCompleted}} / {{totalTasks}}
🔥 *Streak:* {{streak}} days
🪙 *Coins Today:* +{{coinsToday}} (Balance: {{coins}})

💬 *Quote of the Day:*
_{{quote}}_

Consistency is the road to success. Do even better tomorrow! 🚀

— Let's Study Team`;

const QUOTES = [
  "सपने वो नहीं जो हम सोते वक्त देखते हैं, सपने वो हैं जो हमें सोने नहीं देते। — A.P.J. Abdul Kalam",
  "कठिनाइयाँ वो होती हैं जो आपको तब दिखती हैं जब आप अपने लक्ष्य से नजर हटा लेते हैं। — Henry Ford",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. — Winston Churchill",
  "The secret of getting ahead is getting started. — Mark Twain",
  "Don't watch the clock; do what it does — keep going. — Sam Levenson",
  "पढ़ोगे-लिखोगे तो बनोगे नवाब। — Loksaying",
  "Hard work beats talent when talent doesn't work hard. — Tim Notke",
  "जो कोशिश करना नहीं छोड़ते, वो जीतते ज़रूर हैं। — Anonymous",
  "Believe you can and you're halfway there. — Theodore Roosevelt",
  "एक छोटा कदम रोज़ उठाओ, मंज़िल खुद पास आ जाएगी। — Anonymous",
  "Your future is created by what you do today, not tomorrow. — Robert Kiyosaki",
  "Study not to know more, but to become more. — Anonymous",
  "हर रात के बाद एक सुबह ज़रूर आती है। बस टिके रहो। — Anonymous",
  "The more you read, the more things you will know. — Dr. Seuss",
  "It always seems impossible until it's done. — Nelson Mandela",
  "मेहनत इतनी खामोशी से करो कि सफलता शोर मचा दे। — Anonymous",
  "Don't stop when you're tired, stop when you're done. — Anonymous",
  "जिंदगी में कुछ बड़ा करना है तो आराम से दोस्ती मत करो। — Anonymous",
  "Education is the most powerful weapon you can use to change the world. — Nelson Mandela",
  "Push yourself, because no one else is going to do it for you. — Anonymous",
];

function getRandomQuote(): string {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (str, [key, val]) => str.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(val)),
    template
  );
}

function encryptContent(plain: string) {
  try { const { encrypted, iv } = encrypt(plain); return { content: encrypted, contentIv: iv }; }
  catch { return { content: plain, contentIv: "" }; }
}

// ─── GET: fetch saved template ─────────────────────────────────────────────────
export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const row = await prisma.appSetting.findUnique({ where: { key: TEMPLATE_KEY } });
    return NextResponse.json({ template: row?.valueEncrypted ?? DEFAULT_TEMPLATE });
  } catch (e) {
    console.error("GET /api/admin/whatsapp/daily-report:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// ─── POST: save template OR send ──────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();

    // ── Save template ──
    if (body.action === "save") {
      const { template } = body;
      if (!template) return NextResponse.json({ error: "template required" }, { status: 400 });
      await prisma.appSetting.upsert({
        where: { key: TEMPLATE_KEY },
        create: { key: TEMPLATE_KEY, valueEncrypted: template, iv: null },
        update: { valueEncrypted: template },
      });
      return NextResponse.json({ success: true });
    }

    // ── Send daily report ──
    if (body.action === "send") {
      const { template } = body as { template: string };

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Fetch all students with WhatsApp/phone
      const profiles = await prisma.profile.findMany({
        where: { OR: [{ whatsappNumber: { not: null } }, { phone: { not: null } }] },
        select: {
          userId: true,
          fullName: true,
          whatsappNumber: true,
          phone: true,
          currentStreak: true,
          coinBalance: true,
        },
      });

      let sent = 0;
      let failed = 0;
      const results: { name: string; phone: string; status: string }[] = [];

      for (const profile of profiles) {
        const phoneNumber = profile.whatsappNumber ?? profile.phone ?? "";
        if (!phoneNumber) continue;

        const userId = profile.userId;

        // Fetch today's data in parallel
        const [sessions, tasks, coinLogs] = await Promise.all([
          prisma.studySession.findMany({
            where: { userId, startedAt: { gte: todayStart, lte: todayEnd }, durationMinutes: { not: null } },
            select: { durationMinutes: true },
          }),
          prisma.dailyTask.findMany({
            where: { userId, taskDate: { gte: todayStart, lte: todayEnd } },
            select: { completedAt: true },
          }),
          prisma.studyCoinLog.findMany({
            where: { userId, createdAt: { gte: todayStart, lte: todayEnd }, coins: { gt: 0 } },
            select: { coins: true },
          }),
        ]);

        const studyMins   = sessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
        const studyHours  = (studyMins / 60).toFixed(1);
        const totalTasks  = tasks.length;
        const tasksDone   = tasks.filter((t) => t.completedAt !== null).length;
        const coinsToday  = coinLogs.reduce((sum, c) => sum + c.coins, 0);

        const message = fillTemplate(template, {
          name:           profile.fullName ?? "Student",
          studyHours,
          studyMins,
          tasksCompleted: tasksDone,
          totalTasks,
          streak:         profile.currentStreak,
          coins:          profile.coinBalance,
          coinsToday,
          quote:          getRandomQuote(),
        });

        const wamid = await sendWhatsAppText(phoneNumber, message);
        const enc   = encryptContent(message);

        await prisma.whatsAppMessage.create({
          data: {
            wamid:      wamid ?? undefined,
            phoneNumber,
            content:    enc.content,
            contentIv:  enc.contentIv,
            direction:  "OUTBOUND",
            status:     wamid ? "SENT" : "FAILED",
            userId,
          },
        });

        if (wamid) { sent++; results.push({ name: profile.fullName ?? phoneNumber, phone: phoneNumber, status: "sent" }); }
        else { failed++; results.push({ name: profile.fullName ?? phoneNumber, phone: phoneNumber, status: "failed" }); }

        // Small delay to avoid Meta rate limits
        await new Promise((r) => setTimeout(r, 120));
      }

      return NextResponse.json({ success: true, sent, failed, total: profiles.length, results });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("POST /api/admin/whatsapp/daily-report:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
