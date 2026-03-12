import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCalendarEventAttendees } from "@/lib/google-calendar";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    if (!eventId || !eventId.trim()) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    const attendees = await getCalendarEventAttendees(eventId.trim());
    if (attendees === null) {
      return NextResponse.json(
        { error: "Could not fetch attendees (check Google Calendar credentials)" },
        { status: 500 }
      );
    }

    return NextResponse.json({ eventId: eventId.trim(), attendees });
  } catch (e) {
    console.error("GET /api/admin/calendar/event-attendees:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

