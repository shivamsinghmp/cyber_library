import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMeetAddonCorsHeaders } from "../cors";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { "Access-Control-Max-Age": "86400" } });
}

export async function GET(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  const payload = verifyMeetAddonToken(
    request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.slice(7)
      : ""
  );

  const now = new Date();
  const polls = await prisma.meetPoll.findMany({
    where: { 
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } }
      ]
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, question: true, options: true, expiresAt: true },
  });

  const answered = payload
    ? new Set(
        (
          await prisma.meetPollResponse.findMany({
            where: { userId: payload.userId },
            select: { pollId: true },
          })
        ).map((r) => r.pollId)
      )
    : new Set<string>();

  const options = polls.map((p) => ({
    id: p.id,
    question: p.question,
    options: Array.isArray(p.options) ? p.options : (p.options as Record<string, unknown>)?.options ?? [],
    alreadyAnswered: answered.has(p.id),
    expiresAt: p.expiresAt?.toISOString() || null,
  }));
  return NextResponse.json(options, { headers: cors });
}
