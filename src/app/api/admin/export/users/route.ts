import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** GET: List users with profile (name, email, WhatsApp) for admin export. */
export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        studentId: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            fullName: true,
            phone: true,
            whatsappNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = users.map((u) => ({
      id: u.id,
      studentId: u.studentId ?? "",
      name: u.name ?? u.profile?.fullName ?? "",
      email: u.email,
      role: u.role,
      whatsappNumber: u.profile?.whatsappNumber ?? u.profile?.phone ?? "",
      createdAt: u.createdAt,
    }));

    return NextResponse.json(rows);
  } catch (e) {
    console.error("GET /api/admin/export/users:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
