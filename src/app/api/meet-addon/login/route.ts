import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
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
    const limit = checkRateLimit(`meet-login:${ip}`, 10, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many login attempts. Please retry later." },
        { status: 429, headers: cors }
      );
    }

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400, headers: cors });
    }
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, password: true, role: true, deletedAt: true, name: true, profile: { select: { fullName: true } } },
    });
    if (!user?.password || (user as { deletedAt?: Date | null }).deletedAt) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401, headers: cors });
    }
    if (user.role !== "STUDENT" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only students can use the Meet add-on" }, { status: 403, headers: cors });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401, headers: cors });
    }
    const token = signMeetAddonToken(user.id);
    const displayName = (user as { profile?: { fullName?: string | null } | null }).profile?.fullName?.trim()
      || (user as { name?: string | null }).name?.trim()
      || email.split("@")[0];
    console.info("meet-addon-login-success", { userId: user.id, ip });
    return NextResponse.json({ token, userId: user.id, name: displayName }, { headers: cors });
  } catch (e) {
    console.error("meet-addon-login-failed", e);
    return NextResponse.json({ error: "Login failed" }, { status: 500, headers: cors });
  }
}
