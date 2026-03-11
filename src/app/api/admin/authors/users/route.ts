import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** GET: List users for "Link to author" dropdown (admin only). */
export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch (e) {
    console.error("GET /api/admin/authors/users:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
