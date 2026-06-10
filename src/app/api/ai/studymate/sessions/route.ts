import { NextResponse } from "next/server";
import { requireModule } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

// ─── GET — list all sessions for the user ─────────────────────────────────────
export async function GET() {
  const auth = await requireModule("studymate");
  if (auth.error) return auth.error;

  const sessions = await prisma.chatSession.findMany({
    where:   { userId: auth.user.id },
    orderBy: { updatedAt: "desc" },
    take:    50,
    select: {
      id:        true,
      title:     true,
      createdAt: true,
      updatedAt: true,
      _count:    { select: { messages: true } },
    },
  });

  return NextResponse.json(sessions);
}

// ─── POST — create a new empty session ───────────────────────────────────────
export async function POST() {
  const auth = await requireModule("studymate");
  if (auth.error) return auth.error;

  const session = await prisma.chatSession.create({
    data:   { userId: auth.user.id },
    select: {
      id: true, title: true, createdAt: true, updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json(session);
}
