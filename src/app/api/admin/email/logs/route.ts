import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const role = (u: unknown) => (u as { role?: string })?.role;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || role(session.user) !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
