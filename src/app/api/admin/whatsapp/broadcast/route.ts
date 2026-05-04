import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/api-helpers";

/**
 * GET: List recipients for broadcast.
 * Query: slotId (optional). If provided, return students subscribed to that slot; otherwise all active students with WhatsApp.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

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
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

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

    // Process in batches of 50 with 300ms delay between batches.
    // Prevents: OOM crash, WhatsApp API rate limiting, blocking main thread.
    const BATCH_SIZE = 50;
    const BATCH_DELAY_MS = 300;

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (r) => {
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
        })
      );

      // Delay between batches (skip delay after last batch)
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise((res) => setTimeout(res, BATCH_DELAY_MS));
      }
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
