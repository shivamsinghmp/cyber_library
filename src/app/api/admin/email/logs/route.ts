import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    // auth verified (user identity confirmed by requireSuperAdmin/requireAdmin)

    const logs = await prisma.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200, // Limit to 200 logs to prevent payload overload
    });

    return NextResponse.json(logs);
  } catch (e) {
    console.error("GET /api/admin/email/logs:", e);
    return NextResponse.json({ error: "Failed to fetch email logs" }, { status: 500 });
  }
}
