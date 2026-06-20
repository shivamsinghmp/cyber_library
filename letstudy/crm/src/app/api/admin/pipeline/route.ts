import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSales } from "@/lib/api-helpers";
import { z } from "zod";

export async function GET() {
  const auth = await requireSales();
  if (auth.error) return auth.error;

  try {
    const contacts = await prisma.crmContact.findMany({
      orderBy: { updatedAt: "desc" },
    });

    const assigneeIds = [...new Set(contacts.map(c => c.assignedToId).filter((id): id is string => !!id))];
    const assignees = assigneeIds.length
      ? await prisma.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true, email: true } })
      : [];
    const assigneeMap = new Map(assignees.map(a => [a.id, a.name || a.email]));

    return NextResponse.json({
      contacts: contacts.map(c => ({ ...c, assigneeName: c.assignedToId ? assigneeMap.get(c.assignedToId) ?? null : null })),
    });
  } catch (e) {
    console.error("GET /api/admin/pipeline:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const createSchema = z.object({
  name:  z.string().min(1).max(200).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(20).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireSales();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    if (!parsed.data.name && !parsed.data.email && !parsed.data.phone) {
      return NextResponse.json({ error: "Provide at least a name, email, or phone." }, { status: 400 });
    }

    const contact = await prisma.crmContact.create({
      data: { ...parsed.data, source: "MANUAL", stage: "NEW" },
    });
    return NextResponse.json(contact, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/pipeline:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
