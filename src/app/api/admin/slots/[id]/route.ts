import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createStudyRoomEvent } from "@/lib/google-calendar";
import { requireSuperAdmin } from "@/lib/api-helpers";

const updateSlotSchema = z.object({
  name: z.string().min(1).optional(),
  timeLabel: z.string().min(1).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  goal: z.string().nullable().optional(),
  slotType: z.enum(["STUDY", "MENTORSHIP", "MENTAL"]).optional(),
  meetLink: z.string().url("Must be a valid URL").nullable().optional().or(z.literal("")),
  calendarEventId: z.string().nullable().optional().or(z.literal("")),
  autoGenerateMeet: z.boolean().optional().default(false),
  capacity: z.number().int().min(0).optional(),
  price: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSlotSchema.safeParse({
      ...body,
      goal: body.goal === "" || body.goal === undefined ? null : body.goal,
      slotType: ["STUDY", "MENTORSHIP", "MENTAL"].includes(body.slotType) ? body.slotType : undefined,
      meetLink: body.meetLink === "" || body.meetLink === undefined ? null : body.meetLink,
      calendarEventId: body.calendarEventId === "" || body.calendarEventId === undefined ? null : body.calendarEventId,
      autoGenerateMeet: body.autoGenerateMeet,
      capacity: body.capacity != null ? Number(body.capacity) : undefined,
      price: body.price != null ? Number(body.price) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    let finalMeetLink = parsed.data.meetLink !== undefined ? parsed.data.meetLink : undefined;
    let finalCalendarEventId = parsed.data.calendarEventId !== undefined ? parsed.data.calendarEventId : undefined;

    if (parsed.data.autoGenerateMeet) {
      if (!parsed.data.startTime || !parsed.data.endTime) {
         return NextResponse.json({ error: "Start and End times are required when Auto-Generating Google Meet." }, { status: 400 });
      }
      const sDate = new Date(parsed.data.startTime);
      const eDate = new Date(parsed.data.endTime);
      
      const generated = await createStudyRoomEvent(`The Cyber Library: ${parsed.data.name || "Updated Slot"}`, sDate, eDate);
      if (generated) {
        finalMeetLink = generated.meetLink;
        finalCalendarEventId = generated.calendarEventId;
      } else {
        return NextResponse.json({ error: "Failed to generate Google Meet. Ensure Google Cloud credentials are set correctly in .env" }, { status: 500 });
      }
    }

    const validData = { ...parsed.data } as Record<string, any>;
    delete validData.autoGenerateMeet;
    delete validData.startTime;
    delete validData.endTime;

    // Apply the final values overriding any incoming if autoGenerate was used
    if (finalMeetLink !== undefined) validData.meetLink = finalMeetLink;
    if (finalCalendarEventId !== undefined) validData.calendarEventId = finalCalendarEventId;

    const slot = await prisma.studySlot.update({
      where: { id },
      data: validData,
    });
    return NextResponse.json(slot);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }
    console.error("PUT /api/admin/slots/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;
    const { id } = await params;
    await prisma.studySlot.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }
    console.error("DELETE /api/admin/slots/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
