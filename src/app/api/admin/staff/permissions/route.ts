import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit-logger";
import { requireSuperAdmin } from "@/lib/api-helpers";

export async function GET(req: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const p = await prisma.employeePermission.findUnique({ where: { userId } });
    return NextResponse.json({ modules: p?.modules || [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { userId, modules } = await req.json();
    if (!userId || !Array.isArray(modules)) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    const updated = await prisma.employeePermission.upsert({
      where: { userId },
      update: { modules },
      create: { userId, modules },
    });

    
    // Fetch user details for nicer log
    const staff = await prisma.user.findUnique({ where: { id: userId }, select: { email: true }});

    await logAdminAction(
      user.id,
      "GRANT",
      "STAFF_PERMISSIONS",
      `Updated module permissions for staff '${staff?.email || userId}' to [${modules.join(", ")}]`,
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to secure permissions" }, { status: 500 });
  }
}
