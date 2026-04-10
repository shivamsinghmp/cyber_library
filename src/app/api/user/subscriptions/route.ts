import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { addStudentToCalendarEvent } from "@/lib/google-calendar";
import { sendWhatsAppText, sendWhatsAppTemplate } from "@/lib/whatsapp";
import * as fs from "fs";

const bodySchema = z.object({
  slotIds: z.array(z.string().min(1)).min(1, "At least one slot required"),
});

/** GET: List current user's room subscriptions with slot details */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subs = await prisma.roomSubscription.findMany({
      where: { userId },
      include: {
        studySlot: {
          select: {
            id: true,
            roomId: true,
            name: true,
            timeLabel: true,
            isActive: true,
            meetLink: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const list = subs.map((s) => {
      const validUntil = new Date(s.createdAt);
      validUntil.setDate(validUntil.getDate() + 30);
      return {
      id: s.id,
      studySlotId: s.studySlotId,
      createdAt: s.createdAt,
      endDate: validUntil.toISOString(),
      room: {
        id: s.studySlot.id,
        roomId: s.studySlot.roomId,
        name: s.studySlot.name,
        timeLabel: s.studySlot.timeLabel,
        isActive: s.studySlot.isActive,
        meetLink: s.studySlot.meetLink,
      },
    };
  });

    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/user/subscriptions:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** POST: DEPRECATED - All subscriptions are now handled securely by the backend /api/razorpay/verify route */
export async function POST(request: Request) {
  return NextResponse.json({ error: "Direct subscription creation is disabled for security reasons." }, { status: 403 });
}
