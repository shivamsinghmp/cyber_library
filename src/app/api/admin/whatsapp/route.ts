import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { z } from "zod";

/**
 * GET: Fetch unique contacts (recent conversations) and their chat history.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phoneNumber");

    // If a specific phone number is requested, return its full chat history
    if (phoneNumber) {
      const messages = await prisma.whatsAppMessage.findMany({
        where: { phoneNumber },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json(messages);
    }

    // Otherwise, fetch unique conversations (latest message per phone number)
    // Prisma doesn't have a distinct ON for standard queries easily without raw SQL, 
    // so we'll fetch ordered and group in JS.
    const allMessages = await prisma.whatsAppMessage.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, image: true, email: true } }
      }
    });

    const uniqueContacts = new Map();
    for (const msg of allMessages) {
      if (!uniqueContacts.has(msg.phoneNumber)) {
        uniqueContacts.set(msg.phoneNumber, {
          phoneNumber: msg.phoneNumber,
          latestMessage: msg.content,
          timestamp: msg.createdAt,
          user: msg.user, // Associate mapped student details if they exist in our DB
        });
      }
    }

    return NextResponse.json(Array.from(uniqueContacts.values()));
  } catch (e) {
    console.error("GET /api/admin/whatsapp:", e);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

const sendSchema = z.object({
  phoneNumber: z.string().min(10),
  message: z.string().min(1, "Message cannot be empty"),
  userId: z.string().optional(), // If sending to a specific student profile
});

/**
 * POST: Send a manual WhatsApp message to a student from the Admin Dashboard.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = sendSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
    }

    const { phoneNumber, message, userId } = parsed.data;

    // Send the message via Meta Cloud API
    const success = await sendWhatsAppText(phoneNumber, message);

    // Regardless, store it in outbox history for tracking
    const record = await prisma.whatsAppMessage.create({
      data: {
        phoneNumber,
        content: message,
        direction: "OUTBOUND",
        status: success ? "SENT" : "FAILED",
        userId: userId || null,
      }
    });

    if (!success) {
       return NextResponse.json({ error: "API Failure: Check WhatsApp Credentials or Template rules" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, record });
  } catch (e) {
    console.error("POST /api/admin/whatsapp:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
