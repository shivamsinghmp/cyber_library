import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSlotSchema = z.object({
  name: z.string().min(1).optional(),
  timeLabel: z.string().min(1).optional(),
  goal: z.string().nullable().optional(),
  slotType: z.enum(["STUDY", "MENTORSHIP", "MENTAL"]).optional(),
  meetLink: z.string().url("Must be a valid URL").nullable().optional().or(z.literal("")),
  calendarEventId: z.string().nullable().optional().or(z.literal("")),
  capacity: z.number().int().min(0).optional(),
  price: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSlotSchema.safeParse({
      ...body,
      goal: body.goal === "" || body.goal === undefined ? null : body.goal,
      slotType: ["STUDY", "MENTORSHIP", "MENTAL"].includes(body.slotType) ? body.slotType : undefined,
      meetLink: body.meetLink === "" || body.meetLink === undefined ? null : body.meetLink,
      calendarEventId: body.calendarEventId === "" || body.calendarEventId === undefined ? null : body.calendarEventId,
      capacity: body.capacity != null ? Number(body.capacity) : undefined,
      price: body.price != null ? Number(body.price) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const slot = await prisma.studySlot.update({
      where: { id },
      data: parsed.data,
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
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
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
