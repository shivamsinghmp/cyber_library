import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.loginLog.findFirst({
      where: { userId, logoutAt: null },
      orderBy: { loginAt: "desc" },
    });
    if (existing) {
      return NextResponse.json({ ok: true });
    }

    await prisma.loginLog.create({
      data: { userId, loginAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("record-login:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
