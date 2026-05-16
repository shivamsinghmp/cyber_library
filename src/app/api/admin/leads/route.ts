import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

/** GET: List lead (landing form) submissions for admin. */
export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    // auth verified (user identity confirmed by requireSuperAdmin/requireAdmin)

    const leads = await prisma.leadSubmission.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, data: true, source: true, createdAt: true },
      take: 2000,
    });

    return NextResponse.json(leads);
  } catch (e) {
    console.error("GET /api/admin/leads:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

