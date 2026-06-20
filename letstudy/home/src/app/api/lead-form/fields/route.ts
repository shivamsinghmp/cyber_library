import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET: Public. Returns dynamic field definitions for the landing (new student) form. */
export async function GET() {
  try {
    const defs = await prisma.profileFieldDefinition.findMany({
      where: { role: "LEAD" },
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
    });
    return NextResponse.json(defs);
  } catch (e) {
    console.error("GET /api/lead-form/fields:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

