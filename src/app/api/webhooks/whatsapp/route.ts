import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encrypt";
import crypto from "crypto";

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

  if (mode === "subscribe" && token === verifyToken) {
    console.log("WhatsApp webhook verified ✓");
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

          const enc = encryptContent(content);
          await prisma.whatsAppMessage.upsert({
            where:  { wamid: msg.id },
            create: {
              wamid:      msg.id,
              phoneNumber: fromPhone,
              content:    enc.content,
              contentIv:  enc.contentIv,
              direction:  "INBOUND",
              status:     "DELIVERED",
              userId:     profile?.userId ?? null,
            },
            update: {}, // already saved — no-op
          });

          console.log(`WhatsApp inbound from ${fromPhone}: "${content.slice(0, 60)}"`);
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

          console.log(`WhatsApp status update wamid=${status.id} → ${mappedStatus}`);
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
