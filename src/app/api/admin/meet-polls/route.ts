import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const polls = await prisma.meetPoll.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { responses: true } } },
  });
  return NextResponse.json(
    polls.map((p) => ({
      id: p.id,
      question: p.question,
      options: p.options,
      isActive: p.isActive,
      responseCount: p._count.responses,
      createdAt: p.createdAt.toISOString(),
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const options = Array.isArray(body.options) ? body.options.filter((o: unknown) => typeof o === "string").map((o: string) => String(o).trim()) : [];
  if (!question) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }
  if (options.length < 2) {
    return NextResponse.json({ error: "At least 2 options required" }, { status: 400 });
  }
  const poll = await prisma.meetPoll.create({
    data: { question, options },
  });
  console.info("meet-poll-created", { pollId: poll.id, adminId: (session.user as { id?: string }).id });
  return NextResponse.json({ id: poll.id, question: poll.question, options: poll.options });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const question = typeof body.question === "string" ? body.question.trim() : undefined;
  const options = Array.isArray(body.options)
    ? body.options
        .filter((o: unknown) => typeof o === "string")
        .map((o: string) => o.trim())
        .filter(Boolean)
    : undefined;
  const isActive = typeof body.isActive === "boolean" ? body.isActive : undefined;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (options && options.length < 2) {
    return NextResponse.json({ error: "At least 2 options required" }, { status: 400 });
  }

  const poll = await prisma.meetPoll.update({
    where: { id },
    data: {
      ...(question ? { question } : {}),
      ...(options ? { options } : {}),
      ...(typeof isActive === "boolean" ? { isActive } : {}),
    },
  });
  console.info("meet-poll-updated", { pollId: poll.id, adminId: (session.user as { id?: string }).id });

  return NextResponse.json({
    id: poll.id,
    question: poll.question,
    options: poll.options,
    isActive: poll.isActive,
  });
}
