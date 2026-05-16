import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const HEARTBEAT_EXPIRY_MS = 90 * 1000;

function extractMeetCode(meetLink: string): string {
  return meetLink.replace("https://meet.google.com/", "").split("?")[0].trim();
}

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || (role !== "ADMIN" && !(session.user as { isSuperAdmin?: boolean }).isSuperAdmin)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - HEARTBEAT_EXPIRY_MS);

  // Get all active slots that have a meet link
  const slots = await prisma.studySlot.findMany({
    where: { isActive: true },
    select: { id: true, name: true, timeLabel: true, roomId: true, meetLink: true },
    orderBy: { name: "asc" },
  });

  const result = await Promise.all(slots.map(async (slot) => {
    // Find MeetRoom matching this slot's meetLink or roomId
    const meetCode = slot.meetLink ? extractMeetCode(slot.meetLink) : (slot.roomId ?? "");
    const room = await prisma.meetRoom.findUnique({
      where: { roomKey: meetCode },
      select: { id: true },
    });

    const liveStudents = room
      ? await prisma.meetPresenceSession.findMany({
          where: {
            roomId: room.id,
            endedAt: null,
            lastHeartbeatAt: { gt: cutoff },
          },
          select: {
            id: true,
            startedAt: true,
            lastHeartbeatAt: true,
            user: { select: { id: true, name: true, email: true, studentId: true } },
          },
        })
      : [];

    // Today's total check-ins for this slot
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCheckins = await prisma.roomCheckIn.count({
      where: { studySlotId: slot.id, checkedInAt: { gte: todayStart } },
    });

    return {
      slotId:       slot.id,
      slotName:     slot.name,
      timeLabel:    slot.timeLabel,
      roomId:       slot.roomId,
      meetLink:     slot.meetLink,
      liveCount:    liveStudents.length,
      todayCheckins,
      liveStudents: liveStudents.map(s => ({
        userId:      s.user.id,
        name:        s.user.name ?? s.user.email,
        email:       s.user.email,
        studentId:   s.user.studentId,
        joinedAt:    s.startedAt.toISOString(),
        lastSeen:    s.lastHeartbeatAt.toISOString(),
        liveSeconds: Math.floor((Date.now() - s.startedAt.getTime()) / 1000),
      })),
    };
  }));

  return NextResponse.json({
    slots: result,
    totalLive: result.reduce((sum, s) => sum + s.liveCount, 0),
    generatedAt: new Date().toISOString(),
  });
}
