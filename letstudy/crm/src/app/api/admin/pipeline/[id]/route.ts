import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSales } from "@/lib/api-helpers";
import { z } from "zod";

const STAGES = ["NEW", "CONTACTED", "TRIAL", "CONVERTED", "LOST"] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSales();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const contact = await prisma.crmContact.findUnique({
      where: { id },
      include: { activities: { orderBy: { createdAt: "desc" } } },
    });
    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const authorIds = [...new Set(contact.activities.map(a => a.authorId).filter((id): id is string => !!id))];
    const assigneeIds = contact.assignedToId ? [contact.assignedToId] : [];
    const peopleIds = [...new Set([...authorIds, ...assigneeIds])];
    const people = peopleIds.length
      ? await prisma.user.findMany({ where: { id: { in: peopleIds } }, select: { id: true, name: true, email: true } })
      : [];
    const peopleMap = new Map(people.map(p => [p.id, p.name || p.email]));

    return NextResponse.json({
      ...contact,
      assigneeName: contact.assignedToId ? peopleMap.get(contact.assignedToId) ?? null : null,
      activities: contact.activities.map(a => ({ ...a, authorName: a.authorId ? peopleMap.get(a.authorId) ?? null : null })),
    });
  } catch (e) {
    console.error("GET /api/admin/pipeline/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const updateSchema = z.object({
  name:         z.string().max(200).optional(),
  email:        z.union([z.string().email(), z.literal("")]).optional(),
  phone:        z.string().max(20).optional(),
  stage:        z.enum(STAGES).optional(),
  assignedToId: z.union([z.string(), z.null()]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSales();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const existing = await prisma.crmContact.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const stageChanged = parsed.data.stage && parsed.data.stage !== existing.stage;

    const updated = await prisma.crmContact.update({
      where: { id },
      data: parsed.data,
    });

    if (stageChanged) {
      await prisma.crmActivity.create({
        data: {
          contactId: id,
          authorId: auth.user.id,
          type: "STAGE_CHANGE",
          content: `Stage changed: ${existing.stage} → ${parsed.data.stage}`,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/admin/pipeline/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const noteSchema = z.object({
  content: z.string().min(1, "Note can't be empty").max(4000),
});

/** Add a note to the contact's activity timeline. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSales();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const existing = await prisma.crmContact.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const activity = await prisma.crmActivity.create({
      data: { contactId: id, authorId: auth.user.id, type: "NOTE", content: parsed.data.content },
    });
    return NextResponse.json(activity, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/pipeline/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
