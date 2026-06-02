import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { encrypt, decrypt } from "@/lib/encrypt";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/api-helpers";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function encryptContent(plain: string): { content: string; contentIv: string } {
  try {
    const { encrypted, iv } = encrypt(plain);
    return { content: encrypted, contentIv: iv };
  } catch {
    // Fallback: store plain if ENCRYPTION_KEY not set
    return { content: plain, contentIv: "" };
  }
}

function decryptContent(content: string, iv: string | null): string {
  if (!iv) return content; // legacy plain text row
  try {
    return decrypt(content, iv);
  } catch {
    return "[encrypted]";
  }
}

function decryptMessage(msg: { content: string; contentIv: string | null; [key: string]: unknown }) {
  return { ...msg, content: decryptContent(msg.content, msg.contentIv) };
}

// ─── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phoneNumber");

    if (phoneNumber) {
      // Fetch only needed columns — skip unrelated fields
      const messages = await prisma.whatsAppMessage.findMany({
        where: { phoneNumber },
        orderBy: { createdAt: "asc" },
        select: { id: true, wamid: true, phoneNumber: true, direction: true, content: true, contentIv: true, status: true, createdAt: true, userId: true },
        take: 500, // max 500 messages per chat
      });
      return NextResponse.json(messages.map(decryptMessage));
    }

    // Contacts list: one row per phone number — use raw groupBy instead of loading all messages
    const latestPerPhone = await prisma.whatsAppMessage.findMany({
      distinct: ["phoneNumber"],
      orderBy: { createdAt: "desc" },
      select: {
        phoneNumber: true,
        content: true,
        contentIv: true,
        direction: true,
        createdAt: true,
        user: { select: { id: true, name: true, image: true, email: true } },
      },
      take: 1000,
    });

    return NextResponse.json(
      latestPerPhone.map((msg) => ({
        phoneNumber: msg.phoneNumber,
        latestMessage: decryptContent(msg.content, msg.contentIv),
        latestDirection: msg.direction,
        timestamp: msg.createdAt,
        user: msg.user,
      }))
    );
  } catch (e) {
    console.error("GET /api/admin/whatsapp:", e);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// ─── POST ──────────────────────────────────────────────────────────────────────

const sendSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format"),
  message:     z.string().min(1).max(4096),
  userId:      z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const body   = await request.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    const { phoneNumber, message, userId } = parsed.data;

    const wamid = await sendWhatsAppText(phoneNumber, message);

    const { content, contentIv } = encryptContent(message);

    const record = await prisma.whatsAppMessage.create({
      data: {
        wamid:      wamid ?? undefined,
        phoneNumber,
        content,
        contentIv,
        direction:  "OUTBOUND",
        status:     wamid ? "SENT" : "FAILED",
        userId:     userId || null,
      },
    });

    if (!wamid) {
      return NextResponse.json({ error: "WhatsApp API failure — check credentials" }, { status: 502 });
    }

    // Return decrypted record to client
    return NextResponse.json({ ok: true, record: decryptMessage(record) });
  } catch (e) {
    console.error("POST /api/admin/whatsapp:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
