import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { z } from "zod";

const isStaff = (session: { user?: { role?: string } } | null) => {
  const role = (session?.user as { role?: string })?.role;
  return role === "ADMIN" || role === "EMPLOYEE";
};

/**
 * GET: Fetch unique contacts (recent conversations) or chat history for a phone.
 * Staff (ADMIN + EMPLOYEE) only.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isStaff(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phoneNumber");

    if (phoneNumber) {
      const messages = await prisma.whatsAppMessage.findMany({
        where: { phoneNumber },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json(messages);
    }

    const allMessages = await prisma.whatsAppMessage.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, image: true, email: true } },
      },
    });

    const uniqueContacts = new Map<string, { phoneNumber: string; latestMessage: string; timestamp: Date; user: typeof allMessages[0]["user"] }>();
    for (const msg of allMessages) {
      if (!uniqueContacts.has(msg.phoneNumber)) {
        uniqueContacts.set(msg.phoneNumber, {
          phoneNumber: msg.phoneNumber,
          latestMessage: msg.content,
          timestamp: msg.createdAt,
          user: msg.user,
        });
      }
    }

    return NextResponse.json(Array.from(uniqueContacts.values()));
  } catch (e) {
    console.error("GET /api/staff/whatsapp:", e);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

const sendSchema = z.object({
  phoneNumber: z.string().min(10),
  message: z.string().min(1, "Message cannot be empty"),
  userId: z.string().optional(),
});

/**
 * POST: Send a WhatsApp message. Staff (ADMIN + EMPLOYEE) only.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isStaff(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
    }

    const { phoneNumber, message, userId } = parsed.data;

    const success = await sendWhatsAppText(phoneNumber, message);

    const record = await prisma.whatsAppMessage.create({
      data: {
        phoneNumber,
        content: message,
        direction: "OUTBOUND",
        status: success ? "SENT" : "FAILED",
        userId: userId || null,
      },
    });

    if (!success) {
      return NextResponse.json({ error: "API Failure: Check WhatsApp credentials or template rules" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, record });
  } catch (e) {
    console.error("POST /api/staff/whatsapp:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
