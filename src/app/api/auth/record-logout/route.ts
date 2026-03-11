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

    const open = await prisma.loginLog.findFirst({
      where: { userId, logoutAt: null },
      orderBy: { loginAt: "desc" },
    });
    if (open) {
      await prisma.loginLog.update({
        where: { id: open.id },
        data: { logoutAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("record-logout:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
