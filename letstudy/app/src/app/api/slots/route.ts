import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Always fetch fresh list (no cache) so all students see rooms
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type")?.toUpperCase(); // STUDY | MENTORSHIP | MENTAL
    const where: { isActive: boolean; slotType?: string } = { isActive: true };
    if (type && ["STUDY", "MENTORSHIP", "MENTAL"].includes(type)) {
      where.slotType = type;
    }
    const slots = await prisma.studySlot.findMany({
      where,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        roomId: true,
        name: true,
        timeLabel: true,
        capacity: true,
        goal: true,
        slotType: true,
        meetLink: true,
        price: true,
      },
    });
    return NextResponse.json(Array.isArray(slots) ? slots : [], {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (e) {
    console.error("GET /api/slots:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
