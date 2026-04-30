import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import { getMeetAddonCorsHeaders } from "../cors";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { "Access-Control-Max-Age": "86400" } });
}

export async function GET(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  try {
    const token = request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.slice(7) : "";
    const payload = verifyMeetAddonToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { name: true, email: true, profile: { select: { fullName: true } } },
    });

    const name = user?.profile?.fullName?.trim()
      || user?.name?.trim()
      || user?.email?.split("@")[0]
      || "Student";

    return NextResponse.json({ name, email: user?.email ?? "" }, { headers: cors });
  } catch (e) {
    console.error("[meet-addon/me]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500, headers: cors });
  }
}
