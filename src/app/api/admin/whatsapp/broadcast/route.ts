import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { z } from "zod";

const role = (u: unknown) => (u as { role?: string })?.role;

/**
 * GET: List recipients for broadcast.
 * Query: slotId (optional). If provided, return students subscribed to that slot; otherwise all active students with WhatsApp.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || role(session.user) !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get("slotId") || undefined;

    if (slotId) {
      const subs = await prisma.roomSubscription.findMany({
        where: { studySlotId: slotId, user: { deletedAt: null } },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profile: { select: { fullName: true, whatsappNumber: true, phone: true } },
            },
          },
        },
      });
      const recipients = subs
        .map((s) => {
          const phone = s.user.profile?.whatsappNumber || s.user.profile?.phone;
          if (!phone) return null;
          return {
            userId: s.user.id,
            name: s.user.name || s.user.profile?.fullName || s.user.email,
            phoneNumber: phone,
          };
        })
        .filter(Boolean) as { userId: string; name: string; phoneNumber: string }[];
      const unique = Array.from(
        new Map(recipients.map((r) => [r.phoneNumber, r])).values()
      );
      return NextResponse.json(unique);
    }

    const users = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        deletedAt: null,
        OR: [
          { profile: { whatsappNumber: { not: null } } },
          { profile: { phone: { not: null } } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        profile: { select: { fullName: true, whatsappNumber: true, phone: true } },
      },
    });
    const list = users
      .map((u) => {
        const phone = u.profile?.whatsappNumber || u.profile?.phone;
        if (!phone) return null;
        return {
          userId: u.id,
          name: u.name || u.profile?.fullName || u.email,
          phoneNumber: phone,
        };
      })
      .filter(Boolean) as { userId: string; name: string; phoneNumber: string }[];
    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/admin/whatsapp/broadcast:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const postSchema = z.object({
  target: z.enum(["all", "slot"]),
  slotId: z.string().optional(),
  message: z.string().min(1, "Message is required"),
});

async function getRecipients(slotId: string | undefined) {
  if (slotId) {
    const subs = await prisma.roomSubscription.findMany({
      where: { studySlotId: slotId, user: { deletedAt: null } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: { select: { fullName: true, whatsappNumber: true, phone: true } },
          },
        },
      },
    });
    const list = subs
      .map((s) => {
        const phone = s.user.profile?.whatsappNumber || s.user.profile?.phone;
        if (!phone) return null;
        return {
          userId: s.user.id,
          name: s.user.name || s.user.profile?.fullName || s.user.email,
          phoneNumber: phone,
        };
      })
      .filter(Boolean) as { userId: string; name: string; phoneNumber: string }[];
    return Array.from(new Map(list.map((r) => [r.phoneNumber, r])).values());
  }
  const users = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      deletedAt: null,
      OR: [
        { profile: { whatsappNumber: { not: null } } },
        { profile: { phone: { not: null } } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      profile: { select: { fullName: true, whatsappNumber: true, phone: true } },
    },
  });
  return users
    .map((u) => {
      const phone = u.profile?.whatsappNumber || u.profile?.phone;
      if (!phone) return null;
      return {
        userId: u.id,
        name: u.name || u.profile?.fullName || u.email,
        phoneNumber: phone,
      };
    })
    .filter(Boolean) as { userId: string; name: string; phoneNumber: string }[];
}

/**
 * POST: Send broadcast message to all or slot subscribers. Uses text message (template recommended for large scale).
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || role(session.user) !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { target, slotId, message } = parsed.data;
    const recipients = await getRecipients(target === "slot" ? slotId : undefined);

    let sent = 0;
    let failed = 0;
    for (const r of recipients) {
      const ok = await sendWhatsAppText(r.phoneNumber, message);
      await prisma.whatsAppMessage.create({
        data: {
          phoneNumber: r.phoneNumber,
          content: message,
          direction: "OUTBOUND",
          status: ok ? "SENT" : "FAILED",
          userId: r.userId,
        },
      });
      if (ok) sent++;
      else failed++;
    }

    return NextResponse.json({
      ok: true,
      total: recipients.length,
      sent,
      failed,
    });
  } catch (e) {
    console.error("POST /api/admin/whatsapp/broadcast:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
