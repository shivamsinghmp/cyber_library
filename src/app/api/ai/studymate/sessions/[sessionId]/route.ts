import { NextResponse } from "next/server";
import { requireModule } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ sessionId: string }> };

// ─── GET — load messages for a session ───────────────────────────────────────
export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireModule("studymate");
  if (auth.error) return auth.error;

  const { sessionId } = await params;

  const session = await prisma.chatSession.findFirst({
    where:  { id: sessionId, userId: auth.user.id },
    select: {
      id:        true,
      title:     true,
      createdAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select:  { id: true, role: true, content: true, model: true, coins: true, createdAt: true },
      },
    },
  });

  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(session);
}

// ─── DELETE — delete a session and all its messages ──────────────────────────
export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireModule("studymate");
  if (auth.error) return auth.error;

  const { sessionId } = await params;

  const session = await prisma.chatSession.findFirst({
    where:  { id: sessionId, userId: auth.user.id },
    select: { id: true },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.chatSession.delete({ where: { id: sessionId } });
  return NextResponse.json({ ok: true });
}

// ─── PATCH — rename a session ─────────────────────────────────────────────────
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireModule("studymate");
  if (auth.error) return auth.error;

  const { sessionId } = await params;
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const session = await prisma.chatSession.findFirst({
    where:  { id: sessionId, userId: auth.user.id },
    select: { id: true },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.chatSession.update({
    where:  { id: sessionId },
    data:   { title },
    select: { id: true, title: true },
  });
  return NextResponse.json(updated);
}
