import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signMeetAddonToken } from "@/lib/meet-addon-token";
import { getMeetAddonCorsHeaders } from "../cors";
import { checkRateLimit } from "@/lib/rate-limit";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { "Access-Control-Max-Age": "86400" } });
}

export async function POST(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = checkRateLimit(`meet-link-with-code:${ip}`, 20, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait and retry." },
        { status: 429, headers: cors }
      );
    }

    const body = await request.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code.replace(/\D/g, "").slice(0, 6) : "";
    if (code.length !== 6) {
      return NextResponse.json({ error: "Enter the 6-digit code from your dashboard" }, { status: 400, headers: cors });
    }
    const row = await prisma.meetAddonLinkCode.findUnique({
      where: { code },
      include: { user: { select: { id: true, role: true } } },
    });
    if (!row || row.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired code. Get a new code from your dashboard." }, { status: 400, headers: cors });
    }
    if (row.user.role !== "STUDENT" && row.user.role !== "ADMIN") {
      return NextResponse.json({ error: "This account cannot use the add-on" }, { status: 403, headers: cors });
    }
    await prisma.meetAddonLinkCode.delete({ where: { id: row.id } });
    const token = signMeetAddonToken(row.userId);
    console.info("meet-addon-link-with-code-success", { userId: row.userId, ip });
    return NextResponse.json({ token, userId: row.userId }, { headers: cors });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500, headers: cors });
  }
}
