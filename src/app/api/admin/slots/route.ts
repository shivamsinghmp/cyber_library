import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createStudyRoomEvent } from "@/lib/google-calendar";
import { generateRoomId } from "@/lib/roomId";
import * as fs from "fs";
import { requireSuperAdmin } from "@/lib/api-helpers";

const SLOT_TYPES = ["STUDY", "MENTORSHIP", "MENTAL"] as const;

const createSlotSchema = z.object({
  name: z.string().min(1, "Name is required"),
  timeLabel: z.string().min(1, "Time is required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  goal: z.string().nullable().optional(),
  slotType: z.enum(SLOT_TYPES).optional().default("STUDY"),
  meetLink: z.string().url("Must be a valid URL").nullable().optional().or(z.literal("")),
  calendarEventId: z.string().nullable().optional().or(z.literal("")),
  autoGenerateMeet: z.boolean().optional().default(false),
  capacity: z.number().int().min(0).default(10),
  price: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;
    const slots = await prisma.studySlot.findMany({
      orderBy: { createdAt: "asc" },
    });
    for (const s of slots) {
      if (!s.roomId) {
        const newRoomId = await generateRoomId();
        await prisma.studySlot.update({
          where: { id: s.id },
          data: { roomId: newRoomId },
        });
        (s as { roomId: string }).roomId = newRoomId;
      }
    }
    return NextResponse.json(slots);
  } catch (e) {
    console.error("GET /api/admin/slots:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;
    const body = await request.json();
    const parsed = createSlotSchema.safeParse({
      ...body,
      goal: body.goal === "" || body.goal == null ? null : body.goal,
      slotType: ["STUDY", "MENTORSHIP", "MENTAL"].includes(body.slotType) ? body.slotType : "STUDY",
      meetLink: body.meetLink === "" || body.meetLink == null ? null : body.meetLink,
      calendarEventId: body.calendarEventId === "" || body.calendarEventId == null ? null : body.calendarEventId,
      autoGenerateMeet: body.autoGenerateMeet,
      capacity: body.capacity != null ? Number(body.capacity) : 10,
      price: body.price != null ? Number(body.price) : 0,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    if (typeof (prisma as { studySlot?: unknown }).studySlot === "undefined") {
      return NextResponse.json(
        { error: "A slot with this name already exists in this room" },
        { status: 400 }
      );
    }

    let finalMeetLink = parsed.data.meetLink ?? null;
    let finalCalendarEventId = parsed.data.calendarEventId ?? null;

    if (parsed.data.autoGenerateMeet) {
      if (!parsed.data.startTime || !parsed.data.endTime) {
         return NextResponse.json({ error: "Start and End times are required when Auto-Generating Google Meet." }, { status: 400 });
      }
      const sDate = new Date(parsed.data.startTime);
      const eDate = new Date(parsed.data.endTime);
      
      const generated = await createStudyRoomEvent(`The Cyber Library: ${parsed.data.name}`, sDate, eDate);
      if (generated) {
        finalMeetLink = generated.meetLink;
        finalCalendarEventId = generated.calendarEventId;
      } else {
        fs.writeFileSync("calendar-error.txt", `Calendar Event Generation returned null for: ${parsed.data.name} at ${new Date().toISOString()}`, { flag: 'a' });
        return NextResponse.json({ error: "Failed to generate Google Meet. Ensure Google Cloud credentials are set correctly in .env" }, { status: 500 });
      }
    }

    const roomId = await generateRoomId();
    const validSlotData = { ...parsed.data } as Record<string, unknown>;
    delete validSlotData.autoGenerateMeet;
    delete validSlotData.meetLink;
    delete validSlotData.calendarEventId;
    delete validSlotData.startTime;
    delete validSlotData.endTime;
    
    const slot = await prisma.studySlot.create({
      data: {
        ...validSlotData,
        name: parsed.data.name,
        timeLabel: parsed.data.timeLabel,
        goal: parsed.data.goal ?? null,
        slotType: parsed.data.slotType ?? "STUDY",
        meetLink: finalMeetLink,
        calendarEventId: finalCalendarEventId,
        price: parsed.data.price ?? 0,
        roomId,
      },
    });
    return NextResponse.json(slot, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/slots:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
