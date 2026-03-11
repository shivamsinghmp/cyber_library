import { NextResponse } from "next/server";
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

/** POST: Add room subscriptions for current user (after purchase) */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userProfile = await prisma.profile.findUnique({
      where: { userId },
      select: { phone: true, whatsappNumber: true, fullName: true },
    });
    const userPhone = userProfile?.whatsappNumber || userProfile?.phone;

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { slotIds } = parsed.data;

    const existingSlots = await prisma.studySlot.findMany({
      where: { id: { in: slotIds } },
      select: { id: true, name: true, timeLabel: true, meetLink: true, calendarEventId: true },
    });
    const validIds = new Set(existingSlots.map((s) => s.id));
    const slotMap = new Map(existingSlots.map((s) => [s.id, s.calendarEventId]));

    for (const slotId of slotIds) {
      if (!validIds.has(slotId)) continue;
      await prisma.roomSubscription.upsert({
        where: {
          userId_studySlotId: { userId, studySlotId: slotId },
        },
        create: { userId, studySlotId: slotId },
        update: {},
      });

      // After successful subscription creation, try to add them to the Google Calendar
      const calendarEventId = slotMap.get(slotId);
      if (calendarEventId && session.user?.email) {
        // Fire & forget, don't wait/block the web request response on this succeeding 
        addStudentToCalendarEvent(calendarEventId, session.user.email)
          .catch(err => {
             console.error("Auto-admit background failure:", err);
             try { fs.writeFileSync("calendar-invite-error.txt", `Failed Invite: ${err}\n`, { flag: 'a' }); } catch(e){}
          });
      }

      // Send WhatsApp Notification if phone number exists (Meta pre-approved template)
      if (userPhone) {
        const slotData = existingSlots.find(s => s.id === slotId);
        if (slotData) {
           const userName = userProfile?.fullName ? userProfile.fullName.split(' ')[0] : 'Student';
           // Template name must match one created & approved in Meta Business Manager
           // e.g. "room_subscription_confirmation" or "booking_confirmation"
           // Template variables: {{1}} = Name, {{2}} = Room/Shift, {{3}} = TimeLabel
           sendWhatsAppTemplate(
             userPhone,
             "room_subscription_confirmation",
             "en",
             [userName, slotData.name, slotData.timeLabel]
           ).catch(err => console.error("WhatsApp Template Error:", err));
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/user/subscriptions:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
