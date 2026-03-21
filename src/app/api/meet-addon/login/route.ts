import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { signMeetAddonToken } from "@/lib/meet-addon-token";
import { getMeetAddonCorsHeaders } from "../cors";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { "Access-Control-Max-Age": "86400" } });
}

export async function POST(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400, headers: cors });
    }
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, password: true, role: true, deletedAt: true },
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
    return NextResponse.json({ token, userId: user.id }, { headers: cors });
  } catch (e) {
    return NextResponse.json({ error: "Login failed" }, { status: 500, headers: cors });
  }
}
