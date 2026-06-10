import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encrypt";
import { sendWhatsAppText } from "@/lib/whatsapp";
import crypto from "crypto";

const PYTHON_URL    = process.env.PYTHON_SERVER_URL    ?? "http://localhost:8001";
const PYTHON_SECRET = process.env.PYTHON_SERVER_SECRET ?? "";

function encryptContent(plain: string) {
  try { const { encrypted, iv } = encrypt(plain); return { content: encrypted, contentIv: iv }; }
  catch { return { content: plain, contentIv: "" }; }
}

/**
 * Meta WhatsApp Business Platform Webhook
 *
 * Setup (one time):
 *   Meta Developer Console → App → WhatsApp → Configuration → Webhook
 *   Callback URL : https://yourdomain.com/api/webhooks/whatsapp
 *   Verify Token : value of WHATSAPP_VERIFY_TOKEN in .env
 *   Subscribe to : messages
 *
 * GET  — Meta webhook verification challenge
 * POST — Incoming messages + delivery/read status updates
 */

// ─── GET: Webhook verification ─────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();

  if (!verifyToken) {
    console.error("WHATSAPP_VERIFY_TOKEN not set in .env");
    return new Response("WHATSAPP_VERIFY_TOKEN not configured", { status: 500 });
  }

  const tokenMatch =
    mode === "subscribe" &&
    token !== null &&
    token.length === verifyToken.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(verifyToken));

  if (tokenMatch) {
    console.info("[Webhook/WhatsApp] verified ✓");
    return new Response(challenge ?? "", { status: 200 });
  }

  console.warn("WhatsApp webhook verification failed — token mismatch");
  return new Response("Forbidden", { status: 403 });
}

// ─── POST: Incoming events ─────────────────────────────────────────────────────

type WAEntry = {
  id: string;
  changes: {
    value: {
      messaging_product: string;
      metadata: { phone_number_id: string; display_phone_number: string };
      contacts?: { wa_id: string; profile: { name: string } }[];
      messages?: {
        id: string;           // wamid
        from: string;         // sender phone (without +)
        timestamp: string;
        type: string;
        text?: { body: string };
        image?: { caption?: string };
        audio?: object;
        video?: { caption?: string };
        document?: { filename?: string; caption?: string };
        sticker?: object;
        location?: { latitude: number; longitude: number; name?: string };
        reaction?: { message_id: string; emoji: string };
        button?: { text: string };
      }[];
      statuses?: {
        id: string;           // wamid of the outbound message
        status: "sent" | "delivered" | "read" | "failed";
        timestamp: string;
        recipient_id: string;
        errors?: { code: number; title: string }[];
      }[];
    };
    field: string;
  }[];
};

export async function POST(request: Request) {
  try {
    const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
    if (!appSecret) {
      // Hard-fail when the secret is missing — never process unsigned payloads.
      // Set WHATSAPP_APP_SECRET in .env to the App Secret from Meta Developer Console
      // → App → Settings → Basic → App Secret
      console.error("[webhook/whatsapp] WHATSAPP_APP_SECRET not configured — rejecting POST");
      return new Response("Service misconfigured", { status: 503 });
    }

    // Verify Meta's HMAC-SHA256 signature — prevents forged webhook payloads.
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256") ?? "";
    const expected = "sha256=" + crypto
      .createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex");
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    const valid =
      sigBuf.length > 0 &&
      sigBuf.length === expBuf.length &&
      crypto.timingSafeEqual(sigBuf, expBuf);

    if (!valid) {
      console.warn("[webhook/whatsapp] Invalid signature — request rejected");
      return new Response("Forbidden", { status: 403 });
    }

    const body = JSON.parse(rawBody) as { object: string; entry: WAEntry[] };
    return handleWebhookBody(body);
  } catch (e) {
    console.error("WhatsApp webhook error:", e);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function handleWebhookBody(body: { object: string; entry: WAEntry[] }) {
  try {

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;
        const { value } = change;

        // ── Inbound messages ──────────────────────────────────────────────────
        for (const msg of value.messages ?? []) {
          const fromPhone = `+${msg.from}`;
          const content   = extractContent(msg);

          // Find linked user (if any)
          const profile = await prisma.profile.findFirst({
            where: { OR: [{ phone: fromPhone }, { whatsappNumber: fromPhone }] },
            select: { userId: true },
          });

          // Opt-out: student texted STOP/BAND KRO/UNSUBSCRIBE → disable marketing messages
          const upperContent = content.trim().toUpperCase();
          const isOptOut = ["STOP", "BAND KRO", "UNSUBSCRIBE", "BAND KARO"].includes(upperContent);
          if (isOptOut && profile?.userId) {
            await prisma.profile.update({
              where: { userId: profile.userId },
              data:  { whatsappMarketing: false },
            });
            console.info(`[Webhook/WhatsApp] opt-out received from ${fromPhone}`);
          }

          // Meta retries webhooks — dedupe BEFORE firing the bot, otherwise a
          // retry produces a second AI reply and a second coin deduction.
          const alreadySeen = await prisma.whatsAppMessage.findUnique({
            where:  { wamid: msg.id },
            select: { id: true },
          });

          if (!alreadySeen) {
            const enc = encryptContent(content);
            await prisma.whatsAppMessage.create({
              data: {
                wamid:      msg.id,
                phoneNumber: fromPhone,
                content:    enc.content,
                contentIv:  enc.contentIv,
                direction:  "INBOUND",
                status:     "DELIVERED",
                userId:     profile?.userId ?? null,
              },
            }).catch(() => {}); // unique race with a parallel retry — safe to ignore

            console.info(`[Webhook/WhatsApp] inbound from ${fromPhone}: "${content.slice(0, 60)}"`);

            // ── AI Bot reply (fire-and-forget) ────────────────────────────────
            if (profile?.userId && !isOptOut && content.trim().length > 0 && !content.startsWith("[")) {
              handleWaBot(fromPhone, content, profile.userId).catch(() => {});
            }
          }
        }

        // ── Status updates (delivery receipts) ────────────────────────────────
        for (const status of value.statuses ?? []) {
          const mappedStatus = {
            sent:      "SENT",
            delivered: "DELIVERED",
            read:      "READ",
            failed:    "FAILED",
          }[status.status] ?? "SENT";

          await prisma.whatsAppMessage.updateMany({
            where: { wamid: status.id },
            data:  { status: mappedStatus },
          });

          console.info(`[Webhook/WhatsApp] status wamid=${status.id} → ${mappedStatus}`);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("WhatsApp webhook handleBody error:", e);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

// ─── Intent classifier ─────────────────────────────────────────────────────────
async function classifyIntent(message: string, apiKey: string | null): Promise<string> {
  if (!apiKey || message.trim().length <= 2) {
    return message.trim().length <= 2 ? "greeting" : "study_help";
  }
  try {
    const res = await fetch(`${PYTHON_URL}/classify/intent`, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${PYTHON_SECRET}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ message, apiKey }),
      signal:  AbortSignal.timeout(5_000),
    });
    if (!res.ok) return "study_help";
    const data = await res.json() as { intent: string };
    return data.intent || "study_help";
  } catch {
    return "study_help";
  }
}

// ─── WhatsApp AI Bot ────────────────────────────────────────────────────────────
async function handleWaBot(phone: string, userText: string, userId: string): Promise<void> {
  try {
    const { batchGetAppSettings } = await import("@/lib/app-settings");

    // Load settings + profile in parallel
    const [settings, profile] = await Promise.all([
      batchGetAppSettings(["GEMINI_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY"]),
      prisma.profile.findUnique({
        where:  { userId },
        select: { coinBalance: true, fullName: true, targetExam: true, targetYear: true,
                  studyGoal: true, totalStudyHours: true, currentStreak: true },
      }),
    ]);

    const googleKey = settings["GEMINI_API_KEY"] || null;

    // Step 1: Classify intent — cheap + fast, avoids wasting coins on greetings
    const intent = await classifyIntent(userText, googleKey);

    if (intent === "ignore") return;

    if (intent === "greeting") {
      await sendWhatsAppText(phone,
        "Hey! 👋 Type your study question and StudyMate AI will help you right away!"
      );
      return;
    }

    if (intent === "schedule") {
      await sendWhatsAppText(phone,
        "Check your class schedule here: https://lstudy.in/dashboard\n\n" +
        "Got a study question? Just ask and StudyMate AI will help! 📚"
      );
      return;
    }

    if (intent === "payment") {
      await sendWhatsAppText(phone,
        "Buy coins or manage your subscription here: https://lstudy.in/dashboard/wallet\n\n" +
        "💡 1 coin = ₹0.50 · AI study sessions start at 1 coin"
      );
      return;
    }

    // study_help → proceed with AI
    if (!profile || profile.coinBalance < 1) {
      await sendWhatsAppText(phone,
        "Hey! 🪙 You need coins to chat with StudyMate AI.\nBuy coins here: https://lstudy.in/dashboard/wallet/buy-coins"
      );
      return;
    }

    // Rate limit: max 6 bot replies per user per minute — protects the Gemini
    // quota and the WhatsApp send budget from message flooding
    const oneMinAgo = new Date(Date.now() - 60_000);
    const recentCount = await prisma.whatsAppMessage.count({
      where: { userId, direction: "OUTBOUND", createdAt: { gte: oneMinAgo } },
    });
    if (recentCount >= 6) {
      console.warn(`[WA Bot] rate limit hit for user ${userId}`);
      return;
    }

    // Load last 8 WA messages as conversation history
    const recentMsgs = await prisma.whatsAppMessage.findMany({
      where:   { userId, direction: { in: ["INBOUND", "OUTBOUND"] } },
      orderBy: { createdAt: "desc" },
      take:    8,
      select:  { direction: true, content: true, contentIv: true },
    });
    const { decrypt } = await import("@/lib/encrypt");

    const history = recentMsgs
      .reverse()
      .map((m) => {
        let content = m.content;
        // contentIv empty = stored as plaintext (encryption failed at write time)
        if (m.contentIv) {
          try { content = decrypt(m.content, m.contentIv); } catch { return null; }
        }
        return { role: m.direction === "INBOUND" ? "user" : "assistant", content };
      })
      .filter((m): m is { role: string; content: string } => m !== null);

    const keys = {
      google:    googleKey,
      anthropic: settings["ANTHROPIC_API_KEY"] || null,
      openai:    settings["OPENAI_API_KEY"]    || null,
    };

    const messages = [...history, { role: "user", content: userText }];

    // Call Python /chat/complete (non-streaming JSON endpoint)
    const pyRes = await fetch(`${PYTHON_URL}/chat/complete`, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${PYTHON_SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        availableModels: keys.google ? ["gemini-2.5-flash"] : [],
        currentCoins:    profile.coinBalance,
        acceptLowerQuality: true,
        budgetMode:      "strict",
        keys,
        profile: {
          name:            profile.fullName,
          targetExam:      profile.targetExam,
          targetYear:      profile.targetYear,
          studyGoal:       profile.studyGoal,
          totalStudyHours: profile.totalStudyHours,
          currentStreak:   profile.currentStreak,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!pyRes.ok) return;
    const data = await pyRes.json() as { reply: string; coins: number; model: string };
    if (!data.reply) return;

    // Send WA reply
    const wamid = await sendWhatsAppText(phone, data.reply);

    // Save outbound message + deduct coins (guard: never push balance negative
    // when two messages are processed concurrently)
    const coinsToDeduct = Math.max(0, data.coins ?? 1);
    const enc2 = encryptContent(data.reply);
    await prisma.$transaction(async (tx) => {
      await tx.whatsAppMessage.create({
        data: {
          wamid: wamid ?? undefined, phoneNumber: phone,
          content: enc2.content, contentIv: enc2.contentIv,
          direction: "OUTBOUND", status: wamid ? "SENT" : "FAILED", userId,
        },
      });
      const updated = await tx.profile.updateMany({
        where: { userId, coinBalance: { gte: coinsToDeduct } },
        data:  { coinBalance: { decrement: coinsToDeduct } },
      });
      if (updated.count > 0 && coinsToDeduct > 0) {
        await tx.studyCoinLog.create({
          data: { userId, coins: -coinsToDeduct, reason: `WA_BOT_${data.model?.toUpperCase().replace(/-/g, "_")}_${Date.now()}` },
        });
      }
    });
  } catch (e) {
    console.error("[WA Bot] error:", e);
  }
}

function extractContent(msg: NonNullable<WAEntry["changes"][0]["value"]["messages"]>[0]): string {
  if (msg.text?.body)                     return msg.text.body;
  if (msg.image?.caption)                 return `[Image] ${msg.image.caption}`;
  if (msg.image)                          return "[Image]";
  if (msg.video?.caption)                 return `[Video] ${msg.video.caption}`;
  if (msg.video)                          return "[Video]";
  if (msg.audio)                          return "[Voice Message]";
  if (msg.document?.filename)             return `[Document] ${msg.document.filename}`;
  if (msg.document)                       return "[Document]";
  if (msg.sticker)                        return "[Sticker]";
  if (msg.location?.name)                 return `[Location] ${msg.location.name}`;
  if (msg.location)                       return `[Location] ${msg.location.latitude},${msg.location.longitude}`;
  if (msg.reaction)                       return `[Reaction] ${msg.reaction.emoji}`;
  if (msg.button?.text)                   return `[Button] ${msg.button.text}`;
  return `[${msg.type}]`;
}
