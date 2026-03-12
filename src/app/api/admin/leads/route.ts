import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** GET: List lead (landing form) submissions for admin. */
export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const leads = await prisma.leadSubmission.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      leads.map((l) => ({
        id: l.id,
        data: l.data,
        source: l.source,
        createdAt: l.createdAt,
      }))
    );
  } catch (e) {
    console.error("GET /api/admin/leads:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

