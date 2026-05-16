import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "googleapis/build/src/auth/oauth2client";
import { prisma } from "@/lib/prisma";
import { signMeetAddonToken } from "@/lib/meet-addon-token";
import { getMeetAddonCorsHeaders } from "../cors";
import { checkRateLimit } from "@/lib/rate-limit";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { "Access-Control-Max-Age": "86400" } });
}

/**
 * POST { idToken: string }
 * Verifies Google ID token, matches email to our user, issues meet-addon JWT.
 */
export async function POST(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = checkRateLimit(`meet-google-login:${ip}`, 20, 60_000);
    if (!limit.ok) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: cors });
    }

    const body = await request.json().catch(() => ({}));
    const idToken = typeof body.idToken === "string" ? body.idToken.trim() : "";
    if (!idToken) {
      return NextResponse.json({ error: "idToken required" }, { status: 400, headers: cors });
    }

    // ── Verify Google ID token ────────────────────────────────────────────────
    const clientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "Google login not configured." }, { status: 503, headers: cors });
    }

    const oauthClient = new OAuth2Client(clientId);
    let email: string;
    try {
      const ticket = await oauthClient.verifyIdToken({ idToken, audience: clientId });
      const payload = ticket.getPayload();
      if (!payload?.email || !payload.email_verified) {
        return NextResponse.json({ error: "Google account ka email verify nahi hai." }, { status: 401, headers: cors });
      }
      email = payload.email.toLowerCase();
    } catch {
      return NextResponse.json({ error: "Google token invalid hai." }, { status: 401, headers: cors });
    }

    // ── Match to our user ─────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, role: true, deletedAt: true, name: true,
        profile: { select: { fullName: true } },
      },
    });

    if (!user || user.deletedAt) {
      return NextResponse.json(
        { error: "Is Google account se koi Cyber Library account nahi mila. Pehle signup karo." },
        { status: 404, headers: cors }
      );
    }
    if (user.role !== "STUDENT" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sirf students Meet add-on use kar sakte hain." }, { status: 403, headers: cors });
    }

    const token = signMeetAddonToken(user.id);
    const displayName = user.profile?.fullName?.trim() || user.name?.trim() || email.split("@")[0];

    return NextResponse.json({ token, userId: user.id, name: displayName }, { headers: cors });
  } catch (e) {
    console.error("[meet-addon/google-login] error:", e);
    return NextResponse.json({ error: "Login fail hua." }, { status: 500, headers: cors });
  }
}
