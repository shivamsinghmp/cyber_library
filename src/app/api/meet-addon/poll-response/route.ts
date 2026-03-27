import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import { getMeetAddonCorsHeaders } from "../cors";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { "Access-Control-Max-Age": "86400" } });
}

export async function POST(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  const payload = verifyMeetAddonToken(
    request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.slice(7)
      : ""
  );
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }
  const body = await request.json().catch(() => ({}));
  const pollId = typeof body.pollId === "string" ? body.pollId.trim() : "";
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  if (!pollId || !answer) {
    return NextResponse.json({ error: "pollId and answer required" }, { status: 400, headers: cors });
  }
  const poll = await prisma.meetPoll.findFirst({ where: { id: pollId, isActive: true } });
  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404, headers: cors });
  }
  const pollOptions = Array.isArray(poll.options)
    ? poll.options.map((v) => String(v))
    : [];
  if (!pollOptions.includes(answer)) {
    return NextResponse.json({ error: "Answer must match a poll option" }, { status: 400, headers: cors });
  }
  await prisma.meetPollResponse.upsert({
    where: { userId_pollId: { userId: payload.userId, pollId } },
    create: { userId: payload.userId, pollId, answer },
    update: { answer },
  });
  return NextResponse.json({ ok: true }, { headers: cors });
}
