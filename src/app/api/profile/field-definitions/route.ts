import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** GET: Profile field definitions for the current user's role (STUDENT, EMPLOYEE, AUTHOR). */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role ?? "STUDENT";
    const list = await prisma.profileFieldDefinition.findMany({
      where: { role },
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/profile/field-definitions:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
