import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as { id?: string }).id;
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { dailyMantra: true },
    });

    return NextResponse.json({ dailyMantra: profile?.dailyMantra ?? null });
  } catch (e) {
    console.error("GET /api/dashboard/mantra:", e);
    return NextResponse.json({ error: "Failed to fetch mantra" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as { id?: string }).id;
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const raw = body.dailyMantra;
    if (typeof raw !== "string") {
      return NextResponse.json({ error: "dailyMantra string required" }, { status: 400 });
    }
    const dailyMantra = raw.trim() ? raw.trim().slice(0, 5000) : null;

    await prisma.profile.upsert({
      where: { userId },
      create: { userId, dailyMantra },
      update: { dailyMantra },
    });

    return NextResponse.json({ dailyMantra });
  } catch (e) {
    console.error("POST /api/dashboard/mantra:", e);
    return NextResponse.json({ error: "Failed to save mantra" }, { status: 500 });
  }
}
