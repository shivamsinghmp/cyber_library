import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import { getMeetAddonCorsHeaders } from "../../meet-addon/cors";

async function authUserId(request: NextRequest): Promise<string | null> {
  // 1. Try Meet Add-on Bearer Token (Iframe bypassing third-party cookies)
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (token) {
     const payload = verifyMeetAddonToken(token);
     if (payload?.userId) return payload.userId;
  }

  // 2. Try Standard NextAuth Session (Browser session)
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { "Access-Control-Max-Age": "86400" } });
}

export async function PATCH(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  const userId = await authUserId(request);
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }

  try {
    const body = await request.json();
    const { status } = body;

    if (typeof status !== "string") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400, headers: cors });
    }

    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: { 
        liveStatus: status.substring(0, 50), // limit to 50 chars for safety
        liveStatusUpdatedAt: new Date()
      },
      select: { liveStatus: true }
    });

    return NextResponse.json({ ok: true, status: updatedProfile.liveStatus }, { headers: cors });
  } catch (error) {
    // Note: If profile doesn't exist, this will throw, but Profile is usually created on signup
    console.error("Live status update failed:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500, headers: cors });
  }
}
