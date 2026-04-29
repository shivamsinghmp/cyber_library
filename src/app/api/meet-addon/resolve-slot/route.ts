import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import { getMeetAddonCorsHeaders } from "../cors";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { "Access-Control-Max-Age": "86400" } });
}

/**
 * GET /api/meet-addon/resolve-slot?meetingId=abc-defg-hij
 * Matches a Google Meet ID to a StudySlot by checking meetLink contains the meeting code.
 */
export async function GET(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  try {
    const token = request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.slice(7) : "";
    const payload = verifyMeetAddonToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
    }

    const meetingId = request.nextUrl.searchParams.get("meetingId")?.trim();
    if (!meetingId) return NextResponse.json({ slotId: null }, { headers: cors });

    // Extract meeting code from full URL or just use as-is
    // SDK returns "abc-defg-hij" format
    const meetCode = meetingId.replace("https://meet.google.com/", "").split("?")[0].trim();

    const slot = await prisma.studySlot.findFirst({
      where: {
        OR: [
          { meetLink: { contains: meetCode, mode: "insensitive" } },
          { roomId: meetCode },
        ],
        isActive: true,
      },
      select: { id: true, name: true, timeLabel: true, roomId: true, meetLink: true },
    });

    if (!slot) return NextResponse.json({ slotId: null, meetCode }, { headers: cors });

    return NextResponse.json({
      slotId: slot.id,
      slotName: slot.name,
      timeLabel: slot.timeLabel,
      roomId: slot.roomId,
    }, { headers: cors });
  } catch (e) {
    console.error("[meet-addon/resolve-slot] GET error:", e);
    return NextResponse.json({ slotId: null }, { status: 500, headers: cors });
  }
}
