import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMeetAddonCorsHeaders } from "../cors";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { "Access-Control-Max-Age": "86400" } });
}

export async function GET(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  const polls = await prisma.meetPoll.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, question: true, options: true },
  });
  const options = polls.map((p) => ({
    id: p.id,
    question: p.question,
    options: Array.isArray(p.options) ? p.options : (p.options as Record<string, unknown>)?.options ?? [],
  }));
  return NextResponse.json(options, { headers: cors });
}
