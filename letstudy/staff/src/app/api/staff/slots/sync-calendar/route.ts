import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkStaffModuleApi } from "@/lib/permissions";
import { addStudentToCalendarEvent } from "@/lib/google-calendar";

/**
 * POST /api/staff/slots/sync-calendar
 * Adds ALL currently enrolled students for a slot to its Google Calendar event.
 * This grants them auto-admit bypass on Google Meet.
 */
export async function POST(request: Request) {
  try {
    const auth = await checkStaffModuleApi("VIRTUAL_LIBRARY");
    if (auth.error) return auth.error;

    const { slotId } = await request.json();
    if (!slotId) return NextResponse.json({ error: "slotId required" }, { status: 400 });

    const slot = await prisma.studySlot.findUnique({
      where: { id: slotId },
      select: { id: true, name: true, calendarEventId: true },
    });

    if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    if (!slot.calendarEventId) {
      return NextResponse.json(
        { error: "This slot does not have a Google Calendar Event ID. Please create one via 'Generate Meet' first." },
        { status: 400 }
      );
    }

    const subscriptions = await prisma.roomSubscription.findMany({
      where: { studySlotId: slotId },
      select: { user: { select: { email: true, profile: { select: { fullName: true } } } } },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({ success: true, added: 0, failed: 0, message: "No enrolled students found." });
    }

    let added = 0;
    let failed = 0;
    const results: { email: string; status: string }[] = [];

    for (const sub of subscriptions) {
      const email = sub.user.email;
      const ok = await addStudentToCalendarEvent(slot.calendarEventId, email);
      if (ok) { added++; results.push({ email, status: "added" }); }
      else    { failed++; results.push({ email, status: "failed" }); }
      await new Promise((r) => setTimeout(r, 100));
    }

    console.info(`[sync-calendar] slot=${slotId} added=${added} failed=${failed}`);
    return NextResponse.json({ success: true, added, failed, total: subscriptions.length, results });
  } catch (e) {
    console.error("POST /api/staff/slots/sync-calendar:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
